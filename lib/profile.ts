export type BirthTime = 'Morning' | 'Afternoon' | 'Evening' | 'Unknown' | string
export type DeliveryTime = 'Morning' | 'Afternoon' | 'Evening'
export type Language = 'German' | 'Mandarin' | 'Japanese' | 'Spanish' | 'French' | 'None'
export type Gender = 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say'
export type RelationshipStatus = 'Single' | 'In a relationship' | 'Married' | 'Divorced' | 'Widowed' | "It's complicated" | 'Prefer not to say'
export type LifeFocus = 'Career' | 'Relationships' | 'Health' | 'Wealth' | 'Personal Growth' | 'Creativity' | 'Spirituality'

export interface UserProfile {
  legalName: string
  nickname: string
  dateOfBirth: string
  birthTime: BirthTime
  birthCity: string
  gender: Gender
  deliveryTime: DeliveryTime
  timezone: string
  languagePreference: Language
  relationshipStatus?: RelationshipStatus
  lifeFocus?: LifeFocus
  currentCity?: string
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

export const onboardingQuestions: QuestionConfig[] = [
  {
    id: 'legalName',
    question: "Hi there! I'm excited to get to know you. Let's start with your legal name. What should I call you officially?",
    type: 'text',
    placeholder: 'Enter your legal name',
  },
  {
    id: 'nickname',
    question: "Great! And what's your preferred nickname? This is what I'll use day-to-day.",
    type: 'text',
    placeholder: 'Enter your nickname',
  },
  {
    id: 'dateOfBirth',
    question: 'When were you born? This helps me personalize your experience.',
    type: 'date',
    placeholder: 'YYYY-MM-DD',
  },
  {
    id: 'birthTime',
    question: 'Do you know what time of day you were born? This is optional but helps with more accurate readings.',
    type: 'birthTime',
    options: ['Morning', 'Afternoon', 'Evening', 'Unknown'],
  },
  {
    id: 'birthCity',
    question: 'Where were you born? Just the city name is fine.',
    type: 'text',
    placeholder: 'Enter your birth city',
  },
  {
    id: 'gender',
    question: 'How do you identify?',
    type: 'select',
    options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
  },
  {
    id: 'deliveryTime',
    question: 'When would you like to receive your daily insights?',
    type: 'select',
    options: ['Morning', 'Afternoon', 'Evening'],
  },
  {
    id: 'timezone',
    question: "What's your timezone? This ensures your insights arrive at the right time.",
    type: 'timezone',
    placeholder: 'Select your timezone',
  },
  {
    id: 'languagePreference',
    question: 'Are you learning any of these languages? I can incorporate them into your experience.',
    type: 'language',
    options: ['German', 'Mandarin', 'Japanese', 'Spanish', 'French', 'None'],
  },
]

export const layer2Questions: QuestionConfig[] = [
  {
    id: 'relationshipStatus',
    question: "I'd love to learn a bit more about you! What's your current relationship status?",
    type: 'select',
    options: ['Single', 'In a relationship', "It's complicated", 'Prefer not to say'],
  },
  {
    id: 'lifeFocus',
    question: 'What area of life are you most focused on right now?',
    type: 'select',
    options: ['Career', 'Relationships', 'Health', 'Wealth', 'Personal Growth'],
  },
  {
    id: 'currentCity',
    question: 'Where are you currently living? This helps me tailor local insights for you.',
    type: 'textWithShortcut',
    placeholder: 'Enter your current city',
    shortcutLabel: 'Same as birth city',
  },
]
