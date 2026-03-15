import type { DailyMessage } from '@/lib/generate-mock-message'
import { toUserProfile } from './profile-adapter'
import { generateDailyMessage } from './generate-daily-message'
import { getDailyMessage, listDueProfiles, updateProfile, upsertDailyMessage } from './repository'
import { computeNextDeliveryAt, normalizeDeliveryTime, normalizeTimeZone } from './schedule'
import { sendDailyCheckCheck } from './telegram-bot'

function currentIsoDate(): string {
  return new Date().toISOString().split('T')[0]
}

export async function runDailyDispatch(limit = 200) {
  const nowIso = new Date().toISOString()
  const dueProfiles = await listDueProfiles(nowIso, limit)
  let sent = 0
  let failed = 0
  const errors: Array<{ profileId: string; error: string }> = []

  for (const profile of dueProfiles) {
    try {
      const today = currentIsoDate()
      const existing = await getDailyMessage(profile.id, today)
      let message: DailyMessage

      if (existing?.payload) {
        message = existing.payload as DailyMessage
      } else {
        message = await generateDailyMessage(toUserProfile(profile), today)
        await upsertDailyMessage(profile.id, today, message)
      }

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
