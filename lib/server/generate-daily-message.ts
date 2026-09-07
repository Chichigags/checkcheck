import { buildAstroContext } from '@/lib/astrology'
import { buildDailyContext, calculateChart, getDailySignals } from '@/lib/bazi'
import type { DailyMessage, DailyModule, MessageFormat, ModuleType } from '@/lib/generate-mock-message'
import { generateMockMessage } from '@/lib/generate-mock-message'
import { isChinese, normalizeAppLanguage } from '@/lib/i18n'
import type { UserProfile } from '@/lib/profile'
import { chatCompletion } from './openrouter'
import type { DailyMessageRecord } from './types'
import { fetchLocalWeatherForecast } from './weather'

const MODULE_TYPES: ModuleType[] = [
  'keyword',
  'worth_doing',
  'not_to_do',
  'do_dont',
  'work',
  'relationship',
  'social',
  'spending',
  'emotional',
  'social_vs_solo',
  'action_mode',
  'best_window',
  'hard_window',
  'what_to_wear',
  'what_to_eat',
  'one_sentence',
  'small_challenge',
]

const MESSAGE_FORMATS: MessageFormat[] = [
  'keyword',
  'do_dont',
  'one_line',
  'time_of_day',
  'main_watch',
  'one_thing',
  'one_avoid',
  'workday',
  'weekend',
  'social_energy',
  'start_pause_finish',
]

function dayOfWeek(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
}

function summarizeHistory(records: DailyMessageRecord[]): string {
  if (!records.length) return 'No recent messages.'

  return records
    .slice(0, 14)
    .map((record) => {
      const p = record.payload as Partial<DailyMessage> | null
      const format = p?.format ?? 'legacy'
      const topics = (p?.focusTopics ?? []).join(', ') || 'n/a'
      const modules = (p?.modules ?? p?.triggeredModules ?? [])
        .map((m) => ('type' in m ? m.type : ''))
        .filter(Boolean)
        .join(', ')
      const headline = p?.headline || p?.todayVibe || p?.dailyLuck || ''
      return `- ${record.message_date} | format=${format} | topics=${topics} | modules=${modules} | headline="${String(headline).slice(0, 80)}"`
    })
    .join('\n')
}

function buildSystemPrompt(language: ReturnType<typeof normalizeAppLanguage>): string {
  const langLine =
    language === '中文'
      ? 'Write EVERY user-facing string in Simplified Chinese (中文). Titles and messages must be Chinese.'
      : 'Write EVERY user-facing string in English.'

  return `You are CheckCheck — a practical daily companion grounded in real Chinese BaZi (八字) calculations.

NON-NEGOTIABLE RULES:
1. NEVER invent advice just to sound interesting. Every recommendation must be derived from the provided BaZi context, birth data, current city/timezone, and the reading date.
2. Variety comes from interpreting TODAY's specific stems/branches/relation — not from making things up, and not from recycling yesterday's wording.
3. Ordinary / neutral days are OK, but they must still feel SPECIFIC to today's pillar, animal, element interaction, weekday, and any clash/harmony. Forbidden lazy defaults:
   - repeating "today is steady / no strong signal" day after day
   - always using the same modules (action_mode + one_sentence)
   - synonym-swapping the same advice
4. Forbidden hype unless strongly supported: "major opportunity", "you will meet an important person", "wealth energy is very strong".
5. Product tone: "here is how to move through today a little more smoothly."
6. ${langLine}

PROCESS:
A. Read today's Day Pillar, Day Master interaction, clashes/harmonies, month energy.
B. Name what is DISTINCT about today vs a generic quiet day.
C. Pick a format NOT used in recent history when accuracy allows.
D. Pick 2–4 modules supported by today's signals — change module types across days.
E. Lucky colour + number: small closing ritual, thematically tied to today's element/animal when possible.
F. If weather is provided and you mention wear/outdoor advice, align with it.

Available formats: ${MESSAGE_FORMATS.join(', ')}
Available module types: ${MODULE_TYPES.join(', ')}

Respond with valid JSON only:
{
  "format": "one of the formats above",
  "isNeutralDay": true/false,
  "focusTopics": ["short tags"],
  "headline": "opening line — must mention something concrete from today's BaZi (element, animal, clash/harmony, or relation)",
  "body": "1-2 sentences of practical support",
  "modules": [
    { "type": "module type", "title": "short title", "message": "1-2 sentences" }
  ],
  "luckyColour": { "name": "colour name", "hex": "#RRGGBB" },
  "luckyNumber": [n1, n2]
}`
}

