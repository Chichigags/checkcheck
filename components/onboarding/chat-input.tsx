'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Language } from '@/lib/store'

interface ChatInputProps {
  type: 'text' | 'date' | 'select' | 'birthTime' | 'timezone' | 'language' | 'textWithShortcut'
  placeholder?: string
  options?: string[]
  onSubmit: (value: string) => void
  disabled?: boolean
  shortcutLabel?: string
  shortcutValue?: string
}

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
]

export function ChatInput({
  type,
  placeholder,
  options,
  onSubmit,
  disabled,
  shortcutLabel,
  shortcutValue,
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const [customTime, setCustomTime] = useState(false)

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim())
      setValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleOptionClick = (option: string) => {
    onSubmit(option)
  }

  if (type === 'language') {
    const languages: Language[] = ['German', 'Mandarin', 'Japanese', 'Spanish', 'French', 'None']
    return (
      <div className="flex flex-wrap gap-2 p-4">
        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => handleOptionClick(lang)}
            disabled={disabled}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {lang}
          </button>
        ))}
      </div>
    )
  }

  if (type === 'birthTime') {
    const timeOptions = ['Morning', 'Afternoon', 'Evening', 'Unknown']
    
    if (customTime) {
      return (
        <div className="flex items-center gap-2 p-4">
          <Input
            type="time"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="flex-1"
          />
          <Button onClick={handleSubmit} disabled={disabled || !value} size="icon">
            <Send className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => setCustomTime(false)}
            disabled={disabled}
            size="sm"
          >
            Back
          </Button>
        </div>
      )
    }

    return (
      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {timeOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleOptionClick(option)}
              disabled={disabled}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCustomTime(true)}
          disabled={disabled}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Or enter a specific time...
        </button>
      </div>
    )
  }

  if (type === 'select' && options) {
    return (
      <div className="flex flex-wrap gap-2 p-4">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => handleOptionClick(option)}
            disabled={disabled}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {option}
          </button>
        ))}
      </div>
    )
  }

  if (type === 'timezone') {
    return (
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {timezones.map((tz) => (
            <button
              key={tz}
              onClick={() => handleOptionClick(tz)}
              disabled={disabled}
              className={cn(
                'rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left',
                'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {tz.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'textWithShortcut') {
    return (
      <div className="p-4">
        {shortcutLabel && shortcutValue && (
          <button
            onClick={() => handleOptionClick(shortcutValue)}
            disabled={disabled}
            className={cn(
              'mb-3 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {shortcutLabel}
          </button>
        )}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1"
          />
          <Button onClick={handleSubmit} disabled={disabled || !value} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 p-4">
      <Input
        type={type === 'date' ? 'date' : 'text'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
      <Button onClick={handleSubmit} disabled={disabled || !value} size="icon">
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
