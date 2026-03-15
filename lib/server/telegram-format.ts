import type { QuestionConfig } from '@/lib/profile'
import { DELIVERY_TIME_LABELS } from '@/lib/profile'
import type { DailyMessage } from '@/lib/generate-mock-message'
import type { DailyMessageRecord, ProfileRecord } from './types'

export const COMMAND_HELP = [
  'Available commands:',
  '/start - Begin or continue onboarding',
  '/today - Get today\'s CheckCheck',
  '/regenerate - Generate a fresh CheckCheck for today',
  '/history - Last 7 daily messages',
  '/settings - View your current profile',
  '/pause [days] - Pause for 1-30 days',
  '/resume - Resume daily sends',
  '/edit [field] - Update one field',
  '/timezone [tz] - Update timezone',
  '/language [lang] - Set word-of-the-day language',
  '/feedback [text] - Send feedback',
  '/stop - Stop automatic daily messages',
  '/help - Show this list',
  '',
  'Editable fields: nickname, name, birthday, birthtime, birthcity, city, gender, delivery, timezone, language, relationship, focus, inspiration',
].join('\n')

export function formatQuestionPrompt(question: QuestionConfig, step: number, total: number): string {
  const lines = [`(${step + 1}/${total}) ${question.question}`]

  if (question.type === 'select' && question.options && question.options.length > 0) {
    lines.push('', `Options: ${question.options.join(' / ')}`)
  }
  if (question.type === 'birthTime' && question.options) {
    lines.push('', `Or pick: ${question.options.join(' / ')}`)
  }
  if (question.type === 'language' && question.options) {
    lines.push('', `Options: ${question.options.join(' / ')}`)
  }
  if (question.type === 'timezone') {
    lines.push('', 'Example: America/New_York')
  }
  if (question.shortcutLabel) {
    lines.push('', `Or reply "${question.shortcutLabel}" if same as birth city`)
  }
  return lines.join('\n')
}

export function formatDailyMessage(message: DailyMessage): string {
  const lines = [
    `✅✅ CheckCheck for ${message.nickname} (${message.date})`,
    '',
    `🎨 Lucky Colour: ${message.luckyColour.name} (${message.luckyColour.hex})`,
    `🍀 Daily Luck: ${message.dailyLuck}`,
    `⚠️ Watch Out: ${message.watchOut}`,
    `😄 Daily Fun: ${message.dailyFun}`,
  ]

  if (message.dailyInspiration) {
    lines.push('', `💬 Daily Inspiration: ${message.dailyInspiration}`)
  }

  if (message.triggeredModules.length > 0) {
    lines.push('')
    message.triggeredModules.forEach((module) => {
      if (module.type === 'lunar') {
        lines.push(`🌙 ${module.title} [${module.phase}]: ${module.message}`)
      } else if (module.type === 'transit') {
        lines.push(`🪐 ${module.title} [${module.planet}]: ${module.message}`)
      } else if (module.type === 'romance') {
        lines.push(`💕 ${module.title}: ${module.message}`)
      } else if (module.type === 'career') {
        lines.push(`💼 ${module.title}: ${module.message}`)
      } else {
        lines.push(`⚡ ${module.title}: ${module.message}`)
      }
    })
  }

  if (message.dailyWord) {
    lines.push(
      '',
      `📖 Word of the Day (${message.dailyWord.language}): ${message.dailyWord.word}`,
    )
    if (message.dailyWord.pronunciation) {
      lines.push(`Pronunciation: /${message.dailyWord.pronunciation}/`)
    }
    lines.push(`Meaning: ${message.dailyWord.translation}`)
  }

  return lines.join('\n')
}

export function formatSettings(profile: ProfileRecord): string {
  const deliveryLabel = profile.delivery_time
    ? DELIVERY_TIME_LABELS[profile.delivery_time as keyof typeof DELIVERY_TIME_LABELS] ?? profile.delivery_time
    : 'Not set'

  const entries = [
    `Name: ${profile.legal_name ?? 'Not set'}`,
    `Nickname: ${profile.nickname ?? 'Not set'}`,
    `Birthday: ${profile.date_of_birth ?? 'Not set'}`,
    `Birth Time: ${profile.birth_time ?? 'Not set'}`,
    `Birth City: ${profile.birth_city ?? 'Not set'}`,
    `Gender: ${profile.gender ?? 'Not set'}`,
    `Current City: ${profile.current_city ?? 'Not set'}`,
    `Delivery Time: ${deliveryLabel}`,
    `Timezone: ${profile.timezone || 'UTC'}`,
    `Daily Inspiration: ${profile.daily_inspiration ? 'On' : 'Off'}`,
    `Language: ${profile.language_preference || 'None'}`,
    `Relationship: ${profile.relationship_status ?? 'Not set'}`,
    `Life Focus: ${profile.life_focus ?? 'Not set'}`,
    `Onboarding: ${profile.onboarding_complete ? 'Complete' : 'In progress'}`,
    `Status: ${profile.status}`,
  ]

  if (profile.paused_until) {
    entries.push(`Paused Until: ${profile.paused_until}`)
  }

  return ['Your profile:', ...entries.map((entry) => `- ${entry}`)].join('\n')
}

export function formatHistory(records: DailyMessageRecord[]): string {
  if (records.length === 0) {
    return 'No history yet. Use /today first, and daily messages will show up here.'
  }

  const lines = ['Recent history:']
  records.forEach((record) => {
    const payload = record.payload as Partial<DailyMessage> | null
    lines.push(`- ${record.message_date}: ${payload?.dailyLuck ?? 'Message available'}`)
  })
  return lines.join('\n')
}
