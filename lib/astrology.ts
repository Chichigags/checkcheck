/**
 * Western astrology calculations — Sun sign, Moon phase, and Sun transit.
 * No external dependencies; uses astronomical formulas and reference points.
 */

export interface ZodiacSign {
  name: string
  nameZh: string
  symbol: string
  element: string
  elementZh: string
  modality: string
  modalityZh: string
  rulingPlanet: string
  rulingPlanetZh: string
  dateRange: string
  trait: string
  traitZh: string
}

export interface MoonPhaseInfo {
  name: string
  nameZh: string
  emoji: string
  illumination: string
  meaning: string
  meaningZh: string
}

export interface AstroProfile {
  sunSign: ZodiacSign
  currentSunTransit: ZodiacSign
  moonPhase: MoonPhaseInfo
}

// ── Zodiac Signs ───────────────────────────────────────────────────

const ZODIAC: ZodiacSign[] = [
  { name: 'Aries', nameZh: '白羊座', symbol: '♈', element: 'Fire', elementZh: '火', modality: 'Cardinal', modalityZh: '基本', rulingPlanet: 'Mars', rulingPlanetZh: '火星', dateRange: 'Mar 21 – Apr 19', trait: 'Bold, ambitious, and fiercely independent.', traitZh: '大胆、有冲劲，很独立。' },
  { name: 'Taurus', nameZh: '金牛座', symbol: '♉', element: 'Earth', elementZh: '土', modality: 'Fixed', modalityZh: '固定', rulingPlanet: 'Venus', rulingPlanetZh: '金星', dateRange: 'Apr 20 – May 20', trait: 'Grounded, loyal, and drawn to life\'s finer things.', traitZh: '踏实、忠诚，喜欢舒服和美好的东西。' },
  { name: 'Gemini', nameZh: '双子座', symbol: '♊', element: 'Air', elementZh: '风', modality: 'Mutable', modalityZh: '变动', rulingPlanet: 'Mercury', rulingPlanetZh: '水星', dateRange: 'May 21 – Jun 20', trait: 'Curious, adaptable, and effortlessly social.', traitZh: '好奇、灵活，跟人聊天很自然。' },
  { name: 'Cancer', nameZh: '巨蟹座', symbol: '♋', element: 'Water', elementZh: '水', modality: 'Cardinal', modalityZh: '基本', rulingPlanet: 'Moon', rulingPlanetZh: '月亮', dateRange: 'Jun 21 – Jul 22', trait: 'Intuitive, nurturing, and emotionally deep.', traitZh: '直觉强、会照顾人，感受很深。' },
  { name: 'Leo', nameZh: '狮子座', symbol: '♌', element: 'Fire', elementZh: '火', modality: 'Fixed', modalityZh: '固定', rulingPlanet: 'Sun', rulingPlanetZh: '太阳', dateRange: 'Jul 23 – Aug 22', trait: 'Charismatic, creative, and born to shine.', traitZh: '有魅力、爱表现，天生想发光。' },
  { name: 'Virgo', nameZh: '处女座', symbol: '♍', element: 'Earth', elementZh: '土', modality: 'Mutable', modalityZh: '变动', rulingPlanet: 'Mercury', rulingPlanetZh: '水星', dateRange: 'Aug 23 – Sep 22', trait: 'Analytical, practical, and quietly brilliant.', traitZh: '细心、务实，做事讲究。' },
  { name: 'Libra', nameZh: '天秤座', symbol: '♎', element: 'Air', elementZh: '风', modality: 'Cardinal', modalityZh: '基本', rulingPlanet: 'Venus', rulingPlanetZh: '金星', dateRange: 'Sep 23 – Oct 22', trait: 'Diplomatic, aesthetic, and harmony-seeking.', traitZh: '爱平衡、讲究美感，不想起冲突。' },
  { name: 'Scorpio', nameZh: '天蝎座', symbol: '♏', element: 'Water', elementZh: '水', modality: 'Fixed', modalityZh: '固定', rulingPlanet: 'Pluto', rulingPlanetZh: '冥王星', dateRange: 'Oct 23 – Nov 21', trait: 'Intense, perceptive, and magnetically powerful.', traitZh: '感受深、看得透，气场强。' },
  { name: 'Sagittarius', nameZh: '射手座', symbol: '♐', element: 'Fire', elementZh: '火', modality: 'Mutable', modalityZh: '变动', rulingPlanet: 'Jupiter', rulingPlanetZh: '木星', dateRange: 'Nov 22 – Dec 21', trait: 'Adventurous, philosophical, and endlessly optimistic.', traitZh: '爱探索、看得开，乐观。' },
  { name: 'Capricorn', nameZh: '摩羯座', symbol: '♑', element: 'Earth', elementZh: '土', modality: 'Cardinal', modalityZh: '基本', rulingPlanet: 'Saturn', rulingPlanetZh: '土星', dateRange: 'Dec 22 – Jan 19', trait: 'Disciplined, strategic, and quietly unstoppable.', traitZh: '有纪律、会规划，慢慢把事做成。' },
  { name: 'Aquarius', nameZh: '水瓶座', symbol: '♒', element: 'Air', elementZh: '风', modality: 'Fixed', modalityZh: '固定', rulingPlanet: 'Uranus', rulingPlanetZh: '天王星', dateRange: 'Jan 20 – Feb 18', trait: 'Visionary, independent, and refreshingly unconventional.', traitZh: '想法多、独立，不太走寻常路。' },
  { name: 'Pisces', nameZh: '双鱼座', symbol: '♓', element: 'Water', elementZh: '水', modality: 'Mutable', modalityZh: '变动', rulingPlanet: 'Neptune', rulingPlanetZh: '海王星', dateRange: 'Feb 19 – Mar 20', trait: 'Dreamy, compassionate, and deeply creative.', traitZh: '爱想象、心软，很有感受力。' },
]

