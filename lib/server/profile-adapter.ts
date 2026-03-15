import type { DeliveryTime, Language, UserProfile } from '@/lib/profile'
import type { ProfileRecord } from './types'

const PROFILE_KEY_TO_COLUMN: Record<keyof UserProfile, keyof ProfileRecord> = {
  legalName: 'legal_name',
  nickname: 'nickname',
  dateOfBirth: 'date_of_birth',
  birthTime: 'birth_time',
  birthCity: 'birth_city',
  gender: 'gender',
  deliveryTime: 'delivery_time',
  timezone: 'timezone',
  languagePreference: 'language_preference',
  relationshipStatus: 'relationship_status',
  lifeFocus: 'life_focus',
  currentCity: 'current_city',
  hasCompletedLayer2: 'layer2_complete',
}

export function profileFieldToColumn(field: keyof UserProfile): keyof ProfileRecord {
  return PROFILE_KEY_TO_COLUMN[field]
}

export function buildProfilePatch(field: keyof UserProfile, value: string | boolean): Partial<ProfileRecord> {
  const column = profileFieldToColumn(field)
  return { [column]: value } as Partial<ProfileRecord>
}

function asDeliveryTime(value: string | null): DeliveryTime {
  if (value === 'Morning' || value === 'Afternoon' || value === 'Evening') {
    return value
  }
  return 'Morning'
}

function asLanguage(value: string | null): Language {
  if (value === 'German' || value === 'Mandarin' || value === 'Japanese' || value === 'Spanish' || value === 'French' || value === 'None') {
    return value
  }
  return 'None'
}

export function toUserProfile(record: ProfileRecord): UserProfile {
  return {
    legalName: record.legal_name ?? 'Unknown',
    nickname: record.nickname ?? record.telegram_username ?? 'friend',
    dateOfBirth: record.date_of_birth ?? '1990-01-01',
    birthTime: record.birth_time ?? 'Unknown',
    birthCity: record.birth_city ?? 'Unknown',
    gender: (record.gender as UserProfile['gender']) ?? 'Prefer not to say',
    deliveryTime: asDeliveryTime(record.delivery_time),
    timezone: record.timezone || 'UTC',
    languagePreference: asLanguage(record.language_preference),
    relationshipStatus: (record.relationship_status as UserProfile['relationshipStatus']) ?? undefined,
    lifeFocus: (record.life_focus as UserProfile['lifeFocus']) ?? undefined,
    currentCity: record.current_city ?? undefined,
    hasCompletedLayer2: record.layer2_complete,
  }
}
