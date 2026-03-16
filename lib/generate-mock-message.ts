import type { UserProfile, Language } from './profile'

// Triggered module types
export interface RomanceModule {
  type: 'romance'
  title: string
  message: string
}

export interface CareerModule {
  type: 'career'
  title: string
  message: string
}

export interface ConflictModule {
  type: 'conflict'
  title: string
  message: string
}

export interface LunarModule {
  type: 'lunar'
  title: string
  phase: string
  message: string
}

export interface TransitModule {
  type: 'transit'
  title: string
  planet: string
  message: string
}

export type TriggeredModule = RomanceModule | CareerModule | ConflictModule | LunarModule | TransitModule

export interface DailyWord {
  language: Language
  word: string
  translation: string
  pronunciation?: string
}

export interface DailyMessage {
  date: string
  nickname: string
  todayVibe: string
  luckyColour: {
    name: string
    hex: string
  }
  luckyNumber: number[]
  dailyLuck: string
  watchOut: string
  dailyFun: string
  dailyInspiration?: string
  dailyWord?: DailyWord
  triggeredModules: TriggeredModule[]
}

// Deterministic seeding based on date + DOB
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

// Seeded random number generator
function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index) * 10000
  return x - Math.floor(x)
}

// Data pools
const luckyColours = [
  { name: 'Sage Green', hex: '#9CAF88' },
  { name: 'Coral', hex: '#FF7F7F' },
  { name: 'Ocean Blue', hex: '#0077B6' },
  { name: 'Golden Yellow', hex: '#FFD700' },
  { name: 'Lavender', hex: '#E6E6FA' },
]

const dailyLuckMessages = [
  "A chance encounter today could spark something meaningful. Keep your eyes open!",
  "Your intuition is especially sharp today. Trust those gut feelings.",
  "Something you've been waiting for is finally on its way. Patience pays off.",
  "A small act of kindness will come back to you in unexpected ways.",
  "Creative energy is flowing your way. Perfect day to start something new.",
]

const watchOutMessages = [
  "Double-check important details before sending — Mercury's energy is tricky today.",
  "Avoid making big financial decisions before the weekend.",
  "Your patience may be tested around 3pm. Take a breath.",
  "Don't overcommit to social plans. Leave room for rest.",
  "Be mindful of miscommunication with close friends today.",
]

const dailyFunMessages = [
  "If you were a pizza topping, you'd definitely be extra cheese — because you're that good.",
  "Fun fact: The universe is 13.8 billion years old and it chose today to give you good vibes.",
  "Your vibe today: main character energy with a hint of cozy cat.",
  "Plot twist: You're actually the lucky charm in someone else's day.",
  "Today's mood: like a cinnamon roll — warm, sweet, and universally loved.",
]

const inspirationQuotes = [
  '"The only way to do great work is to love what you do." — Steve Jobs',
  '"In the middle of difficulty lies opportunity." — Albert Einstein',
  '"What you seek is seeking you." — Rumi',
  '"Be yourself; everyone else is already taken." — Oscar Wilde',
  '"The best time to plant a tree was 20 years ago. The second best time is now." — Chinese Proverb',
]

