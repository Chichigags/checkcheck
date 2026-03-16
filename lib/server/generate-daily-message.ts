import { buildAstroContext } from '@/lib/astrology'
import { buildDailyContext, calculateChart } from '@/lib/bazi'
import type { DailyMessage, DailyWord, TriggeredModule } from '@/lib/generate-mock-message'
import { generateMockMessage } from '@/lib/generate-mock-message'
import type { UserProfile } from '@/lib/profile'
import { chatCompletion } from './openrouter'

function buildSystemPrompt(wantInspiration: boolean, wantWord: boolean): string {
  const inspirationField = wantInspiration
    ? `  "dailyInspiration": "A short, meaningful quote or proverb to start the day — can be from any culture, era, or thinker. Keep it to 1-2 sentences max.",\n`
    : ''

  const wordField = wantWord
    ? `  "dailyWord": {
    "language": "the user's chosen language",
    "word": "a beautiful/useful word in that language",
    "translation": "english meaning",
    "pronunciation": "phonetic guide"
  }\n`
    : ''

  const inspirationRule = wantInspiration
    ? '- dailyInspiration: pick a quote that connects to the day\'s theme or the user\'s life focus. Vary sources — mix Eastern philosophy, Western literature, modern thinkers, proverbs.\n'
    : ''

  const wordRule = wantWord
    ? '- dailyWord: only include if the user has a language preference that is not "None". Pick a word that connects to the day\'s theme.\n'
    : ''

  return `You are CheckCheck, a warm and witty daily insights companion. You create personalized daily readings grounded in real Chinese BaZi (八字) calculations and Western astrology data, delivered as practical, punchy advice.

IMPORTANT: You will receive COMPUTED data from both systems — BaZi (Four Pillars, Day Master, element interactions, clashes, harmonies) and Western astrology (Sun sign, Moon phase, Sun transit, element dynamics). These are calculated from the user's actual birth data and today's date. Use them as the foundation for your reading. Reference specific elements, interactions, moon phase energy, and sign dynamics when relevant. Do NOT invent data — only interpret what is provided.

Your tone is: friendly, playful, insightful, concise. Like a smart friend who reads horoscopes ironically but still finds wisdom in them.

You MUST respond with valid JSON matching this exact schema:

{
  "todayVibe": "A short punchy one-liner capturing today's energy (e.g. 'Trust the slow build — it's working.')",
  "luckyColour": {
    "name": "A creative colour name (e.g. 'Midnight Coral', 'Forest Sage')",
    "hex": "#RRGGBB hex code"
  },
  "luckyNumber": [7, 23],
  "dailyLuck": "1-2 sentences of personalized positive insight for the day",
  "watchOut": "1-2 sentences about something to be mindful of today",
  "dailyFun": "1 sentence that's funny, quirky, or uplifting — like a fortune cookie with personality",
${inspirationField}  "triggeredModules": [
    {
      "type": "romance|career|conflict|lunar|transit",
      "title": "Short catchy title (2-4 words)",
      "message": "1-2 sentences of personalized advice",
      "phase": "only if type is lunar — e.g. 'Waxing Crescent'",
      "planet": "only if type is transit — e.g. 'Mercury'"
    }
  ],
${wordField}}

Rules:
- todayVibe: a short, catchy one-liner — think motto of the day, grounded in the BaZi/astrology context.
- luckyNumber: pick 2 numbers (1-99) that feel thematically connected to the day's energy.
- triggeredModules: include 1-2 modules. Pick types relevant to the user's life focus and situation.
- For "lunar" type modules, always include "phase". For "transit" type, always include "planet".
- For other module types (romance, career, conflict), do NOT include "phase" or "planet".
${inspirationRule}${wordRule}- Make content feel personal using the user's name, life situation, and preferences.
- Vary the lucky colour creatively — don't repeat common colours.
- The dailyFun should genuinely make someone smile.
- Do NOT be generic. Reference specific details from the user's profile.
- Keep each field concise — this is read in a Telegram chat.`
}

