import { buildDailyContext, calculateChart, getDailyLuckyRitual, getDailySignals } from '@/lib/bazi'
import type { DailyMessage } from '@/lib/generate-mock-message'
import { generateMockMessage } from '@/lib/generate-mock-message'
import { isChinese, normalizeAppLanguage } from '@/lib/i18n'
import type { UserProfile } from '@/lib/profile'
import { chatCompletion } from './openrouter'
import type { DailyMessageRecord } from './types'
import { fetchLocalWeatherForecast } from './weather'

function dayOfWeek(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
}

function summarizeHistory(records: DailyMessageRecord[]): string {
  if (!records.length) return 'No recent messages.'

  return records
    .slice(0, 14)
    .map((record) => {
      const p = record.payload as Partial<DailyMessage> | null
      const topics = (p?.focusTopics ?? []).join(', ') || 'n/a'
      const headline = p?.headline || p?.todayVibe || p?.dailyLuck || ''
      const preview = (p?.paragraphs ?? []).join(' / ').slice(0, 120) || String(p?.body ?? '').slice(0, 120)
      return `- ${record.message_date} | topics=${topics} | headline="${String(headline).slice(0, 80)}" | ${preview}`
    })
    .join('\n')
}

function buildSystemPrompt(language: ReturnType<typeof normalizeAppLanguage>): string {
  const zh = language === '中文'
  const langLine = zh
    ? 'Write EVERY user-facing string in Simplified Chinese (中文).'
    : 'Write EVERY user-facing string in English.'
  const lengthLine = zh
    ? 'Chinese length: about 180–300 Chinese characters for headline + paragraphs combined (not counting lucky colour/numbers).'
    : 'English length: about 80–130 words for headline + paragraphs combined (not counting lucky colour/numbers).'

  return `You are CheckCheck. You have already done the BaZi calculation. Now you only write a useful daily heads-up.

${langLine}

VOICE:
It should feel like someone who understands this person’s BaZi is giving a practical heads-up for today — not like a teacher explaining BaZi.
Tone: simple, natural, easy to understand, specific, slightly predictive, useful in daily life.

GOOD:
- 今天更适合把已经开始的事情做完，不太适合临时开一个新坑。
- 下午可能会比平时更容易多想，别人一句很普通的话也可能让你反复琢磨。
- 今天如果要处理重要沟通，上午会比傍晚更顺。
- 今天看到“好像很划算”的东西时，先别急着买。
- Today is better for finishing things than starting something new.
- You may be a little more sensitive to other people’s tone this afternoon.
- If something matters, ask directly instead of guessing.

BAD (never write like this):
- 戊为火库，丙火透干。
- 财星入库，财富能量增强。
- 土旺克水，日主受制。
- 今日磁场较弱。
- Your Water Day Master is controlled by strong Earth energy.
- The wealth star enters storage today.
- Fire generates Earth and strengthens your financial energy.

FORBIDDEN in user-facing text unless absolutely unavoidable:
财星, 官杀, 比劫, 食伤, 印星, 日主, 火生土, 土克水, 金生水, 入库, 冲合刑害, 天干, 地支, 日柱, 月柱, 年柱, 五行, 旺, 克, 冲, 合, 刑, 害, 库, 磁场, Day Master, wealth star, output star, resource star, authority star, peer star, clash, harmony, punishment, ten god, five elements generating/controlling.

Do not mention stems, branches, animals as metaphysics, or element names as theory. The user should understand the whole message immediately without knowing anything about BaZi.

PROCESS (internal):
1. Read the INTERNAL BAZI ANALYSIS.
2. Pick the 2–3 strongest signals for THIS date. Do not force the same categories every day.
3. Do NOT always cover career, money, health, relationships, food, and social life.
4. Write the conclusion only — never the calculation.
5. Ordinary / relatively steady days are allowed. Still give one specific, useful heads-up. Never pad with “energy is weak” or vague cosmic language.

STRUCTURE:
- headline: a short takeaway for today. No date prefix (the app adds the date). No name. Chinese example: 今天适合收尾，不适合想太多. English example: Finish what you started
- paragraphs: 2 or 3 short paragraphs of everyday advice. Specific actions, timings, or cautions when the chart supports them.
- ${lengthLine}
- Do not add lucky colour/numbers. Those are attached by the system from the BaZi analysis.

Respond with valid JSON only:
{
  "headline": "short takeaway",
  "paragraphs": ["paragraph 1", "paragraph 2"],
  "focusTopics": ["2-3 short tags matching the signals you used"],
  "isNeutralDay": true/false
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
  const ritual = getDailyLuckyRitual(chart, date)
  const language = normalizeAppLanguage(profile.languagePreference)
  const weekday = dayOfWeek(date)
  const zh = language === '中文'

  const parts = [
    `Write today’s CheckCheck for ${date} (${weekday}).`,
    '',
    'User (for context only — do not greet by name unless it helps a sentence):',
    `- Name: ${profile.nickname || profile.legalName}`,
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
    `Quick signal tags (internal): themes=${signals.strongestThemes.join(', ')}; dayTone=${signals.relationKind}; monthOverlay=${signals.monthRelationKind}; animal=${signals.todayAnimal}; friction=${[...signals.clashLabels, ...signals.punishmentLabels, ...signals.harmLabels].join('|') || 'none'}; support=${signals.harmonyLabels.join('|') || 'none'}; steady=${signals.isNeutral}`,
    '',
    `Lucky ritual already computed (do not mention the source element): ${zh ? ritual.colour.nameZh : ritual.colour.name} / ${ritual.numbers.join(zh ? '、' : ', ')}`,
    '',
    '=== Recent messages (do not repeat the same headline, topics, or closing move) ===',
    historySummary,
    ''
  )

  if (weatherSummary) {
    parts.push(
      '=== Local weather (optional; mention only if it genuinely affects today’s heads-up) ===',
      weatherSummary,
      ''
    )
  }

  parts.push('JSON only. No markdown, no code fences.')
  return parts.join('\n')
}

const FORBIDDEN_USER_TEXT = [
  '财星', '官杀', '比劫', '食伤', '印星', '日主',
  '火生土', '土克水', '金生水', '入库', '冲合刑害',
  'Day Master', 'wealth star', 'output star', 'resource star',
  'authority star', 'peer star',
]

function containsJargon(text: string): boolean {
  const lower = text.toLowerCase()
  return FORBIDDEN_USER_TEXT.some((term) => lower.includes(term.toLowerCase()))
}

function parseParagraphs(raw: unknown, fallback?: string): string[] {
  const fromArray = Array.isArray(raw)
    ? raw.map((p) => String(p ?? '').trim()).filter(Boolean)
    : []
  if (fromArray.length > 0) return fromArray.slice(0, 3)
  const fromFallback = String(fallback ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  return fromFallback.slice(0, 3)
}

function stripDatePrefix(headline: string): string {
  return headline
    .replace(/^\d{1,2}月\d{1,2}日\s*[｜|]\s*/, '')
    .replace(/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s*[|｜]\s*/i, '')
    .trim()
}

function parseLlmResponse(raw: string, profile: UserProfile, date: string): DailyMessage {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const parsed = JSON.parse(cleaned) as Record<string, unknown>
  const language = normalizeAppLanguage(profile.languagePreference)
  const chart = calculateChart(profile.dateOfBirth, profile.birthTime)
  const ritual = getDailyLuckyRitual(chart, date)
  const zh = language === '中文'

  const headline = stripDatePrefix(String(parsed.headline ?? parsed.todayVibe ?? '').trim())
  const paragraphs = parseParagraphs(parsed.paragraphs, String(parsed.body ?? ''))
  const focusTopics = Array.isArray(parsed.focusTopics)
    ? parsed.focusTopics.map((t) => String(t)).filter(Boolean).slice(0, 6)
    : []

  if (!headline) {
    throw new Error('LLM JSON missing headline')
  }
  if (paragraphs.length < 2) {
    throw new Error('LLM JSON missing paragraphs')
  }
  if (containsJargon([headline, ...paragraphs].join('\n'))) {
    throw new Error('LLM output leaked BaZi jargon')
  }

  return {
    date,
    nickname: profile.nickname || profile.legalName,
    language,
    format: 'one_line',
    headline,
    body: paragraphs.join('\n\n'),
    paragraphs,
    modules: [],
    luckyColour: {
      name: zh ? ritual.colour.nameZh : ritual.colour.name,
      hex: ritual.colour.hex,
    },
    luckyNumber: [...ritual.numbers],
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
        temperature: 0.7,
        maxTokens: 700,
      }
    )

    return parseLlmResponse(response, profile, date)
  } catch (error) {
    console.error('LLM generation failed, falling back to BaZi mock:', error instanceof Error ? error.message : error)
    return generateMockMessage(profile, date)
  }
}
