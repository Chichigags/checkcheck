/**
 * Chinese BaZi (八字) Four Pillars of Destiny calculation engine.
 *
 * Computes Year/Month/Day/Hour pillars from birth data using:
 * - Heavenly Stems & Earthly Branches (天干地支)
 * - Solar term boundaries for month calculation
 * - Julian Day Number for day pillar
 * - 五虎遁月 / 五鼠遁时 rules for stem derivation
 */

export type BaziElement = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water'
export type Polarity = 'Yang' | 'Yin'

export interface Pillar {
  stemIndex: number
  branchIndex: number
}

export interface BaziChart {
  year: Pillar
  month: Pillar
  day: Pillar
  hour: Pillar | null
}

export interface ElementCount {
  Wood: number
  Fire: number
  Earth: number
  Metal: number
  Water: number
}

export interface BaziProfile {
  chart: BaziChart
  dayMaster: {
    stemIndex: number
    element: BaziElement
    polarity: Polarity
    description: string
  }
  elements: ElementCount
}

// ── Constants ──────────────────────────────────────────────────────

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
const STEM_PY = ['Jiǎ', 'Yǐ', 'Bǐng', 'Dīng', 'Wù', 'Jǐ', 'Gēng', 'Xīn', 'Rén', 'Guǐ']
const BRANCH_PY = ['Zǐ', 'Chǒu', 'Yín', 'Mǎo', 'Chén', 'Sì', 'Wǔ', 'Wèi', 'Shēn', 'Yǒu', 'Xū', 'Hài']
const ANIMALS = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig']
const ANIMAL_EMOJI = ['🐀', '🐂', '🐅', '🐇', '🐉', '🐍', '🐴', '🐐', '🐒', '🐓', '🐕', '🐖']

const S_EL: BaziElement[] = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water']
const S_POL: Polarity[] = ['Yang', 'Yin', 'Yang', 'Yin', 'Yang', 'Yin', 'Yang', 'Yin', 'Yang', 'Yin']
const B_EL: BaziElement[] = ['Water', 'Earth', 'Wood', 'Wood', 'Earth', 'Fire', 'Fire', 'Earth', 'Metal', 'Metal', 'Earth', 'Water']

// Hidden stems within each earthly branch (藏干)
const HIDDEN: number[][] = [
  [9],       // 子: 癸
  [5, 9, 7], // 丑: 己癸辛
  [0, 2, 4], // 寅: 甲丙戊
  [1],       // 卯: 乙
  [4, 1, 9], // 辰: 戊乙癸
  [2, 6, 4], // 巳: 丙庚戊
  [3, 5],    // 午: 丁己
  [5, 3, 1], // 未: 己丁乙
  [6, 8, 4], // 申: 庚壬戊
  [7],       // 酉: 辛
  [4, 7, 3], // 戌: 戊辛丁
  [8, 0],    // 亥: 壬甲
]

const CLASHES: [number, number][] = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]]
const HARMONIES: [number, number][] = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]]
const HARMS: [number, number][] = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]]
const TRIPLE_PUNISH: number[][] = [
  [0, 3], // 子卯
  [2, 5], [5, 8], [2, 8], // 寅巳申
  [1, 10], [10, 7], [1, 7], // 丑戌未
]
const SELF_PUNISH = new Set([4, 6, 9, 11]) // 辰午酉亥

const ELEMENT_NUMBERS: Record<BaziElement, [number, number]> = {
  Wood: [3, 8],
  Fire: [2, 7],
  Earth: [5, 10],
  Metal: [4, 9],
  Water: [1, 6],
}

