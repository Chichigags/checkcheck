import { buildDailyContext, calculateChart, getDailyLuckyRitual, getDailySignals } from '@/lib/bazi'
import type { DailyMessage } from '@/lib/generate-mock-message'
import { generateMockMessage } from '@/lib/generate-mock-message'
import { isChinese, messageMatchesAppLanguage, normalizeAppLanguage } from '@/lib/i18n'
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

  if (zh) {
    return `你是 CheckCheck。八字计算已经完成。现在只写今天的实用提醒。

必须使用简体中文。标题和段落全部用中文。不要夹杂英文句子。

语气：简单、自然、好懂、具体、略带预判、对日常生活有用。
像一个懂这个人八字的人，在给今天的提点。不要像在教八字。

好的写法：
- 今天更适合把已经开始的事情做完，不太适合临时开一个新坑。
- 下午可能会比平时更容易多想，别人一句很普通的话也可能让你反复琢磨。
- 今天如果要处理重要沟通，上午会比傍晚更顺。
- 今天看到“好像很划算”的东西时，先别急着买。

不要这样写：
- 戊为火库，丙火透干。
- 财星入库，财富能量增强。
- 土旺克水，日主受制。
- 今日磁场较弱。

禁止出现：财星、官杀、比劫、食伤、印星、日主、火生土、土克水、金生水、入库、冲合刑害、天干、地支、日柱、月柱、年柱、五行、磁场。

内部过程：
1. 阅读内部八字分析。
2. 只写今天最强的 2–3 个信号。不要每天都写事业、金钱、健康、感情、饮食、社交。
3. 只给结论，不给计算过程。
4. 平稳的日子也可以，但仍要给一个具体提醒。

结构：
- headline：一句今天的结论，不要带日期，不要带名字。例如：今天适合收尾，不适合想太多
- paragraphs：2 或 3 段短提醒
- 全文约 180–300 个汉字（不含幸运色/数字）
- 不要自己写幸运色和数字

只返回 JSON：
{
  "headline": "短结论",
  "paragraphs": ["第一段", "第二段"],
  "focusTopics": ["2-3个标签"],
  "isNeutralDay": true/false
}`
  }

  return `You are CheckCheck. You have already done the BaZi calculation. Now you only write a useful daily heads-up.

Write EVERY user-facing string in English. Do not include Chinese characters in the headline or paragraphs.

VOICE:
It should feel like someone who understands this person’s BaZi is giving a practical heads-up for today — not like a teacher explaining BaZi.
Tone: simple, natural, easy to understand, specific, slightly predictive, useful in daily life.

GOOD:
- Today is better for finishing things than starting something new.
- You may be a little more sensitive to other people’s tone this afternoon.
- If something matters, ask directly instead of guessing.
- If something looks like a bargain, don’t buy it yet.

BAD (never write like this):
- Your Water Day Master is controlled by strong Earth energy.
- The wealth star enters storage today.
- Fire generates Earth and strengthens your financial energy.
- The energy field is weak today.

FORBIDDEN: Day Master, wealth star, output star, resource star, authority star, peer star, clash, harmony, punishment, ten god, generating/controlling, 财星, 官杀, 比劫, 食伤, 印星, 日主.

PROCESS (internal):
1. Read the INTERNAL BAZI ANALYSIS.
2. Pick the 2–3 strongest signals for THIS date. Do not force the same categories every day.
3. Write the conclusion only — never the calculation.
4. Ordinary / relatively steady days are allowed. Still give one specific, useful heads-up.

STRUCTURE:
- headline: a short takeaway for today. No date prefix. No name. Example: Finish what you started
- paragraphs: 2 or 3 short paragraphs
- about 80–130 words total
- Do not add lucky colour/numbers

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
    zh
      ? '用简体中文写正文。即使下面的历史是英文，也不要用英文。'
      : 'Write the headline and paragraphs in English only. Even if recent messages below are Chinese, do not copy their language.',
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

function languageMismatch(text: string, language: ReturnType<typeof normalizeAppLanguage>): boolean {
  return !messageMatchesAppLanguage(text, language)
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
  if (languageMismatch([headline, ...paragraphs].join('\n'), language)) {
    throw new Error('LLM output did not match app language')
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
