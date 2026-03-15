import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile } from './profile'
import { onboardingQuestions, layer2Questions } from './profile'

export type {
  BirthTime,
  DeliveryTime,
  Gender,
  Language,
  LifeFocus,
  QuestionConfig,
  QuestionType,
  RelationshipStatus,
  UserProfile,
} from './profile'

export { onboardingQuestions, layer2Questions }

interface OnboardingState {
  step: number
  profile: Partial<UserProfile>
  isComplete: boolean
}

interface UserStore {
  onboarding: OnboardingState
  userProfile: UserProfile | null
  
  // Onboarding actions
  setOnboardingStep: (step: number) => void
  updateOnboardingProfile: (field: keyof UserProfile, value: string) => void
  completeOnboarding: () => void
  resetOnboarding: () => void
  
  // Profile actions
  updateProfileField: (field: keyof UserProfile, value: string) => void
  completeLayer2: () => void
  resetLayer2: () => void
}

const initialOnboardingState: OnboardingState = {
  step: 0,
  profile: {},
  isComplete: false,
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      onboarding: initialOnboardingState,
      userProfile: null,

      setOnboardingStep: (step) =>
        set((state) => ({
          onboarding: { ...state.onboarding, step },
        })),

      updateOnboardingProfile: (field, value) =>
        set((state) => ({
          onboarding: {
            ...state.onboarding,
            profile: { ...state.onboarding.profile, [field]: value },
          },
        })),

      completeOnboarding: () => {
        const { onboarding } = get()
        set({
          onboarding: { ...onboarding, isComplete: true },
          userProfile: onboarding.profile as UserProfile,
        })
      },

      resetOnboarding: () =>
        set({
          onboarding: initialOnboardingState,
          userProfile: null,
        }),

      updateProfileField: (field, value) =>
        set((state) => ({
          userProfile: state.userProfile
            ? { ...state.userProfile, [field]: value }
            : null,
        })),

      completeLayer2: () =>
        set((state) => ({
          userProfile: state.userProfile
            ? { ...state.userProfile, hasCompletedLayer2: true }
            : null,
        })),

      resetLayer2: () =>
        set((state) => ({
          userProfile: state.userProfile
            ? { ...state.userProfile, hasCompletedLayer2: false, relationshipStatus: undefined, lifeFocus: undefined, currentCity: undefined }
            : null,
        })),
    }),
    {
      name: 'user-profile-storage',
    }
  )
)
