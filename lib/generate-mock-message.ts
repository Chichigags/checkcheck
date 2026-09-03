import type { AppLanguage, UserProfile } from './profile'
import { normalizeAppLanguage } from './i18n'

export type MessageFormat =
  | 'keyword'
  | 'do_dont'
  | 'one_line'
  | 'time_of_day'
  | 'main_watch'
  | 'one_thing'
  | 'one_avoid'
  | 'workday'
  | 'weekend'
  | 'social_energy'
  | 'start_pause_finish'

export type ModuleType =
  | 'keyword'
  | 'worth_doing'
  | 'not_to_do'
  | 'do_dont'
  | 'work'
  | 'relationship'
  | 'social'
  | 'spending'
  | 'emotional'
  | 'social_vs_solo'
  | 'action_mode'
  | 'best_window'
  | 'hard_window'
  | 'what_to_wear'
  | 'what_to_eat'
  | 'one_sentence'
  | 'small_challenge'

export interface DailyModule {
  type: ModuleType
  title: string
  message: string
}

export interface DailyMessage {
  date: string
  nickname: string
  language: AppLanguage
  format: MessageFormat
  /** Opening line / today’s framing */
  headline: string
  /** Optional short supporting paragraph */
  body?: string
  modules: DailyModule[]
  luckyColour: {
    name: string
    hex: string
  }
  luckyNumber: number[]
  /** True when the chart has no strong signal */
  isNeutralDay?: boolean
  /** Categories used (for anti-repetition) */
  focusTopics?: string[]

  // ── Legacy fields (older stored payloads / old formatter) ──
  todayVibe?: string
  dailyLuck?: string
  watchOut?: string
  dailyFun?: string
  dailyInspiration?: string
  dailyWord?: unknown
  triggeredModules?: Array<{ type: string; title: string; message: string; phase?: string; planet?: string }>
}

function createSeed(dateStr: string, dob: string): number {
  const dateNum = dateStr.split('-').join('')
  const dobNum = dob.split('-').join('')
  let seed = 0
  for (let i = 0; i < dateNum.length; i++) {
    seed = ((seed << 5) - seed) + dateNum.charCodeAt(i)
    seed = seed & seed
  }
  for (let i = 0; i < dobNum.length; i++) {
    seed = ((seed << 5) - seed) + dobNum.charCodeAt(i)
    seed = seed & seed
  }
  return Math.abs(seed)
}

function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index) * 10000
  return x - Math.floor(x)
}

const luckyColours = [
  { name: 'Sage Green', hex: '#9CAF88' },
  { name: 'Coral', hex: '#FF7F7F' },
  { name: 'Ocean Blue', hex: '#0077B6' },
  { name: 'Golden Yellow', hex: '#FFD700' },
  { name: 'Lavender', hex: '#E6E6FA' },
  { name: 'Clay', hex: '#C4A484' },
  { name: 'Ink', hex: '#2C3E50' },
]

const FORMATS: MessageFormat[] = [
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

/** Fallback when LLM is unavailable — still BaZi-agnostic but honest about being steady */
export function generateMockMessage(profile: UserProfile, customDate?: string): DailyMessage {
  const dateToUse = customDate || new Date().toISOString().split('T')[0]
  const seed = createSeed(dateToUse, profile.dateOfBirth)
  const language = normalizeAppLanguage(profile.languagePreference)
  const colourIndex = Math.floor(seededRandom(seed, 0) * luckyColours.length)
  const format = FORMATS[Math.floor(seededRandom(seed, 1) * FORMATS.length)]
  const num1 = Math.floor(seededRandom(seed, 22) * 99) + 1
  const num2 = Math.floor(seededRandom(seed, 23) * 99) + 1
  const zh = language === '中文'
  const name = profile.nickname || profile.legalName

  const headline = zh
    ? `${name}，今天整体偏平稳，没有特别强的信号。`
    : `${name}, today looks fairly steady — no especially strong signal.`

  const body = zh
    ? '与其硬推大事，不如把日常节奏走稳。下面是基于你八字与今日干支的温和提醒。'
    : 'Normal progress may work better than forcing a big move. Here are gentle reminders grounded in your chart and today’s stems/branches.'

  const modules: DailyModule[] = [
    {
      type: 'action_mode',
      title: zh ? '今日节奏' : 'Today’s pace',
      message: zh
        ? '更适合观察与收尾，而不是贸然开新局。'
        : 'Better for observing and finishing than starting something brand new.',
    },
    {
      type: 'one_sentence',
      title: zh ? '一句话' : 'One line to keep',
      message: zh ? '稳一点，比用力一点更对。' : 'Steady beats forced today.',
    },
  ]

  return {
    date: dateToUse,
    nickname: name,
    language,
    format,
    headline,
    body,
    modules,
    luckyColour: luckyColours[colourIndex],
    luckyNumber: [num1, num2 === num1 ? ((num2 % 99) + 1) : num2],
    isNeutralDay: true,
    focusTopics: ['steady', 'observe'],
    todayVibe: headline,
  }
}

export const languageFlags: Record<string, string> = {
  English: '🇬🇧',
  中文: '🇨🇳',
}