const ELEMENT_COLOURS: Record<BaziElement, Array<{ name: string; nameZh: string; hex: string }>> = {
  Wood: [
    { name: 'Sage green', nameZh: '鼠尾草绿', hex: '#9CAF88' },
    { name: 'Moss', nameZh: '苔绿', hex: '#8A9A5B' },
    { name: 'Jade', nameZh: '青绿', hex: '#00A86B' },
  ],
  Fire: [
    { name: 'Coral', nameZh: '珊瑚红', hex: '#FF7F7F' },
    { name: 'Ember orange', nameZh: '余烬橙', hex: '#E25822' },
    { name: 'Amber brown', nameZh: '琥珀棕', hex: '#B86B2A' },
  ],
  Earth: [
    { name: 'Clay', nameZh: '陶土色', hex: '#C4A484' },
    { name: 'Sand', nameZh: '沙色', hex: '#C2B280' },
    { name: 'Ochre', nameZh: '赭石', hex: '#CC7722' },
  ],
  Metal: [
    { name: 'Silver mist', nameZh: '银雾', hex: '#C0C0C0' },
    { name: 'Pearl', nameZh: '珍珠白', hex: '#EAE0C8' },
    { name: 'Steel', nameZh: '钢青', hex: '#71797E' },
  ],
  Water: [
    { name: 'Ocean blue', nameZh: '海蓝', hex: '#0077B6' },
    { name: 'Ink', nameZh: '墨色', hex: '#2C3E50' },
    { name: 'Mist blue', nameZh: '雾蓝', hex: '#A7C7E7' },
  ],
}

const ANIMAL_TONE: Record<string, string> = {
  Rat: 'late-day cleverness, noticing small openings, easy to over-calculate',
  Ox: 'slow grind and stubborn follow-through; rushing feels wrong',
  Tiger: 'bold starts and impatience; leaping before the landing is ready',
  Rabbit: 'softer social pace, more sensitive to tone, prefers not to confront',
  Dragon: 'extra drive and bigger ideas; easy to overpromise',
  Snake: 'inward and watchful; rushing a decision backfires',
  Horse: 'restless body energy that wants movement; sitting still gets itchy',
  Goat: 'comfort-seeking and indecisive when options multiply',
  Monkey: 'quick wit and scattered attention; clever shortcuts that skip a step',
  Rooster: 'sharp eye for flaws; easy to say one extra critical sentence',
  Dog: 'loyal worry and defensive replies; taking things personally',
  Pig: 'ease and appetite; easy to overspend, overeat, or say yes once too often',
}

const PILLAR_LIFE_AREA: Record<string, string> = {
  Year: 'longer-term plans, family, or the wider environment',
  Month: 'work rhythm, this season of life, or colleagues',
  Day: 'mood, close relationships, or how you feel in your body',
  Hour: 'today’s schedule, evening energy, or follow-through',
}

const EL_ORDER: BaziElement[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water']
const EL_EMOJI: Record<BaziElement, string> = { Wood: '🪵', Fire: '🔥', Earth: '⛰️', Metal: '🪙', Water: '💧' }

const DM_DESC: string[] = [
  'Like a tall tree — ambitious, pioneering, always growing.',
  'Like a vine — flexible, graceful, quietly resilient.',
  'Like the sun — radiant, generous, naturally magnetic.',
  'Like a candle — warm, perceptive, quietly powerful.',
  'Like a mountain — stable, dependable, unshakably grounded.',
  'Like fertile soil — nurturing, supportive, richly detailed.',
  'Like a sword — decisive, principled, strong-willed.',
  'Like a gemstone — refined, precise, elegantly sharp.',
  'Like the ocean — expansive, wise, endlessly flowing.',
  'Like morning dew — intuitive, sensitive, deeply perceptive.',
]

// ── Core Math ──────────────────────────────────────────────────────

function julianDay(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12)
  const yr = y + 4800 - a
  const mo = m + 12 * a - 3
  return d + Math.floor((153 * mo + 2) / 5) + 365 * yr +
    Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045
}

function mmdd(m: number, d: number): number { return m * 100 + d }

/**
 * Determine BaZi month (1–12) from Gregorian date using solar term (节气) boundaries.
 * Month 1 (寅) starts at 立春 (~Feb 4); Month 12 (丑) ends before the next 立春.
 */
