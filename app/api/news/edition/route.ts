import { NextRequest, NextResponse } from 'next/server'
import { newsMode } from '@/lib/server/news/config'
import { ingestEdition } from '@/lib/server/news/ingest'
import { editionDate } from '@/lib/server/news/content'
import { getEdition, recentEditions } from '@/lib/server/news/storage'
export const runtime = 'nodejs'
function authorized(request: NextRequest) {
  const secret = process.env.NEWS_INGEST_SECRET
  return !!secret && request.headers.get('authorization') === `Bearer ${secret}`
}
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 })
  if (!newsMode()) return NextResponse.json({ ok: false, error: 'News disabled' }, { status: 409 })
  try { return NextResponse.json({ ok: true, today: await getEdition(editionDate()), recent: await recentEditions() }) }
  catch { return NextResponse.json({ ok: false, error: 'Read failed' }, { status: 500 }) }
}
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 })
  if (!newsMode()) return NextResponse.json({ ok: false, error: 'News disabled' }, { status: 409 })
  if (Number(request.headers.get('content-length') || 0) > 250_000) return NextResponse.json({ ok: false }, { status: 413 })
  const raw = await request.text()
  if (raw.length > 250_000) return NextResponse.json({ ok: false }, { status: 413 })
  let input: unknown
  try { input = JSON.parse(raw) } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }
  try { return NextResponse.json({ ok: true, ...await ingestEdition(input) }) }
  catch (e) {
    const invalid = e instanceof Error && /Only today|Duplicate|Unsafe|exceeds|Missing source/.test(e.message) || (e instanceof Error && e.name === 'ZodError')
    return NextResponse.json({ ok: false, error: invalid ? 'Invalid edition' : 'Edition storage failed' }, { status: invalid ? 400 : 500 })
  }
}
