export type BirthTime = 'Morning' | 'Noon' | 'Afternoon' | 'Evening' | 'Night' | 'Unknown' | string
export type DeliveryTime = 'Morning' | 'Afternoon' | 'Evening'
export type Language = 'German' | 'Mandarin' | 'Japanese' | 'Spanish' | 'French' | 'Indonesian' | 'None'
export type Gender = 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say'
export type RelationshipStatus = 'Single' | 'In a relationship' | 'Married' | 'Divorced' | 'Widowed' | "It's complicated" | 'Prefer not to say'
export type LifeFocus = 'Career' | 'Relationships' | 'Health' | 'Wealth' | 'Personal Growth' | 'Others' | 'Creativity' | 'Spirituality'

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

export type QuestionType = 'text' | 'date' | 'birthTime' | 'select' | 'timezone' | 'language' | 'textWithShortcut'

export interface QuestionConfig {
  id: keyof UserProfile
  question: string
  type: QuestionType
  placeholder?: string
  options?: string[]
  shortcutLabel?: string
}

export const WELCOME_MESSAGE = `Hi there, welcome to CheckCheck — your daily cosmic cheat sheet, blending Chinese BaZi and Western astrology into one punchy message. No fluff, just the good stuff.

I just need to know you a bit first. The more accurate, the better your reading — you can always tweak things later.`

export const onboardingQuestions: QuestionConfig[] = [
  {
    id: 'legalName',
    question: "What's your legal full name?",
    type: 'text',
    placeholder: 'Enter your legal name',
  },
  {
    id: 'nickname',
    question: "And what should I call you? This is what I'll use day-to-day.",
    type: 'text',
    placeholder: 'Enter your nickname',
  },
  {
    id: 'dateOfBirth',
    question: "What's your date of birth?\nPlease use the Gregorian calendar (the standard international one, not lunar).\nFormat: YYYY-MM-DD",
    type: 'date',
    placeholder: 'YYYY-MM-DD',
  },
  {
    id: 'birthTime',
    question: "What time were you born? This helps make your reading more accurate.\nEnter exact time in 24h format (HH:MM), or pick:",
    type: 'birthTime',
    options: ['Morning', 'Noon', 'Afternoon', 'Evening', 'Night', 'I don\'t know'],
  },
  {
    id: 'birthCity',
    question: "Where were you born? Your birthplace helps anchor your chart.\nFormat: City, Country",
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
    question: 'Where do you live now?\nFormat: City, Country\ne.g. Singapore, Singapore',
    type: 'textWithShortcut',
    placeholder: 'City, Country',
    shortcutLabel: 'Same',
  },
  {
    id: 'languagePreference',
    question: 'Almost done! Want a Word of the Day? Pick up a new language, one word at a time 📖',
    type: 'select',
    options: ['German', 'Mandarin', 'Japanese', 'Spanish', 'French', 'Indonesian', 'No thanks'],
  },
]

export const layer2Questions: QuestionConfig[] = [
  {
    id: 'relationshipStatus',
    question: "What's your current relationship status?",
    type: 'select',
    options: ['Single', 'In a relationship', "It's complicated", 'Prefer not to say'],
  },
  {
    id: 'lifeFocus',
    question: 'What area of life are you most focused on right now?',
    type: 'select',
    options: ['Career', 'Relationships', 'Health', 'Wealth', 'Personal Growth', 'Others'],
  },
]

export const LAYER2_INTRO = "Nice — core onboarding done! Just 2 more quick ones to make your readings even more personal."

export const COMPLETION_MESSAGE = `You're all set — the cosmos is now calibrated to you 🎉

Your personalised CheckCheck arrives tomorrow morning. Open the menu anytime to get today's reading now.`

export const DELIVERY_TIME_LABELS: Record<DeliveryTime, string> = {
  Morning: '8:00 AM',
  Afternoon: '12:00 PM',
  Evening: '7:00 PM',
}

export function deliveryLabelToSlot(label: string): DeliveryTime | null {
  const normalized = label.trim().toLowerCase()
  if (normalized === '8:00 am' || normalized === '8am' || normalized === '08:00' || normalized === '8:00' || normalized === 'morning') return 'Morning'
  if (normalized === '12:00 pm' || normalized === '12pm' || normalized === '12:00' || normalized === 'noon' || normalized === 'afternoon') return 'Afternoon'
  if (normalized === '7:00 pm' || normalized === '7pm' || normalized === '19:00' || normalized === 'evening') return 'Evening'
  return null
}

