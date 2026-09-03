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

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: { inline_keyboard?: Array<Array<{ text: string; callback_data: string }>> }
): Promise<void> {
  await telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(replyMarkup && { reply_markup: replyMarkup }),
  })
}

export async function answerCallbackQuery(callbackQueryId: string): Promise<void> {
  await telegramRequest('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
  })
}

const BOT_COMMANDS = [
  { command: 'today', description: "Get today's CheckCheck" },
  { command: 'cosmicid', description: 'View your Cosmic ID (BaZi + Astrology)' },
  { command: 'start', description: 'Begin or continue onboarding' },
  { command: 'settings', description: 'View and edit your profile' },
  { command: 'language', description: 'Change app language (English / 中文)' },
  { command: 'pause', description: 'Pause daily sends (1-30 days)' },
  { command: 'resume', description: 'Resume daily sends' },
  { command: 'feedback', description: 'Send feedback' },
  { command: 'stop', description: 'Stop automatic daily messages' },
  { command: 'help', description: 'Show command list' },
]

export async function setBotCommands(): Promise<void> {
  await telegramRequest('setMyCommands', { commands: BOT_COMMANDS })
}

export async function sendTelegramPhoto(chatId: number, imageBuffer: Buffer, caption?: string): Promise<void> {
  const token = getTelegramToken()
  const url = `https://api.telegram.org/bot${token}/sendPhoto`

  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)

  const parts: Buffer[] = []

  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`
  ))

  if (caption) {
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`
    ))
  }

  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="color.png"\r\nContent-Type: image/png\r\n\r\n`
  ))
  parts.push(imageBuffer)
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))

  const body = Buffer.concat(parts)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
    cache: 'no-store',
  })

  const json = (await response.json()) as { ok: boolean; description?: string }
  if (!response.ok || !json.ok) {
    throw new Error(json.description ?? 'Telegram sendPhoto failed.')
  }
}
