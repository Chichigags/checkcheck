import 'server-only'

import { SupabaseRestError, supabaseRestRequest } from './supabase-rest'
import type { BotFlow, BotStateRecord, DailyMessageRecord, ProfileRecord, TelegramUser } from './types'

const REST_BASE = '/rest/v1'

function tablePath(table: string): string {
  return `${REST_BASE}/${table}`
}

export async function recordTelegramUpdate(updateId: number): Promise<boolean> {
  try {
    await supabaseRestRequest<null>({
      method: 'POST',
      path: tablePath('telegram_updates'),
      prefer: 'return=minimal',
      body: { update_id: updateId },
    })
    return true
  } catch (error) {
    if (error instanceof SupabaseRestError && error.details?.code === '23505') {
      return false
    }
    throw error
  }
}

export async function getProfileByTelegramUserId(telegramUserId: number): Promise<ProfileRecord | null> {
  const rows = await supabaseRestRequest<ProfileRecord[]>({
    method: 'GET',
    path: tablePath('profiles'),
    query: {
      telegram_user_id: `eq.${telegramUserId}`,
      select: '*',
      limit: 1,
    },
  })
  return rows[0] ?? null
}

export async function upsertProfileFromTelegram(user: TelegramUser): Promise<ProfileRecord> {
  const existing = await getProfileByTelegramUserId(user.id)
  if (existing) {
    if (existing.telegram_username !== (user.username ?? null)) {
      return updateProfile(existing.id, { telegram_username: user.username ?? null })
    }
    return existing
  }

  const legalName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.first_name || null
  const rows = await supabaseRestRequest<ProfileRecord[]>({
    method: 'POST',
    path: tablePath('profiles'),
    query: { select: '*' },
    prefer: 'return=representation',
    body: {
      telegram_user_id: user.id,
      telegram_username: user.username ?? null,
      legal_name: legalName,
    },
  })
  return rows[0]
}

export async function updateProfile(profileId: string, patch: Partial<ProfileRecord>): Promise<ProfileRecord> {
  const rows = await supabaseRestRequest<ProfileRecord[]>({
    method: 'PATCH',
    path: tablePath('profiles'),
    query: {
      id: `eq.${profileId}`,
      select: '*',
    },
    prefer: 'return=representation',
    body: patch,
  })
  const updated = Array.isArray(rows) ? rows[0] : undefined
  if (!updated) {
    throw new Error(`Profile update returned no row for ${profileId}`)
  }
  return updated
}

export async function getBotState(profileId: string): Promise<BotStateRecord | null> {
  const rows = await supabaseRestRequest<BotStateRecord[]>({
    method: 'GET',
    path: tablePath('bot_state'),
    query: {
      profile_id: `eq.${profileId}`,
      select: '*',
      limit: 1,
    },
  })
  return rows[0] ?? null
}

export async function upsertBotState(profileId: string, patch: Partial<BotStateRecord>): Promise<BotStateRecord> {
  const rows = await supabaseRestRequest<BotStateRecord[]>({
    method: 'POST',
    path: tablePath('bot_state'),
    query: {
      on_conflict: 'profile_id',
      select: '*',
    },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      profile_id: profileId,
      ...patch,
    },
  })
  return rows[0]
}

export async function ensureBotState(profileId: string, defaultFlow: BotFlow = 'onboarding'): Promise<BotStateRecord> {
  const existing = await getBotState(profileId)
  if (existing) return existing
  return upsertBotState(profileId, {
    flow: defaultFlow,
    step: 0,
    awaiting_field: null,
    last_command: null,
  })
}

export async function getDailyMessage(profileId: string, date: string): Promise<DailyMessageRecord | null> {
  const rows = await supabaseRestRequest<DailyMessageRecord[]>({
    method: 'GET',
    path: tablePath('daily_messages'),
    query: {
      profile_id: `eq.${profileId}`,
      message_date: `eq.${date}`,
      select: '*',
      limit: 1,
    },
  })
  return rows[0] ?? null
}

export async function upsertDailyMessage(profileId: string, date: string, payload: unknown): Promise<DailyMessageRecord> {
  const rows = await supabaseRestRequest<DailyMessageRecord[]>({
    method: 'POST',
    path: tablePath('daily_messages'),
    query: {
      on_conflict: 'profile_id,message_date',
      select: '*',
    },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      profile_id: profileId,
      message_date: date,
      payload,
      sent_at: new Date().toISOString(),
    },
  })
  const row = Array.isArray(rows) ? rows[0] : undefined
  if (!row) {
    throw new Error(`daily_messages upsert returned no row for ${profileId} ${date}`)
  }
  return row
}

/**
 * Atomically claim today's message slot so concurrent /today or cron
 * calls cannot generate two different readings for the same day.
 * Returns 'won' if this caller should generate, 'exists' if another
 * row already holds the slot.
 */
export async function claimDailyMessageSlot(
  profileId: string,
  date: string
): Promise<'won' | 'exists'> {
  const rows = await supabaseRestRequest<DailyMessageRecord[]>({
    method: 'POST',
    path: tablePath('daily_messages'),
    query: {
      on_conflict: 'profile_id,message_date',
      select: '*',
    },
    prefer: 'resolution=ignore-duplicates,return=representation',
    body: {
      profile_id: profileId,
      message_date: date,
      payload: { status: 'generating' },
      sent_at: new Date().toISOString(),
    },
  })
  if (Array.isArray(rows) && rows.length > 0) return 'won'
  return 'exists'
}

export async function deleteDailyMessage(profileId: string, date: string): Promise<void> {
  await supabaseRestRequest<null>({
    method: 'DELETE',
    path: tablePath('daily_messages'),
    query: {
      profile_id: `eq.${profileId}`,
      message_date: `eq.${date}`,
    },
    prefer: 'return=minimal',
  })
}

export async function getRecentDailyMessages(profileId: string, limit = 7): Promise<DailyMessageRecord[]> {
  return supabaseRestRequest<DailyMessageRecord[]>({
    method: 'GET',
    path: tablePath('daily_messages'),
    query: {
      profile_id: `eq.${profileId}`,
      select: '*',
      order: 'message_date.desc',
      limit,
    },
  })
}

export async function insertFeedback(profileId: string | null, message: string): Promise<void> {
  await supabaseRestRequest<null>({
    method: 'POST',
    path: tablePath('feedback'),
    prefer: 'return=minimal',
    body: {
      profile_id: profileId,
      message,
    },
  })
}

export async function listDueProfiles(nowIso: string, limit = 200): Promise<ProfileRecord[]> {
  const rows = await supabaseRestRequest<ProfileRecord[]>({
    method: 'GET',
    path: tablePath('profiles'),
    query: {
      select: '*',
      status: 'eq.active',
      onboarding_complete: 'eq.true',
      next_delivery_at: `lte.${nowIso}`,
      order: 'next_delivery_at.asc',
      limit,
    },
  })

  const now = new Date(nowIso)
  return rows.filter((profile) => !profile.paused_until || new Date(profile.paused_until) <= now)
}
