import type { DailyMessage } from '@/lib/generate-mock-message'
import {
  COMPLETION_MESSAGE,
  WELCOME_MESSAGE,
  deliveryLabelToSlot,
  layer2Questions,
  onboardingQuestions,
  parseExtrasAnswer,
  type Language,
  type QuestionConfig,
  type UserProfile,
} from '@/lib/profile'
import { generateDailyMessage } from './generate-daily-message'
import { buildProfilePatch, inferTimezoneFromCity, profileFieldToColumn, toUserProfile } from './profile-adapter'
import {
  deleteDailyMessage,
  ensureBotState,
  getDailyMessage,
  getRecentDailyMessages,
  insertFeedback,
  recordTelegramUpdate,
  updateProfile,
  upsertBotState,
  upsertDailyMessage,
  upsertProfileFromTelegram,
} from './repository'
import { computeNextDeliveryAt, normalizeDeliveryTime, normalizeTimeZone } from './schedule'
import { formatDailyMessage, formatHistory, formatQuestionPrompt, formatSettings, COMMAND_HELP } from './telegram-format'
import { sendTelegramMessage } from './telegram-client'
import type { BotFlow, BotStateRecord, ProfileRecord, TelegramUpdate } from './types'

const EDITABLE_FIELDS: Record<string, keyof UserProfile> = {
  nickname: 'nickname',
  name: 'legalName',
  birthday: 'dateOfBirth',
  birthtime: 'birthTime',
  birthcity: 'birthCity',
  city: 'currentCity',
  gender: 'gender',
  delivery: 'deliveryTime',
  timezone: 'timezone',
  language: 'languagePreference',
  relationship: 'relationshipStatus',
  focus: 'lifeFocus',
  inspiration: 'dailyInspiration',
}

function currentIsoDate(): string {
  return new Date().toISOString().split('T')[0]
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime())
}

function isValidTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date())
    return true
  } catch {
    return false
  }
}

function pickOption(answer: string, options: string[]): string | null {
  const normalized = answer.trim().toLowerCase()
  return options.find((option) => option.toLowerCase() === normalized) ?? null
}

function getQuestions(flow: BotFlow): QuestionConfig[] {
  return flow === 'layer2' ? layer2Questions : onboardingQuestions
}

function defaultFlowForProfile(profile: ProfileRecord): BotFlow {
  if (!profile.onboarding_complete) return 'onboarding'
  if (!profile.layer2_complete) return 'layer2'
  return 'idle'
}

function normalizeQuestionAnswer(
  question: QuestionConfig,
  answer: string,
  profile: ProfileRecord
): { ok: true; value: string } | { ok: false; message: string } {
  const trimmed = answer.trim()
  if (!trimmed) {
    return { ok: false, message: 'Please send a value.' }
  }

  if (question.type === 'select' && question.options) {
    // For delivery time, accept time labels like "07:00" and map to slot names
    if (question.id === 'deliveryTime') {
      const slot = deliveryLabelToSlot(trimmed)
      if (!slot) {
        return { ok: false, message: `Please choose one of: ${question.options.join(' / ')}` }
      }
      return { ok: true, value: slot }
    }
    const option = pickOption(trimmed, question.options)
    if (!option) {
      return { ok: false, message: `Please choose one of: ${question.options.join(' / ')}` }
    }
    return { ok: true, value: option }
  }

  if ((question.type === 'birthTime') && question.options) {
    // Accept exact time in HH:MM format or approximate options
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      return { ok: true, value: trimmed }
    }
    const option = pickOption(trimmed, question.options)
    if (!option) {
      return { ok: false, message: `Enter exact time (HH:MM) or pick: ${question.options.join(' / ')}` }
    }
    return { ok: true, value: option }
  }

  if (question.type === 'language' && question.options) {
    const option = pickOption(trimmed, question.options)
    if (!option) {
      return { ok: false, message: `Please choose one of: ${question.options.join(' / ')}` }
    }
    return { ok: true, value: option }
  }

  if (question.type === 'extras') {
    const parsed = parseExtrasAnswer(trimmed)
    if (!parsed.inspiration && !parsed.wantLanguage) {
      // Could be "C" / "no" — valid
      if (/^(c|no|none|no thanks)$/i.test(trimmed)) {
        return { ok: true, value: 'C' }
      }
    }
    if (parsed.inspiration || parsed.wantLanguage) {
      if (parsed.inspiration && parsed.wantLanguage) return { ok: true, value: 'both' }
      if (parsed.inspiration) return { ok: true, value: 'A' }
      return { ok: true, value: 'B' }
    }
    return { ok: false, message: 'Please reply A, B, both, or C.' }
  }

  if (question.type === 'date') {
    if (!isValidDate(trimmed)) {
      return { ok: false, message: 'Please use date format YYYY-MM-DD.' }
    }
    return { ok: true, value: trimmed }
  }

  if (question.type === 'timezone') {
    if (!isValidTimeZone(trimmed)) {
      return { ok: false, message: 'That timezone looks invalid. Example: America/New_York' }
    }
    return { ok: true, value: trimmed }
  }

  if (question.type === 'textWithShortcut') {
    if (trimmed.toLowerCase() === 'same') {
      const fallback = profile.birth_city?.trim()
      if (!fallback) {
        return { ok: false, message: 'I do not have a birth city yet. Please type your current city.' }
      }
      return { ok: true, value: fallback }
    }
  }

  return { ok: true, value: trimmed }
}

