import type { AppLanguage, UserProfile } from './profile'
import { normalizeAppLanguage } from './i18n'
import {
  calculateChart,
  getDailyLuckyRitual,
  getDailySignals,
  type DailyBaziSignals,
  type DailyRelationKind,
} from './bazi'

export type MessageFormat =
  | 'keyword'
  | 'do_dont'
  | 'one_line'
  | 'time_of_day'
  | 'main_watch'
  | 'one_thing'
  | 'one_avoid'
  | 'workday'
  | 'weekend'
  | 'social_energy'
  | 'start_pause_finish'

export type ModuleType =
  | 'keyword'
  | 'worth_doing'
  | 'not_to_do'
  | 'do_dont'
  | 'work'
  | 'relationship'
  | 'social'
  | 'spending'
  | 'emotional'
  | 'social_vs_solo'
  | 'action_mode'
  | 'best_window'
  | 'hard_window'
  | 'what_to_wear'
  | 'what_to_eat'
  | 'one_sentence'
  | 'small_challenge'

export interface DailyModule {
  type: ModuleType
  title: string
  message: string
}

export interface DailyMessage {
  date: string
  nickname: string
  language: AppLanguage
  format: MessageFormat
  /** Short takeaway — date prefix is added by the formatter */
  headline: string
  /** Optional short supporting paragraph */
  body?: string
  /** 2–3 user-facing paragraphs */
  paragraphs?: string[]
  modules: DailyModule[]
  luckyColour: {
    name: string
    hex: string
  }
  luckyNumber: number[]
  /** True when the chart has no strong signal */
  isNeutralDay?: boolean
  /** Categories used (for anti-repetition) */
  focusTopics?: string[]
  /** llm = OpenRouter; mock = deterministic BaZi fallback */
  generatedBy?: 'llm' | 'mock'

  // ── Legacy fields (older stored payloads / old formatter) ──
  todayVibe?: string
  dailyLuck?: string
  watchOut?: string
  dailyFun?: string
  dailyInspiration?: string
  dailyWord?: unknown
  triggeredModules?: Array<{ type: string; title: string; message: string; phase?: string; planet?: string }>
}

type CopyPack = {
  headline: string
  paragraphs: string[]
}