function baziMonth(gM: number, gD: number): number {
  const v = mmdd(gM, gD)
  if (v >= mmdd(2, 4) && v < mmdd(3, 6)) return 1
  if (v >= mmdd(3, 6) && v < mmdd(4, 5)) return 2
  if (v >= mmdd(4, 5) && v < mmdd(5, 6)) return 3
  if (v >= mmdd(5, 6) && v < mmdd(6, 6)) return 4
  if (v >= mmdd(6, 6) && v < mmdd(7, 7)) return 5
  if (v >= mmdd(7, 7) && v < mmdd(8, 7)) return 6
  if (v >= mmdd(8, 7) && v < mmdd(9, 8)) return 7
  if (v >= mmdd(9, 8) && v < mmdd(10, 8)) return 8
  if (v >= mmdd(10, 8) && v < mmdd(11, 7)) return 9
  if (v >= mmdd(11, 7) && v < mmdd(12, 7)) return 10
  if (v >= mmdd(12, 7)) return 11
  if (v < mmdd(1, 6)) return 11
  return 12
}

/** BaZi year changes at 立春 (~Feb 4), not Jan 1. */
function baziYear(y: number, gM: number, gD: number): number {
  return mmdd(gM, gD) < mmdd(2, 4) ? y - 1 : y
}

function calcYearPillar(by: number): Pillar {
  return {
    stemIndex: ((by - 4) % 10 + 10) % 10,
    branchIndex: ((by - 4) % 12 + 12) % 12,
  }
}

/** 五虎遁月: derive month stem from year stem. */
function calcMonthPillar(bm: number, yearStem: number): Pillar {
  const branchIndex = (bm + 1) % 12
  const starts = [2, 4, 6, 8, 0]
  const stemIndex = (starts[yearStem % 5] + bm - 1) % 10
  return { stemIndex, branchIndex }
}

function calcDayPillar(y: number, m: number, d: number): Pillar {
  const j = julianDay(y, m, d)
  return { stemIndex: (j + 9) % 10, branchIndex: (j + 1) % 12 }
}

function hourBranch(hour: number): number {
  return hour === 23 ? 0 : Math.floor((hour + 1) / 2)
}

/** 五鼠遁时: derive hour stem from day stem. */
function calcHourPillar(hour: number, dayStem: number): Pillar {
  const bi = hourBranch(hour)
  const starts = [0, 2, 4, 6, 8]
  return { stemIndex: (starts[dayStem % 5] + bi) % 10, branchIndex: bi }
}

function parseBirthHour(birthTime: string): number | null {
  const m = birthTime.match(/^(\d{1,2}):(\d{2})$/)
  if (m) return parseInt(m[1])
  const lower = birthTime.toLowerCase().trim()
  if (lower === 'morning') return 8
  if (lower === 'noon') return 12
  if (lower === 'afternoon') return 15
  if (lower === 'evening') return 19
  if (lower === 'night') return 22
  return null
}

// ── Public API ─────────────────────────────────────────────────────

export function calculateChart(dateOfBirth: string, birthTime: string): BaziChart {
  const [y, m, d] = dateOfBirth.split('-').map(Number)
  const by = baziYear(y, m, d)
  const bm = baziMonth(m, d)
  const yp = calcYearPillar(by)
  const mp = calcMonthPillar(bm, yp.stemIndex)
  const dp = calcDayPillar(y, m, d)
  const hour = parseBirthHour(birthTime)
  const hp = hour !== null ? calcHourPillar(hour, dp.stemIndex) : null
  return { year: yp, month: mp, day: dp, hour: hp }
}

export function getProfile(chart: BaziChart): BaziProfile {
  const si = chart.day.stemIndex
  return {
    chart,
    dayMaster: {
      stemIndex: si,
      element: S_EL[si],
      polarity: S_POL[si],
      description: DM_DESC[si],
    },
    elements: countElements(chart),
  }
}

function countElements(chart: BaziChart): ElementCount {
  const c: ElementCount = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 }
  const pillars = [chart.year, chart.month, chart.day]
  if (chart.hour) pillars.push(chart.hour)
  for (const p of pillars) {
    c[S_EL[p.stemIndex]]++
    for (const h of HIDDEN[p.branchIndex]) c[S_EL[h]]++
  }
  return c
}

// ── Interactions ───────────────────────────────────────────────────

