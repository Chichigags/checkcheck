import 'server-only'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

function getOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) {
    throw new Error('Missing OPENROUTER_API_KEY environment variable.')
  }
  return key
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }
): Promise<string> {
  const apiKey = getOpenRouterKey()
  const model = options?.model ?? 'moonshotai/kimi-k2.5'

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://checkcheck-red.vercel.app',
      'X-Title': 'CheckCheck',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.9,
      max_tokens: options?.maxTokens ?? 1200,
      response_format: { type: 'json_object' },
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`)
  }

  const json = (await response.json()) as OpenRouterResponse
  const content = json.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('OpenRouter returned empty response.')
  }

  return content
}