function relationPack(kind: DailyRelationKind, zh: boolean): CopyPack {
  if (kind === 'wealth') {
    return zh
      ? {
          headline: '今天看到划算的东西，先别急着买',
          paragraphs: [
            '今天比较容易被“好像很值”的东西打动。能换成具体结果的事可以推进：回一封待办、确认一笔账、把快完成的交付收尾。新开一个很大的花钱计划，先放一放。',
            '如果要买，给自己一个短暂停。问一句：这是今天必须的，还是只是看起来便宜？',
          ],
        }
      : {
          headline: 'Don’t rush the bargain',
          paragraphs: [
            'Today is better for turning effort into a result than for chasing something that looks like a deal. Reply to the pending note, confirm the number, or finish a delivery that’s almost done.',
            'If something suddenly feels like a steal, pause. Ask whether you need it today, or whether it only looks cheap.',
          ],
        }
  }

  if (kind === 'output') {
    return zh
      ? {
          headline: '今天适合说清楚，但别说太多',
          paragraphs: [
            '把卡住的想法讲明白、把草稿发一版、把含糊的安排确认掉，今天会比较顺。闷头硬扛反而容易越想越复杂。',
            '话说完就停。下午之后别人一句普通的回应，也可能让你反复琢磨。重要的事情别靠猜，直接问清楚。',
          ],
        }
      : {
          headline: 'Say it clearly, then stop',
          paragraphs: [
            'Today is good for making a fuzzy idea concrete: send the draft, name the blocker, or confirm the plan out loud. Grinding in silence will make it feel bigger than it is.',
            'Once you’ve said it, stop. Later in the day a short reply can sit in your head longer than it should. If it matters, ask directly.',
          ],
        }
  }

  if (kind === 'resource') {
    return zh
      ? {
          headline: '今天适合补一补，不适合硬撑',
          paragraphs: [
            '把散落的信息收拢、问一个懂的人、把睡眠和节奏补回来，会比硬开一个高压任务更有用。今天不是靠意志力硬扛的日子。',
            '如果脑子转得慢，允许自己把事情拆小。先完成能看见结果的一小步，再决定要不要加码。',
          ],
        }
      : {
          headline: 'Fill the tank, don’t force it',
          paragraphs: [
            'Today is better for gathering what you need than for pushing a high-pressure push: tidy the notes, ask someone who knows, or actually rest. White-knuckling it will cost more than it returns.',
            'If your mind feels slower, shrink the task. Finish one small visible step before you add more.',
          ],
        }
  }

  if (kind === 'authority') {
    return zh
      ? {
          headline: '今天先对齐规则，别用情绪硬刚',
          paragraphs: [
            '截止日期、交付标准、必须面对的回复，今天适合处理。把要求写清楚，会比争论“谁对”更省力。',
            '火气上来时先别回重要消息。降温后再说，语气会稳很多。',
          ],
        }
      : {
          headline: 'Meet the standard, skip the fight',
          paragraphs: [
            'Today is better for deadlines, delivery standards, and the reply you’ve been avoiding. Writing down what “done” means beats arguing who’s right.',
            'If you feel heated, don’t send the important message yet. Wait until the temperature drops.',
          ],
        }
  }

  return zh
    ? {
        headline: '今天适合短协作，别陷入比较',
        paragraphs: [
          '跟人并肩做一件小事可以，长时间较劲或反复对照别人的进度，今天特别耗神。走自己的步速就好。',
          '如果有人让你觉得自己慢了，先回到你已经开始的那件事。把那件做完，比赢过旁边的人更有用。',
        ],
      }
    : {
        headline: 'Team up briefly, skip the comparison',
        paragraphs: [
          'A short collaboration can help today. A long stretch of matching someone else’s pace, or measuring yourself against them, will drain you.',
          'If you feel behind, return to the thing you already started. Finishing that beats winning the comparison.',
        ],
      }
}

function frictionParagraph(zh: boolean, labels: string[]): string | null {
  const label = labels[0]
  if (!label) return null
  if (label === 'Day') {
    return zh
      ? '下午到傍晚可能比平时更敏感一点。别人一句普通的话也容易让你多想。重要的事情别靠猜，直接问清楚。'
      : 'You may be a little more sensitive than usual later in the day. Don’t read too much into a short reply or someone’s tone. If something matters, just ask.'
  }
  if (label === 'Month') {
    return zh
      ? '工作或近阶段的安排今天容易卡住。已经开始的事情继续推可以，临时加一个很大的新目标，容易越想越复杂。'
      : 'Work or this season’s plans may snag more easily. Keep moving what you already started; a brand-new oversized goal will get tangled.'
  }
  if (label === 'Hour') {
    return zh
      ? '晚上的精力可能不太稳。重要的事尽量放在上午处理，傍晚之后少做需要判断力的决定。'
      : 'Evening energy may be less steady. Handle anything important in the morning if you can, and save judgment calls for later.'
  }
  return zh
    ? '大方向上的事今天别急着拍板。先把眼前能收尾的小事做完，长线决定可以再放一天。'
    : 'Don’t lock a long-term decision today. Finish a small thing in front of you, and let the bigger call wait a day.'
}