const dailyWords: Record<Exclude<Language, 'None'>, { word: string; translation: string; pronunciation?: string }[]> = {
  German: [
    { word: 'Fernweh', translation: 'A longing for distant places', pronunciation: 'FERN-vay' },
    { word: 'Gemütlichkeit', translation: 'Cozy contentment', pronunciation: 'geh-MOOT-lish-kite' },
    { word: 'Weltschmerz', translation: 'World-weariness', pronunciation: 'VELT-shmertz' },
    { word: 'Schadenfreude', translation: 'Joy from others\' misfortune', pronunciation: 'SHAH-den-froy-duh' },
    { word: 'Wanderlust', translation: 'Desire to travel', pronunciation: 'VAN-der-loost' },
  ],
  Mandarin: [
    { word: '缘分 (Yuánfèn)', translation: 'Fateful coincidence', pronunciation: 'ywan-fen' },
    { word: '加油 (Jiāyóu)', translation: 'Keep going! / You can do it!', pronunciation: 'jya-yo' },
    { word: '心动 (Xīndòng)', translation: 'Heart flutter', pronunciation: 'shin-dong' },
    { word: '随缘 (Suíyuán)', translation: 'Go with the flow', pronunciation: 'sway-ywan' },
    { word: '默契 (Mòqì)', translation: 'Unspoken understanding', pronunciation: 'moh-chee' },
  ],
  Japanese: [
    { word: '木漏れ日 (Komorebi)', translation: 'Sunlight through leaves', pronunciation: 'koh-moh-reh-bee' },
    { word: 'わびさび (Wabi-sabi)', translation: 'Beauty in imperfection', pronunciation: 'wah-bee sah-bee' },
    { word: '頑張れ (Ganbare)', translation: 'Do your best!', pronunciation: 'gahn-bah-reh' },
    { word: '一期一会 (Ichigo ichie)', translation: 'Once in a lifetime encounter', pronunciation: 'ee-chee-go ee-chee-eh' },
    { word: '生きがい (Ikigai)', translation: 'Reason for being', pronunciation: 'ee-kee-guy' },
  ],
  Spanish: [
    { word: 'Sobremesa', translation: 'Time spent chatting after a meal', pronunciation: 'soh-breh-MEH-sah' },
    { word: 'Estrenar', translation: 'To wear something for the first time', pronunciation: 'ehs-treh-NAR' },
    { word: 'Querencia', translation: 'A place where you feel safe', pronunciation: 'keh-REN-see-ah' },
    { word: 'Madrugada', translation: 'The early hours before dawn', pronunciation: 'mah-droo-GAH-dah' },
    { word: 'Duende', translation: 'The spirit of art and passion', pronunciation: 'DWEN-deh' },
  ],
  French: [
    { word: 'Flâner', translation: 'To stroll aimlessly', pronunciation: 'flah-NAY' },
    { word: 'Dépaysement', translation: 'Disorientation from being somewhere new', pronunciation: 'day-pay-eez-MON' },
    { word: 'Retrouvailles', translation: 'The joy of reuniting', pronunciation: 'reh-troov-EYE' },
    { word: 'Épanouir', translation: 'To bloom or flourish', pronunciation: 'ay-pah-noo-EER' },
    { word: 'Ennui', translation: 'A feeling of listless boredom', pronunciation: 'on-WEE' },
  ],
  Indonesian: [
    { word: 'Jayus', translation: 'A joke so unfunny it becomes funny', pronunciation: 'JAH-yoos' },
    { word: 'Semangat', translation: 'Spirit, enthusiasm, keep going!', pronunciation: 'seh-MANG-at' },
    { word: 'Rindu', translation: 'A deep longing or missing someone', pronunciation: 'RIN-doo' },
    { word: 'Gotong royong', translation: 'Working together as a community', pronunciation: 'GO-tong ROY-ong' },
    { word: 'Baper', translation: 'Getting overly emotional (bawa perasaan)', pronunciation: 'BAH-per' },
  ],
}

const romanceModules: Omit<RomanceModule, 'type'>[] = [
  { title: 'Love Alert', message: 'Venus is sending flirty vibes your way. Someone might catch your eye today.' },
  { title: 'Heart Check', message: 'A good day for honest conversations with your partner.' },
  { title: 'Cupid\'s Note', message: 'Single? Keep your DMs open. Taken? Plan something spontaneous.' },
]

const careerModules: Omit<CareerModule, 'type'>[] = [
  { title: 'Career Boost', message: 'An opportunity for recognition is coming. Speak up in that meeting.' },
  { title: 'Work Wisdom', message: 'Focus on one big task rather than many small ones today.' },
  { title: 'Professional Edge', message: 'A connection you make today could open doors later.' },
]

const conflictModules: Omit<ConflictModule, 'type'>[] = [
  { title: 'Tension Alert', message: 'Mars energy is strong. Pick your battles wisely today.' },
  { title: 'Conflict Caution', message: 'Avoid heated discussions before lunch. Energy shifts later.' },
  { title: 'Peace Tip', message: 'If something bothers you, wait 24 hours before responding.' },
]

const lunarModules: Omit<LunarModule, 'type'>[] = [
  { title: 'Moon Message', phase: 'Waxing Crescent', message: 'Time to set intentions and plant seeds for growth.' },
  { title: 'Lunar Insight', phase: 'Full Moon', message: 'Emotions run high. Great for release and celebration.' },
  { title: 'Moon Wisdom', phase: 'Waning Gibbous', message: 'Reflect on recent wins. Gratitude amplifies luck.' },
]

const transitModules: Omit<TransitModule, 'type'>[] = [
  { title: 'Cosmic Transit', planet: 'Mercury', message: 'Communication flows easily. Great day for important conversations.' },
  { title: 'Planetary Shift', planet: 'Jupiter', message: 'Expansion energy is present. Think big today.' },
  { title: 'Celestial Move', planet: 'Saturn', message: 'Discipline and structure pay off. Stay focused.' },
]

