import 'server-only'
import { supabaseRestRequest as rest } from '../supabase-rest'
import type { Edition } from './content'
import type { ProfileRecord } from '../types'

export interface Subscription { profile_id: string; active: boolean; paused_until: string | null; timezone: string; delivery_time: string; next_delivery_at: string; interests: string; awaiting_interests: boolean }
export const newsRest = rest
export async function getSubscription(id: string): Promise<Subscription | null> {
  const rows = await rest<Subscription[]>({ path: '/rest/v1/news_subscriptions', query: { profile_id: `eq.${id}`, limit: 1 } })
  return rows[0] ?? null
}
export async function saveSubscription(id: string, patch: Partial<Subscription>): Promise<void> {
  await rest({ method: 'POST', path: '/rest/v1/news_subscriptions', query: { on_conflict: 'profile_id' }, prefer: 'resolution=merge-duplicates', body: { profile_id: id, ...patch } })
}
export async function getEdition(date: string): Promise<Edition | null> {
  const rows = await rest<Array<{ payload: Edition | null }>>({ path: '/rest/v1/news_editions', query: { edition_date: `eq.${date}`, status: 'in.(ready,empty)', limit: 1 } })
  return rows[0]?.payload ?? null
}
export async function recentEditions(): Promise<Edition[]> {
  const rows = await rest<Array<{ payload: Edition }>>({ path: '/rest/v1/news_editions', query: { status: 'eq.ready', order: 'edition_date.desc', limit: 14 } })
  return rows.map(r => r.payload)
}
export async function dueSubscriptions(now: Date, limit = 50): Promise<Array<Subscription & { profiles: ProfileRecord }>> {
  return rest({ path: '/rest/v1/news_subscriptions', query: { select: '*,profiles!inner(*)', active: 'eq.true', next_delivery_at: `lte.${now.toISOString()}`, or: `(paused_until.is.null,paused_until.lte.${now.toISOString()})`, order: 'next_delivery_at.asc', limit } })
}