async function updateProfileFromField(
  profile: ProfileRecord,
  field: keyof UserProfile,
  rawValue: string
): Promise<{ profile: ProfileRecord; message?: string }> {
  // Special handling for dailyInspiration toggle
  if (field === 'dailyInspiration') {
    const normalized = rawValue.trim().toLowerCase()
    if (normalized === 'on' || normalized === 'yes' || normalized === 'true') {
      return { profile: await updateProfile(profile.id, { daily_inspiration: true }) }
    }
    if (normalized === 'off' || normalized === 'no' || normalized === 'false') {
      return { profile: await updateProfile(profile.id, { daily_inspiration: false }) }
    }
    return { profile, message: 'Reply "on" or "off".' }
  }

  const questionLookup = [...onboardingQuestions, ...layer2Questions].find((question) => question.id === field)
  const parsed = questionLookup
    ? normalizeQuestionAnswer(questionLookup, rawValue, profile)
    : ({ ok: true, value: rawValue.trim() } as const)

  if (!parsed.ok) {
    return { profile, message: parsed.message }
  }

  const patch: Partial<ProfileRecord> = buildProfilePatch(field, parsed.value)
  const maybeDelivery = field === 'deliveryTime' ? normalizeDeliveryTime(parsed.value) : normalizeDeliveryTime(profile.delivery_time)
  const maybeTimeZone = field === 'timezone' ? normalizeTimeZone(parsed.value) : normalizeTimeZone(profile.timezone)

  if (profile.onboarding_complete && profile.status === 'active' && !profile.paused_until) {
    patch.next_delivery_at = computeNextDeliveryAt(maybeTimeZone, maybeDelivery)
  }

  const updatedProfile = await updateProfile(profile.id, patch)
  return { profile: updatedProfile }
}

async function getOrCreateTodayMessage(profile: ProfileRecord): Promise<DailyMessage> {
  const date = currentIsoDate()
  const existing = await getDailyMessage(profile.id, date)
  if (existing?.payload) {
    return existing.payload as DailyMessage
  }

  const userProfile = toUserProfile(profile)
  const message = await generateDailyMessage(userProfile, date)
  await upsertDailyMessage(profile.id, date, message)
  return message
}

