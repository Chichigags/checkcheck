'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/lib/store'
import { generateMockMessage, type DailyMessage } from '@/lib/generate-mock-message'
import { DailyMessageCard } from '@/components/daily-message-card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Settings, Calendar, CheckCheck } from 'lucide-react'
import Link from 'next/link'

interface HistoryEntry {
  date: string
  dayOfWeek: string
  formattedDate: string
  message: DailyMessage
}

function CollapsedRow({ 
  entry, 
  isExpanded, 
  onToggle 
}: { 
  entry: HistoryEntry
  isExpanded: boolean
  onToggle: () => void 
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full text-left"
    >
      <div className="flex items-center gap-3 p-4 bg-background rounded-xl shadow-sm hover:shadow-md transition-shadow border border-border">
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-shrink-0">
          <div 
            className="h-6 w-6 rounded-full shadow-inner"
            style={{ backgroundColor: entry.message.luckyColour.hex }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{entry.dayOfWeek}</span>
            <span className="text-xs text-muted-foreground">{entry.formattedDate}</span>
          </div>
          <p className="text-sm text-muted-foreground truncate leading-relaxed">
            {entry.message.dailyLuck}
          </p>
        </div>
      </div>
    </button>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Calendar className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-2">No history yet</h3>
      <p className="text-sm text-muted-foreground">
        Your first CheckCheck arrives tomorrow
      </p>
    </div>
  )
}

export default function HistoryPage() {
  const router = useRouter()
  const { userProfile } = useUserStore()
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  // Generate 7 days of mock history
  const historyEntries = useMemo(() => {
    if (!userProfile) return []

    const entries: HistoryEntry[] = []
    const today = new Date()

    for (let i = 1; i <= 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const message = generateMockMessage(userProfile, dateStr)
      
      entries.push({
        date: dateStr,
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
        formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        message,
      })
    }

    return entries
  }, [userProfile])

  const toggleExpanded = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }

  // Redirect if not onboarded
  if (!userProfile) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <Link href="/today" className="flex items-center gap-2">
            <CheckCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">CheckCheck</span>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Message History</h1>
          <p className="text-sm text-muted-foreground">Your past daily readings</p>
        </div>

        {historyEntries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {historyEntries.map((entry) => {
              const isExpanded = expandedDates.has(entry.date)
              return (
                <div key={entry.date}>
                  <CollapsedRow
                    entry={entry}
                    isExpanded={isExpanded}
                    onToggle={() => toggleExpanded(entry.date)}
                  />
                  {isExpanded && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <DailyMessageCard message={entry.message} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex items-center justify-around max-w-lg mx-auto py-2">
          <Link href="/today">
            <Button variant="ghost" size="sm" className="flex-col h-auto py-2">
              <CheckCheck className="h-5 w-5 mb-1" />
              <span className="text-xs">Today</span>
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="flex-col h-auto py-2 text-primary">
            <Calendar className="h-5 w-5 mb-1" />
            <span className="text-xs">History</span>
          </Button>
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
