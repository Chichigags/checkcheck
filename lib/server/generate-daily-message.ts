import type { DailyMessage, DailyWord, TriggeredModule } from '@/lib/generate-mock-message'
import { generateMockMessage } from '@/lib/generate-mock-message'
import type { UserProfile } from '@/lib/profile'
import { chatCompletion } from './openrouter'

function buildSystemPrompt(): string {
  return `You are CheckCheck, a warm and witty daily insights companion. You create personalized daily readings that blend astrology-inspired wisdom, practical advice, and humor.

Your tone is: friendly, playful, insightful, concise. Like a smart friend who reads horoscopes ironically but still finds wisdom in them.

You MUST respond with valid JSON matching this exact schema:

{
  "luckyColour": {
    "name": "A creative colour name (e.g. 'Midnight Coral', 'Forest Sage')",
    "hex": "#RRGGBB hex code"
  },
  "dailyLuck": "1-2 sentences of personalized positive insight for the day",
  "watchOut": "1-2 sentences about something to be mindful of today",
  "dailyFun": "1 sentence that's funny, quirky, or uplifting — like a fortune cookie with personality",
  "triggeredModules": [
    {
      "type": "romance|career|conflict|lunar|transit",
      "title": "Short catchy title (2-4 words)",
      "message": "1-2 sentences of personalized advice",
      "phase": "only if type is lunar — e.g. 'Waxing Crescent'",
      "planet": "only if type is transit — e.g. 'Mercury'"
    }
  ],
  "dailyWord": {
    "language": "the user's chosen language",
    "word": "a beautiful/useful word in that language",
    "translation": "english meaning",
    "pronunciation": "phonetic guide"
  }
}

Rules:
- triggeredModules: include 1-2 modules. Pick types relevant to the user's life focus and situation.
- For "lunar" type modules, always include "phase". For "transit" type, always include "planet".
- For other module types (romance, career, conflict), do NOT include "phase" or "planet".
- dailyWord: only include if the user has a language preference that is not "None". Pick a word that connects to the day's theme.
- Make content feel personal using the user's name, life situation, and preferences.
- Vary the lucky colour creatively — don't repeat common colours.
- The dailyFun should genuinely make someone smile.
- Do NOT be generic. Reference specific details from the user's profile.
- Keep each field concise — this is read in a Telegram chat.`
}

function buildUserPrompt(profile: UserProfile, date: string): string {
  const parts = [
    `Generate a CheckCheck daily reading for ${date}.`,
    '',
    'User profile:',
    `- Name: ${profile.nickname || profile.legalName}`,
    `- Date of birth: ${profile.dateOfBirth}`,
    `- Birth time: ${profile.birthTime}`,
    `- Birth city: ${profile.birthCity}`,
    `- Gender: ${profile.gender}`,
    `- Timezone: ${profile.timezone}`,
  ]

  if (profile.relationshipStatus) {
    parts.push(`- Relationship: ${profile.relationshipStatus}`)
  }
  if (profile.lifeFocus) {
    parts.push(`- Life focus: ${profile.lifeFocus}`)
  }
  if (profile.currentCity) {
    parts.push(`- Currently living in: ${profile.currentCity}`)
  }
  if (profile.languagePreference && profile.languagePreference !== 'None') {
    parts.push(`- Learning language: ${profile.languagePreference}`)
  } else {
    parts.push('- Language preference: None (skip dailyWord)')
  }

  parts.push('', 'Respond with JSON only. No markdown, no code fences, no explanation.')

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

  return {
    date,
    nickname: profile.nickname || profile.legalName,
    luckyColour: {
      name: String(luckyColour?.name ?? 'Ocean Blue'),
      hex: String(luckyColour?.hex ?? '#0077B6'),
    },
    dailyLuck: String(parsed.dailyLuck ?? ''),
    watchOut: String(parsed.watchOut ?? ''),
    dailyFun: String(parsed.dailyFun ?? ''),
    triggeredModules: parseModules(parsed.triggeredModules as unknown[]),
    dailyWord: hasLanguage ? parseDailyWord(parsed.dailyWord, profile.languagePreference) : undefined,
  }
}

export async function generateDailyMessage(profile: UserProfile, date: string): Promise<DailyMessage> {
  try {
    const response = await chatCompletion([
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(profile, date) },
    ])

    return parseLlmResponse(response, profile, date)
  } catch (error) {
    console.error('LLM generation failed, falling back to mock:', error)
    return generateMockMessage(profile, date)
  }
}
