import 'server-only'
import { z } from 'zod'
import { editionDate, sourceSchema, canonicalUrl, validateDraft, renderEdition, type Edition } from './content'
import { getEdition, recentEditions, newsRest } from './storage'

// The scheduled assistant researches and writes; this endpoint only validates and stores.
export async function ingestEdition(input: unknown, now = new Date()) {
  const packet = z.object({ date: z.string(), sources: z.array(sourceSchema).max(24), draft: z.unknown() }).parse(input)
  if (packet.date !== editionDate(now)) throw new Error('Only today’s Singapore edition can be submitted')
  const sources = packet.sources.map(s => ({ ...s, url: canonicalUrl(s.url) }))
  if (new Set(sources.map(s => s.id)).size !== sources.length) throw new Error('Duplicate source IDs')
  const draft = validateDraft(packet.draft, sources, await recentEditions(), now)
  const payload: Edition = { date: packet.date, draft, sources, messages: renderEdition(packet.date, draft, sources) }
  if (await getEdition(packet.date)) return { status: 'exists' }
  const token = await newsRest<string | null>({ method: 'POST', path: '/rest/v1/rpc/claim_news_edition', body: { p_date: packet.date } })
  if (!token) return { status: 'busy' }
  const saved = await newsRest<boolean>({ method: 'POST', path: '/rest/v1/rpc/finish_news_edition', body: { p_date: packet.date, p_token: token, p_payload: payload } })
  if (!saved) throw new Error('Edition claim lost')
  return { status: draft.stories.length ? 'ready' : 'empty', stories: draft.stories.length }
}
