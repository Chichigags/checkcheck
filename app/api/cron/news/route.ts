import { NextRequest, NextResponse } from 'next/server'
import { newsMode } from '@/lib/server/news/config'
import { produceNews } from '@/lib/server/news/production'
export const runtime = 'nodejs'
export const maxDuration = 300
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 })
  if (request.method === 'GET') {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date())
    if (parts < '07:30') return NextResponse.json({ ok: true, status: 'before_production_window' })
  }
  if (!newsMode()) return NextResponse.json({ ok: true, status: 'disabled' })
  try { return NextResponse.json({ ok: true, ...await produceNews() }) }
  catch (e) { console.error('News production failed', e); return NextResponse.json({ ok: false, error: 'News production failed' }, { status: 500 }) }
}
export const POST = GET
