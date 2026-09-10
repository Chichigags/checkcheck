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

function paragraphsFromMessage(message: DailyMessage): string[] {
  if (message.paragraphs && message.paragraphs.length > 0) {
    return message.paragraphs.filter(Boolean).slice(0, 3)
  }

  const collected: string[] = []
  if (message.body) {
    collected.push(...message.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean))
  }
  for (const module of message.modules ?? []) {
    if (module.message.trim()) collected.push(module.message.trim())
  }
  if (collected.length > 0) return collected.slice(0, 3)
  return [message.dailyLuck, message.watchOut].filter((p): p is string => Boolean(p)).slice(0, 3)
}

export function formatLuckyFooter(message: DailyMessage): string {
  const lang = normalizeAppLanguage(message.language)
  const numbers = Array.isArray(message.luckyNumber) ? message.luckyNumber : [7, 23]
  const numberText = isChinese(lang) ? numbers.join('、') : numbers.join(', ')
  const sep = isChinese(lang) ? '：' : ': '
  return [
    `🎨 ${t.luckyColour(lang)}${sep}${message.luckyColour.name}`,
    `🔢 ${t.luckyNumber(lang)}${sep}${numberText}`,
  ].join('\n')
}

export function formatDailyMessage(message: DailyMessage): string {
  const lang = normalizeAppLanguage(message.language)
  const takeaway = (message.headline || message.todayVibe || '').trim()
  const dateLabel = t.formatDailyDate(message.date, lang)
  const sep = isChinese(lang) ? '｜' : ' | '
  const headline = takeaway ? `${dateLabel}${sep}${takeaway}` : dateLabel
  const paragraphs = paragraphsFromMessage(message)

  const lines = [headline]
  for (const paragraph of paragraphs) {
    lines.push('', paragraph)
  }
  lines.push('', formatLuckyFooter(message))
  return lines.join('\n')
}

function displayGender(value: string | null, zh: boolean): string {
  if (!value) return zh ? '未设置' : 'Not set'
  const zhMap: Record<string, string> = {
    Male: '男',
    Female: '女',
    'Non-binary': '非二元性别',
    'Prefer not to say': '不愿透露',
  }
  const enMap: Record<string, string> = {
    '男': 'Male',
    '女': 'Female',
    '非二元性别': 'Non-binary',
    '不愿透露': 'Prefer not to say',
  }
  return zh ? (zhMap[value] ?? value) : (enMap[value] ?? value)
}

function displayLanguage(value: string | null, zh: boolean): string {
  const normalized = normalizeAppLanguage(value)
  if (zh) return normalized === '中文' ? '中文' : '英文'
  return normalized === '中文' ? 'Chinese' : 'English'
}

export function formatSettings(profile: ProfileRecord): string {
  const lang = normalizeAppLanguage(profile.language_preference)
  const zh = isChinese(lang)
  const unset = zh ? '未设置' : 'Not set'
  const deliveryLabel = profile.delivery_time
    ? DELIVERY_TIME_LABELS[profile.delivery_time as keyof typeof DELIVERY_TIME_LABELS] ?? profile.delivery_time
    : unset

  if (zh) {
    const entries = [
      `称呼：${profile.nickname ?? unset}`,
      `生日：${profile.date_of_birth ?? unset}`,
      `出生时间：${profile.birth_time ?? unset}`,
      `出生地：${profile.birth_city ?? unset}`,
      `性别：${displayGender(profile.gender, true)}`,
      `当前城市：${profile.current_city ?? unset}`,
      `推送时间：${deliveryLabel}`,
      `语言：${displayLanguage(profile.language_preference, true)}`,
    ]
    if (profile.paused_until) entries.push(`暂停至：${profile.paused_until}`)
    return ['你的资料：', ...entries.map((entry) => `- ${entry}`)].join('\n')
  }

  const entries = [
    `Name: ${profile.nickname ?? unset}`,
    `Birthday: ${profile.date_of_birth ?? unset}`,
    `Birth Time: ${profile.birth_time ?? unset}`,
    `Birth City: ${profile.birth_city ?? unset}`,
    `Gender: ${displayGender(profile.gender, false)}`,
    `Current City: ${profile.current_city ?? unset}`,
    `Send time: ${deliveryLabel}`,
    `Language: ${displayLanguage(profile.language_preference, false)}`,
  ]

  if (profile.paused_until) {
    entries.push(`Paused until: ${profile.paused_until}`)
  }

  return ['Your profile:', ...entries.map((entry) => `- ${entry}`)].join('\n')
}