async function handleOnboardingAnswer(profile: ProfileRecord, state: BotStateRecord, text: string): Promise<string[]> {
  const flow = state.flow === 'layer2' ? 'layer2' : 'onboarding'
  const questions = getQuestions(flow)
  const safeStep = Math.max(0, Math.min(state.step, questions.length - 1))
  const question = questions[safeStep]

  const parsed = normalizeQuestionAnswer(question, text, profile)
  if (!parsed.ok) {
    return [parsed.message, formatQuestionPrompt(question, safeStep, questions.length)]
  }

  // Handle extras question (Q9) — sets dailyInspiration and conditionally skips language question
  if (question.type === 'extras') {
    const extras = parseExtrasAnswer(text)
    await updateProfile(profile.id, { daily_inspiration: extras.inspiration })

    if (extras.wantLanguage) {
      // Proceed to the language question (next step)
      const nextStep = safeStep + 1
      await upsertBotState(profile.id, { flow, step: nextStep, awaiting_field: null })
      return [formatQuestionPrompt(questions[nextStep], nextStep, questions.length)]
    }

    // No language wanted — set to None and skip language question, finish onboarding
    await updateProfile(profile.id, { language_preference: 'None' })
    return await finishOnboarding(profile, flow)
  }

  // Handle delivery time — store the slot name (Morning/Afternoon/Evening)
  const patch: Partial<ProfileRecord> = buildProfilePatch(question.id, parsed.value)

  // After current city answer, auto-detect timezone
  if (question.id === 'currentCity') {
    const detectedTz = inferTimezoneFromCity(parsed.value)
    if (detectedTz) {
      patch.timezone = detectedTz
    }
  }

  const updatedProfile = await updateProfile(profile.id, patch)

  const isFinalQuestion = safeStep >= questions.length - 1
  if (!isFinalQuestion) {
    const nextStep = safeStep + 1
    await upsertBotState(profile.id, {
      flow,
      step: nextStep,
      awaiting_field: null,
    })
    return [formatQuestionPrompt(questions[nextStep], nextStep, questions.length)]
  }

  return await finishOnboarding(updatedProfile, flow)
}

async function finishOnboarding(profile: ProfileRecord, flow: BotFlow): Promise<string[]> {
  if (flow === 'onboarding') {
    const deliveryTime = normalizeDeliveryTime(profile.delivery_time)
    const timeZone = normalizeTimeZone(profile.timezone)
    await updateProfile(profile.id, {
      onboarding_complete: true,
      next_delivery_at: computeNextDeliveryAt(timeZone, deliveryTime),
      status: 'active',
    })
    await upsertBotState(profile.id, {
      flow: 'layer2',
      step: 0,
      awaiting_field: null,
    })
    return [
      COMPLETION_MESSAGE,
      "But first — 2 quick bonus questions to make your readings even more personal:",
      formatQuestionPrompt(layer2Questions[0], 0, layer2Questions.length),
    ]
  }

  // Layer 2 complete
  await updateProfile(profile.id, { layer2_complete: true })
  await upsertBotState(profile.id, {
    flow: 'idle',
    step: 0,
    awaiting_field: null,
  })
  return ['Perfect, personalisation complete! Your CheckCheck readings will now be even more tailored to you. Use /today to get your reading now.']
}

async function handleEditValue(profile: ProfileRecord, state: BotStateRecord, text: string): Promise<string[]> {
  const field = state.awaiting_field as keyof UserProfile
  const result = await updateProfileFromField(profile, field, text)
  if (result.message) {
    return [result.message]
  }

  await upsertBotState(profile.id, {
    awaiting_field: null,
  })
  return [`Updated ${field}.`]
}

