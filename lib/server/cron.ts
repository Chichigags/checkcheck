import type { DailyMessage } from '@/lib/generate-mock-message'
import { getOrCreateTodayMessage, sendDailyCheckCheck } from './telegram-bot'
import { listDueProfiles, updateProfile } from './repository'
import { computeNextDeliveryAt, normalizeDeliveryTime, normalizeTimeZone } from './schedule'
import { setBotCommands } from './telegram-client'

export async function runDailyDispatch(limit = 200) {
  await setBotCommands().catch((err) => console.error('setBotCommands failed:', err))
  const nowIso = new Date().toISOString()
  const dueProfiles = await listDueProfiles(nowIso, limit)
  let sent = 0
  let failed = 0
  const errors: Array<{ profileId: string; error: string }> = []

  for (const profile of dueProfiles) {
    try {
      // Shared claim/cache path — same as /today, prevents double different readings
      const message: DailyMessage = await getOrCreateTodayMessage(profile)
      await sendDailyCheckCheck(profile.telegram_user_id, message)
      await updateProfile(profile.id, {
        next_delivery_at: computeNextDeliveryAt(
          normalizeTimeZone(profile.timezone),
          normalizeDeliveryTime(profile.delivery_time)
        ),
      })
      sent += 1
    } catch (error) {
      failed += 1
      errors.push({
        profileId: profile.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    scanned: dueProfiles.length,
    sent,
    failed,
    errors,
  }
}
