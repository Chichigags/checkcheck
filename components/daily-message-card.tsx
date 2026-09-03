'use client'

import type { DailyMessage, DailyModule } from '@/lib/generate-mock-message'
import { Sparkles } from 'lucide-react'

interface DailyMessageCardProps {
  message: DailyMessage
}

function ModuleBlock({ module }: { module: DailyModule }) {
  return (
    <div className="rounded-lg p-3 bg-muted/40">
      <p className="font-medium text-sm text-foreground mb-1">{module.title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{module.message}</p>
    </div>
  )
}

export function DailyMessageCard({ message }: DailyMessageCardProps) {
  const formattedDate = new Date(`${message.date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const headline = message.headline || message.todayVibe
  const modules = message.modules ?? []
  const numbers = message.luckyNumber?.join(', ') ?? '7, 23'

  return (
    <div className="w-full max-w-[380px] mx-auto">
      <div className="bg-background rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b border-border">
          <p className="text-xs text-muted-foreground">{formattedDate}</p>
          <h2 className="font-semibold text-foreground">{message.nickname}</h2>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {headline && (
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground leading-relaxed">{headline}</p>
            </div>
          )}

          {message.body && (
            <p className="text-sm text-muted-foreground leading-relaxed">{message.body}</p>
          )}

          {modules.length > 0 ? (
            <div className="flex flex-col gap-2">
              {modules.map((module, index) => (
                <ModuleBlock key={`${module.type}-${index}`} module={module} />
              ))}
            </div>
          ) : (
            <>
              {message.dailyLuck && (
                <p className="text-sm text-muted-foreground leading-relaxed">{message.dailyLuck}</p>
              )}
              {message.watchOut && (
                <p className="text-sm text-muted-foreground leading-relaxed">{message.watchOut}</p>
              )}
            </>
          )}

          <div className="border-t border-border pt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded-full shadow-inner flex-shrink-0"
                style={{ backgroundColor: message.luckyColour.hex }}
              />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Lucky Colour</p>
                <p className="font-medium text-foreground">{message.luckyColour.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Lucky Number</p>
              <p className="font-medium text-foreground">{numbers}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
