import 'server-only'

function getTelegramToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable.')
  }
  return token
}

async function telegramRequest<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const token = getTelegramToken()
  const url = `https://api.telegram.org/bot${token}/${method}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const json = (await response.json()) as { ok: boolean; result?: T; description?: string }
  if (!response.ok || !json.ok) {
    throw new Error(json.description ?? `Telegram API ${method} failed.`)
  }

  return json.result as T
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  await telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  })
}
