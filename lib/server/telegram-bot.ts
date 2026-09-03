import { calculateChart, formatCosmicId, getProfile } from '@/lib/bazi'
import type { DailyMessage } from '@/lib/generate-mock-message'
import {
  LAYER2_INTRO,
  WELCOME_MESSAGE,
  canonicalizeAppLanguage,
  canonicalizeBirthTimeOption,
  canonicalizeGender,
  deliveryLabelToSlot,
  getOnboardingQuestions,
  layer2Questions,
  type AppLanguage,
  type QuestionConfig,
  type UserProfile,
} from '@/lib/profile'
import { normalizeAppLanguage, t } from '@/lib/i18n'
import { generateDailyMessage } from './generate-daily-message'
import { generateColorPng } from './color-image'
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
import { formatDailyMessage, formatQuestionPrompt, formatSettings, getSettingsEditKeyboard } from './telegram-format'
import { answerCallbackQuery, sendTelegramMessage, sendTelegramPhoto } from './telegram-client'
import type { BotFlow, BotStateRecord, ProfileRecord, TelegramUpdate } from './types'

type BotReply = string | { type: 'daily'; message: DailyMessage } | { type: 'settings'; profile: ProfileRecord }

function langOf(profile: ProfileRecord): AppLanguage {
  return normalizeAppLanguage(profile.language_preference)
}

function questionsFor(profile: ProfileRecord): QuestionConfig[] {
  return getOnboardingQuestions(langOf(profile))
}

export async function sendDailyCheckCheck(chatId: number, message: DailyMessage): Promise<void> {
  const lang = normalizeAppLanguage(message.language)
  const numbers = Array.isArray(message.luckyNumber) ? message.luckyNumber.join(', ') : '7, 23'
  const caption = [
    t.checkCheckFor(lang, message.nickname, message.date),
    '',
    `🎨 ${t.luckyColour(lang)}: ${message.luckyColour.name}`,
    `🔢 ${t.luckyNumber(lang)}: ${numbers}`,
  ].join('\n')
  const colorPng = generateColorPng(message.luckyColour.hex, 400, 150)
  await sendTelegramPhoto(chatId, colorPng, caption)
  await sendTelegramMessage(chatId, formatDailyMessage(message))
}

