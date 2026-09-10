'use client'

import type { DailyMessage } from '@/lib/generate-mock-message'
import { isChinese, normalizeAppLanguage, t } from '@/lib/i18n'

interface DailyMessageCardProps {
  message: DailyMessage
}

function paragraphsFromMessage(message: DailyMessage): string[] {
  if (message.paragraphs && message.paragraphs.length > 0) {
    return message.paragraphs.filter(Boolean).slice(0, 3)
  }
  const collected: string[] = []
  if (message.body) {
    collected.push(...message.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean))
  }
  for (const module of message.modules ?? []) {
    if (module.message.trim()) collected.push(module.message.trim())
  }
  if (collected.length > 0) return collected.slice(0, 3)
  return [message.dailyLuck, message.watchOut].filter((p): p is string => Boolean(p)).slice(0, 3)
}

export function DailyMessageCard({ message }: DailyMessageCardProps) {
  const lang = normalizeAppLanguage(message.language)
  const zh = isChinese(lang)
  const takeaway = message.headline || message.todayVibe || ''
  const dateLabel = t.formatDailyDate(message.date, lang)
  const headline = takeaway
    ? `${dateLabel}${zh ? '｜' : ' | '}${takeaway}`
    : dateLabel
  const paragraphs = paragraphsFromMessage(message)
  const numbers = message.luckyNumber ?? []
  const numberText = zh ? numbers.join('、') : numbers.join(', ')
  const sep = zh ? '：' : ': '

  return (
    <div className="w-full max-w-[380px] mx-auto">
      <div className="bg-background rounded-2xl shadow-lg overflow-hidden">
        <div
          className="h-16 w-full"
          style={{ backgroundColor: message.luckyColour.hex }}
        />

        <div className="p-4 flex flex-col gap-4">
          <h2 className="font-semibold text-foreground leading-snug">{headline}</h2>

          {paragraphs.map((paragraph, index) => (
            <p key={index} className="text-sm text-foreground/80 leading-relaxed">
              {paragraph}
            </p>
          ))}

          <div className="border-t border-border pt-3 flex flex-col gap-1 text-sm">
            <p>🎨 {t.luckyColour(lang)}{sep}{message.luckyColour.name}</p>
            <p>🔢 {t.luckyNumber(lang)}{sep}{numberText || (zh ? '5、1' : '5, 1')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
