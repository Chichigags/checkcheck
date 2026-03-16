import { NextResponse } from 'next/server'
import { chatCompletion } from '@/lib/server/openrouter'

export async function GET() {
  const hasKey = !!process.env.OPENROUTER_API_KEY
  if (!hasKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 })
  }

  try {
    const result = await chatCompletion([
      { role: 'system', content: 'Reply with a short JSON object: {"status":"ok","message":"hello"}' },
      { role: 'user', content: 'Test' },
    ], { maxTokens: 50 })
    return NextResponse.json({ success: true, llmResponse: result })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
