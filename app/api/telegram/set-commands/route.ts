import { NextRequest, NextResponse } from 'next/server'
import { setBotCommands } from '@/lib/server/telegram-client'

export const runtime = 'nodejs'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true

  const bearer = request.headers.get('authorization')
  const xSecret = request.headers.get('x-cron-secret')
  return bearer === `Bearer ${secret}` || xSecret === secret
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await setBotCommands()
    return NextResponse.json({ ok: true, message: 'Bot menu updated' })
  } catch (error) {
    console.error('setBotCommands failed', error)
    return NextResponse.json({ ok: false, error: 'Failed to update menu' }, { status: 500 })
  }
}
