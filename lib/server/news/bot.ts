import 'server-only'
import type { TelegramUpdate } from '../types'
import { upsertProfileFromTelegram, recordTelegramUpdate } from '../repository'
import { answerCallbackQuery, sendTelegramMessage, setBotCommandsForChat } from '../telegram-client'
import { getSubscription, saveSubscription } from './storage'
import { getEdition } from './storage'
import { editionDate } from './content'
import { sendEdition } from './dispatch'
import { computeNextDeliveryAt, normalizeDeliveryTime } from '../schedule'

const HELP = 'CHECK CHECK\nGlobal AI. Asian Perspective.\nKnow Something. Have Something to Say.\n\n/start — subscribe\n/today — today’s English briefing\n/settings — delivery settings\nDaily delivery: 08:00–09:00 Singapore time\nOne shared delivery time for everyone\n/pause 1–30 — pause for days\n/resume — resume daily sends\n/stop — stop daily sends\n/interests — tell me what interests you\n\nInterests are collected for a future Picked for You feature. For now, everyone receives the same curated stories.'
export async function handleNewsUpdate(update: TelegramUpdate) {
  if (update.callback_query) { await answerCallbackQuery(update.callback_query.id); return { ignored: true, sent: 0 } }
  const message = update.message
  if (!message?.from || message.chat.type !== 'private' || !message.text) return { ignored: true, sent: 0 }
  if (!await recordTelegramUpdate(update.update_id)) return { duplicate: true, sent: 0 }
  const profile = await upsertProfileFromTelegram(message.from)
  let sub = await getSubscription(profile.id)
  if (!sub) {
    await saveSubscription(profile.id, { active: false, timezone: 'Asia/Singapore', delivery_time: 'Morning', next_delivery_at: computeNextDeliveryAt('Asia/Singapore', 'Morning') })
    sub = (await getSubscription(profile.id))!
  }
  const text = message.text.trim()
  const [raw, ...args] = text.split(/\s+/)
  const command = raw.split('@')[0].toLowerCase()
  const chatId = message.chat.id
  const reply = async (value: string) => { await sendTelegramMessage(chatId, value); return { sent: 1 } }
  const today = async () => {
    const edition = await getEdition(editionDate())
    if (!edition) return reply('Today’s briefing is not ready yet. Please check back later.')
    if (!edition.messages.length) return reply('No stories passed our quality checks today. We won’t fill the space with noise.')
    await sendEdition(chatId, edition)
    return { sent: edition.messages.length }
  }
  if (sub.awaiting_interests && !text.startsWith('/')) {
    if (text.length > 500) return reply('Please keep your interests under 500 characters.')
    await saveSubscription(profile.id, { interests: text, awaiting_interests: false })
    return reply('Saved. Picked for You is planned for a future update; today’s public briefing stays the same for everyone.')
  }
  if (text.startsWith('/') && sub.awaiting_interests) await saveSubscription(profile.id, { awaiting_interests: false })
  switch (command) {
    case '/start':
    case '/resume':
      await setBotCommandsForChat(chatId, 'English').catch(e => console.error('News chat menu update failed', e))
      await saveSubscription(profile.id, { active: true, paused_until: null, next_delivery_at: computeNextDeliveryAt(sub.timezone, normalizeDeliveryTime(sub.delivery_time)) })
      await reply(command === '/start' ? HELP + '\n\nSubscribed to daily English briefings.' : 'Daily sends resumed.')
      return today()
    case '/today': return today()
    case '/settings': return reply(`Daily sends: ${sub.active ? 'On' : 'Off'}\nDelivery: 08:00–09:00 Singapore time${sub.paused_until ? `\nPaused until: ${sub.paused_until}` : ''}\nInterests: ${sub.interests || 'Not set'}\n\nDaily delivery: 08:00–09:00 Singapore time\nOne shared delivery time for everyone\n/interests\n/pause 3\n/stop`)
    case '/interests':
      if (args.length) {
        const interests = args.join(' ')
        if (interests.length > 500) return reply('Please keep your interests under 500 characters.')
        await saveSubscription(profile.id, { interests, awaiting_interests: false })
        return reply('Interests saved for a future Picked for You update. Personalization is not live yet.')
      }
      await saveSubscription(profile.id, { awaiting_interests: true })
      return reply('Tell me what interests you (up to 500 characters). Example: AI, Singapore, dogs, entrepreneurship. We’re collecting interests; personalized stories are not live yet.')
    case '/pause': {
      if (!/^\d+$/.test(args[0] ?? '') || Number(args[0]) < 1 || Number(args[0]) > 30) return reply('Use /pause 1–30. Example: /pause 3')
      await saveSubscription(profile.id, { paused_until: new Date(Date.now() + Number(args[0]) * 86400_000).toISOString() })
      return reply(`Paused for ${args[0]} days. Daily sends will resume automatically.`)
    }
    case '/stop':
      await saveSubscription(profile.id, { active: false, paused_until: null })
      return reply('Daily sends stopped. Use /start to subscribe again.')
    case '/delivery':
    case '/timezone': return reply('Everyone receives one daily edition in the same 08:00–09:00 Singapore delivery window. Individual delivery times are not enabled.')
    default: return reply(HELP)
  }
}