function isClash(a: number, b: number): boolean {
  return CLASHES.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

function isHarmony(a: number, b: number): boolean {
  return HARMONIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

function isHarm(a: number, b: number): boolean {
  return HARMS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

function isPunishment(a: number, b: number): boolean {
  if (a === b && SELF_PUNISH.has(a)) return true
  return TRIPLE_PUNISH.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

function prevElement(el: BaziElement): BaziElement {
  return EL_ORDER[(EL_ORDER.indexOf(el) + 4) % 5]
}

function nextElement(el: BaziElement): BaziElement {
  return EL_ORDER[(EL_ORDER.indexOf(el) + 1) % 5]
}

function wealthElement(el: BaziElement): BaziElement {
  return EL_ORDER[(EL_ORDER.indexOf(el) + 2) % 5]
}

function authorityElement(el: BaziElement): BaziElement {
  return EL_ORDER[(EL_ORDER.indexOf(el) + 3) % 5]
}

function pillarShort(p: Pillar): string {
  return `${STEMS[p.stemIndex]}${BRANCHES[p.branchIndex]}`
}

export type DailyRelationKind = 'peer' | 'output' | 'resource' | 'wealth' | 'authority'
export type DayMasterStrength = 'weak' | 'balanced' | 'strong'

export interface DailyLuckyRitual {
  colour: { name: string; nameZh: string; hex: string }
  numbers: [number, number]
  sourceElement: BaziElement
}

export interface DailyBaziSignals {
  dayMasterElement: BaziElement
  todayElement: BaziElement
  todayAnimal: string
  todayPillar: string
  todayYearPillar: string
  todayMonthPillar: string
  relationKind: DailyRelationKind
  monthRelationKind: DailyRelationKind
  yearRelationKind: DailyRelationKind
  clashLabels: string[]
  harmonyLabels: string[]
  punishmentLabels: string[]
  harmLabels: string[]
  usefulElements: BaziElement[]
  unfavourableElements: BaziElement[]
  favorableElement: BaziElement
  dayMasterStrength: DayMasterStrength
  strongestThemes: string[]
  isNeutral: boolean
  weekday: number // 0=Sun … 6=Sat (UTC noon of date)
}

function relationKind(dm: BaziElement, other: BaziElement): DailyRelationKind {
  if (dm === other) return 'peer'
  const di = EL_ORDER.indexOf(dm)
  const oi = EL_ORDER.indexOf(other)
  if ((di + 1) % 5 === oi) return 'output'
  if ((oi + 1) % 5 === di) return 'resource'
  if ((di + 2) % 5 === oi) return 'wealth'
  return 'authority'
}

function themeForRelation(kind: DailyRelationKind): string[] {
  switch (kind) {
    case 'wealth':
      return ['money', 'impulse spending']
    case 'output':
      return ['communication', 'expression']
    case 'resource':
      return ['rest', 'learning']
    case 'authority':
      return ['work', 'pressure']
    case 'peer':
      return ['collaboration', 'comparison']
  }
}

function themeForPillar(label: string): string {
  switch (label) {
    case 'Year':
      return 'family / long-term plans'
    case 'Month':
      return 'work'
    case 'Day':
      return 'mood / close relationships'
    case 'Hour':
      return 'schedule / evening energy'
    default:
      return 'pacing'
  }
}

function natalStrength(chart: BaziChart): {
  strength: DayMasterStrength
  useful: BaziElement[]
  unfavourable: BaziElement[]
} {
  const dm = S_EL[chart.day.stemIndex]
  const counts = countElements(chart)
  const support = counts[dm] + counts[prevElement(dm)]
  const total = EL_ORDER.reduce((sum, el) => sum + counts[el], 0) || 1
  const ratio = support / total

  const strength: DayMasterStrength = ratio < 0.32 ? 'weak' : ratio > 0.52 ? 'strong' : 'balanced'
  if (strength === 'weak') {
    return {
      strength,
      useful: [prevElement(dm), dm],
      unfavourable: [authorityElement(dm), nextElement(dm)],
    }
  }
  if (strength === 'strong') {
    return {
      strength,
      useful: [wealthElement(dm), nextElement(dm), authorityElement(dm)],
      unfavourable: [dm, prevElement(dm)],
    }
  }
  return {
    strength,
    useful: [wealthElement(dm), prevElement(dm)],
    unfavourable: [authorityElement(dm)],
  }
}

function pickFavorableElement(
  natal: ReturnType<typeof natalStrength>,
  todayEl: BaziElement,
  kind: DailyRelationKind,
  hasFriction: boolean
): BaziElement {
  if (hasFriction) return natal.useful[0]
  if (natal.useful.includes(todayEl)) return todayEl
  if (kind === 'authority' || kind === 'peer') return natal.useful[0]
  return natal.useful[0]
}

function pickStrongestThemes(
  relationKindToday: DailyRelationKind,
  monthKind: DailyRelationKind,
  clashLabels: string[],
  harmonyLabels: string[],
  punishmentLabels: string[],
  harmLabels: string[],
  weekday: number
): string[] {
  const themes: string[] = []
  const add = (theme: string) => {
    if (theme && !themes.includes(theme)) themes.push(theme)
  }

  add(themeForRelation(relationKindToday)[0])

  const friction = [...punishmentLabels, ...harmLabels, ...clashLabels]
  if (friction[0]) add(themeForPillar(friction[0]))
  else if (harmonyLabels[0]) add(themeForPillar(harmonyLabels[0]))

  if (monthKind !== relationKindToday && (monthKind === 'wealth' || monthKind === 'authority')) {
    add(themeForRelation(monthKind)[0])
  }

  if (themes.length < 2) {
    add(themeForRelation(relationKindToday)[1])
  }

  if (themes.length < 2) {
    add(weekday === 0 || weekday === 6 ? 'pacing' : 'finishing work')
  }

  return themes.slice(0, 3)
}

function collectBranchHits(
  todayBranch: number,
  userBranches: Array<{ label: string; index: number }>,
  test: (a: number, b: number) => boolean
): string[] {
  return userBranches.filter((ub) => test(todayBranch, ub.index)).map((ub) => ub.label)
}

/** Structured daily signals for LLM prompts and deterministic fallbacks */
export function getDailySignals(chart: BaziChart, todayDate: string): DailyBaziSignals {
  const [y, m, d] = todayDate.split('-').map(Number)
  const today = calcDayPillar(y, m, d)
  const by = baziYear(y, m, d)
  const bm = baziMonth(m, d)
  const yearP = calcYearPillar(by)
  const monthP = calcMonthPillar(bm, yearP.stemIndex)
  const dmEl = S_EL[chart.day.stemIndex]
  const todayEl = S_EL[today.stemIndex]
  const weekday = new Date(`${todayDate}T12:00:00Z`).getUTCDay()

  const userBranches = [
    { label: 'Year', index: chart.year.branchIndex },
    { label: 'Month', index: chart.month.branchIndex },
    { label: 'Day', index: chart.day.branchIndex },
  ]
  if (chart.hour) userBranches.push({ label: 'Hour', index: chart.hour.branchIndex })

  const clashLabels = collectBranchHits(today.branchIndex, userBranches, isClash)
  const harmonyLabels = collectBranchHits(today.branchIndex, userBranches, isHarmony)
  const punishmentLabels = collectBranchHits(today.branchIndex, userBranches, isPunishment)
  const harmLabels = collectBranchHits(today.branchIndex, userBranches, isHarm)
  const natal = natalStrength(chart)
  const kind = relationKind(dmEl, todayEl)
  const monthKind = relationKind(dmEl, S_EL[monthP.stemIndex])
  const yearKind = relationKind(dmEl, S_EL[yearP.stemIndex])
  const hasFriction = clashLabels.length + punishmentLabels.length + harmLabels.length > 0
  const favorableElement = pickFavorableElement(natal, todayEl, kind, hasFriction)

  return {
    dayMasterElement: dmEl,
    todayElement: todayEl,
    todayAnimal: ANIMALS[today.branchIndex],
    todayPillar: pillarShort(today),
    todayYearPillar: pillarShort(yearP),
    todayMonthPillar: pillarShort(monthP),
    relationKind: kind,
    monthRelationKind: monthKind,
    yearRelationKind: yearKind,
    clashLabels,
    harmonyLabels,
    punishmentLabels,
    harmLabels,
    usefulElements: natal.useful,
    unfavourableElements: natal.unfavourable,
    favorableElement,
    dayMasterStrength: natal.strength,
    strongestThemes: pickStrongestThemes(
      kind,
      monthKind,
      clashLabels,
      harmonyLabels,
      punishmentLabels,
      harmLabels,
      weekday
    ),
    isNeutral: !hasFriction && harmonyLabels.length === 0,
    weekday,
  }
}

function lifeAreasForRelation(kind: DailyRelationKind): string {
  switch (kind) {
    case 'wealth':
      return 'money, spending, deals, exchanging effort for a concrete result'
    case 'output':
      return 'communication, expressing ideas, showing work, writing or speaking'
    case 'resource':
      return 'rest, learning, asking for help, gathering information'
    case 'authority':
      return 'deadlines, rules, bosses/clients, pressure to perform'
    case 'peer':
      return 'collaboration, comparison, matching other people’s pace'
  }
}

/**
 * Lucky colour + numbers derived from today’s useful element — never random.
 */
export function getDailyLuckyRitual(chart: BaziChart, todayDate: string): DailyLuckyRitual {
  const signals = getDailySignals(chart, todayDate)
  const colours = ELEMENT_COLOURS[signals.favorableElement]
  const [y, m, d] = todayDate.split('-').map(Number)
  const today = calcDayPillar(y, m, d)
  const colour = colours[(today.stemIndex + today.branchIndex) % colours.length]
  const fromUseful = ELEMENT_NUMBERS[signals.favorableElement]
  const fromToday = ELEMENT_NUMBERS[signals.todayElement]
  const first = fromUseful[0]
  const second = fromToday[0] === first ? fromToday[1] : fromToday[0]
  const numbers: [number, number] = [first, second === first ? fromUseful[1] : second]
  return {
    colour,
    numbers,
    sourceElement: signals.favorableElement,
  }
}

function describeHits(kind: string, labels: string[]): string[] {
  return labels.map((label) => {
    const area = PILLAR_LIFE_AREA[label] ?? label
    if (kind === 'clash') {
      return `- Friction with natal ${label.toLowerCase()} pillar → ${area} may feel bumpier; slow down, don’t force a confrontation.`
    }
    if (kind === 'harmony') {
      return `- Support with natal ${label.toLowerCase()} pillar → ${area} can move if you keep the action small and concrete.`
    }
    if (kind === 'punishment') {
      return `- Awkward loop with natal ${label.toLowerCase()} pillar → easy to repeat an old pattern in ${area}; change the next small step, not the whole story.`
    }
    return `- Hidden drain with natal ${label.toLowerCase()} pillar → ${area} may leak energy quietly; don’t over-commit there.`
  })
}

// ── Daily BaZi Context (fed to LLM — internal only) ───────────────

export function buildDailyContext(chart: BaziChart, todayDate: string): string {
  const signals = getDailySignals(chart, todayDate)
  const elements = countElements(chart)
  const elSummary = EL_ORDER.map((el) => `${el}: ${elements[el]}`).join(', ')
  const ritual = getDailyLuckyRitual(chart, todayDate)
  const hourLine = chart.hour
    ? `Hour ${pillarShort(chart.hour)} — ${PILLAR_LIFE_AREA.Hour}`
    : 'Hour unknown — skip evening-timing claims that need birth time.'

  const lines = [
    '=== INTERNAL BAZI ANALYSIS (never quote, never teach) ===',
    `Natal self element: ${signals.dayMasterElement} (strength: ${signals.dayMasterStrength})`,
    `Natal element balance: ${elSummary}`,
    `Useful elements today: ${signals.usefulElements.join(', ')}`,
    `Unfavourable elements today: ${signals.unfavourableElements.join(', ')}`,
    `Lucky ritual source element: ${ritual.sourceElement} → colour ${ritual.colour.name} / ${ritual.colour.nameZh}, numbers ${ritual.numbers.join(', ')}`,
    '',
    'Natal pillars and life areas:',
    `- Year ${pillarShort(chart.year)} (${ANIMALS[chart.year.branchIndex]}) — ${PILLAR_LIFE_AREA.Year}`,
    `- Month ${pillarShort(chart.month)} (${ANIMALS[chart.month.branchIndex]}) — ${PILLAR_LIFE_AREA.Month}`,
    `- Day ${pillarShort(chart.day)} (${ANIMALS[chart.day.branchIndex]}) — ${PILLAR_LIFE_AREA.Day}`,
    `- ${hourLine}`,
    '',
    "Today's pillars (the date being read):",
    `- Year ${signals.todayYearPillar} — background tone: ${lifeAreasForRelation(signals.yearRelationKind)}`,
    `- Month ${signals.todayMonthPillar} — this month's overlay: ${lifeAreasForRelation(signals.monthRelationKind)}`,
    `- Day ${signals.todayPillar} (${signals.todayAnimal}) — strongest daily tone: ${lifeAreasForRelation(signals.relationKind)}`,
    '',
    `Today's animal tone: ${signals.todayAnimal} — ${ANIMAL_TONE[signals.todayAnimal] ?? 'mixed pacing'}`,
  ]

  const hits = [
    ...describeHits('clash', signals.clashLabels),
    ...describeHits('harmony', signals.harmonyLabels),
    ...describeHits('punishment', signals.punishmentLabels),
    ...describeHits('harm', signals.harmLabels),
  ]
  if (hits.length > 0) {
    lines.push('', 'Interactions between today and natal chart:')
    lines.push(...hits)
  } else {
    lines.push('', 'No sharp clash/harmony today — the day can feel relatively steady. Still give one specific heads-up from today’s animal + daily tone. Do not say “no signal” or “energy is weak”.')
  }

  lines.push(
    '',
    `Strongest 2–3 signals to write about (do NOT force a full life-area menu): ${signals.strongestThemes.join('; ')}`,
    '=== END INTERNAL BAZI ANALYSIS ==='
  )
  return lines.join('\n')
}

// ── Telegram Display Format ────────────────────────────────────────

import { formatAstroProfile, getAstroProfile } from './astrology'

export function formatCosmicId(profile: BaziProfile, dateOfBirth: string, todayDate: string, language?: string): string {
  const astro = getAstroProfile(dateOfBirth, todayDate)
  const { chart, dayMaster, elements } = profile
  const zh = language === '中文'

  const lines = [
    zh ? '🪪 我的八字' : '🪪 My BaZi',
    '',
    // ── Western Astrology ──
    '✦ WESTERN ASTROLOGY',
    '',
    formatAstroProfile(astro),
    '',
    // ── Chinese BaZi ──
    '✦ CHINESE BAZI (八字)',
    '',
    '📜 Four Pillars:',
  ]

  const pillars: [string, Pillar][] = [
    ['Year', chart.year],
    ['Month', chart.month],
    ['Day', chart.day],
  ]
  if (chart.hour) pillars.push(['Hour', chart.hour])

  for (const [label, p] of pillars) {
    const star = label === 'Day' ? ' ⭐' : ''
    lines.push(
      `${label}: ${STEMS[p.stemIndex]}${BRANCHES[p.branchIndex]}` +
      ` (${STEM_PY[p.stemIndex]} ${BRANCH_PY[p.branchIndex]})` +
      ` — ${S_EL[p.stemIndex]} ${ANIMALS[p.branchIndex]} ${ANIMAL_EMOJI[p.branchIndex]}${star}`
    )
  }

  lines.push(
    '',
    `${EL_EMOJI[dayMaster.element]} Day Master: ${STEMS[dayMaster.stemIndex]} ${STEM_PY[dayMaster.stemIndex]} — ${dayMaster.polarity} ${dayMaster.element}`,
    dayMaster.description,
  )

  lines.push('', '⚖️ Five Elements (BaZi):')
  const maxCount = Math.max(...Object.values(elements), 1)
  for (const el of EL_ORDER) {
    const count = elements[el]
    const bars = Math.round((count / maxCount) * 5)
    const bar = '■'.repeat(bars) + '□'.repeat(5 - bars)
    lines.push(`${EL_EMOJI[el]} ${el}: ${bar} ${count}`)
  }

  if (!chart.hour) {
    lines.push('', zh
      ? '💡 可在 /settings 更新出生时间，以生成完整八字。'
      : '💡 Update your birth time via /settings for a complete chart.')
  }

  lines.push('', 'The Day Pillar (⭐) is the core of your chart — your inner self.')

  return lines.join('\n')
}
