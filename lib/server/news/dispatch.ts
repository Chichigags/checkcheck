import 'server-only'
import { editionDate, type Edition } from './content'
import { getEdition, dueSubscriptions, saveSubscription, newsRest } from './storage'
import { computeNextDeliveryAt, normalizeDeliveryTime, normalizeTimeZone } from '../schedule'
import { sendTelegramMessage } from '../telegram-client'

export async function sendEdition(chatId: number, edition: Edition): Promise<void> {
  for (const message of edition.messages) await sendTelegramMessage(chatId, message)
}
export async function dispatchNews(now = new Date()) {
  const deadline = Date.now() + 230_000
  const edition = await getEdition(editionDate(now))
  if (!edition) return { status: 'not_ready', sent: 0, failed: 0 }
  let due = await dueSubscriptions(now)
  const visited = new Set<string>()
  let scanned = 0
  let sent = 0, failed = 0, skipped = 0
  const errors: Array<{ profileId: string; error: string }> = []
  while (due.length) {
  for (const sub of due) {
    if (Date.now() > deadline - 30_000) break
    visited.add(sub.profile_id)
    scanned++
    try {
      if (edition.messages.length) {
        const claimed = await newsRest<boolean>({ method: 'POST', path: '/rest/v1/rpc/claim_news_delivery', body: { p_profile: sub.profile_id, p_date: edition.date } })
        if (claimed) {
          try {
            for (let i = 0; i < edition.messages.length; i++) {
              if (Date.now() > deadline) throw new Error('Dispatch time budget exceeded; partial delivery needs review')
              await sendTelegramMessage(sub.profiles.telegram_user_id, edition.messages[i])
              await newsRest({ method: 'PATCH', path: '/rest/v1/news_deliveries', query: { profile_id: `eq.${sub.profile_id}`, edition_date: `eq.${edition.date}` }, body: { next_part: i + 1, updated_at: new Date().toISOString() } })
            }
            await newsRest({ method: 'PATCH', path: '/rest/v1/news_deliveries', query: { profile_id: `eq.${sub.profile_id}`, edition_date: `eq.${edition.date}` }, body: { status: 'sent', updated_at: new Date().toISOString() } })
            sent++
          } catch (e) {
            await newsRest({ method: 'PATCH', path: '/rest/v1/news_deliveries', query: { profile_id: `eq.${sub.profile_id}`, edition_date: `eq.${edition.date}` }, body: { status: 'uncertain', updated_at: new Date().toISOString() } }).catch(() => {})
            throw e
          }
        } else skipped++
      } else skipped++
      await saveSubscription(sub.profile_id, { next_delivery_at: computeNextDeliveryAt(normalizeTimeZone(sub.timezone), normalizeDeliveryTime(sub.delivery_time), now) })
    } catch (e) {
      failed++
      errors.push({ profileId: sub.profile_id, error: e instanceof Error ? e.message : 'Dispatch failed' })
    }
  }
  if (Date.now() > deadline - 30_000 || !edition.messages.length) break
  due = (await dueSubscriptions(now)).filter(s => !visited.has(s.profile_id))
  }
  return { status: edition.messages.length ? 'ready' : 'empty', scanned, sent, failed, skipped, errors }
}
