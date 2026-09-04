import { buildAstroContext } from '@/lib/astrology'
import { buildDailyContext, calculateChart } from '@/lib/bazi'
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
    .slice(0, 30)
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
1. NEVER invent advice just to sound interesting. Every recommendation, warning, timing tip, lucky color, lucky number, or theme MUST be derived from the provided BaZi context, birth data, current city/timezone, and the reading date.
2. Variety comes from how you interpret and present the REAL reading — not from making things up.
3. If the chart does not support a strong conclusion, say so. Ordinary / neutral days are OK and preferred over fake excitement.
4. Forbidden hype unless strongly supported: "major opportunity", "you will meet an important person", "wealth energy is very strong".
5. Product tone: not "here is your fortune" — instead "here is how to move through today a little more smoothly."
6. ${langLine}

PROCESS (in order):
A. Interpret the computed BaZi signals for today (Day Master interaction, clashes, harmonies, element balance, month energy).
B. Decide if today is strong, mixed, or neutral.
C. Choose a message format that fits the real reading (and avoid recently used formats when accuracy allows).
D. Select 2–4 modules that the reading genuinely supports. Do NOT force career/wealth/love/health every day.
E. Lucky colour + lucky number are a small closing ritual — still thematically grounded, not random decoration.
F. If weather data is provided and you include wear / outdoor / weather-sensitive advice, ALIGN with the forecast. Do not suggest light clothing on a cold rainy day.

Available formats: ${MESSAGE_FORMATS.join(', ')}
Available module types: ${MODULE_TYPES.join(', ')}

Respond with valid JSON only:
{
  "format": "one of the formats above",
  "isNeutralDay": true/false,
  "focusTopics": ["short topic tags used for anti-repetition, e.g. steady, finish, solo"],
  "headline": "opening line framing the day",
  "body": "optional 1-2 sentence support; omit or empty if not needed",
  "modules": [
    { "type": "module type", "title": "short title", "message": "1-2 sentences of practical guidance" }
  ],
  "luckyColour": { "name": "colour name", "hex": "#RRGGBB" },
  "luckyNumber": [n1, n2]
}

Rules for modules:
- Include only modules supported by today's signals (typically 2–4).
- Prefer practical guidance: what is worth doing, what to avoid, action vs wait, social vs solo, time windows, emotional/work/money reminders WHEN supported.
- what_to_wear / what_to_eat only when chart + (if present) weather support them.
- Do not repeat the same module type inside one message.
- Keep Telegram-friendly length.`
}

function buildUserPrompt(
  profile: UserProfile,
  date: string,
  historySummary: string,
  weatherSummary: string | null
): string {
  const chart = calculateChart(profile.dateOfBirth, profile.birthTime)
  const baziContext = buildDailyContext(chart, date)
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
    astroContext,
    '',
    '=== Recent message history (avoid obvious repetition of format/topics/wording when accuracy allows) ===',
    historySummary,
    ''
  )

  if (weatherSummary) {
    parts.push(
      '=== Local weather forecast (use if wear / outdoor / weather-sensitive advice appears) ===',
      weatherSummary,
      ''
    )
  } else {
    parts.push(
      '=== Local weather ===',
      'Unavailable. Avoid specific weather claims. Prefer chart-only wear advice or skip wear modules.',
      ''
    )
  }

  parts.push(
    'Remember: accuracy over excitement. Neutral days should sound neutral.',
    'Respond with JSON only. No markdown, no code fences, no explanation.'
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

  const fallbackHeadline =
    language === '中文'
      ? '今天整体偏平稳，没有特别强的信号。'
      : 'Today is fairly steady — no especially strong signal.'

  return {
    date,
    nickname: profile.nickname || profile.legalName,
    language,
    format,
    headline: headline || fallbackHeadline,
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
                  ? '保持节奏，不必硬推。'
                  : 'Keep a steady pace — no need to force it.',
            },
          ],
    luckyColour: {
      name: String(luckyColour?.name ?? (language === '中文' ? '雾蓝' : 'Ocean Blue')),
      hex: String(luckyColour?.hex ?? '#0077B6'),
    },
    luckyNumber,
    isNeutralDay: Boolean(parsed.isNeutralDay),
    focusTopics,
    todayVibe: headline || fallbackHeadline,
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

    const response = await chatCompletion([
      { role: 'system', content: buildSystemPrompt(language) },
      {
        role: 'user',
        content: buildUserPrompt(profile, date, summarizeHistory(recentHistory), weather?.summary ?? null),
      },
    ], {
      temperature: 0.7,
      maxTokens: 900,
    })

    return parseLlmResponse(response, profile, date)
  } catch (error) {
    console.error('LLM generation failed, falling back to mock:', error instanceof Error ? error.message : error)
    return generateMockMessage(profile, date)
  }
}
