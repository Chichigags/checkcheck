export type BirthTime = 'Morning' | 'Noon' | 'Afternoon' | 'Evening' | 'Night' | 'Unknown' | string
export type DeliveryTime = 'Morning' | 'Afternoon' | 'Evening'
/** UI / message language for the whole CheckCheck experience */
export type AppLanguage = 'English' | '中文'
/** @deprecated Kept for older stored payloads; prefer AppLanguage */
export type Language = AppLanguage | 'German' | 'Mandarin' | 'Japanese' | 'Spanish' | 'French' | 'Indonesian' | 'None'
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
  /** App UI + daily message language */
  languagePreference: AppLanguage
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

/** Bilingual first question — shown before language is chosen */
export const LANGUAGE_QUESTION: QuestionConfig = {
  id: 'languagePreference',
  question: 'Choose your language / 请选择语言',
  type: 'language',
  options: ['English', '中文'],
}

function englishQuestions(): QuestionConfig[] {
  return [
    LANGUAGE_QUESTION,
    {
      id: 'nickname',
      question: "What should I call you?\n\nThis is the name I'll use in your daily Check Check.",
      type: 'text',
      placeholder: 'Your name',
    },
    {
      id: 'dateOfBirth',
      question: 'When were you born?\n\nPlease use the Gregorian calendar, not the lunar calendar.\nFormat: YYYY-MM-DD',
      type: 'date',
      placeholder: 'YYYY-MM-DD',
    },
    {
      id: 'birthTime',
      question: 'What time were you born?\n\nYour birth time helps make your BaZi reading more accurate.\nEnter the exact time in 24-hour format (HH or HH:MM), or choose:',
      type: 'birthTime',
      options: ['Morning', 'Noon', 'Afternoon', 'Evening', 'Night', "I don't know"],
    },
    {
      id: 'birthCity',
      question: 'Where were you born?\n\nFormat: City, Country\nExample: Beijing, China',
      type: 'text',
      placeholder: 'City, Country',
    },
    {
      id: 'gender',
      question: "What's your gender?",
      type: 'select',
      options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
    },
    {
      id: 'currentCity',
      question: 'Where do you live now?\n\nThis helps Check Check calculate your daily reading based on your current location, local date, and timezone.\n\nFormat: City, Country\nExample: Singapore, Singapore',
      type: 'text',
      placeholder: 'City, Country',
    },
  ]
}

function chineseQuestions(): QuestionConfig[] {
  return [
    LANGUAGE_QUESTION,
    {
      id: 'nickname',
      question: '我应该怎么称呼你？\n\n之后每天的 Check Check 都会用这个名字称呼你。',
      type: 'text',
      placeholder: '你的称呼',
    },
    {
      id: 'dateOfBirth',
      question: '你的出生日期是什么？\n\n请使用公历，不要填写农历。\n格式：YYYY-MM-DD',
      type: 'date',
      placeholder: 'YYYY-MM-DD',
    },
    {
      id: 'birthTime',
      question: '你是什么时间出生的？\n\n准确的出生时间可以帮助我们更准确地计算你的八字。\n请输入 24 小时制的准确时间（HH 或 HH:MM），或者选择：',
      type: 'birthTime',
      options: ['早晨', '中午', '下午', '晚上', '深夜', '不知道'],
    },
    {
      id: 'birthCity',
      question: '你出生在哪里？\n\n格式：城市，国家\n例如：北京，中国',
      type: 'text',
      placeholder: '城市，国家',
    },
    {
      id: 'gender',
      question: '你的性别是？',
      type: 'select',
      options: ['男', '女', '非二元性别', '不愿透露'],
    },
    {
      id: 'currentCity',
      question: '你现在居住在哪个城市？\n\n我们会根据你当前所在地的日期、时间和时区来计算每天的 Check Check。\n\n格式：城市，国家\n例如：新加坡，新加坡',
      type: 'text',
      placeholder: '城市，国家',
    },
  ]
}

/** Full 7-question onboarding, localized after language is known */
export function getOnboardingQuestions(language?: AppLanguage | string | null): QuestionConfig[] {
  if (language === '中文') return chineseQuestions()
  return englishQuestions()
}

/** Default export for web store / early boot before language is chosen */
export const onboardingQuestions: QuestionConfig[] = englishQuestions()

/** Layer 2 kept for legacy profiles mid-flow; not part of new onboarding */
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

export const WELCOME_MESSAGE = `Hi there / 你好

Welcome to CheckCheck — your daily cosmic cheat sheet.
欢迎来到 CheckCheck — 你的每日宇宙小抄。

First, pick a language.`

export const LAYER2_INTRO = "Nice — core onboarding done! Just 2 more quick ones to make your readings even more personal."

export const COMPLETION_MESSAGE = `You're all set ✨

Your first Check Check is ready.

Type /today for today's reading, or /help to see all commands.`

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

/** Map localized onboarding answers to canonical stored values */
export function canonicalizeGender(value: string): Gender | null {
  const v = value.trim().toLowerCase()
  const map: Record<string, Gender> = {
    male: 'Male',
    female: 'Female',
    'non-binary': 'Non-binary',
    nonbinary: 'Non-binary',
    'prefer not to say': 'Prefer not to say',
    '男': 'Male',
    '女': 'Female',
    '非二元性别': 'Non-binary',
    '不愿透露': 'Prefer not to say',
  }
  return map[v] ?? map[value.trim()] ?? null
}

export function canonicalizeBirthTimeOption(value: string): string | null {
  const v = value.trim().toLowerCase()
  const map: Record<string, string> = {
    morning: 'Morning',
    noon: 'Noon',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night',
    "i don't know": 'Unknown',
    "i dont know": 'Unknown',
    unknown: 'Unknown',
    '早晨': 'Morning',
    '中午': 'Noon',
    '下午': 'Afternoon',
    '晚上': 'Evening',
    '深夜': 'Night',
    '不知道': 'Unknown',
  }
  return map[v] ?? map[value.trim()] ?? null
}

export function canonicalizeAppLanguage(value: string): AppLanguage | null {
  const v = value.trim().toLowerCase()
  if (v === 'english' || v === 'en') return 'English'
  if (v === '中文' || v === 'zh' || v === 'chinese' || v === 'cn') return '中文'
  if (value.trim() === '中文') return '中文'
  if (value.trim() === 'English') return 'English'
  return null
}
