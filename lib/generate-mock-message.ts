import type { AppLanguage, UserProfile } from './profile'
import { normalizeAppLanguage } from './i18n'
import { calculateChart, getDailySignals, type BaziElement, type DailyRelationKind } from './bazi'

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
  /** Opening line / today’s framing */
  headline: string
  /** Optional short supporting paragraph */
  body?: string
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

function createSeed(dateStr: string, dob: string): number {
  const dateNum = dateStr.split('-').join('')
  const dobNum = dob.split('-').join('')
  let seed = 0
  for (let i = 0; i < dateNum.length; i++) {
    seed = ((seed << 5) - seed) + dateNum.charCodeAt(i)
    seed = seed & seed
  }
  for (let i = 0; i < dobNum.length; i++) {
    seed = ((seed << 5) - seed) + dobNum.charCodeAt(i)
    seed = seed & seed
  }
  return Math.abs(seed)
}

function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index) * 10000
  return x - Math.floor(x)
}

const ELEMENT_COLOURS: Record<BaziElement, Array<{ name: string; hex: string; nameZh: string }>> = {
  Wood: [
    { name: 'Sage Green', nameZh: '鼠尾草绿', hex: '#9CAF88' },
    { name: 'Moss', nameZh: '苔绿', hex: '#8A9A5B' },
    { name: 'Jade', nameZh: '青绿', hex: '#00A86B' },
  ],
  Fire: [
    { name: 'Coral', nameZh: '珊瑚红', hex: '#FF7F7F' },
    { name: 'Ember', nameZh: '余烬橙', hex: '#E25822' },
    { name: 'Rosewood', nameZh: '玫瑰木', hex: '#9E4244' },
  ],
  Earth: [
    { name: 'Clay', nameZh: '陶土色', hex: '#C4A484' },
    { name: 'Sand', nameZh: '沙色', hex: '#C2B280' },
    { name: 'Ochre', nameZh: '赭石', hex: '#CC7722' },
  ],
  Metal: [
    { name: 'Silver Mist', nameZh: '银雾', hex: '#C0C0C0' },
    { name: 'Pearl', nameZh: '珍珠白', hex: '#EAE0C8' },
    { name: 'Steel', nameZh: '钢青', hex: '#71797E' },
  ],
  Water: [
    { name: 'Ocean Blue', nameZh: '海蓝', hex: '#0077B6' },
    { name: 'Ink', nameZh: '墨色', hex: '#2C3E50' },
    { name: 'Mist Blue', nameZh: '雾蓝', hex: '#A7C7E7' },
  ],
}

const FORMATS: MessageFormat[] = [
  'keyword',
  'do_dont',
  'one_line',
  'time_of_day',
  'main_watch',
  'one_thing',
  'one_avoid',
  'workday',
  'weekend',
  'social_energy',
  'start_pause_finish',
]

type CopyPack = {
  headline: string
  body: string
  modules: DailyModule[]
  topics: string[]
  format: MessageFormat
}