const EDITABLE_FIELDS: Record<string, keyof UserProfile> = {
  nickname: 'nickname',
  name: 'nickname',
  birthday: 'dateOfBirth',
  birthtime: 'birthTime',
  birthcity: 'birthCity',
  city: 'currentCity',
  gender: 'gender',
  delivery: 'deliveryTime',
  timezone: 'timezone',
  language: 'languagePreference',
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

function getQuestions(flow: BotFlow, profile: ProfileRecord): QuestionConfig[] {
  return flow === 'layer2' ? layer2Questions : questionsFor(profile)
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
  const lang = langOf(profile)
  const trimmed = answer.trim()
  if (!trimmed) {
    return { ok: false, message: t.pleaseSendValue(lang) }
  }

  if (question.type === 'language' || question.id === 'languagePreference') {
    const language = canonicalizeAppLanguage(trimmed)
    if (!language) {
      return { ok: false, message: t.chooseOneOf(lang, question.options ?? ['English', '中文']) }
    }
    return { ok: true, value: language }
  }

  if (question.type === 'select' && question.options) {
    if (question.id === 'deliveryTime') {
      const slot = deliveryLabelToSlot(trimmed)
      if (!slot) {
        return { ok: false, message: t.chooseOneOf(lang, question.options) }
      }
      return { ok: true, value: slot }
    }

    if (question.id === 'gender') {
      const gender = canonicalizeGender(trimmed)
      if (!gender) {
        return { ok: false, message: t.chooseOneOf(lang, question.options) }
      }
      return { ok: true, value: gender }
    }

    const option = pickOption(trimmed, question.options)
    if (!option) {
      return { ok: false, message: t.chooseOneOf(lang, question.options) }
    }
    return { ok: true, value: option }
  }

  if (question.type === 'birthTime' && question.options) {
    if (/^\d{1,2}$/.test(trimmed)) {
      const hour = Number(trimmed)
      if (hour >= 0 && hour <= 23) {
        return { ok: true, value: `${String(hour).padStart(2, '0')}:00` }
      }
    }
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      return { ok: true, value: trimmed }
    }
    const mapped = canonicalizeBirthTimeOption(trimmed)
    if (mapped) {
      return { ok: true, value: mapped }
    }
    const option = pickOption(trimmed, question.options)
    if (!option) {
      return { ok: false, message: t.birthTimeHint(lang, question.options) }
    }
    return { ok: true, value: canonicalizeBirthTimeOption(option) ?? option }
  }

  if (question.type === 'date') {
    if (!isValidDate(trimmed)) {
      return { ok: false, message: t.dateFormat(lang) }
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
    if (trimmed.toLowerCase() === 'same' || trimmed === '同' || trimmed === '一样') {
      const fallback = profile.birth_city?.trim()
      if (!fallback) {
        return { ok: false, message: t.pleaseSendValue(lang) }
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
  const questions = [...questionsFor(profile), ...layer2Questions]
  const questionLookup = questions.find((question) => question.id === field)
  const parsed = questionLookup
    ? normalizeQuestionAnswer(questionLookup, rawValue, profile)
    : field === 'languagePreference'
      ? (() => {
          const language = canonicalizeAppLanguage(rawValue)
          return language
            ? ({ ok: true, value: language } as const)
            : ({ ok: false, message: t.chooseOneOf(langOf(profile), ['English', '中文']) } as const)
        })()
      : ({ ok: true, value: rawValue.trim() } as const)

  if (!parsed.ok) {
    return { profile, message: parsed.message }
  }

  const patch: Partial<ProfileRecord> = buildProfilePatch(field, parsed.value)
  if (field === 'nickname') {
    patch.legal_name = parsed.value
  }
  if (field === 'currentCity') {
    const detectedTz = inferTimezoneFromCity(parsed.value)
    if (detectedTz) patch.timezone = detectedTz
  }

  const maybeDelivery = field === 'deliveryTime' ? normalizeDeliveryTime(parsed.value) : normalizeDeliveryTime(profile.delivery_time)
  const maybeTimeZone = field === 'timezone' ? normalizeTimeZone(parsed.value) : normalizeTimeZone(patch.timezone ?? profile.timezone)

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
  const recent = await getRecentDailyMessages(profile.id, 30)
  const message = await generateDailyMessage(userProfile, date, recent)
  await upsertDailyMessage(profile.id, date, message)
  return message
}

async function handleOnboardingAnswer(profile: ProfileRecord, state: BotStateRecord, text: string): Promise<BotReply[]> {
  const flow = state.flow === 'layer2' ? 'layer2' : 'onboarding'
  const questions = getQuestions(flow, profile)
  const safeStep = Math.max(0, Math.min(state.step, questions.length - 1))
  const question = questions[safeStep]

  const parsed = normalizeQuestionAnswer(question, text, profile)
  if (!parsed.ok) {
    return [parsed.message, formatQuestionPrompt(question, safeStep, questions.length)]
  }

  const patch: Partial<ProfileRecord> = buildProfilePatch(question.id, parsed.value)
  if (question.id === 'nickname') {
    patch.legal_name = parsed.value
  }

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
    // After language is set, rebuild question list in that language
    const nextQuestions = getQuestions(flow, updatedProfile)
    await upsertBotState(profile.id, {
      flow,
      step: nextStep,
      awaiting_field: null,
    })
    return [formatQuestionPrompt(nextQuestions[nextStep], nextStep, nextQuestions.length)]
  }

  return await finishOnboarding(updatedProfile, flow)
}

async function finishOnboarding(profile: ProfileRecord, flow: BotFlow): Promise<BotReply[]> {
  if (flow === 'layer2') {
    await updateProfile(profile.id, { layer2_complete: true })
    await upsertBotState(profile.id, {
      flow: 'idle',
      step: 0,
      awaiting_field: null,
    })
    return [t.completion(langOf(profile))]
  }

  // New flow: finish after 7 questions — skip layer2
  const timeZone = normalizeTimeZone(profile.timezone)
  await updateProfile(profile.id, {
    onboarding_complete: true,
    layer2_complete: true,
    delivery_time: 'Morning',
    daily_inspiration: false,
    next_delivery_at: computeNextDeliveryAt(timeZone, 'Morning'),
    status: 'active',
  })
  await upsertBotState(profile.id, {
    flow: 'idle',
    step: 0,
    awaiting_field: null,
  })
  return [t.completion(langOf(profile))]
}

async function handleEditValue(profile: ProfileRecord, state: BotStateRecord, text: string): Promise<BotReply[]> {
  const field = state.awaiting_field as keyof UserProfile
  const result = await updateProfileFromField(profile, field, text)
  if (result.message) {
    return [result.message]
  }

  await upsertBotState(profile.id, {
    awaiting_field: null,
  })

  if (field === 'languagePreference') {
    return [t.languageUpdated(langOf(result.profile))]
  }

  return [t.updatedField(langOf(result.profile), field)]
}

async function handleCommand(
  profile: ProfileRecord,
  state: BotStateRecord,
  text: string
): Promise<BotReply[]> {
  const [rawCommand, ...rawArgs] = text.trim().split(/\s+/)
  const command = rawCommand.toLowerCase().split('@')[0]
  const args = rawArgs
  const lang = langOf(profile)

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
        const questions = questionsFor(profile)
        const step = Math.max(0, Math.min(state.step, questions.length - 1))
        await upsertBotState(profile.id, { flow: 'onboarding', step, awaiting_field: null })
        const question = questions[step]
        if (step === 0) {
          return [WELCOME_MESSAGE, formatQuestionPrompt(question, step, questions.length)]
        }
        return [t.welcomeBack(lang), formatQuestionPrompt(question, step, questions.length)]
      }

      if (flow === 'layer2') {
        const step = Math.max(0, Math.min(state.step, layer2Questions.length - 1))
        await upsertBotState(profile.id, { flow: 'layer2', step, awaiting_field: null })
        return [LAYER2_INTRO, formatQuestionPrompt(layer2Questions[step], step, layer2Questions.length)]
      }

      return [
        lang === '中文'
          ? '欢迎回来！输入 /today 查看今日 CheckCheck，/settings 编辑资料，/help 查看指令。'
          : 'Welcome back! Use /today for your daily CheckCheck, /settings to edit profile, or /help for commands.',
      ]
    }

    case '/help':
      return [t.help(lang)]

    case '/today': {
      if (!profile.onboarding_complete) {
        const questions = questionsFor(profile)
        const step = Math.max(0, Math.min(state.step, questions.length - 1))
        return [t.finishOnboardingFirst(lang), formatQuestionPrompt(questions[step], step, questions.length)]
      }
      if (profile.status === 'stopped') {
        return [
          lang === '中文'
            ? '你的账号已停止推送。输入 /start 重新开启。'
            : 'Your account is stopped. Use /start to reactivate daily messages.',
        ]
      }

      const message = await getOrCreateTodayMessage(profile)
      return [{ type: 'daily', message }]
    }

    case '/regenerate': {
      if (!profile.onboarding_complete) {
        return [t.finishOnboardingFirst(lang)]
      }
      const regenDate = currentIsoDate()
      await deleteDailyMessage(profile.id, regenDate)
      const freshMessage = await getOrCreateTodayMessage(profile)
      return [
        lang === '中文' ? '已重新生成今日 CheckCheck：' : 'Regenerated your daily CheckCheck:',
        { type: 'daily', message: freshMessage },
      ]
    }

    case '/reset': {
      await updateProfile(profile.id, {
        onboarding_complete: false,
        layer2_complete: false,
        language_preference: 'English',
      })
      await upsertBotState(profile.id, { flow: 'onboarding', step: 0, awaiting_field: null })
      return [
        lang === '中文'
          ? '已重置设置！发送 /start 重新开始。'
          : 'Onboarding reset! Send /start to go through the setup again.',
      ]
    }

    case '/cosmicid':
    case '/bazi': {
      if (!profile.onboarding_complete) {
        return [
          lang === '中文'
            ? '请先完成设置 — 我需要你的出生资料来生成宇宙身份证。'
            : 'Please finish onboarding first — I need your birth data to build your Cosmic ID.',
        ]
      }
      const userProfile = toUserProfile(profile)
      const chart = calculateChart(userProfile.dateOfBirth, userProfile.birthTime)
      const baziProfile = getProfile(chart)
      return [formatCosmicId(baziProfile, userProfile.dateOfBirth, currentIsoDate())]
    }

    case '/settings':
      return [{ type: 'settings', profile }]

    case '/pause': {
      const days = Number.parseInt(args[0] ?? '', 10)
      if (!Number.isFinite(days) || days < 1 || days > 30) {
        return [
          lang === '中文'
            ? '请指定 1-30 天。例如：/pause 3'
            : 'Please specify days between 1 and 30. Example: /pause 3',
        ]
      }

      const pausedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      const updated = await updateProfile(profile.id, {
        paused_until: pausedUntil,
      })

      return [
        lang === '中文'
          ? `已暂停 ${days} 天。随时可用 /resume 恢复。\n暂停至：${updated.paused_until}`
          : `Paused for ${days} day${days === 1 ? '' : 's'}. Resume anytime with /resume.\nPaused until: ${updated.paused_until}`,
      ]
    }

    case '/resume': {
      const deliveryTime = normalizeDeliveryTime(profile.delivery_time)
      const timeZone = normalizeTimeZone(profile.timezone)
      const updated = await updateProfile(profile.id, {
        paused_until: null,
        status: 'active',
        next_delivery_at: computeNextDeliveryAt(timeZone, deliveryTime),
      })
      return [
        lang === '中文'
          ? `已恢复。下次推送时间：${updated.next_delivery_at}`
          : `Resumed. Next delivery scheduled at ${updated.next_delivery_at}.`,
      ]
    }

    case '/edit': {
      const fieldArg = (args[0] ?? '').toLowerCase()
      const mapped = EDITABLE_FIELDS[fieldArg]
      if (!fieldArg || !mapped) {
        return [
          lang === '中文'
            ? `用法：/edit [字段]\n可编辑：${Object.keys(EDITABLE_FIELDS).join(', ')}`
            : 'Usage: /edit [field]\nEditable fields: ' + Object.keys(EDITABLE_FIELDS).join(', '),
        ]
      }
      const column = profileFieldToColumn(mapped)
      const currentValue = profile[column]
      await upsertBotState(profile.id, {
        awaiting_field: mapped,
      })

      return [
        lang === '中文'
          ? `当前 ${fieldArg}：${currentValue ?? '未设置'}\n请发送新的值。`
          : `Current ${fieldArg}: ${currentValue ?? 'Not set'}\nSend the new value now.`,
      ]
    }

    case '/timezone': {
      const timezone = args.join(' ').trim()
      if (!timezone) {
        return [
          lang === '中文'
            ? `当前时区：${profile.timezone || 'UTC'}\n用法：/timezone America/New_York`
            : `Current timezone: ${profile.timezone || 'UTC'}\nUsage: /timezone America/New_York`,
        ]
      }
      if (!isValidTimeZone(timezone)) {
        return [
          lang === '中文'
            ? '无效时区。例如：America/New_York'
            : 'Invalid timezone. Example: America/New_York',
        ]
      }

      const deliveryTime = normalizeDeliveryTime(profile.delivery_time)
      const updated = await updateProfile(profile.id, {
        timezone,
        next_delivery_at: profile.onboarding_complete && profile.status === 'active' && !profile.paused_until
          ? computeNextDeliveryAt(timezone, deliveryTime)
          : profile.next_delivery_at,
      })
      return [
        lang === '中文'
          ? `时区已更新为 ${updated.timezone}。`
          : `Timezone updated to ${updated.timezone}.`,
      ]
    }

    case '/language': {
      const provided = args.join(' ').trim()
      if (!provided) {
        return [
          lang === '中文'
            ? `当前语言：${profile.language_preference || 'English'}\n可用：English / 中文`
            : `Current language: ${profile.language_preference || 'English'}\nAvailable: English / 中文`,
        ]
      }

      const selected = canonicalizeAppLanguage(provided)
      if (!selected) {
        return [
          lang === '中文'
            ? `未知语言「${provided}」。可用：English / 中文`
            : `Unknown language "${provided}". Available: English / 中文`,
        ]
      }

      const updated = await updateProfile(profile.id, { language_preference: selected })
      return [t.languageUpdated(langOf(updated))]
    }

    case '/feedback': {
      const feedback = args.join(' ').trim()
      if (!feedback) {
        return [
          lang === '中文'
            ? '请附上反馈内容。例如：/feedback 喜欢这个格式'
            : 'Please include feedback text. Example: /feedback Love the format',
        ]
      }
      await insertFeedback(profile.id, feedback)
      return [lang === '中文' ? '谢谢反馈，已保存。' : 'Thanks for the feedback. Saved.']
    }

    case '/stop':
      await updateProfile(profile.id, {
        status: 'stopped',
        paused_until: null,
      })
      return [
        lang === '中文'
          ? '已停止所有自动推送。随时可用 /start 重新开启。'
          : 'All automatic messages are stopped. Use /start anytime to reactivate.',
      ]

    default:
      return [
        lang === '中文'
          ? `未知指令「${command}」。输入 /help 查看可用指令。`
          : `Unknown command "${command}". Use /help to see available commands.`,
      ]
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<{ ignored?: boolean; duplicate?: boolean; sent: number }> {
  if (update.callback_query) {
    const cq = update.callback_query
    if (cq.message?.chat.type !== 'private' || !cq.from) {
      return { ignored: true, sent: 0 }
    }

    const isNew = await recordTelegramUpdate(update.update_id)
    if (!isNew) {
      return { duplicate: true, sent: 0 }
    }

    const data = cq.data ?? ''
    if (!data.startsWith('edit:')) {
      await answerCallbackQuery(cq.id)
      return { sent: 0 }
    }

    const fieldArg = data.slice(5).toLowerCase()
    const mapped = EDITABLE_FIELDS[fieldArg]
    if (!mapped) {
      await answerCallbackQuery(cq.id)
      return { sent: 0 }
    }

    const profile = await upsertProfileFromTelegram(cq.from)
    const column = profileFieldToColumn(mapped)
    const currentValue = profile[column]
    const lang = langOf(profile)

    await upsertBotState(profile.id, { awaiting_field: mapped })
    const prompt =
      lang === '中文'
        ? `当前 ${fieldArg}：${currentValue ?? '未设置'}\n请发送新的值。`
        : `Current ${fieldArg}: ${currentValue ?? 'Not set'}\nSend the new value now.`

    await answerCallbackQuery(cq.id)
    await sendTelegramMessage(cq.message.chat.id, prompt)
    return { sent: 1 }
  }

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

  let replies: BotReply[] = []
  if (
    !messageText.startsWith('/') &&
    state.flow === 'onboarding' &&
    state.step === 0 &&
    state.last_command === null &&
    !profile.onboarding_complete
  ) {
    await upsertBotState(profile.id, { last_command: '/start' })
    const questions = questionsFor(profile)
    replies = [
      WELCOME_MESSAGE,
      formatQuestionPrompt(questions[0], 0, questions.length),
    ]
  } else if (state.awaiting_field && !messageText.startsWith('/')) {
    replies = await handleEditValue(profile, state, messageText)
  } else if (messageText.startsWith('/')) {
    replies = await handleCommand(profile, state, messageText)
  } else if (state.flow === 'onboarding' || state.flow === 'layer2') {
    replies = await handleOnboardingAnswer(profile, state, messageText)
  } else {
    replies = [
      langOf(profile) === '中文'
        ? '我只响应以 / 开头的指令。输入 /help 查看可用指令。'
        : 'I only respond to commands that start with /. Use /help for available commands.',
    ]
  }

  const chatId = update.message.chat.id
  for (const reply of replies) {
    if (typeof reply === 'string') {
      await sendTelegramMessage(chatId, reply)
    } else if (reply.type === 'daily') {
      await sendDailyCheckCheck(chatId, reply.message)
    } else if (reply.type === 'settings') {
      const lang = langOf(reply.profile)
      await sendTelegramMessage(
        chatId,
        formatSettings(reply.profile) +
          (lang === '中文' ? '\n\n点击下方按钮编辑：' : '\n\nTap a button below to edit:'),
        getSettingsEditKeyboard()
      )
    }
  }

  return { sent: replies.length }
}
