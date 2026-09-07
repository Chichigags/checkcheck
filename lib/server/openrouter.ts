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
  error?: { message?: string }
}

function getOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) {
    throw new Error('Missing OPENROUTER_API_KEY environment variable.')
  }
  return key
}

/** Primary + fallbacks. Kimi K2.5 was retired ~Aug 31 2026. */
function getModelCandidates(preferred?: string): string[] {
  const primary = preferred || process.env.OPENROUTER_MODEL || 'moonshotai/kimi-k2.6'
  const fallbacks = [
    'moonshotai/kimi-k2.6',
    'openai/gpt-4o-mini',
    'google/gemini-2.0-flash-001',
  ]
  return [primary, ...fallbacks.filter((m) => m !== primary)]
}

async function requestCompletion(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options?.temperature ?? 0.9,
    max_tokens: options?.maxTokens ?? 1200,
  }
  if (options?.jsonMode !== false) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://checkcheck-red.vercel.app',
      'X-Title': 'CheckCheck',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const raw = await response.text()
  let json: OpenRouterResponse
  try {
    json = JSON.parse(raw) as OpenRouterResponse
  } catch {
    throw new Error(`OpenRouter non-JSON response ${response.status}: ${raw.slice(0, 200)}`)
  }

  if (!response.ok) {
    throw new Error(
      `OpenRouter API error ${response.status} (${model}): ${json.error?.message ?? raw.slice(0, 300)}`
    )
  }

  const content = json.choices?.[0]?.message?.content
  if (!content) {
    throw new Error(`OpenRouter returned empty response (${model}).`)
  }

  return content
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
  const models = getModelCandidates(options?.model)
  let lastError: Error | null = null

  for (const model of models) {
    try {
      return await requestCompletion(apiKey, model, messages, {
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        jsonMode: true,
      })
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`OpenRouter model failed (${model}):`, lastError.message)

      // Retry same model once without forced JSON mode (some models reject it)
      try {
        return await requestCompletion(apiKey, model, messages, {
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
          jsonMode: false,
        })
      } catch (retryError) {
        lastError = retryError instanceof Error ? retryError : new Error(String(retryError))
        console.error(`OpenRouter retry without json_mode failed (${model}):`, lastError.message)
      }
    }
  }

  throw lastError ?? new Error('OpenRouter chatCompletion failed for all models.')
}
