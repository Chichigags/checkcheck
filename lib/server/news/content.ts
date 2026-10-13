import { z } from 'zod'

export const sourceSchema = z.object({
  id: z.string(), title: z.string().min(1), url: z.string().url(),
  publishedAt: z.string().datetime({ offset: true }), content: z.string().min(200),
})
export type Source = z.infer<typeof sourceSchema>
const text = (max: number) => z.string().trim().min(1).max(max)
export const storySchema = z.object({
  key: text(120), category: z.enum(['AI & Business', 'Fun to Know']),
  hook: text(180), story: text(800), interestingPart: text(400).optional(),
  whyItMatters: text(500), sourceIds: z.array(z.string()).min(2).max(4),
})
export const draftSchema = z.object({
  stories: z.array(storySchema).max(3),
  worthYourTime: z.object({ kind: z.enum(['Following', 'Trying', 'Saving']), text: text(500), sourceId: z.string() }).optional(),
})
export type Draft = z.infer<typeof draftSchema>
export interface Edition { date: string; draft: Draft; sources: Source[]; messages: string[] }

export function editionDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
export function canonicalUrl(value: string): string {
  const u = new URL(value)
  if (u.protocol !== 'https:' || u.username || u.password) throw new Error('Unsafe source URL')
  u.hash = ''
  for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/.test(k)) u.searchParams.delete(k)
  return u.toString()
}
export function recentSource(source: Source, now: Date): boolean {
  const age = now.getTime() - Date.parse(source.publishedAt)
  return age >= 0 && age <= 48 * 3600_000
}
export function validateDraft(value: unknown, sources: Source[], history: Edition[], now: Date): Draft {
  const draft = draftSchema.parse(value)
  const byId = new Map(sources.map(s => [s.id, s]))
  const oldKeys = new Set(history.flatMap(e => e.draft.stories.map(s => s.key.toLowerCase())))
  const oldUrls = new Set(history.flatMap(e => e.draft.stories.flatMap(s => s.sourceIds.map(id => e.sources.find(x => x.id === id)?.url))))
  const seenKeys = new Set<string>()
  const seenUrls = new Set<string>()
  const stories = draft.stories.filter(s => {
    const evidence = s.sourceIds.map(id => byId.get(id))
    if (evidence.some(x => !x || !recentSource(x, now))) return false
    const urls = evidence.map(x => x!.url)
    const domains = new Set(urls.map(u => new URL(u).hostname.replace(/^www\./, '')))
    const key = s.key.toLowerCase()
    if (domains.size < 2 || oldKeys.has(key) || seenKeys.has(key) || urls.some(u => oldUrls.has(u) || seenUrls.has(u))) return false
    seenKeys.add(key); urls.forEach(u => seenUrls.add(u))
    return true
  })
  const worth = draft.worthYourTime
  return { stories, ...(worth && stories.length && byId.has(worth.sourceId) && recentSource(byId.get(worth.sourceId)!, now) ? { worthYourTime: worth } : {}) }
}
export function renderEdition(date: string, draft: Draft, sources: Source[]): string[] {
  if (!draft.stories.length) return []
  const link = (id: string) => { const s = sources.find(x => x.id === id); if (!s) throw new Error('Missing source'); return `${s.title}\n${s.url}` }
  const messages = [
    `CHECK CHECK · ${date}\nGlobal AI. Asian Perspective.\nFollow the Substance, Not the Hype.\n\nToday in 30 Seconds\n${draft.stories.map(s => `• ${s.hook}`).join('\n')}`,
    ...draft.stories.map((s, i) => `${String(i + 1).padStart(2, '0')} · ${s.category}\n${s.hook}\n\nThe Story\n${s.story}${s.interestingPart ? `\n\nThe Interesting Part\n${s.interestingPart}` : ''}\n\nWhy It Matters\n${s.whyItMatters}\n\nSources\n${s.sourceIds.map(link).join('\n\n')}`),
    ...(draft.worthYourTime ? [`One Thing Worth Your Time\nWorth ${draft.worthYourTime.kind}\n${draft.worthYourTime.text}\n\n${link(draft.worthYourTime.sourceId)}`] : []),
  ]
  if (messages.some(m => m.length > 4000)) throw new Error('Edition exceeds Telegram message limit')
  return messages
}
