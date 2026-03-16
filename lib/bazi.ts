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

/**
 * Five Elements relationship between the Day Master and another element.
 * Based on the generating (相生) and controlling (相克) cycles.
 */
function elementRelation(dm: BaziElement, other: BaziElement): string {
  if (dm === other) return 'Peer (比肩) — similar energy, support or competition'
  const di = EL_ORDER.indexOf(dm)
  const oi = EL_ORDER.indexOf(other)
  if ((di + 1) % 5 === oi) return 'Output (食伤) — creative, expressive, may drain stamina'
  if ((oi + 1) % 5 === di) return 'Resource (印星) — supportive, nurturing, helpful energy'
  if ((di + 2) % 5 === oi) return 'Wealth (财星) — opportunity and reward, requires effort'
  return 'Authority (官杀) — discipline, external pressure, but also growth'
}

function pillarShort(p: Pillar): string {
  return `${STEMS[p.stemIndex]}${BRANCHES[p.branchIndex]}`
}

// ── Daily BaZi Context (fed to LLM) ───────────────────────────────

export function buildDailyContext(chart: BaziChart, todayDate: string): string {
  const [y, m, d] = todayDate.split('-').map(Number)
  const today = calcDayPillar(y, m, d)
  const bm = baziMonth(m, d)
  const by = baziYear(y, m, d)
  const monthP = calcMonthPillar(bm, calcYearPillar(by).stemIndex)

  const dm = chart.day.stemIndex
  const rel = elementRelation(S_EL[dm], S_EL[today.stemIndex])

  const userBranches = [
    { label: 'Year', index: chart.year.branchIndex },
    { label: 'Month', index: chart.month.branchIndex },
    { label: 'Day', index: chart.day.branchIndex },
  ]
  if (chart.hour) userBranches.push({ label: 'Hour', index: chart.hour.branchIndex })

  const clashes: string[] = []
  const harmonies: string[] = []
  for (const ub of userBranches) {
    if (isClash(today.branchIndex, ub.index)) {
      clashes.push(`Today's ${BRANCHES[today.branchIndex]} (${ANIMALS[today.branchIndex]}) CLASHES with user's ${ub.label} ${BRANCHES[ub.index]} (${ANIMALS[ub.index]}) — tension in ${ub.label.toLowerCase()}-related matters`)
    }
    if (isHarmony(today.branchIndex, ub.index)) {
      harmonies.push(`Today's ${BRANCHES[today.branchIndex]} (${ANIMALS[today.branchIndex]}) HARMONIZES with user's ${ub.label} ${BRANCHES[ub.index]} (${ANIMALS[ub.index]}) — smooth energy in ${ub.label.toLowerCase()}-related matters`)
    }
  }

  const elements = countElements(chart)
  const elSummary = EL_ORDER.map(el => `${el}: ${elements[el]}`).join(', ')

  const lines = [
    '=== Computed BaZi (八字) Analysis ===',
    `Day Master: ${STEMS[dm]} ${STEM_PY[dm]} (${S_POL[dm]} ${S_EL[dm]}) — ${DM_DESC[dm]}`,
    `Birth pillars: Year ${pillarShort(chart.year)} (${ANIMALS[chart.year.branchIndex]}), Month ${pillarShort(chart.month)}, Day ${pillarShort(chart.day)}${chart.hour ? `, Hour ${pillarShort(chart.hour)}` : ''}`,
    `Element balance: ${elSummary}`,
    '',
    `Today's Day Pillar: ${pillarShort(today)} (${S_POL[today.stemIndex]} ${S_EL[today.stemIndex]}, ${ANIMALS[today.branchIndex]})`,
    `Today → Day Master interaction: ${rel}`,
  ]

  if (clashes.length > 0) {
    lines.push('')
    clashes.forEach(c => lines.push(`⚠️ ${c}`))
  }
  if (harmonies.length > 0) {
    lines.push('')
    harmonies.forEach(h => lines.push(`✅ ${h}`))
  }
  if (clashes.length === 0 && harmonies.length === 0) {
    lines.push('No major branch clashes or harmonies today — neutral flow.')
  }

  lines.push('', `Current month energy: ${pillarShort(monthP)} (${S_EL[monthP.stemIndex]} ${ANIMALS[monthP.branchIndex]})`)
  lines.push('=== End BaZi Analysis ===')
  return lines.join('\n')
}

// ── Telegram Display Format ────────────────────────────────────────

export function formatBaziChart(profile: BaziProfile): string {
  const { chart, dayMaster, elements } = profile

  const lines = [
    '🏮 Your BaZi Chart (八字命盘)',
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

  lines.push('', '⚖️ Five Elements:')
  const maxCount = Math.max(...Object.values(elements), 1)
  for (const el of EL_ORDER) {
    const count = elements[el]
    const bars = Math.round((count / maxCount) * 5)
    const bar = '■'.repeat(bars) + '□'.repeat(5 - bars)
    lines.push(`${EL_EMOJI[el]} ${el}: ${bar} ${count}`)
  }

  if (!chart.hour) {
    lines.push('', '💡 Tip: Update your birth time via /settings for a more complete chart (Hour Pillar).')
  }

  lines.push('', 'The Day Pillar (⭐) represents your core inner self.')

  return lines.join('\n')
}
