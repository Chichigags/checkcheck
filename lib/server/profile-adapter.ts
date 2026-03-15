import type { DeliveryTime, Language, UserProfile } from '@/lib/profile'
import type { ProfileRecord } from './types'

const PROFILE_KEY_TO_COLUMN: Record<keyof UserProfile, keyof ProfileRecord> = {
  legalName: 'legal_name',
  nickname: 'nickname',
  dateOfBirth: 'date_of_birth',
  birthTime: 'birth_time',
  birthCity: 'birth_city',
  gender: 'gender',
  currentCity: 'current_city',
  deliveryTime: 'delivery_time',
  timezone: 'timezone',
  dailyInspiration: 'daily_inspiration',
  languagePreference: 'language_preference',
  relationshipStatus: 'relationship_status',
  lifeFocus: 'life_focus',
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
    currentCity: record.current_city ?? undefined as unknown as string,
    deliveryTime: asDeliveryTime(record.delivery_time),
    timezone: record.timezone || 'UTC',
    dailyInspiration: record.daily_inspiration ?? false,
    languagePreference: asLanguage(record.language_preference),
    relationshipStatus: (record.relationship_status as UserProfile['relationshipStatus']) ?? undefined,
    lifeFocus: (record.life_focus as UserProfile['lifeFocus']) ?? undefined,
    hasCompletedLayer2: record.layer2_complete,
  }
}

const COUNTRY_TO_TIMEZONE: Record<string, string> = {
  'china': 'Asia/Shanghai',
  'hong kong': 'Asia/Hong_Kong',
  'taiwan': 'Asia/Taipei',
  'japan': 'Asia/Tokyo',
  'south korea': 'Asia/Seoul',
  'korea': 'Asia/Seoul',
  'singapore': 'Asia/Singapore',
  'malaysia': 'Asia/Kuala_Lumpur',
  'thailand': 'Asia/Bangkok',
  'vietnam': 'Asia/Ho_Chi_Minh',
  'philippines': 'Asia/Manila',
  'indonesia': 'Asia/Jakarta',
  'india': 'Asia/Kolkata',
  'australia': 'Australia/Sydney',
  'new zealand': 'Pacific/Auckland',
  'united states': 'America/New_York',
  'usa': 'America/New_York',
  'us': 'America/New_York',
  'canada': 'America/Toronto',
  'united kingdom': 'Europe/London',
  'uk': 'Europe/London',
  'england': 'Europe/London',
  'germany': 'Europe/Berlin',
  'france': 'Europe/Paris',
  'italy': 'Europe/Rome',
  'spain': 'Europe/Madrid',
  'portugal': 'Europe/Lisbon',
  'netherlands': 'Europe/Amsterdam',
  'belgium': 'Europe/Brussels',
  'switzerland': 'Europe/Zurich',
  'austria': 'Europe/Vienna',
  'sweden': 'Europe/Stockholm',
  'norway': 'Europe/Oslo',
  'denmark': 'Europe/Copenhagen',
  'finland': 'Europe/Helsinki',
  'poland': 'Europe/Warsaw',
  'czech republic': 'Europe/Prague',
  'czechia': 'Europe/Prague',
  'hungary': 'Europe/Budapest',
  'greece': 'Europe/Athens',
  'turkey': 'Europe/Istanbul',
  'russia': 'Europe/Moscow',
  'brazil': 'America/Sao_Paulo',
  'argentina': 'America/Argentina/Buenos_Aires',
  'mexico': 'America/Mexico_City',
  'colombia': 'America/Bogota',
  'chile': 'America/Santiago',
  'peru': 'America/Lima',
  'uae': 'Asia/Dubai',
  'united arab emirates': 'Asia/Dubai',
  'dubai': 'Asia/Dubai',
  'saudi arabia': 'Asia/Riyadh',
  'israel': 'Asia/Jerusalem',
  'south africa': 'Africa/Johannesburg',
  'egypt': 'Africa/Cairo',
  'nigeria': 'Africa/Lagos',
  'kenya': 'Africa/Nairobi',
  'pakistan': 'Asia/Karachi',
  'bangladesh': 'Asia/Dhaka',
  'sri lanka': 'Asia/Colombo',
  'myanmar': 'Asia/Yangon',
  'cambodia': 'Asia/Phnom_Penh',
  'laos': 'Asia/Vientiane',
  'nepal': 'Asia/Kathmandu',
  'iran': 'Asia/Tehran',
  'iraq': 'Asia/Baghdad',
  'qatar': 'Asia/Qatar',
  'kuwait': 'Asia/Kuwait',
  'bahrain': 'Asia/Bahrain',
  'oman': 'Asia/Muscat',
  'jordan': 'Asia/Amman',
  'lebanon': 'Asia/Beirut',
  'ireland': 'Europe/Dublin',
  'scotland': 'Europe/London',
  'wales': 'Europe/London',
  'romania': 'Europe/Bucharest',
  'bulgaria': 'Europe/Sofia',
  'croatia': 'Europe/Zagreb',
  'serbia': 'Europe/Belgrade',
  'ukraine': 'Europe/Kyiv',
  'iceland': 'Atlantic/Reykjavik',
  'luxembourg': 'Europe/Luxembourg',
  'monaco': 'Europe/Monaco',
  'morocco': 'Africa/Casablanca',
  'tunisia': 'Africa/Tunis',
  'ghana': 'Africa/Accra',
  'ethiopia': 'Africa/Addis_Ababa',
  'tanzania': 'Africa/Dar_es_Salaam',
}

/**
 * Extracts timezone from a "City, Country" string by matching the country portion.
 * Returns null if no match found (caller should default to UTC or ask user).
 */
export function inferTimezoneFromCity(cityCountry: string): string | null {
  const parts = cityCountry.split(',')
  if (parts.length < 2) return null

  const country = parts[parts.length - 1].trim().toLowerCase()
  return COUNTRY_TO_TIMEZONE[country] ?? null
}
