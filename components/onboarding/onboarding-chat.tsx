'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore, type UserProfile } from '@/lib/store'
import { getOnboardingQuestions, WELCOME_MESSAGE } from '@/lib/profile'
import { normalizeAppLanguage } from '@/lib/i18n'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Message {
  id: string
  text: string
  isBot: boolean
}

export function OnboardingChat() {
  const router = useRouter()
  const { onboarding, setOnboardingStep, updateOnboardingProfile, completeOnboarding } = useUserStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [inputDisabled, setInputDisabled] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)

  const language = normalizeAppLanguage(onboarding.profile.languagePreference as string | undefined)
  const questions = useMemo(() => getOnboardingQuestions(language), [language])
  const currentQuestion = questions[onboarding.step] ?? questions[0]

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const showInitialMessage = async () => {
      setIsTyping(true)
      await new Promise((resolve) => setTimeout(resolve, 600))
      setIsTyping(false)
      setMessages([
        { id: 'welcome', text: WELCOME_MESSAGE, isBot: true },
        { id: 'q0', text: currentQuestion.question, isBot: true },
      ])
      setInputDisabled(false)
    }

    showInitialMessage()
  }, [currentQuestion.question])

  const handleAnswer = async (answer: string) => {
    const userMessage: Message = {
      id: `user-${onboarding.step}`,
      text: answer,
      isBot: false,
    }
    setMessages((prev) => [...prev, userMessage])
    setInputDisabled(true)

    updateOnboardingProfile(currentQuestion.id as keyof UserProfile, answer)

    if (onboarding.step < questions.length - 1) {
      const nextStep = onboarding.step + 1
      setOnboardingStep(nextStep)

      setIsTyping(true)
      await new Promise((resolve) => setTimeout(resolve, 600))
      setIsTyping(false)

      const nextQuestions = getOnboardingQuestions(
        currentQuestion.id === 'languagePreference' ? normalizeAppLanguage(answer) : language
      )
      const nextQuestion = nextQuestions[nextStep]
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${nextStep}`,
          text: nextQuestion.question,
          isBot: true,
        },
      ])
      setInputDisabled(false)
    } else {
      setIsTyping(true)
      await new Promise((resolve) => setTimeout(resolve, 600))
      setIsTyping(false)

      const doneText =
        language === '中文'
          ? '设置完成 ✨\n\n你的第一条 Check Check 已经准备好了。'
          : "You're all set ✨\n\nYour first Check Check is ready."

      setMessages((prev) => [...prev, { id: 'complete', text: doneText, isBot: true }])

      completeOnboarding()
      await new Promise((resolve) => setTimeout(resolve, 1500))
      router.push('/settings')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-center p-4 border-b">
        <h1 className="text-lg font-semibold">CheckCheck</h1>
      </header>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="flex flex-col gap-4 max-w-2xl mx-auto pb-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message.text} isBot={message.isBot} />
          ))}
          {isTyping && <ChatMessage message="" isBot isTyping />}
        </div>
      </ScrollArea>

      <div className="border-t max-w-2xl mx-auto w-full">
        <ChatInput
          type={currentQuestion.type}
          placeholder={currentQuestion.placeholder}
          options={currentQuestion.options}
          onSubmit={handleAnswer}
          disabled={inputDisabled}
        />
      </div>
    </div>
  )
}