const ELEMENT_EMOJI: Record<string, string> = { Fire: '🔥', Earth: '🌍', Air: '💨', Water: '🌊' }

// Sun sign boundaries as [month, day] — the date the sign STARTS
const SIGN_STARTS: [number, number][] = [
  [3, 21],  // Aries
  [4, 20],  // Taurus
  [5, 21],  // Gemini
  [6, 21],  // Cancer
  [7, 23],  // Leo
  [8, 23],  // Virgo
  [9, 23],  // Libra
  [10, 23], // Scorpio
  [11, 22], // Sagittarius
  [12, 22], // Capricorn
  [1, 20],  // Aquarius
  [2, 19],  // Pisces
]

// ── Moon Phase ─────────────────────────────────────────────────────

const SYNODIC_MONTH = 29.53059
// Reference new moon: January 6, 2000 18:14 UTC (JDE 2451550.26)
const REF_NEW_MOON_JD = 2451550.26

const MOON_PHASES: MoonPhaseInfo[] = [
  { name: 'New Moon', nameZh: '新月', emoji: '🌑', illumination: '0%', meaning: 'Fresh starts and intention setting.', meaningZh: '适合重新开始，把想做的事想清楚。' },
  { name: 'Waxing Crescent', nameZh: '娥眉月', emoji: '🌒', illumination: '1-49%', meaning: 'Building momentum and planting seeds.', meaningZh: '适合慢慢推进，把事情铺开。' },
  { name: 'First Quarter', nameZh: '上弦月', emoji: '🌓', illumination: '50%', meaning: 'Decision time — take action on intentions.', meaningZh: '适合做决定，把想法付诸行动。' },
  { name: 'Waxing Gibbous', nameZh: '盈凸月', emoji: '🌔', illumination: '51-99%', meaning: 'Refine and adjust before the peak.', meaningZh: '适合调整细节，把事情做完整。' },
  { name: 'Full Moon', nameZh: '满月', emoji: '🌕', illumination: '100%', meaning: 'Culmination, clarity, and release.', meaningZh: '事情更容易看清，也适合放下。' },
  { name: 'Waning Gibbous', nameZh: '亏凸月', emoji: '🌖', illumination: '99-51%', meaning: 'Gratitude and sharing wisdom.', meaningZh: '适合复盘、分享，把经验留下来。' },
  { name: 'Last Quarter', nameZh: '下弦月', emoji: '🌗', illumination: '50%', meaning: 'Letting go and forgiving.', meaningZh: '适合收尾、放手，不要硬撑。' },
  { name: 'Waning Crescent', nameZh: '残月', emoji: '🌘', illumination: '49-1%', meaning: 'Rest, reflect, and prepare for renewal.', meaningZh: '适合休息、整理，为下一轮做准备。' },
]

