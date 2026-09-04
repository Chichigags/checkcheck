import { NextRequest, NextResponse } from 'next/server'
import { handleTelegramUpdate } from '@/lib/server/telegram-bot'
import type { TelegramUpdate } from '@/lib/server/types'

export const runtime = 'nodejs'

function isAuthorized(request: NextRequest): boolean {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expectedSecret) return true
  const provided = request.headers.get('x-telegram-bot-api-secret-token')
  return provided === expectedSecret
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let update: TelegramUpdate
  try {
    update = (await request.json()) as TelegramUpdate
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 })
  }

  try {
    const result = await handleTelegramUpdate(update)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('Telegram webhook processing error', error)
    // Best-effort notify the user so onboarding doesn't die silently
    try {
      const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id
      if (chatId) {
        const { sendTelegramMessage } = await import('@/lib/server/telegram-client')
        await sendTelegramMessage(
          chatId,
          'Something went wrong on my side. Please try again, or send /start to continue.'
        )
      }
    } catch (notifyError) {
      console.error('Failed to notify user after webhook error', notifyError)
    }
    return NextResponse.json({ ok: false, error: 'Processing failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'telegram-webhook' })
}