function buildUserPrompt(profile: UserProfile, date: string): string {
  const chart = calculateChart(profile.dateOfBirth, profile.birthTime)
  const baziContext = buildDailyContext(chart, date)
  const astroContext = buildAstroContext(profile.dateOfBirth, date)

  const parts = [
    `Generate a CheckCheck daily reading for ${date}.`,
    '',
    'User profile:',
    `- Name: ${profile.nickname || profile.legalName}`,
    `- Date of birth: ${profile.dateOfBirth}`,
    `- Birth time: ${profile.birthTime}`,
    `- Birth city: ${profile.birthCity}`,
    `- Gender: ${profile.gender}`,
    `- Current city: ${profile.currentCity || 'Not set'}`,
  ]

  if (profile.relationshipStatus) {
    parts.push(`- Relationship: ${profile.relationshipStatus}`)
  }
  if (profile.lifeFocus) {
    parts.push(`- Life focus: ${profile.lifeFocus}`)
  }

  if (profile.dailyInspiration) {
    parts.push('- Wants daily inspiration quote: Yes')
  }

  if (profile.languagePreference && profile.languagePreference !== 'None') {
    parts.push(`- Learning language: ${profile.languagePreference}`)
  } else {
    parts.push('- Language preference: None (skip dailyWord)')
  }

  parts.push('', baziContext, '', astroContext, '', 'Respond with JSON only. No markdown, no code fences, no explanation.')

  return parts.join('\n')
}

function parseModules(raw: unknown[]): TriggeredModule[] {
  if (!Array.isArray(raw)) return []
  const modules: TriggeredModule[] = []

  for (const item of raw.slice(0, 2)) {
    if (!item || typeof item !== 'object') continue
    const m = item as Record<string, unknown>
    const type = String(m.type ?? '')
    const title = String(m.title ?? '')
    const message = String(m.message ?? '')
    if (!type || !title || !message) continue

    switch (type) {
      case 'lunar':
        modules.push({ type: 'lunar', title, message, phase: String(m.phase ?? 'Unknown') })
        break
      case 'transit':
        modules.push({ type: 'transit', title, message, planet: String(m.planet ?? 'Unknown') })
        break
      case 'romance':
      case 'career':
      case 'conflict':
        modules.push({ type, title, message })
        break
    }
  }

  return modules
}

function parseDailyWord(raw: unknown, expectedLanguage: string): DailyWord | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const w = raw as Record<string, unknown>
  const word = String(w.word ?? '').trim()
  const translation = String(w.translation ?? '').trim()
  if (!word || !translation) return undefined

  return {
    language: expectedLanguage as DailyWord['language'],
    word,
    translation,
    pronunciation: w.pronunciation ? String(w.pronunciation) : undefined,
  }
}

function parseLlmResponse(raw: string, profile: UserProfile, date: string): DailyMessage {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const parsed = JSON.parse(cleaned) as Record<string, unknown>

  const luckyColour = parsed.luckyColour as { name?: string; hex?: string } | undefined
  const hasLanguage = profile.languagePreference && profile.languagePreference !== 'None'

  const rawNumbers = Array.isArray(parsed.luckyNumber) ? parsed.luckyNumber : [7, 23]
  const luckyNumber = rawNumbers.slice(0, 2).map((n: unknown) => Math.max(1, Math.min(99, Number(n) || 1)))

  return {
    date,
    nickname: profile.nickname || profile.legalName,
    todayVibe: String(parsed.todayVibe ?? 'Go with the flow today.'),
    luckyColour: {
      name: String(luckyColour?.name ?? 'Ocean Blue'),
      hex: String(luckyColour?.hex ?? '#0077B6'),
    },
    luckyNumber,
    dailyLuck: String(parsed.dailyLuck ?? ''),
    watchOut: String(parsed.watchOut ?? ''),
    dailyFun: String(parsed.dailyFun ?? ''),
    dailyInspiration: profile.dailyInspiration && parsed.dailyInspiration
      ? String(parsed.dailyInspiration)
      : undefined,
    triggeredModules: parseModules(parsed.triggeredModules as unknown[]),
    dailyWord: hasLanguage ? parseDailyWord(parsed.dailyWord, profile.languagePreference) : undefined,
  }
}

export async function generateDailyMessage(profile: UserProfile, date: string): Promise<DailyMessage> {
  try {
    const wantInspiration = profile.dailyInspiration ?? false
    const wantWord = !!(profile.languagePreference && profile.languagePreference !== 'None')

    const response = await chatCompletion([
      { role: 'system', content: buildSystemPrompt(wantInspiration, wantWord) },
      { role: 'user', content: buildUserPrompt(profile, date) },
    ])

    return parseLlmResponse(response, profile, date)
  } catch (error) {
    console.error('LLM generation failed, falling back to mock:', error)
    return generateMockMessage(profile, date)
  }
}