// ── Calculations ───────────────────────────────────────────────────

function julianDay(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12)
  const yr = y + 4800 - a
  const mo = m + 12 * a - 3
  return d + Math.floor((153 * mo + 2) / 5) + 365 * yr +
    Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045
}

function mmdd(m: number, d: number): number { return m * 100 + d }

export function getSunSign(dateOfBirth: string): ZodiacSign {
  const [, m, d] = dateOfBirth.split('-').map(Number)
  const v = mmdd(m, d)

  // Check each sign boundary in order
  // Capricorn spans year boundary (Dec 22 – Jan 19)
  if (v >= mmdd(3, 21) && v < mmdd(4, 20)) return ZODIAC[0]   // Aries
  if (v >= mmdd(4, 20) && v < mmdd(5, 21)) return ZODIAC[1]   // Taurus
  if (v >= mmdd(5, 21) && v < mmdd(6, 21)) return ZODIAC[2]   // Gemini
  if (v >= mmdd(6, 21) && v < mmdd(7, 23)) return ZODIAC[3]   // Cancer
  if (v >= mmdd(7, 23) && v < mmdd(8, 23)) return ZODIAC[4]   // Leo
  if (v >= mmdd(8, 23) && v < mmdd(9, 23)) return ZODIAC[5]   // Virgo
  if (v >= mmdd(9, 23) && v < mmdd(10, 23)) return ZODIAC[6]  // Libra
  if (v >= mmdd(10, 23) && v < mmdd(11, 22)) return ZODIAC[7] // Scorpio
  if (v >= mmdd(11, 22) && v < mmdd(12, 22)) return ZODIAC[8] // Sagittarius
  if (v >= mmdd(12, 22)) return ZODIAC[9]                      // Capricorn
  if (v < mmdd(1, 20)) return ZODIAC[9]                        // Capricorn
  if (v >= mmdd(1, 20) && v < mmdd(2, 19)) return ZODIAC[10]  // Aquarius
  return ZODIAC[11]                                             // Pisces
}

