'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore, onboardingQuestions, type UserProfile } from '@/lib/store'
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

  const currentQuestion = onboardingQuestions[onboarding.step]

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  // Initialize first question
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const showInitialMessage = async () => {
      setIsTyping(true)
      await new Promise((resolve) => setTimeout(resolve, 600))
      setIsTyping(false)
      setMessages([
        {
          id: 'welcome',
          text: currentQuestion.question,
          isBot: true,
        },
      ])
      setInputDisabled(false)
    }

    showInitialMessage()
  }, [currentQuestion.question])

  const handleAnswer = async (answer: string) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${onboarding.step}`,
      text: answer,
      isBot: false,
    }
    setMessages((prev) => [...prev, userMessage])
    setInputDisabled(true)

    // Save answer to store
    updateOnboardingProfile(currentQuestion.id as keyof UserProfile, answer)

    // Check if we have more questions
    if (onboarding.step < onboardingQuestions.length - 1) {
      // Move to next question
      const nextStep = onboarding.step + 1
      setOnboardingStep(nextStep)

      // Show typing indicator
      setIsTyping(true)
      await new Promise((resolve) => setTimeout(resolve, 600))
      setIsTyping(false)

      // Add next question
      const nextQuestion = onboardingQuestions[nextStep]
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
      // All questions answered
      setIsTyping(true)
      await new Promise((resolve) => setTimeout(resolve, 600))
      setIsTyping(false)

      setMessages((prev) => [
        ...prev,
        {
          id: 'complete',
          text: "Perfect! I've got everything I need. Your personalized experience is ready. Let me take you to your profile!",
          isBot: true,
        },
      ])

      // Complete onboarding and redirect
      completeOnboarding()
      await new Promise((resolve) => setTimeout(resolve, 1500))
      router.push('/settings')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-center p-4 border-b">
        <h1 className="text-lg font-semibold">Welcome</h1>
      </header>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="flex flex-col gap-4 max-w-2xl mx-auto pb-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message.text}
              isBot={message.isBot}
            />
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
