'use client'

import { useState, useRef, useEffect } from 'react'
import { useUserStore } from '@/lib/store'
import { generateMockMessage } from '@/lib/generate-mock-message'
import { DailyMessageCard } from '@/components/daily-message-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Bot, User, Terminal } from 'lucide-react'

type MessageType = 'user' | 'bot' | 'card'

interface ChatMessage {
  id: string
  type: MessageType
  content: string
  cardMessage?: ReturnType<typeof generateMockMessage>
}

// Editable fields mapping
const editableFields: Record<string, string> = {
  nickname: 'nickname',
  name: 'legalName',
  birthday: 'dateOfBirth',
  birthtime: 'birthTime',
  birthcity: 'birthCity',
  city: 'currentCity',
  gender: 'gender',
  delivery: 'deliveryTime',
  timezone: 'timezone',
  language: 'languagePreference',
  relationship: 'relationshipStatus',
  focus: 'lifeFocus',
}

const commandHelp = `
Available Commands:

/start - Begin your CheckCheck journey
/today - Get today's personalized reading
/history - View your past readings
/settings - View your current profile settings
/pause [days] - Pause messages for N days (1-30)
/resume - Resume daily messages
/edit [field] - Edit a profile field
/timezone [tz] - Update your timezone
/language [lang] - Set word-of-the-day language
/feedback [text] - Send feedback to the team
/stop - Permanently stop all messages
/help - Show this help message

Editable fields: nickname, name, birthday, birthtime, birthcity, city, gender, delivery, timezone, language, relationship, focus
`.trim()

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