export function getSettingsEditKeyboard(lang: ReturnType<typeof normalizeAppLanguage>) {
  const zh = isChinese(lang)
  const buttons = zh
    ? [
        { text: '✏️ 称呼', callback_data: 'edit:nickname' },
        { text: '✏️ 生日', callback_data: 'edit:birthday' },
        { text: '✏️ 出生时间', callback_data: 'edit:birthtime' },
        { text: '✏️ 出生地', callback_data: 'edit:birthcity' },
        { text: '✏️ 性别', callback_data: 'edit:gender' },
        { text: '✏️ 当前城市', callback_data: 'edit:city' },
        { text: '✏️ 推送时间', callback_data: 'edit:delivery' },
        { text: '✏️ 语言', callback_data: 'edit:language' },
        { text: '🔄 重新设置资料', callback_data: 'reset:profile' },
      ]
    : [
        { text: '✏️ Name', callback_data: 'edit:nickname' },
        { text: '✏️ Birthday', callback_data: 'edit:birthday' },
        { text: '✏️ Birth Time', callback_data: 'edit:birthtime' },
        { text: '✏️ Birth City', callback_data: 'edit:birthcity' },
        { text: '✏️ Gender', callback_data: 'edit:gender' },
        { text: '✏️ Current City', callback_data: 'edit:city' },
        { text: '✏️ Send time', callback_data: 'edit:delivery' },
        { text: '✏️ Language', callback_data: 'edit:language' },
        { text: '🔄 Reset Profile', callback_data: 'reset:profile' },
      ]

  return {
    inline_keyboard: [
      buttons.slice(0, 3),
      buttons.slice(3, 6),
      buttons.slice(6, 9),
    ],
  }
}

export function settingsFieldLabel(field: string, lang: ReturnType<typeof normalizeAppLanguage>): string {
  const zh = isChinese(lang)
  const labels: Record<string, [string, string]> = {
    nickname: ['Name', '称呼'],
    name: ['Name', '称呼'],
    birthday: ['Birthday', '生日'],
    dateOfBirth: ['Birthday', '生日'],
    birthtime: ['Birth Time', '出生时间'],
    birthTime: ['Birth Time', '出生时间'],
    birthcity: ['Birth City', '出生地'],
    birthCity: ['Birth City', '出生地'],
    city: ['Current City', '当前城市'],
    currentCity: ['Current City', '当前城市'],
    gender: ['Gender', '性别'],
    delivery: ['Send time', '推送时间'],
    deliveryTime: ['Send time', '推送时间'],
    timezone: ['Timezone', '时区'],
    language: ['Language', '语言'],
    languagePreference: ['Language', '语言'],
  }
  const pair = labels[field]
  if (!pair) return field
  return zh ? pair[1] : pair[0]
}

export function formatEditPrompt(lang: ReturnType<typeof normalizeAppLanguage>, field: string, currentValue: unknown): string {
  const label = settingsFieldLabel(field, lang)
  const zh = isChinese(lang)
  const value = currentValue == null || currentValue === '' ? (zh ? '未设置' : 'Not set') : String(currentValue)
  const lines = zh
    ? [`当前${label}：${value}`, '请发送新的值。']
    : [`Current ${label}: ${value}`, 'Send the new value now.']

  const options: Record<string, [string, string]> = {
    gender: ['Male / Female / Non-binary / Prefer not to say', '男 / 女 / 非二元性别 / 不愿透露'],
    language: ['English / 中文', 'English / 中文'],
    delivery: ['Morning (8:00 AM) / Afternoon (12:00 PM) / Evening (7:00 PM)', '早上（8:00）/ 中午（12:00）/ 晚上（19:00）'],
    birthtime: ['HH:MM, or Morning / Noon / Afternoon / Evening / Night', 'HH:MM，或 早晨 / 中午 / 下午 / 晚上 / 深夜'],
  }
  const optionLine = options[field]
  if (optionLine) {
    lines.push(zh ? `选项：${optionLine[1]}` : `Options: ${optionLine[0]}`)
  }

  return lines.join('\n')
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
