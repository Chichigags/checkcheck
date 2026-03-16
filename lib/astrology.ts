/**
 * Western astrology calculations — Sun sign, Moon phase, and Sun transit.
 * No external dependencies; uses astronomical formulas and reference points.
 */

export interface ZodiacSign {
  name: string
  symbol: string
  element: string
  modality: string
  rulingPlanet: string
  dateRange: string
  trait: string
}

export interface MoonPhaseInfo {
  name: string
  emoji: string
  illumination: string
  meaning: string
}

export interface AstroProfile {
  sunSign: ZodiacSign
  currentSunTransit: ZodiacSign
  moonPhase: MoonPhaseInfo
}

// ── Zodiac Signs ───────────────────────────────────────────────────

const ZODIAC: ZodiacSign[] = [
  { name: 'Aries', symbol: '♈', element: 'Fire', modality: 'Cardinal', rulingPlanet: 'Mars', dateRange: 'Mar 21 – Apr 19', trait: 'Bold, ambitious, and fiercely independent.' },
  { name: 'Taurus', symbol: '♉', element: 'Earth', modality: 'Fixed', rulingPlanet: 'Venus', dateRange: 'Apr 20 – May 20', trait: 'Grounded, loyal, and drawn to life\'s finer things.' },
  { name: 'Gemini', symbol: '♊', element: 'Air', modality: 'Mutable', rulingPlanet: 'Mercury', dateRange: 'May 21 – Jun 20', trait: 'Curious, adaptable, and effortlessly social.' },
  { name: 'Cancer', symbol: '♋', element: 'Water', modality: 'Cardinal', rulingPlanet: 'Moon', dateRange: 'Jun 21 – Jul 22', trait: 'Intuitive, nurturing, and emotionally deep.' },
  { name: 'Leo', symbol: '♌', element: 'Fire', modality: 'Fixed', rulingPlanet: 'Sun', dateRange: 'Jul 23 – Aug 22', trait: 'Charismatic, creative, and born to shine.' },
  { name: 'Virgo', symbol: '♍', element: 'Earth', modality: 'Mutable', rulingPlanet: 'Mercury', dateRange: 'Aug 23 – Sep 22', trait: 'Analytical, practical, and quietly brilliant.' },
  { name: 'Libra', symbol: '♎', element: 'Air', modality: 'Cardinal', rulingPlanet: 'Venus', dateRange: 'Sep 23 – Oct 22', trait: 'Diplomatic, aesthetic, and harmony-seeking.' },
  { name: 'Scorpio', symbol: '♏', element: 'Water', modality: 'Fixed', rulingPlanet: 'Pluto', dateRange: 'Oct 23 – Nov 21', trait: 'Intense, perceptive, and magnetically powerful.' },
  { name: 'Sagittarius', symbol: '♐', element: 'Fire', modality: 'Mutable', rulingPlanet: 'Jupiter', dateRange: 'Nov 22 – Dec 21', trait: 'Adventurous, philosophical, and endlessly optimistic.' },
  { name: 'Capricorn', symbol: '♑', element: 'Earth', modality: 'Cardinal', rulingPlanet: 'Saturn', dateRange: 'Dec 22 – Jan 19', trait: 'Disciplined, strategic, and quietly unstoppable.' },
  { name: 'Aquarius', symbol: '♒', element: 'Air', modality: 'Fixed', rulingPlanet: 'Uranus', dateRange: 'Jan 20 – Feb 18', trait: 'Visionary, independent, and refreshingly unconventional.' },
  { name: 'Pisces', symbol: '♓', element: 'Water', modality: 'Mutable', rulingPlanet: 'Neptune', dateRange: 'Feb 19 – Mar 20', trait: 'Dreamy, compassionate, and deeply creative.' },
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
  { name: 'New Moon', emoji: '🌑', illumination: '0%', meaning: 'Fresh starts and intention setting.' },
  { name: 'Waxing Crescent', emoji: '🌒', illumination: '1-49%', meaning: 'Building momentum and planting seeds.' },
  { name: 'First Quarter', emoji: '🌓', illumination: '50%', meaning: 'Decision time — take action on intentions.' },
  { name: 'Waxing Gibbous', emoji: '🌔', illumination: '51-99%', meaning: 'Refine and adjust before the peak.' },
  { name: 'Full Moon', emoji: '🌕', illumination: '100%', meaning: 'Culmination, clarity, and release.' },
  { name: 'Waning Gibbous', emoji: '🌖', illumination: '99-51%', meaning: 'Gratitude and sharing wisdom.' },
  { name: 'Last Quarter', emoji: '🌗', illumination: '50%', meaning: 'Letting go and forgiving.' },
  { name: 'Waning Crescent', emoji: '🌘', illumination: '49-1%', meaning: 'Rest, reflect, and prepare for renewal.' },
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

export function formatAstroProfile(profile: AstroProfile): string {
  const { sunSign, moonPhase } = profile

  const lines = [
    `${sunSign.symbol} Sun Sign: ${sunSign.name}`,
    `${ELEMENT_EMOJI[sunSign.element]} Element: ${sunSign.element} | ${sunSign.modality}`,
    `🪐 Ruling Planet: ${sunSign.rulingPlanet}`,
    sunSign.trait,
  ]

  lines.push(
    '',
    `${moonPhase.emoji} Current Moon: ${moonPhase.name}`,
    moonPhase.meaning,
  )

  return lines.join('\n')
}
