'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/lib/store'
import { generateMockMessage, type DailyMessage } from '@/lib/generate-mock-message'
import { DailyMessageCard } from '@/components/daily-message-card'
import { Layer2Onboarding } from '@/components/onboarding/layer2-onboarding'
import { Button } from '@/components/ui/button'
import { RefreshCw, Settings, Calendar, CheckCheck } from 'lucide-react'
import Link from 'next/link'

export default function TodayPage() {
  const router = useRouter()
  const { userProfile } = useUserStore()
  const [message, setMessage] = useState<DailyMessage | null>(null)
  const [showLayer2, setShowLayer2] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  // Format today's date
  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  // Mock lunar date
  const lunarDate = '二月十七'

  const generateMessage = useCallback((randomDate?: string) => {
    if (!userProfile) return
    const newMessage = generateMockMessage(userProfile, randomDate)
    setMessage(newMessage)
  }, [userProfile])

  useEffect(() => {
    // Redirect to onboarding if no profile exists
    if (!userProfile) {
      router.push('/')
      return
    }

    // Generate today's message
    generateMessage()

    // Check if layer 2 should be shown
    if (!userProfile.hasCompletedLayer2) {
      setShowLayer2(true)
    }
  }, [userProfile, router, generateMessage])

  const handleRegenerate = () => {
    setIsRegenerating(true)
    // Use a random past date for testing different messages
    const daysAgo = Math.floor(Math.random() * 30) + 1
    const randomDate = new Date()
    randomDate.setDate(randomDate.getDate() - daysAgo)
    generateMessage(randomDate.toISOString().split('T')[0])
    setTimeout(() => setIsRegenerating(false), 500)
  }

  const handleLayer2Complete = () => {
    setShowLayer2(false)
  }

  if (!userProfile || !message) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-primary-foreground"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M9 11l3 3L22 4" />
                <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" />
              </svg>
            </div>
            <span className="font-semibold">CheckCheck</span>
          </div>
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Greeting section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Good {getTimeOfDay()}, {userProfile.nickname}
          </h1>
          <p className="text-muted-foreground mt-1">
            {formattedDate} · <span className="font-medium">{lunarDate}</span>
          </p>
        </div>

        {/* Layer 2 onboarding (if needed) */}
        {showLayer2 && (
          <Layer2Onboarding onComplete={handleLayer2Complete} />
        )}

        {/* Daily message card */}
        <DailyMessageCard message={message} />

        {/* Regenerate button (for testing) */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="text-muted-foreground"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate (Demo)
          </Button>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex items-center justify-around max-w-lg mx-auto py-2">
          <Button variant="ghost" size="sm" className="flex-col h-auto py-2 text-primary">
            <CheckCheck className="h-5 w-5 mb-1" />
            <span className="text-xs">Today</span>
          </Button>
          <Link href="/history">
            <Button variant="ghost" size="sm" className="flex-col h-auto py-2">
              <Calendar className="h-5 w-5 mb-1" />
              <span className="text-xs">History</span>
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="flex-col h-auto py-2">
              <Settings className="h-5 w-5 mb-1" />
              <span className="text-xs">Settings</span>
            </Button>
          </Link>
        </div>
      </nav>

      {/* Bottom padding for nav */}
      <div className="h-20" />
    </div>
  )
}

function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