function buildUserPrompt(
  profile: UserProfile,
  date: string,
  historySummary: string,
  weatherSummary: string | null
): string {
  const chart = calculateChart(profile.dateOfBirth, profile.birthTime)
  const baziContext = buildDailyContext(chart, date)
  const signals = getDailySignals(chart, date)
  const astroContext = buildAstroContext(profile.dateOfBirth, date)
  const language = normalizeAppLanguage(profile.languagePreference)
  const weekday = dayOfWeek(date)

  const parts = [
    `Generate a CheckCheck daily reading for ${date} (${weekday}).`,
    '',
    'User profile:',
    `- Name: ${profile.nickname || profile.legalName}`,
    `- Date of birth: ${profile.dateOfBirth}`,
    `- Birth time: ${profile.birthTime}`,
    `- Birth city: ${profile.birthCity}`,
    `- Gender: ${profile.gender}`,
    `- Current city: ${profile.currentCity || 'Not set'}`,
    `- Timezone: ${profile.timezone || 'UTC'}`,
    `- App language: ${language}`,
  ]

  if (profile.relationshipStatus) parts.push(`- Relationship: ${profile.relationshipStatus}`)
  if (profile.lifeFocus) parts.push(`- Life focus: ${profile.lifeFocus}`)

  parts.push(
    '',
    baziContext,
    '',
    `Quick signals: relation=${signals.relationKind}; todayElement=${signals.todayElement}; animal=${signals.todayAnimal}; clashes=${signals.clashLabels.join('|') || 'none'}; harmonies=${signals.harmonyLabels.join('|') || 'none'}; neutral=${signals.isNeutral}`,
    '',
    astroContext,
    '',
    '=== Recent message history (DO NOT reuse the same headline pattern, module pair, or closing line) ===',
    historySummary,
    ''
  )

  if (weatherSummary) {
    parts.push(
      '=== Local weather forecast ===',
      weatherSummary,
      ''
    )
  } else {
    parts.push(
      '=== Local weather ===',
      'Unavailable. Skip weather-specific claims.',
      ''
    )
  }

  parts.push(
    'Make today feel different from the last 7 days while staying faithful to the BaZi signals.',
    'Respond with JSON only. No markdown, no code fences.'
  )

  return parts.join('\n')
}

function parseModules(raw: unknown): DailyModule[] {
  if (!Array.isArray(raw)) return []
  const modules: DailyModule[] = []
  const seen = new Set<string>()

  for (const item of raw.slice(0, 5)) {
    if (!item || typeof item !== 'object') continue
    const m = item as Record<string, unknown>
    const type = String(m.type ?? '') as ModuleType
    const title = String(m.title ?? '').trim()
    const message = String(m.message ?? '').trim()
    if (!MODULE_TYPES.includes(type) || !title || !message || seen.has(type)) continue
    seen.add(type)
    modules.push({ type, title, message })
  }

  return modules
}

function parseLlmResponse(raw: string, profile: UserProfile, date: string): DailyMessage {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const parsed = JSON.parse(cleaned) as Record<string, unknown>
  const language = normalizeAppLanguage(profile.languagePreference)

  const luckyColour = parsed.luckyColour as { name?: string; hex?: string } | undefined
  const rawNumbers = Array.isArray(parsed.luckyNumber) ? parsed.luckyNumber : [7, 23]
  const luckyNumber = rawNumbers.slice(0, 2).map((n: unknown) => Math.max(1, Math.min(99, Number(n) || 1)))

  const formatRaw = String(parsed.format ?? 'one_line') as MessageFormat
  const format = MESSAGE_FORMATS.includes(formatRaw) ? formatRaw : 'one_line'
  const headline = String(parsed.headline ?? parsed.todayVibe ?? '').trim()
  const body = String(parsed.body ?? '').trim()
  const modules = parseModules(parsed.modules)
  const focusTopics = Array.isArray(parsed.focusTopics)
    ? parsed.focusTopics.map((t) => String(t)).filter(Boolean).slice(0, 6)
    : []

  if (!headline) {
    throw new Error('LLM JSON missing headline')
  }

  return {
    date,
    nickname: profile.nickname || profile.legalName,
    language,
    format,
    headline,
    body: body || undefined,
    modules:
      modules.length > 0
        ? modules
        : [
            {
              type: 'one_sentence',
              title: language === '中文' ? '一句话' : 'One line',
              message:
                language === '中文'
                  ? '按今天的干支节奏走，比硬推更稳。'
                  : 'Move with today’s stem/branch pace rather than forcing it.',
            },
          ],
    luckyColour: {
      name: String(luckyColour?.name ?? (language === '中文' ? '雾蓝' : 'Ocean Blue')),
      hex: String(luckyColour?.hex ?? '#0077B6'),
    },
    luckyNumber,
    isNeutralDay: Boolean(parsed.isNeutralDay),
    focusTopics,
    generatedBy: 'llm',
    todayVibe: headline,
  }
}

export async function generateDailyMessage(
  profile: UserProfile,
  date: string,
  recentHistory: DailyMessageRecord[] = []
): Promise<DailyMessage> {
  try {
    const language = normalizeAppLanguage(profile.languagePreference)
    const weather = profile.currentCity
      ? await fetchLocalWeatherForecast(profile.currentCity, date, isChinese(language) ? 'zh' : 'en')
      : null

    const response = await chatCompletion(
      [
        { role: 'system', content: buildSystemPrompt(language) },
        {
          role: 'user',
          content: buildUserPrompt(profile, date, summarizeHistory(recentHistory), weather?.summary ?? null),
        },
      ],
      {
        temperature: 0.85,
        maxTokens: 1000,
      }
    )

    return parseLlmResponse(response, profile, date)
  } catch (error) {
    console.error('LLM generation failed, falling back to BaZi mock:', error instanceof Error ? error.message : error)
    return generateMockMessage(profile, date)
  }
}