export default function DevPage() {
  const { userProfile, updateProfileField } = useUserStore()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: generateId(),
      type: 'bot',
      content: 'Welcome to the CheckCheck Bot Simulator! Type a command or click one of the quick actions below. Try /help to see all available commands.',
    },
  ])
  const [input, setInput] = useState('')
  const [awaitingEditValue, setAwaitingEditValue] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addBotMessage = (content: string, cardMessage?: ReturnType<typeof generateMockMessage>) => {
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        type: cardMessage ? 'card' : 'bot',
        content,
        cardMessage,
      },
    ])
  }

  const processCommand = (text: string) => {
    const trimmed = text.trim()
    
    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: generateId(), type: 'user', content: trimmed },
    ])

    // Handle edit value follow-up
    if (awaitingEditValue) {
      const fieldKey = awaitingEditValue
      const fieldName = Object.entries(editableFields).find(([, v]) => v === fieldKey)?.[0] || fieldKey
      updateProfileField(fieldKey as keyof typeof userProfile, trimmed)
      addBotMessage(`Got it! Your ${fieldName} has been updated to "${trimmed}".`)
      setAwaitingEditValue(null)
      return
    }

    // Parse command
    const parts = trimmed.split(/\s+/)
    const command = parts[0].toLowerCase()
    const args = parts.slice(1)

    switch (command) {
      case '/start':
        addBotMessage(
          userProfile
            ? `Welcome back, ${userProfile.nickname || userProfile.legalName}! Your daily CheckCheck is ready. Type /today to see it.`
            : "Welcome to CheckCheck! I'll send you personalized daily insights based on your profile. Complete onboarding first at the main app to get started."
        )
        break

      case '/today':
        if (!userProfile) {
          addBotMessage("You haven't completed onboarding yet. Please set up your profile first.")
        } else {
          const message = generateMockMessage(userProfile)
          addBotMessage('', message)
        }
        break

      case '/history':
        addBotMessage(
          "Here's your reading history for the past 7 days. To see the full history with expandable cards, visit the History tab in the app."
        )
        break

      case '/settings':
        if (!userProfile) {
          addBotMessage("You haven't set up your profile yet.")
        } else {
          const settings = `
Your Profile:
- Name: ${userProfile.legalName}
- Nickname: ${userProfile.nickname}
- Birthday: ${userProfile.dateOfBirth}
- Birth Time: ${userProfile.birthTime}
- Birth City: ${userProfile.birthCity}
- Gender: ${userProfile.gender}
- Delivery Time: ${userProfile.deliveryTime}
- Timezone: ${userProfile.timezone}
- Language: ${userProfile.languagePreference}
${userProfile.relationshipStatus ? `- Relationship: ${userProfile.relationshipStatus}` : ''}
${userProfile.lifeFocus ? `- Life Focus: ${userProfile.lifeFocus}` : ''}
${userProfile.currentCity ? `- Current City: ${userProfile.currentCity}` : ''}

Use /edit [field] to update any field.
          `.trim()
          addBotMessage(settings)
        }
        break

      case '/pause':
        const days = parseInt(args[0])
        if (!days || days < 1 || days > 30) {
          addBotMessage("Please specify a number of days between 1 and 30. Example: /pause 3")
        } else {
          addBotMessage(`Messages paused for ${days} day${days > 1 ? 's' : ''}. I'll be back on ${new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. Use /resume anytime to start again.`)
        }
        break

      case '/resume':
        addBotMessage("Messages resumed! You'll receive your next CheckCheck at your scheduled delivery time.")
        break

      case '/edit':
        const field = args[0]?.toLowerCase()
        if (!field) {
          addBotMessage("Please specify a field to edit. Example: /edit nickname\n\nAvailable fields: " + Object.keys(editableFields).join(', '))
        } else if (!editableFields[field]) {
          addBotMessage(`Unknown field "${field}". Available fields: ` + Object.keys(editableFields).join(', '))
        } else {
          const currentValue = userProfile?.[editableFields[field] as keyof typeof userProfile]
          addBotMessage(`Your current ${field} is: "${currentValue || 'not set'}"\n\nPlease type the new value:`)
          setAwaitingEditValue(editableFields[field])
        }
        break

      case '/timezone':
        const tz = args.join(' ')
        if (!tz) {
          addBotMessage(`Your current timezone is: ${userProfile?.timezone || 'not set'}\n\nTo change it, type: /timezone America/New_York`)
        } else {
          updateProfileField('timezone', tz)
          addBotMessage(`Timezone updated to "${tz}". Your daily messages will now arrive at the correct local time.`)
        }
        break

      case '/language':
        const lang = args[0]
        const validLangs = ['german', 'mandarin', 'japanese', 'spanish', 'french', 'none']
        if (!lang) {
          addBotMessage(`Your current word-of-the-day language is: ${userProfile?.languagePreference || 'None'}\n\nAvailable: German, Mandarin, Japanese, Spanish, French, None`)
        } else if (!validLangs.includes(lang.toLowerCase())) {
          addBotMessage(`Unknown language "${lang}". Available: German, Mandarin, Japanese, Spanish, French, None`)
        } else {
          const formatted = lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase()
          updateProfileField('languagePreference', formatted)
          addBotMessage(`Language preference updated to "${formatted}". ${formatted === 'None' ? "You won't receive word-of-the-day anymore." : `You'll now receive ${formatted} words of the day!`}`)
        }
        break

      case '/feedback':
        const feedback = args.join(' ')
        if (!feedback) {
          addBotMessage("Please include your feedback message. Example: /feedback I love the daily readings!")
        } else {
          addBotMessage("Thank you for your feedback! The CheckCheck team has received your message and will review it soon.")
        }
        break

      case '/stop':
        addBotMessage("Are you sure you want to permanently stop all messages? This will delete your profile data. Reply 'yes' to confirm or any other message to cancel.\n\n(In the real bot, this would require confirmation)")
        break

      case '/help':
        addBotMessage(commandHelp)
        break

      default:
        if (command.startsWith('/')) {
          addBotMessage(`Unknown command "${command}". Type /help to see available commands.`)
        } else {
          addBotMessage("I only respond to commands starting with /. Type /help to see what I can do!")
        }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    processCommand(input)
    setInput('')
  }

  const quickCommands = ['/today', '/settings', '/history', '/help']

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      {/* Header */}
      <header className="bg-background border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground flex items-center gap-2">
              CheckCheck Bot
              <span className="text-xs font-normal px-2 py-0.5 bg-amber-100 text-amber-700 rounded">Simulator</span>
            </h1>
            <p className="text-xs text-muted-foreground">Dev Tool — Not visible to users</p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-3">
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.type === 'user' ? (
                <div className="flex justify-end">
                  <div className="flex items-start gap-2 max-w-[80%]">
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2">
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ) : msg.type === 'card' && msg.cardMessage ? (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2 max-w-full">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <DailyMessageCard message={msg.cardMessage} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2 max-w-[80%]">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-background border border-border rounded-2xl rounded-tl-sm px-4 py-2 shadow-sm">
                      <p className="text-sm whitespace-pre-wrap text-foreground">{msg.content}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Quick Commands */}
      <div className="bg-background/80 backdrop-blur border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto">
          {quickCommands.map((cmd) => (
            <Button
              key={cmd}
              variant="outline"
              size="sm"
              onClick={() => processCommand(cmd)}
              className="flex-shrink-0 text-xs"
            >
              {cmd}
            </Button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-background border-t border-border px-4 py-3">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={awaitingEditValue ? "Type the new value..." : "Type a command (e.g., /today)"}
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
