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
    return NextResponse.json({ ok: false, error: 'Processing failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'telegram-webhook' })
}
