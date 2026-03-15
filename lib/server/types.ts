export type BotFlow = 'onboarding' | 'layer2' | 'idle'
export type ProfileStatus = 'active' | 'stopped'

export interface ProfileRecord {
  id: string
  auth_user_id: string | null
  telegram_user_id: number
  telegram_username: string | null
  legal_name: string | null
  nickname: string | null
  date_of_birth: string | null
  birth_time: string | null
  birth_city: string | null
  gender: string | null
  delivery_time: string | null
  timezone: string
  language_preference: string
  relationship_status: string | null
  life_focus: string | null
  current_city: string | null
  onboarding_complete: boolean
  layer2_complete: boolean
  paused_until: string | null
  status: ProfileStatus
  next_delivery_at: string | null
  created_at: string
  updated_at: string
}

export interface BotStateRecord {
  profile_id: string
  flow: BotFlow
  step: number
  awaiting_field: string | null
  last_command: string | null
  updated_at: string
}

export interface DailyMessageRecord {
  id: string
  profile_id: string
  message_date: string
  payload: unknown
  sent_at: string
}

export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
}

export interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}
