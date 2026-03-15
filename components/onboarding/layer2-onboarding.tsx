'use client'

import { useState, useEffect, useRef } from 'react'
import { useUserStore, layer2Questions, type UserProfile } from '@/lib/store'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'

interface Message {
  id: string
  text: string
  isBot: boolean
}

interface Layer2OnboardingProps {
  onComplete: () => void
}

export function Layer2Onboarding({ onComplete }: Layer2OnboardingProps) {
  const { userProfile, updateProfileField, completeLayer2 } = useUserStore()
  const [step, setStep] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [inputDisabled, setInputDisabled] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)

  const currentQuestion = layer2Questions[step]

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
      id: `user-${step}`,
      text: answer,
      isBot: false,
    }
    setMessages((prev) => [...prev, userMessage])
    setInputDisabled(true)

    // Save answer to store
    updateProfileField(currentQuestion.id as keyof UserProfile, answer)

    // Check if we have more questions
    if (step < layer2Questions.length - 1) {
      // Move to next question
      const nextStep = step + 1
      setStep(nextStep)

      // Show typing indicator
      setIsTyping(true)
      await new Promise((resolve) => setTimeout(resolve, 600))
      setIsTyping(false)

      // Add next question
      const nextQuestion = layer2Questions[nextStep]
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
          text: "Thanks for sharing! I'll use this to make your readings even more personalized.",
          isBot: true,
        },
      ])

      // Complete layer 2 and notify parent
      completeLayer2()
      await new Promise((resolve) => setTimeout(resolve, 1500))
      onComplete()
    }
  }

  return (
    <div className="flex flex-col bg-card rounded-2xl border shadow-sm overflow-hidden mb-6">
      <div
        ref={scrollRef}
        className="flex-1 p-4 max-h-80 overflow-y-auto"
      >
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message.text}
              isBot={message.isBot}
            />
          ))}
          {isTyping && <ChatMessage message="" isBot isTyping />}
        </div>
      </div>

      <div className="border-t">
        <ChatInput
          type={currentQuestion.type}
          placeholder={currentQuestion.placeholder}
          options={currentQuestion.options}
          onSubmit={handleAnswer}
          disabled={inputDisabled}
          shortcutLabel={currentQuestion.shortcutLabel}
          shortcutValue={userProfile?.birthCity}
        />
      </div>
    </div>
  )
}