export function getMoonPhase(dateStr: string): MoonPhaseInfo {
  const [y, m, d] = dateStr.split('-').map(Number)
  const jd = julianDay(y, m, d)
  const daysSinceRef = jd - REF_NEW_MOON_JD
  const cyclePosition = ((daysSinceRef % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH
  const phaseIndex = Math.floor((cyclePosition / SYNODIC_MONTH) * 8)
  return MOON_PHASES[Math.min(phaseIndex, 7)]
}

/** What zodiac sign the Sun is currently transiting on a given date. */
export function getSunTransit(dateStr: string): ZodiacSign {
  return getSunSign(dateStr)
}

// ── Public API ─────────────────────────────────────────────────────

export function getAstroProfile(dateOfBirth: string, todayDate: string): AstroProfile {
  return {
    sunSign: getSunSign(dateOfBirth),
    currentSunTransit: getSunTransit(todayDate),
    moonPhase: getMoonPhase(todayDate),
  }
}

// ── Daily Context for LLM ──────────────────────────────────────────

export function buildAstroContext(dateOfBirth: string, todayDate: string): string {
  const profile = getAstroProfile(dateOfBirth, todayDate)
  const { sunSign, currentSunTransit, moonPhase } = profile

  const lines = [
    '=== Western Astrology Analysis ===',
    `Sun Sign: ${sunSign.symbol} ${sunSign.name} (${sunSign.element}, ${sunSign.modality})`,
    `Ruling Planet: ${sunSign.rulingPlanet}`,
    `Personality: ${sunSign.trait}`,
    '',
    `Today's Sun Transit: ${currentSunTransit.symbol} Sun in ${currentSunTransit.name} (${currentSunTransit.element})`,
    `Moon Phase: ${moonPhase.emoji} ${moonPhase.name} — ${moonPhase.meaning}`,
  ]

  // Element interaction between natal sun and current transit
  if (sunSign.element === currentSunTransit.element) {
    lines.push(`Element synergy: Both ${sunSign.element} — amplified energy, feel at home.`)
  } else {
    const interaction = elementInteraction(sunSign.element, currentSunTransit.element)
    lines.push(`Element dynamic: Natal ${sunSign.element} meets transit ${currentSunTransit.element} — ${interaction}`)
  }

  lines.push('=== End Astrology Analysis ===')
  return lines.join('\n')
}

function elementInteraction(natal: string, transit: string): string {
  const harmonious: Record<string, string> = {
    'Fire-Air': 'energizing and expansive, ideas catch fire.',
    'Air-Fire': 'energizing and expansive, ideas catch fire.',
    'Earth-Water': 'nurturing and productive, growth comes naturally.',
    'Water-Earth': 'nurturing and productive, growth comes naturally.',
  }
  const challenging: Record<string, string> = {
    'Fire-Water': 'tension between passion and emotion — channel both wisely.',
    'Water-Fire': 'tension between passion and emotion — channel both wisely.',
    'Earth-Air': 'practical meets abstract — ground your ideas to make them real.',
    'Air-Earth': 'practical meets abstract — ground your ideas to make them real.',
  }
  const neutral: Record<string, string> = {
    'Fire-Earth': 'passion meets practicality — build something lasting.',
    'Earth-Fire': 'passion meets practicality — build something lasting.',
    'Air-Water': 'mind meets heart — let intuition guide your thinking.',
    'Water-Air': 'mind meets heart — let intuition guide your thinking.',
  }

  const key = `${natal}-${transit}`
  return harmonious[key] ?? challenging[key] ?? neutral[key] ?? 'mixed energies at play.'
}

// ── Telegram Display Format ────────────────────────────────────────

export function formatAstroProfile(profile: AstroProfile, language?: string): string {
  const { sunSign, moonPhase } = profile
  const zh = language === '中文' || language === 'zh' || language === 'Chinese'

  if (zh) {
    return [
      `${sunSign.symbol} 太阳星座：${sunSign.nameZh}`,
      `${ELEMENT_EMOJI[sunSign.element]} 元素：${sunSign.elementZh} | ${sunSign.modalityZh}`,
      `🪐 守护星：${sunSign.rulingPlanetZh}`,
      sunSign.traitZh,
      '',
      `${moonPhase.emoji} 当前月相：${moonPhase.nameZh}`,
      moonPhase.meaningZh,
    ].join('\n')
  }

  return [
    `${sunSign.symbol} Sun Sign: ${sunSign.name}`,
    `${ELEMENT_EMOJI[sunSign.element]} Element: ${sunSign.element} | ${sunSign.modality}`,
    `🪐 Ruling Planet: ${sunSign.rulingPlanet}`,
    sunSign.trait,
    '',
    `${moonPhase.emoji} Current Moon: ${moonPhase.name}`,
    moonPhase.meaning,
  ].join('\n')
}