async function handleCommand(
  profile: ProfileRecord,
  state: BotStateRecord,
  text: string
): Promise<string[]> {
  const [rawCommand, ...rawArgs] = text.trim().split(/\s+/)
  const command = rawCommand.toLowerCase().split('@')[0]
  const args = rawArgs

  if (state.awaiting_field && command !== '/edit') {
    await upsertBotState(profile.id, { awaiting_field: null })
  }
  await upsertBotState(profile.id, { last_command: command })

  switch (command) {
    case '/start': {
      const flow = defaultFlowForProfile(profile)
      if (profile.status === 'stopped') {
        const deliveryTime = normalizeDeliveryTime(profile.delivery_time)
        const timeZone = normalizeTimeZone(profile.timezone)
        await updateProfile(profile.id, {
          status: 'active',
          next_delivery_at: computeNextDeliveryAt(timeZone, deliveryTime),
        })
      }

      if (flow === 'onboarding') {
        const step = Math.max(0, Math.min(state.step, onboardingQuestions.length - 1))
        await upsertBotState(profile.id, { flow: 'onboarding', step, awaiting_field: null })
        const question = onboardingQuestions[step]
        if (step === 0) {
          return [WELCOME_MESSAGE, formatQuestionPrompt(question, step, onboardingQuestions.length)]
        }
        return ['Welcome back! Let\'s continue where we left off.', formatQuestionPrompt(question, step, onboardingQuestions.length)]
      }

      if (flow === 'layer2') {
        const step = Math.max(0, Math.min(state.step, layer2Questions.length - 1))
        await upsertBotState(profile.id, { flow: 'layer2', step, awaiting_field: null })
        return ['Welcome back! Let\'s finish your personalisation.', formatQuestionPrompt(layer2Questions[step], step, layer2Questions.length)]
      }

      return ['Welcome back! Use /today for your daily CheckCheck, /settings to edit profile, or /help for commands.']
    }

    case '/help':
      return [COMMAND_HELP]

    case '/today': {
      if (!profile.onboarding_complete) {
        const step = Math.max(0, Math.min(state.step, onboardingQuestions.length - 1))
        const question = onboardingQuestions[step]
        return ['Please finish onboarding first.', formatQuestionPrompt(question, step, onboardingQuestions.length)]
      }
      if (profile.status === 'stopped') {
        return ['Your account is stopped. Use /start to reactivate daily messages.']
      }

      const message = await getOrCreateTodayMessage(profile)
      return [formatDailyMessage(message)]
    }

    case '/regenerate': {
      if (!profile.onboarding_complete) {
        return ['Please finish onboarding first with /start.']
      }
      const regenDate = currentIsoDate()
      await deleteDailyMessage(profile.id, regenDate)
      const freshMessage = await getOrCreateTodayMessage(profile)
      return ['Regenerated your daily CheckCheck:', formatDailyMessage(freshMessage)]
    }

    case '/history': {
      if (!profile.onboarding_complete) {
        return ['Please finish onboarding first with /start.']
      }
      const history = await getRecentDailyMessages(profile.id, 7)
      return [formatHistory(history)]
    }

    case '/settings':
      return [formatSettings(profile)]

    case '/pause': {
      const days = Number.parseInt(args[0] ?? '', 10)
      if (!Number.isFinite(days) || days < 1 || days > 30) {
        return ['Please specify days between 1 and 30. Example: /pause 3']
      }

      const pausedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      const updated = await updateProfile(profile.id, {
        paused_until: pausedUntil,
      })

      return [`Paused for ${days} day${days === 1 ? '' : 's'}. Resume anytime with /resume.\nPaused until: ${updated.paused_until}`]
    }

    case '/resume': {
      const deliveryTime = normalizeDeliveryTime(profile.delivery_time)
      const timeZone = normalizeTimeZone(profile.timezone)
      const updated = await updateProfile(profile.id, {
        paused_until: null,
        status: 'active',
        next_delivery_at: computeNextDeliveryAt(timeZone, deliveryTime),
      })
      return [`Resumed. Next delivery scheduled at ${updated.next_delivery_at}.`]
    }

    case '/edit': {
      const fieldArg = (args[0] ?? '').toLowerCase()
      const mapped = EDITABLE_FIELDS[fieldArg]
      if (!fieldArg || !mapped) {
        return ['Usage: /edit [field]\nEditable fields: ' + Object.keys(EDITABLE_FIELDS).join(', ')]
      }
      const column = profileFieldToColumn(mapped)
      const currentValue = profile[column]
      await upsertBotState(profile.id, {
        awaiting_field: mapped,
      })

      if (mapped === 'dailyInspiration') {
        return [`Daily Inspiration is currently: ${currentValue ? 'On' : 'Off'}\nReply "on" or "off".`]
      }

      return [`Current ${fieldArg}: ${currentValue ?? 'Not set'}\nSend the new value now.`]
    }

    case '/timezone': {
      const timezone = args.join(' ').trim()
      if (!timezone) {
        return [`Current timezone: ${profile.timezone || 'UTC'}\nUsage: /timezone America/New_York`]
      }
      if (!isValidTimeZone(timezone)) {
        return ['Invalid timezone. Example: America/New_York']
      }

      const deliveryTime = normalizeDeliveryTime(profile.delivery_time)
      const updated = await updateProfile(profile.id, {
        timezone,
        next_delivery_at: profile.onboarding_complete && profile.status === 'active' && !profile.paused_until
          ? computeNextDeliveryAt(timezone, deliveryTime)
          : profile.next_delivery_at,
      })
      return [`Timezone updated to ${updated.timezone}.`]
    }

    case '/language': {
      const provided = args[0]
      const allowed: Language[] = ['German', 'Mandarin', 'Japanese', 'Spanish', 'French', 'None']
      if (!provided) {
        return [`Current language: ${profile.language_preference || 'None'}\nAvailable: ${allowed.join(', ')}`]
      }

      const selected = allowed.find((lang) => lang.toLowerCase() === provided.toLowerCase())
      if (!selected) {
        return [`Unknown language "${provided}". Available: ${allowed.join(', ')}`]
      }

      await updateProfile(profile.id, { language_preference: selected })
      return [`Language preference updated to ${selected}.`]
    }

    case '/feedback': {
      const feedback = args.join(' ').trim()
      if (!feedback) {
        return ['Please include feedback text. Example: /feedback Love the format']
      }
      await insertFeedback(profile.id, feedback)
      return ['Thanks for the feedback. Saved.']
    }

    case '/stop':
      await updateProfile(profile.id, {
        status: 'stopped',
        paused_until: null,
      })
      return ['All automatic messages are stopped. Use /start anytime to reactivate.']

    default:
      return [`Unknown command "${command}". Use /help to see available commands.`]
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<{ ignored?: boolean; duplicate?: boolean; sent: number }> {
  if (!update.message?.from || !update.message.text || update.message.chat.type !== 'private') {
    return { ignored: true, sent: 0 }
  }

  const isNew = await recordTelegramUpdate(update.update_id)
  if (!isNew) {
    return { duplicate: true, sent: 0 }
  }

  const messageText = update.message.text.trim()
  const profile = await upsertProfileFromTelegram(update.message.from)
  const defaultFlow = defaultFlowForProfile(profile)
  let state = await ensureBotState(profile.id, defaultFlow)

  if (state.flow !== defaultFlow && !state.awaiting_field) {
    state = await upsertBotState(profile.id, {
      flow: defaultFlow,
      step: state.step,
    })
  }

  let replies: string[] = []
  if (
    !messageText.startsWith('/') &&
    state.flow === 'onboarding' &&
    state.step === 0 &&
    state.last_command === null &&
    !profile.onboarding_complete
  ) {
    await upsertBotState(profile.id, { last_command: '/start' })
    replies = [
      WELCOME_MESSAGE,
      formatQuestionPrompt(onboardingQuestions[0], 0, onboardingQuestions.length),
    ]
  } else if (state.awaiting_field && !messageText.startsWith('/')) {
    replies = await handleEditValue(profile, state, messageText)
  } else if (messageText.startsWith('/')) {
    replies = await handleCommand(profile, state, messageText)
  } else if (state.flow === 'onboarding' || state.flow === 'layer2') {
    replies = await handleOnboardingAnswer(profile, state, messageText)
  } else {
    replies = ['I only respond to commands that start with /. Use /help for available commands.']
  }

  for (const reply of replies) {
    await sendTelegramMessage(update.message.chat.id, reply)
  }

  return { sent: replies.length }
}
