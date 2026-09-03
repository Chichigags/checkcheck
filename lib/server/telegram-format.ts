import type { QuestionConfig } from '@/lib/profile'
import { DELIVERY_TIME_LABELS } from '@/lib/profile'
import type { DailyMessage } from '@/lib/generate-mock-message'
import { t, normalizeAppLanguage, isChinese } from '@/lib/i18n'
import type { DailyMessageRecord, ProfileRecord } from './types'

export function formatQuestionPrompt(question: QuestionConfig, step: number, total: number): string {
  const lines = [`(${step + 1}/${total}) ${question.question}`]

  if ((question.type === 'select' || question.type === 'language') && question.options && question.options.length > 0) {
    lines.push('', `Options: ${question.options.join(' / ')}`)
  }
  if (question.type === 'birthTime' && question.options) {
    lines.push('', question.options.join(' / '))
  }
  if (question.type === 'timezone') {
    lines.push('', 'Example: America/New_York')
  }
  if (question.shortcutLabel) {
    lines.push('', `Or reply "${question.shortcutLabel}" if same as birth city`)
  }
  return lines.join('\n')
}

const MODULE_EMOJI: Record<string, string> = {
  keyword: '🔑',
  worth_doing: '✅',
  not_to_do: '🚫',
  do_dont: '⚖️',
  work: '💼',
  relationship: '💞',
  social: '👋',
  spending: '💸',
  emotional: '🫧',
  social_vs_solo: '🧍',
  action_mode: '🧭',
  best_window: '☀️',
  hard_window: '⛈️',
  what_to_wear: '👗',
  what_to_eat: '🍜',
  one_sentence: '📝',
  small_challenge: '🎯',
  lunar: '🌙',
  transit: '🪐',
  romance: '💕',
  career: '💼',
  conflict: '⚡',
}

export function formatDailyMessage(message: DailyMessage): string {
  const lang = normalizeAppLanguage(message.language)

  // New schema
  if (message.headline || (message.modules && message.modules.length > 0)) {
    const lines = [`💫 ${message.headline || message.todayVibe || ''}`]
    if (message.body) {
      lines.push('', message.body)
    }

    for (const module of message.modules ?? []) {
      const emoji = MODULE_EMOJI[module.type] ?? '•'
      lines.push('', `${emoji} ${module.title}`, module.message)
    }

    lines.push('', t.haveAGreatDay(lang))
    return lines.join('\n')
  }

  // Legacy schema fallback
  const vibe = message.todayVibe || 'Go with the flow today.'
  const lines = [
    `💫 "${vibe}"`,
    '',
    `🍀 Daily Luck: ${message.dailyLuck ?? ''}`,
    '',
    `⚠️ Watch Out: ${message.watchOut ?? ''}`,
    '',
    `😄 Daily Fun: ${message.dailyFun ?? ''}`,
  ]

  if (message.dailyInspiration) {
    lines.push('', `💬 Daily Inspiration: ${message.dailyInspiration}`)
  }

  if (message.triggeredModules && message.triggeredModules.length > 0) {
    message.triggeredModules.forEach((module) => {
      lines.push('')
      const emoji = MODULE_EMOJI[module.type] ?? '⚡'
      if (module.type === 'lunar') {
        lines.push(`${emoji} ${module.title} · ${module.phase}`)
      } else if (module.type === 'transit') {
        lines.push(`${emoji} ${module.title} · ${module.planet}`)
      } else {
        lines.push(`${emoji} ${module.title}`)
      }
      lines.push(module.message)
    })
  }

  lines.push('', t.haveAGreatDay(lang))
  return lines.join('\n')
}

export function formatSettings(profile: ProfileRecord): string {
  const lang = normalizeAppLanguage(profile.language_preference)
  const deliveryLabel = profile.delivery_time
    ? DELIVERY_TIME_LABELS[profile.delivery_time as keyof typeof DELIVERY_TIME_LABELS] ?? profile.delivery_time
    : 'Not set'

  if (isChinese(lang)) {
    const entries = [
      `称呼: ${profile.nickname ?? '未设置'}`,
      `生日: ${profile.date_of_birth ?? '未设置'}`,
      `出生时间: ${profile.birth_time ?? '未设置'}`,
      `出生地: ${profile.birth_city ?? '未设置'}`,
      `性别: ${profile.gender ?? '未设置'}`,
      `当前城市: ${profile.current_city ?? '未设置'}`,
      `推送时段: ${deliveryLabel}`,
      `时区: ${profile.timezone || 'UTC'}`,
      `语言: ${profile.language_preference || 'English'}`,
      `设置完成: ${profile.onboarding_complete ? '是' : '进行中'}`,
      `状态: ${profile.status}`,
    ]
    if (profile.paused_until) entries.push(`暂停至: ${profile.paused_until}`)
    return ['你的资料：', ...entries.map((entry) => `- ${entry}`)].join('\n')
  }

  const entries = [
    `Name: ${profile.nickname ?? 'Not set'}`,
    `Birthday: ${profile.date_of_birth ?? 'Not set'}`,
    `Birth Time: ${profile.birth_time ?? 'Not set'}`,
    `Birth City: ${profile.birth_city ?? 'Not set'}`,
    `Gender: ${profile.gender ?? 'Not set'}`,
    `Current City: ${profile.current_city ?? 'Not set'}`,
    `Delivery Time: ${deliveryLabel}`,
    `Timezone: ${profile.timezone || 'UTC'}`,
    `Language: ${profile.language_preference || 'English'}`,
    `Onboarding: ${profile.onboarding_complete ? 'Complete' : 'In progress'}`,
    `Status: ${profile.status}`,
  ]

  if (profile.paused_until) {
    entries.push(`Paused Until: ${profile.paused_until}`)
  }

  return ['Your profile:', ...entries.map((entry) => `- ${entry}`)].join('\n')
}

export const EDIT_BUTTONS: Array<{ text: string; callback_data: string }> = [
  { text: '✏️ Name', callback_data: 'edit:nickname' },
  { text: '✏️ Birthday', callback_data: 'edit:birthday' },
  { text: '✏️ Birth Time', callback_data: 'edit:birthtime' },
  { text: '✏️ Birth City', callback_data: 'edit:birthcity' },
  { text: '✏️ City', callback_data: 'edit:city' },
  { text: '✏️ Gender', callback_data: 'edit:gender' },
  { text: '✏️ Delivery', callback_data: 'edit:delivery' },
  { text: '✏️ Timezone', callback_data: 'edit:timezone' },
  { text: '✏️ Language', callback_data: 'edit:language' },
]

export function getSettingsEditKeyboard() {
  return {
    inline_keyboard: [
      EDIT_BUTTONS.slice(0, 3),
      EDIT_BUTTONS.slice(3, 6),
      EDIT_BUTTONS.slice(6, 9),
    ],
  }
}

export function formatHistory(records: DailyMessageRecord[]): string {
  if (records.length === 0) {
    return 'No history yet. Use /today first, and daily messages will show up here.'
  }

  const lines = ['Recent history:']
  records.forEach((record) => {
    const payload = record.payload as Partial<DailyMessage> | null
    const preview = payload?.headline || payload?.todayVibe || payload?.dailyLuck || 'Message available'
    lines.push(`- ${record.message_date}: ${preview}`)
  })
  return lines.join('\n')
}

/** @deprecated Use t.help(lang) */
export const COMMAND_HELP = t.help('English')
