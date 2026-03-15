'use client'

import { cn } from '@/lib/utils'

interface ChatMessageProps {
  message: string
  isBot: boolean
  isTyping?: boolean
}

export function ChatMessage({ message, isBot, isTyping }: ChatMessageProps) {
  return (
    <div
      className={cn(
        'flex w-full',
        isBot ? 'justify-start' : 'justify-end'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
          isBot
            ? 'bg-secondary text-secondary-foreground rounded-bl-sm'
            : 'bg-primary text-primary-foreground rounded-br-sm'
        )}
      >
        {isTyping ? (
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <p className="text-pretty leading-relaxed">{message}</p>
        )}
      </div>
    </div>
  )
}