const languageFlags: Record<Exclude<Language, 'None'>, string> = {
  German: '🇩🇪',
  Mandarin: '🇨🇳',
  Japanese: '🇯🇵',
  Spanish: '🇪🇸',
  French: '🇫🇷',
  Indonesian: '🇮🇩',
}

export function generateMockMessage(profile: UserProfile, customDate?: string): DailyMessage {
  const dateToUse = customDate || new Date().toISOString().split('T')[0]
  const seed = createSeed(dateToUse, profile.dateOfBirth)
  
  // Pick from pools using deterministic seed
  const colourIndex = Math.floor(seededRandom(seed, 0) * luckyColours.length)
  const luckIndex = Math.floor(seededRandom(seed, 1) * dailyLuckMessages.length)
  const watchIndex = Math.floor(seededRandom(seed, 2) * watchOutMessages.length)
  const funIndex = Math.floor(seededRandom(seed, 3) * dailyFunMessages.length)
  
  // Build daily inspiration if enabled
  let dailyInspiration: string | undefined
  if (profile.dailyInspiration) {
    const inspIndex = Math.floor(seededRandom(seed, 20) * inspirationQuotes.length)
    dailyInspiration = inspirationQuotes[inspIndex]
  }

  // Build daily word if language preference is set
  let dailyWord: DailyWord | undefined
  if (profile.languagePreference && profile.languagePreference !== 'None') {
    const words = dailyWords[profile.languagePreference]
    const wordIndex = Math.floor(seededRandom(seed, 4) * words.length)
    const selectedWord = words[wordIndex]
    dailyWord = {
      language: profile.languagePreference,
      word: selectedWord.word,
      translation: selectedWord.translation,
      pronunciation: selectedWord.pronunciation,
    }
  }
  
  // Randomly include 0-2 triggered modules
  const triggeredModules: TriggeredModule[] = []
  const numTriggered = Math.floor(seededRandom(seed, 5) * 3) // 0, 1, or 2
  
  const allTriggeredPools = [
    { pool: romanceModules, type: 'romance' as const },
    { pool: careerModules, type: 'career' as const },
    { pool: conflictModules, type: 'conflict' as const },
    { pool: lunarModules, type: 'lunar' as const },
    { pool: transitModules, type: 'transit' as const },
  ]
  
  // Shuffle and pick triggered modules
  const shuffledPools = [...allTriggeredPools].sort(
    (a, b) => seededRandom(seed, 6 + allTriggeredPools.indexOf(a)) - seededRandom(seed, 6 + allTriggeredPools.indexOf(b))
  )
  
  for (let i = 0; i < numTriggered && i < shuffledPools.length; i++) {
    const { pool, type } = shuffledPools[i]
    const itemIndex = Math.floor(seededRandom(seed, 10 + i) * pool.length)
    const item = pool[itemIndex]
    
    if (type === 'lunar') {
      triggeredModules.push({ type, ...item } as LunarModule)
    } else if (type === 'transit') {
      triggeredModules.push({ type, ...item } as TransitModule)
    } else {
      triggeredModules.push({ type, ...item } as TriggeredModule)
    }
  }
  
  const vibeMessages = [
    'Trust the slow build — it\'s working.',
    'Say yes to the unexpected today.',
    'Small wins count. Collect them.',
    'Your energy is magnetic today — use it wisely.',
    'Less overthinking, more doing.',
    'The universe is conspiring in your favour.',
    'Stay curious. Something good is brewing.',
    'Let it flow — don\'t force it.',
  ]
  const vibeIndex = Math.floor(seededRandom(seed, 21) * vibeMessages.length)
  const num1 = Math.floor(seededRandom(seed, 22) * 99) + 1
  const num2 = Math.floor(seededRandom(seed, 23) * 99) + 1

  return {
    date: dateToUse,
    nickname: profile.nickname || profile.legalName,
    todayVibe: vibeMessages[vibeIndex],
    luckyColour: luckyColours[colourIndex],
    luckyNumber: [num1, num2 === num1 ? ((num2 % 99) + 1) : num2],
    dailyLuck: dailyLuckMessages[luckIndex],
    watchOut: watchOutMessages[watchIndex],
    dailyFun: dailyFunMessages[funIndex],
    dailyInspiration,
    dailyWord,
    triggeredModules,
  }
}

export { languageFlags }