function harmonyParagraph(zh: boolean, labels: string[]): string | null {
  const label = labels[0]
  if (!label) return null
  if (label === 'Month') {
    return zh
      ? '近阶段在推的事，今天可以往前挪一小步。不必开新线，把已经开始的那件推进到能看见结果就够。'
      : 'Something already in motion at work can move a little today. Don’t open a new thread — just get the current one to a visible result.'
  }
  if (label === 'Day') {
    return zh
      ? '自己的状态今天相对顺一点。适合把拖着的消息回掉，或把一件小事确认清楚。'
      : 'Your own pacing is a little smoother. Reply to the message you’ve been putting off, or confirm one small thing.'
  }
  return zh
    ? '今天整体还算顺。选一件已经开始的事做完，比临时开一个新坑更值。'
    : 'The day has some ease in it. Finish one thing you already started rather than opening something new.'
}

function steadyParagraph(zh: boolean, animal: string): string {
  if (zh) {
    if (animal === 'Snake' || animal === 'Ox') {
      return '今天没有特别难的地方，整体比较稳。更适合把已经开始的事情做完，不太适合临时开一个新坑。'
    }
    if (animal === 'Horse' || animal === 'Tiger') {
      return '今天没有特别大的阻力，但人会比较坐不住。把要做的事拆小，做完一件再动下一件。'
    }
    return '今天没有特别难的地方，整体比较稳。选一件拖着的小事处理掉就很好。'
  }
  if (animal === 'Snake' || animal === 'Ox') {
    return 'Nothing especially difficult today — overall steady. Better for finishing what you started than opening a new hole.'
  }
  if (animal === 'Horse' || animal === 'Tiger') {
    return 'Nothing major is blocking you, but you may feel restless. Split the work small, and finish one piece before starting the next.'
  }
  return 'Nothing especially difficult today — overall steady. Clearing one small leftover task is enough.'
}

function buildCopy(signals: DailyBaziSignals, zh: boolean): CopyPack {
  const base = relationPack(signals.relationKind, zh)
  const friction = [...signals.punishmentLabels, ...signals.harmLabels, ...signals.clashLabels]
  const overlay =
    frictionParagraph(zh, friction) ||
    harmonyParagraph(zh, signals.harmonyLabels) ||
    (signals.isNeutral ? steadyParagraph(zh, signals.todayAnimal) : null)

  const paragraphs = [base.paragraphs[0]]
  if (overlay) paragraphs.push(overlay)
  else if (base.paragraphs[1]) paragraphs.push(base.paragraphs[1])

  let headline = base.headline
  if (signals.isNeutral && friction.length === 0) {
    headline = zh ? '今天适合收尾，不适合想太多' : 'Finish what you started'
  } else if (friction.includes('Day')) {
    headline = zh ? '今天适合收尾，不适合想太多' : 'Finish what you started'
  }

  return { headline, paragraphs: paragraphs.slice(0, 3) }
}

/** Fallback when LLM is unavailable — grounded in real daily BaZi signals */
export function generateMockMessage(profile: UserProfile, customDate?: string): DailyMessage {
  const dateToUse = customDate || new Date().toISOString().split('T')[0]
  const language = normalizeAppLanguage(profile.languagePreference)
  const zh = language === '中文'
  const name = profile.nickname || profile.legalName

  const chart = calculateChart(profile.dateOfBirth, profile.birthTime)
  const signals = getDailySignals(chart, dateToUse)
  const ritual = getDailyLuckyRitual(chart, dateToUse)
  const copy = buildCopy(signals, zh)

  return {
    date: dateToUse,
    nickname: name,
    language,
    format: 'one_line',
    headline: copy.headline,
    body: copy.paragraphs.join('\n\n'),
    paragraphs: copy.paragraphs,
    modules: [],
    luckyColour: {
      name: zh ? ritual.colour.nameZh : ritual.colour.name,
      hex: ritual.colour.hex,
    },
    luckyNumber: [...ritual.numbers],
    isNeutralDay: signals.isNeutral,
    focusTopics: signals.strongestThemes,
    generatedBy: 'mock',
    todayVibe: copy.headline,
  }
}

export const languageFlags: Record<string, string> = {
  English: '🇬🇧',
  中文: '🇨🇳',
}
