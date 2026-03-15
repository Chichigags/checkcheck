'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/lib/store'
import { OnboardingChat } from '@/components/onboarding/onboarding-chat'

export default function Home() {
  const router = useRouter()
  const { onboarding } = useUserStore()

  useEffect(() => {
    // If onboarding is complete, redirect to today's reading
    if (onboarding.isComplete) {
      router.push('/today')
    }
  }, [onboarding.isComplete, router])

  // Show onboarding if not complete
  if (!onboarding.isComplete) {
    return <OnboardingChat />
  }

  return null
}
