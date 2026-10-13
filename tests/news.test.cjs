// Transpile repository TypeScript without adding a runtime dependency.
const ts = require('typescript')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const originalLoad = Module._load
Module._load = function (id, parent, main) {
  if (id === 'server-only') return {}
  if (id.startsWith('@/')) id = path.resolve(__dirname, '..', id.slice(2))
  return originalLoad.call(this, id, parent, main)
}
require.extensions['.ts'] = function (mod, name) {
  mod._compile(ts.transpileModule(fs.readFileSync(name, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, name)
}
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { validateDraft, renderEdition, canonicalUrl, editionDate } = require('../lib/server/news/content.ts')
const now = new Date('2026-10-13T01:00:00Z')
const sources = ['https://example.com/report', 'https://publisher.org/report'].map((url, i) => ({ id: `s${i}`, title: 'Source', url, content: 'Evidence '.repeat(40), publishedAt: '2026-10-12T12:00:00Z' }))
const story = { key: 'event', category: 'AI & Business', hook: 'A useful development', story: 'A factual story.', whyItMatters: 'A practical implication.', sourceIds: ['s0', 's1'] }
const edition = { date: '2026-10-13', sources, draft: { stories: [story] }, messages: ['Intro', 'Story'] }

test('Singapore date, safe URL and tracking normalization', () => {
 assert.equal(editionDate(new Date('2026-10-12T23:00:00Z')), '2026-10-13')
 assert.equal(canonicalUrl('https://example.com/a?utm_source=x&v=1#x'), 'https://example.com/a?v=1')
 assert.throws(() => canonicalUrl('http://example.com'))
 assert.throws(() => canonicalUrl('https://user:pass@example.com'))
})
test('accept corroborated story and render source-linked English sections', () => {
 const d = validateDraft({ stories: [story] }, sources, [], now)
 assert.equal(d.stories.length, 1)
 const messages = renderEdition(edition.date, d, sources)
 assert.equal(messages.length, 2)
 assert.match(messages[0], /Today in 30 Seconds/)
 assert.match(messages[1], /Why It Matters/)
 assert.match(messages[1], /https:\/\/publisher.org\/report/)
})
test('reject missing, stale, future, same-publisher evidence and repeats', () => {
 for (const altered of [sources.slice(0, 1), sources.map(s => ({ ...s, publishedAt: '2026-10-01T00:00:00Z' })), sources.map(s => ({ ...s, publishedAt: '2026-10-14T00:00:00Z' })), sources.map(s => ({ ...s, url: 'https://example.com/' + s.id }))]) {
  assert.equal(validateDraft({ stories: [story] }, altered, [], now).stories.length, 0)
 }
 assert.equal(validateDraft({ stories: [story] }, sources, [edition], now).stories.length, 0)
 assert.equal(validateDraft({ stories: [{ ...story, key: 'different-key' }] }, sources, [edition], now).stories.length, 0)
 assert.equal(validateDraft({ stories: [story, story] }, sources, [], now).stories.length, 1)
 assert.deepEqual(renderEdition(edition.date, { stories: [] }, sources), [])
 assert.throws(() => validateDraft({ stories: [{ ...story, hook: 'x'.repeat(181) }] }, sources, [], now))
})

process.env.SUPABASE_URL = 'https://db.example'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only'
process.env.TELEGRAM_BOT_TOKEN = 'test-only'
process.env.BOT_MODE = 'news'
const { dispatchNews } = require('../lib/server/news/dispatch.ts')
const { handleNewsUpdate } = require('../lib/server/news/bot.ts')
const { ingestEdition } = require('../lib/server/news/ingest.ts')
const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
function mock(handler) { const old = global.fetch; global.fetch = async (url, options = {}) => handler(new URL(url), options, options.body ? JSON.parse(options.body) : undefined); return () => { global.fetch = old } }
const sub = { profile_id: 'p1', active: true, paused_until: null, timezone: 'Asia/Singapore', delivery_time: 'Morning', next_delivery_at: '2026-10-13T00:00:00Z', interests: '', awaiting_interests: false, profiles: { id: 'p1', telegram_user_id: 1 } }

test('dispatch claims once, checkpoints all parts, and advances schedule', async () => {
 let claimed = false, sends = 0, patches = [], schedules = 0
 const restore = mock((u, o, b) => {
  if (u.pathname.endsWith('news_editions')) return json([{ payload: edition }])
  if (u.pathname.endsWith('news_dispatch_candidates')) return json([sub])
  if (u.pathname.endsWith('news_subscriptions')) { if (o.method === 'POST') { schedules++; return json(null) } return json([sub]) }
  if (u.pathname.endsWith('claim_news_delivery')) { const result = !claimed; claimed = true; return json(result) }
  if (u.hostname === 'api.telegram.org') { sends++; return json({ ok: true }) }
  if (u.pathname.endsWith('news_deliveries')) { patches.push(b); return json(null) }
  throw new Error('Unexpected request ' + u)
 })
 try {
  assert.equal((await dispatchNews(now)).sent, 1)
  assert.equal((await dispatchNews(now)).sent, 0)
  assert.equal(sends, 2); assert.equal(schedules, 2)
  assert.deepEqual(patches.map(p => p.next_part).filter(Boolean), [1, 2])
  assert.equal(patches.at(-1).status, 'sent')
 } finally { restore() }
})
test('ambiguous Telegram failure is quarantined and never blindly retried', async () => {
 let claimed = false, sends = 0, status
 const restore = mock((u, o, b) => {
  if (u.pathname.endsWith('news_editions')) return json([{ payload: edition }])
  if (u.pathname.endsWith('news_dispatch_candidates')) return json([sub])
  if (u.pathname.endsWith('news_subscriptions')) return json(o.method === 'POST' ? null : [sub])
  if (u.pathname.endsWith('claim_news_delivery')) { const result = !claimed; claimed = true; return json(result) }
  if (u.hostname === 'api.telegram.org') { sends++; throw new Error('Timeout after possible delivery') }
  if (u.pathname.endsWith('news_deliveries')) { status = b.status; return json(null) }
  throw new Error('Unexpected request')
 })
 try { assert.equal((await dispatchNews(now)).failed, 1); assert.equal(status, 'uncertain'); await dispatchNews(now); assert.equal(sends, 1) } finally { restore() }
})
test('empty editions send nothing; unavailable editions leave schedules alone', async () => {
 for (const payload of [null, { ...edition, messages: [], draft: { stories: [] } }]) {
  let sends = 0
  const restore = mock((u, o) => {
   if (u.pathname.endsWith('news_editions')) return json(payload ? [{ payload }] : [])
   if (u.pathname.endsWith('news_dispatch_candidates')) return json([sub])
  if (u.pathname.endsWith('news_subscriptions')) return json(o.method === 'POST' ? null : [sub])
   sends++; throw new Error('Unexpected send')
  })
  try { const result = await dispatchNews(now); assert.equal(result.sent, 0); assert.equal(sends, 0) } finally { restore() }
 }
})
test('news /start avoids birth onboarding and /interests does not promise personalization', async () => {
 let subscription = { ...sub }, messages = [], writes = []
 const restore = mock((u, o, b) => {
  if (u.pathname.endsWith('telegram_updates')) return json(null)
  if (u.pathname.endsWith('profiles')) return json([{ id: 'p1', telegram_username: null }])
  if (u.pathname.endsWith('news_dispatch_candidates')) return json([sub])
  if (u.pathname.endsWith('news_subscriptions')) { if (o.method === 'POST') { writes.push(b); Object.assign(subscription, b); return json(null) } return json([subscription]) }
  if (u.pathname.endsWith('news_editions')) return json([{ payload: edition }])
  if (u.hostname === 'api.telegram.org') { messages.push(b.text); return json({ ok: true }) }
  throw new Error('Unexpected request ' + u)
 })
 const update = text => ({ update_id: 1, message: { from: { id: 1, first_name: 'Test' }, chat: { id: 1, type: 'private' }, text } })
 try {
  await handleNewsUpdate(update('/start')); assert.ok(writes.some(x => x.active === true)); assert.ok(messages.includes('Story'))
  await handleNewsUpdate(update('/interests')); await handleNewsUpdate(update('AI, Singapore'))
  assert.equal(subscription.interests, 'AI, Singapore'); assert.match(messages.at(-1), /not live yet|future update/)
  await handleNewsUpdate(update('/stop')); assert.equal(subscription.active, false)
  await handleNewsUpdate(update('/pause 2abc')); assert.match(messages.at(-1), /Use \/pause/)
 } finally { restore() }
})





test('daily candidates use one edition rather than per-user delivery timestamps', async () => {
 const { dueSubscriptions } = require('../lib/server/news/storage.ts')
 const restore = mock((u,o,b) => { assert.ok(u.pathname.endsWith('news_dispatch_candidates')); assert.equal(b.p_date, '2026-10-13'); return json([]) })
 try { assert.deepEqual(await dueSubscriptions(now), []) } finally { restore() }
})

test('legacy BaZi command still works when news mode is disabled', async () => {
 const { handleTelegramUpdate } = require('../lib/server/telegram-bot.ts')
 const { calculateChart, getProfile, formatCosmicId } = require('../lib/bazi.ts')
 const { toUserProfile } = require('../lib/server/profile-adapter.ts')
 const profile = { id: 'p1', telegram_user_id: 1, telegram_username: null, nickname: 'Test', date_of_birth: '1987-01-04', birth_time: '12:00', timezone: 'Asia/Singapore', language_preference: 'English', onboarding_complete: true, layer2_complete: true }
 const expected = formatCosmicId(getProfile(calculateChart(toUserProfile(profile).dateOfBirth, toUserProfile(profile).birthTime)), '1987-01-04', new Date().toISOString().split('T')[0], 'English')
 const messages = []
 const restore = mock((u, o, b) => {
  if (u.hostname === 'api.telegram.org') { if (b.text) messages.push(b.text); return json({ ok: true }) }
  if (u.pathname.endsWith('telegram_updates')) return json(null)
  if (u.pathname.endsWith('profiles')) return json([profile])
  if (u.pathname.endsWith('bot_state')) return json([{ profile_id: 'p1', flow: 'idle', step: 0, awaiting_field: null }])
  throw new Error('Unexpected request ' + u)
 })
 process.env.BOT_MODE = 'bazi'
 try {
  const result = await handleTelegramUpdate({ update_id: 9, message: { from: { id: 1, first_name: 'Test' }, chat: { id: 1, type: 'private' }, text: '/bazi' } })
  assert.equal(result.sent, 1); assert.equal(messages[0], expected)
  await new Promise(resolve => setImmediate(resolve))
 } finally { restore(); process.env.BOT_MODE = 'news' }
})
test('cron, menu and webhook endpoints fail closed without secrets', async () => {
 const { NextRequest } = require('next/server')
 const daily = require('../app/api/cron/daily/route.ts')
 const news = require('../app/api/cron/news/route.ts')
 const menu = require('../app/api/telegram/set-commands/route.ts')
 const webhook = require('../app/api/telegram/webhook/route.ts')
 delete process.env.CRON_SECRET; delete process.env.TELEGRAM_WEBHOOK_SECRET
 const restore = mock(() => { throw new Error('Unauthorized request reached backend') })
 try {
  const req = new NextRequest('https://example.com/api/test')
  assert.equal((await daily.GET(req)).status, 401)
  assert.equal((await news.GET(req)).status, 410)
  assert.equal((await menu.GET(req)).status, 401)
  assert.equal((await webhook.POST(req)).status, 401)
 } finally { restore() }
})

test('assistant-authored upload validates and saves, without search or model calls', async () => {
 let saved
 const restore = mock((u,o,b) => {
  assert.equal(u.hostname, 'db.example')
  if (u.pathname.endsWith('news_editions')) return json([])
  if (u.pathname.endsWith('claim_news_edition')) return json('token')
  if (u.pathname.endsWith('finish_news_edition')) { saved = b.p_payload; return json(true) }
  throw new Error('Unexpected request ' + u)
 })
 try {
  assert.equal((await ingestEdition({ date: edition.date, sources, draft: { stories: [story] } }, now)).status, 'ready')
  assert.equal(saved.messages.length, 2)
  await assert.rejects(ingestEdition({ date: '2026-10-12', sources, draft: { stories: [] } }, now), /Only today/)
  await assert.rejects(ingestEdition({ date: edition.date, sources: [sources[0], sources[0]], draft: { stories: [] } }, now), /Duplicate source IDs/)
 } finally { restore() }
})
test('empty or insufficiently corroborated assistant edition sends no filler', async () => {
 let saved
 const restore = mock((u,o,b) => {
  if (u.pathname.endsWith('news_editions')) return json([])
  if (u.pathname.endsWith('claim_news_edition')) return json('token')
  if (u.pathname.endsWith('finish_news_edition')) { saved = b.p_payload; return json(true) }
  throw new Error('Unexpected request')
 })
 try { assert.equal((await ingestEdition({ date: edition.date, sources: sources.slice(0,1), draft: { stories: [story] } }, now)).status, 'empty'); assert.deepEqual(saved.messages, []) } finally { restore() }
})
