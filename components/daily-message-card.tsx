'use client'

import type { DailyMessage, TriggeredModule } from '@/lib/generate-mock-message'
import { languageFlags } from '@/lib/generate-mock-message'
import { Sparkles, AlertTriangle, PartyPopper, Heart, Briefcase, Swords, Moon, Orbit } from 'lucide-react'

interface DailyMessageCardProps {
  message: DailyMessage
}

function ModuleIcon({ type }: { type: TriggeredModule['type'] }) {
  const iconProps = { className: 'h-4 w-4' }
  switch (type) {
    case 'romance':
      return <Heart {...iconProps} />
    case 'career':
      return <Briefcase {...iconProps} />
    case 'conflict':
      return <Swords {...iconProps} />
    case 'lunar':
      return <Moon {...iconProps} />
    case 'transit':
      return <Orbit {...iconProps} />
  }
}

function TriggeredModuleCard({ module }: { module: TriggeredModule }) {
  const getBgColor = (type: TriggeredModule['type']) => {
    switch (type) {
      case 'romance':
        return 'bg-pink-50'
      case 'career':
        return 'bg-blue-50'
      case 'conflict':
        return 'bg-orange-50'
      case 'lunar':
        return 'bg-indigo-50'
      case 'transit':
        return 'bg-purple-50'
    }
  }

  const getIconColor = (type: TriggeredModule['type']) => {
    switch (type) {
      case 'romance':
        return 'text-pink-500'
      case 'career':
        return 'text-blue-500'
      case 'conflict':
        return 'text-orange-500'
      case 'lunar':
        return 'text-indigo-500'
      case 'transit':
        return 'text-purple-500'
    }
  }

  return (
    <div className={`rounded-lg p-3 ${getBgColor(module.type)}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={getIconColor(module.type)}>
          <ModuleIcon type={module.type} />
        </span>
        <span className="font-medium text-sm text-foreground">{module.title}</span>
        {module.type === 'lunar' && (
          <span className="text-xs text-muted-foreground ml-auto">{module.phase}</span>
        )}
        {module.type === 'transit' && (
          <span className="text-xs text-muted-foreground ml-auto">{module.planet}</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{module.message}</p>
    </div>
  )
}

export function DailyMessageCard({ message }: DailyMessageCardProps) {
  const formattedDate = new Date(message.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="w-full max-w-[380px] mx-auto">
      <div className="bg-background rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b border-border">
          <p className="text-xs text-muted-foreground">{formattedDate}</p>
          <h2 className="font-semibold text-foreground">
            Good day, {message.nickname}!
          </h2>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Lucky Colour */}
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

          {/* Daily Luck */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-sm text-foreground">Daily Luck</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{message.dailyLuck}</p>
          </div>

          {/* Watch Out */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="font-medium text-sm text-foreground">Watch Out</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{message.watchOut}</p>
          </div>

          {/* Daily Fun */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PartyPopper className="h-4 w-4 text-green-500" />
              <span className="font-medium text-sm text-foreground">Daily Fun</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{message.dailyFun}</p>
          </div>

          {/* Triggered Modules */}
          {message.triggeredModules.length > 0 && (
            <div className="flex flex-col gap-2">
              {message.triggeredModules.map((module, index) => (
                <TriggeredModuleCard key={`${module.type}-${index}`} module={module} />
              ))}
            </div>
          )}

          {/* Daily Word */}
          {message.dailyWord && (
            <>
              <div className="border-t border-border" />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{languageFlags[message.dailyWord.language]}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Word of the Day
                  </span>
                </div>
                <p className="font-semibold text-foreground">{message.dailyWord.word}</p>
                {message.dailyWord.pronunciation && (
                  <p className="text-xs text-muted-foreground italic mb-1">
                    /{message.dailyWord.pronunciation}/
                  </p>
                )}
                <p className="text-sm text-muted-foreground">{message.dailyWord.translation}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
