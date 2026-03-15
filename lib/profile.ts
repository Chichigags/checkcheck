export type BirthTime = 'Morning' | 'Noon' | 'Afternoon' | 'Evening' | 'Night' | 'Unknown' | string
export type DeliveryTime = 'Morning' | 'Afternoon' | 'Evening'
export type Language = 'German' | 'Mandarin' | 'Japanese' | 'Spanish' | 'French' | 'None'
export type Gender = 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say'
export type RelationshipStatus = 'Single' | 'In a relationship' | 'Married' | 'Divorced' | 'Widowed' | "It's complicated" | 'Prefer not to say'
export type LifeFocus = 'Career' | 'Relationships' | 'Health' | 'Wealth' | 'Personal Growth' | 'Creativity' | 'Spirituality'
export type DailyExtras = 'A' | 'B' | 'both' | 'C'

export interface UserProfile {
  legalName: string
  nickname: string
  dateOfBirth: string
  birthTime: BirthTime
  birthCity: string
  gender: Gender
  currentCity: string
  deliveryTime: DeliveryTime
  timezone: string
  dailyInspiration: boolean
  languagePreference: Language
  relationshipStatus?: RelationshipStatus
  lifeFocus?: LifeFocus
  hasCompletedLayer2?: boolean
}

export type QuestionType = 'text' | 'date' | 'birthTime' | 'select' | 'timezone' | 'language' | 'textWithShortcut' | 'extras'

export interface QuestionConfig {
  id: keyof UserProfile
  question: string
  type: QuestionType
  placeholder?: string
  options?: string[]
  shortcutLabel?: string
}

export const WELCOME_MESSAGE = `Welcome to CheckCheck ✅✅ — your personal daily fortune digest, blending Chinese BaZi and Western astrology into one punchy morning message.

Your readings are fully personalised — so please use your real details. The more accurate, the better your daily CheckCheck. You can always update anything later with /edit.`

export const onboardingQuestions: QuestionConfig[] = [
  {
    id: 'legalName',
    question: "What's your legal full name?",
    type: 'text',
    placeholder: 'Enter your legal name',
  },
  {
    id: 'nickname',
    question: "What should I call you? (first name or nickname)",
    type: 'text',
    placeholder: 'Enter your nickname',
  },
  {
    id: 'dateOfBirth',
    question: "Birthday? Solar calendar please — not lunar.\nFormat: YYYY-MM-DD\ne.g. 1987-01-03",
    type: 'date',
    placeholder: 'YYYY-MM-DD',
  },
  {
    id: 'birthTime',
    question: "Birth time? This improves reading accuracy quite a bit.\nEnter exact time in 24hr format: HH:MM\nOr pick an approximate:",
    type: 'birthTime',
    options: ['Morning', 'Noon', 'Afternoon', 'Evening', 'Night', 'Unknown'],
  },
  {
    id: 'birthCity',
    question: "Where were you born?\nFormat: City, Country\ne.g. Beijing, China or Paris, France",
    type: 'text',
    placeholder: 'City, Country',
  },
  {
    id: 'gender',
    question: 'Gender?',
    type: 'select',
    options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
  },
  {
    id: 'currentCity',
    question: 'Where do you live now?\nFormat: City, Country — or reply "Same" if unchanged.\ne.g. Singapore, Singapore',
    type: 'textWithShortcut',
    placeholder: 'City, Country',
    shortcutLabel: 'Same',
  },
  {
    id: 'deliveryTime',
    question: 'What time should your CheckCheck arrive each day? (Local time)',
    type: 'select',
    options: ['07:00', '14:00', '19:00'],
  },
  {
    id: 'dailyInspiration',
    question: `Almost done! Any daily extras?
💬 A — Daily Inspiration (a short quote to start your day)
📖 B — Word of the Day (if you're learning a new language)
🙅 C — No thanks

Reply A, B, both, or C`,
    type: 'extras',
  },
  {
    id: 'languagePreference',
    question: 'Which language are you learning?',
    type: 'language',
    options: ['German', 'Mandarin', 'Japanese', 'Spanish', 'French'],
  },
]

export const layer2Questions: QuestionConfig[] = [
  {
    id: 'relationshipStatus',
    question: "Want more personalised readings? What's your current relationship status?",
    type: 'select',
    options: ['Single', 'In a relationship', "It's complicated", 'Prefer not to say'],
  },
  {
    id: 'lifeFocus',
    question: 'What area of life are you most focused on right now?',
    type: 'select',
    options: ['Career', 'Relationships', 'Health', 'Wealth', 'Personal Growth'],
  },
]

export const COMPLETION_MESSAGE = `You're all set! 🎉 Your first CheckCheck arrives tomorrow at your chosen time.

Type /today for today's reading, or /help to see all commands.`

export const DELIVERY_TIME_LABELS: Record<DeliveryTime, string> = {
  Morning: '07:00',
  Afternoon: '14:00',
  Evening: '19:00',
}

export function deliveryLabelToSlot(label: string): DeliveryTime | null {
  const normalized = label.trim().toLowerCase()
  if (normalized === '07:00' || normalized === '7:00' || normalized === 'morning') return 'Morning'
  if (normalized === '14:00' || normalized === 'afternoon') return 'Afternoon'
  if (normalized === '19:00' || normalized === 'evening') return 'Evening'
  return null
}

export function parseExtrasAnswer(answer: string): { inspiration: boolean; wantLanguage: boolean } {
  const normalized = answer.trim().toLowerCase()
  if (normalized === 'a') return { inspiration: true, wantLanguage: false }
  if (normalized === 'b') return { inspiration: false, wantLanguage: true }
  if (normalized === 'both' || normalized === 'ab' || normalized === 'a and b' || normalized === 'a, b' || normalized === 'a b') {
    return { inspiration: true, wantLanguage: true }
  }
  if (normalized === 'c' || normalized === 'no' || normalized === 'none' || normalized === 'no thanks') {
    return { inspiration: false, wantLanguage: false }
  }
  return { inspiration: false, wantLanguage: false }
}
