import { NextResponse } from 'next/server'
// Replaced by assistant-authored uploads; never invoke search/model billing from this route.
export async function GET() { return NextResponse.json({ ok: false, error: 'Use the assistant-authored edition endpoint' }, { status: 410 }) }
export const POST = GET
