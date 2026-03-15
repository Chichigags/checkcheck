import { NextRequest, NextResponse } from 'next/server'
import { runDailyDispatch } from '@/lib/server/cron'

export const runtime = 'nodejs'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true

  const bearer = request.headers.get('authorization')
  const xSecret = request.headers.get('x-cron-secret')
  return bearer === `Bearer ${secret}` || xSecret === secret
}

async function run(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runDailyDispatch()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('Daily cron run failed', error)
    return NextResponse.json({ ok: false, error: 'Cron execution failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return run(request)
}

export async function POST(request: NextRequest) {
  return run(request)
}