function relationCopy(kind: DailyRelationKind, zh: boolean, animal: string, element: BaziElement): CopyPack[] {
  const el = zh
    ? { Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水' }[element]
    : element

  if (kind === 'wealth') {
    return [
      {
        format: 'one_thing',
        topics: ['wealth', 'effort', 'finish'],
        headline: zh
          ? `今日偏财星气质（${el}），有收获的可能，但要靠动手换。`
          : `Wealth-leaning day (${el}) — gains are possible if you put in the work.`,
        body: zh
          ? `今天日柱带${animal}，更适合把已开的事做完、把该收的口子收好，而不是空谈机会。`
          : `Today’s pillar carries ${animal} energy — better for closing loops than chasing shiny new ideas.`,
        modules: [
          {
            type: 'worth_doing',
            title: zh ? '今天最值得做' : 'Most worth doing',
            message: zh
              ? '推进一件能看见结果的具体事务：报价、结算、交付、回复待办。'
              : 'Push one concrete money-or-result task: quote, invoice, deliver, or clear a pending reply.',
          },
          {
            type: 'not_to_do',
            title: zh ? '今天别做' : 'Skip today',
            message: zh
              ? '别只因为“感觉有机会”就冲动加码；先确认数字和边界。'
              : 'Don’t scale up on vibes alone — confirm numbers and boundaries first.',
          },
        ],
      },
      {
        format: 'do_dont',
        topics: ['wealth', 'focus'],
        headline: zh ? `财星日：适合务实换收获。` : `A practical “earn it” day.`,
        body: zh
          ? `日主遇见财气，动作可以更主动一点，但别分散火力。`
          : `Day Master meets wealth qi — be proactive, but stay focused.`,
        modules: [
          {
            type: 'do_dont',
            title: zh ? '做 / 不做' : 'Do / Don’t',
            message: zh
              ? '做：把一件事推进到可交付。不做：同时开三条新线。'
              : 'Do: move one thing to deliverable. Don’t: open three new threads at once.',
          },
          {
            type: 'one_sentence',
            title: zh ? '一句话' : 'One line',
            message: zh ? '今天的好运，藏在完成里。' : 'Today’s luck hides inside finishing.',
          },
        ],
      },
    ]
  }

  if (kind === 'output') {
    return [
      {
        format: 'social_energy',
        topics: ['express', 'create', 'social'],
        headline: zh
          ? `今日偏食伤（${el}），适合表达、创作和把想法说清楚。`
          : `Output day (${el}) — good for expressing, creating, and clarifying ideas.`,
        body: zh
          ? `能量偏外放，写、说、展示会比闷头硬扛更顺。注意别说太多耗神。`
          : `Energy leans outward — writing, speaking, and showing work flow better than grinding in silence. Don’t overtalk yourself empty.`,
        modules: [
          {
            type: 'worth_doing',
            title: zh ? '今天最值得做' : 'Most worth doing',
            message: zh
              ? '发一版草稿、聊清楚一个卡点，或把模糊想法落成文字。'
              : 'Ship a draft, unblock a conversation, or turn a fuzzy idea into words.',
          },
          {
            type: 'emotional',
            title: zh ? '情绪提醒' : 'Emotional note',
            message: zh
              ? '表达可以锋利，但先确认对方听得进去；留一点余力给自己。'
              : 'Be clear, not cutting — check the room, and save some energy for yourself.',
          },
        ],
      },
    ]
  }

  if (kind === 'resource') {
    return [
      {
        format: 'start_pause_finish',
        topics: ['support', 'learn', 'rest'],
        headline: zh
          ? `今日偏印星（${el}），适合吸收、求助、把节奏放稳。`
          : `Resource day (${el}) — good for learning, asking for help, and steadying pace.`,
        body: zh
          ? `有支持感的一天。别硬撑；让信息、睡眠或他人的协助进入你的系统。`
          : `Supportive tone today. Don’t white-knuckle it — let information, rest, or help in.`,
        modules: [
          {
            type: 'action_mode',
            title: zh ? '今日节奏' : 'Today’s pace',
            message: zh
              ? '更适合整理、学习、复盘，而不是硬开高压战场。'
              : 'Better for organizing, learning, and reviewing than forcing a high-pressure push.',
          },
          {
            type: 'worth_doing',
            title: zh ? '今天最值得做' : 'Most worth doing',
            message: zh
              ? '问一个懂的人，或把散落的资料收成一页清晰笔记。'
              : 'Ask someone who knows — or gather scattered notes into one clear page.',
          },
        ],
      },
    ]
  }

  if (kind === 'authority') {
    return [
      {
        format: 'main_watch',
        topics: ['discipline', 'pressure', 'structure'],
        headline: zh
          ? `今日偏官杀（${el}），规则与外界压力更明显。`
          : `Authority day (${el}) — rules and external pressure show up more clearly.`,
        body: zh
          ? `适合守承诺、对齐标准、处理“必须面对”的事。别用情绪硬碰硬。`
          : `Good for keeping promises, aligning to standards, and facing must-dos. Don’t fight pressure with heat.`,
        modules: [
          {
            type: 'not_to_do',
            title: zh ? '今天别做' : 'Skip today',
            message: zh
              ? '别在火气上头时回重要消息；先降温再回应。'
              : 'Don’t reply to important messages while heated — cool down first.',
          },
          {
            type: 'work',
            title: zh ? '工作提醒' : 'Work note',
            message: zh
              ? '把交付标准写清楚，比争论“谁对”更省力。'
              : 'Writing down the delivery standard beats arguing who’s right.',
          },
        ],
      },
    ]
  }

  // peer
  return [
    {
      format: 'social_vs_solo',
      topics: ['peer', 'compare', 'pace'],
      headline: zh
        ? `今日偏比肩（${el}），人际与节奏感会更明显。`
        : `Peer day (${el}) — people dynamics and pacing feel louder.`,
      body: zh
        ? `容易想较劲或想并肩前进。选合作可以，别陷入无谓比较。`
        : `Easy to compete or team up. Collaboration is fine — skip pointless comparison.`,
      modules: [
        {
          type: 'social_vs_solo',
          title: zh ? '社交还是独处？' : 'Social or solo?',
          message: zh
            ? '短协作可以，长时间消耗型社交就少一点。'
            : 'Short collaboration yes; long draining social no.',
        },
        {
          type: 'one_sentence',
          title: zh ? '一句话' : 'One line',
          message: zh ? '走自己的步速，比赢过旁边的人更重要。' : 'Your pace matters more than beating the person next to you.',
        },
      ],
    },
  ]
}

function clashHarmonyOverlay(
  zh: boolean,
  clashLabels: string[],
  harmonyLabels: string[]
): DailyModule | null {
  if (clashLabels.length > 0) {
    const area = clashLabels[0]
    const areaZh: Record<string, string> = {
      Year: '大环境/长线',
      Month: '近阶段节奏',
      Day: '自身状态',
      Hour: '时间安排',
    }
    return {
      type: 'hard_window',
      title: zh ? '更需小心的地方' : 'Where friction may rise',
      message: zh
        ? `今日与你的${areaZh[area] ?? area}有冲的迹象，相关话题慢半拍、少硬刚。`
        : `Today clashes with your ${area.toLowerCase()} pillar — slow down on related topics; don’t force confrontations.`,
    }
  }
  if (harmonyLabels.length > 0) {
    const area = harmonyLabels[0]
    return {
      type: 'best_window',
      title: zh ? '更顺的方向' : 'Where things may flow',
      message: zh
        ? `今日与你的${area === 'Day' ? '自身状态' : area === 'Month' ? '近阶段节奏' : area === 'Hour' ? '时间安排' : '大环境'}有合，相关事项可以主动推进一点。`
        : `Today harmonizes with your ${area.toLowerCase()} pillar — a bit more push is welcome in related matters.`,
    }
  }
  return null
}

function weekendOrWeekdayTwist(zh: boolean, weekday: number): DailyModule {
  const isWeekend = weekday === 0 || weekday === 6
  if (isWeekend) {
    return {
      type: 'social',
      title: zh ? '周末提醒' : 'Weekend note',
      message: zh
        ? '留给恢复和真实想做的事一点空间，别把周末过成加班延长赛。'
        : 'Leave room for recovery and something you actually want — don’t turn the weekend into overtime 2.0.',
    }
  }
  return {
    type: 'work',
    title: zh ? '工作日提醒' : 'Workday note',
    message: zh
      ? '把今天的一件主线写在最上面，其余都排第二。'
      : 'Put one main thread at the top of today; everything else is secondary.',
  }
}

/** Fallback when LLM is unavailable — grounded in real daily BaZi signals, varies by day */
export function generateMockMessage(profile: UserProfile, customDate?: string): DailyMessage {
  const dateToUse = customDate || new Date().toISOString().split('T')[0]
  const seed = createSeed(dateToUse, profile.dateOfBirth)
  const language = normalizeAppLanguage(profile.languagePreference)
  const zh = language === '中文'
  const name = profile.nickname || profile.legalName

  const chart = calculateChart(profile.dateOfBirth, profile.birthTime)
  const signals = getDailySignals(chart, dateToUse)
  const packs = relationCopy(signals.relationKind, zh, signals.todayAnimal, signals.todayElement)
  const pack = packs[Math.floor(seededRandom(seed, 3) * packs.length)] ?? packs[0]

  const modules = [...pack.modules]
  const overlay = clashHarmonyOverlay(zh, signals.clashLabels, signals.harmonyLabels)
  if (overlay) modules.push(overlay)
  else modules.push(weekendOrWeekdayTwist(zh, signals.weekday))

  // Cap at 3 modules for Telegram length
  const trimmed = modules.slice(0, 3)

  const colours = ELEMENT_COLOURS[signals.todayElement]
  const colour = colours[Math.floor(seededRandom(seed, 0) * colours.length)]
  const num1 = Math.floor(seededRandom(seed, 22) * 99) + 1
  const num2 = Math.floor(seededRandom(seed, 23) * 99) + 1
  const format = FORMATS.includes(pack.format)
    ? pack.format
    : FORMATS[Math.floor(seededRandom(seed, 1) * FORMATS.length)]

  const headline = zh ? `${name}，${pack.headline}` : `${name}, ${pack.headline}`

  return {
    date: dateToUse,
    nickname: name,
    language,
    format,
    headline,
    body: pack.body,
    modules: trimmed,
    luckyColour: {
      name: zh ? colour.nameZh : colour.name,
      hex: colour.hex,
    },
    luckyNumber: [num1, num2 === num1 ? ((num2 % 99) + 1) : num2],
    isNeutralDay: signals.isNeutral && signals.clashLabels.length === 0,
    focusTopics: [...pack.topics, signals.relationKind, signals.todayAnimal.toLowerCase()],
    generatedBy: 'mock',
    todayVibe: headline,
  }
}

export const languageFlags: Record<string, string> = {
  English: '🇬🇧',
  中文: '🇨🇳',
}
