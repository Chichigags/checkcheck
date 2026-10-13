// No API models or search providers. Credentials are read from the local environment only.
import { readFile } from 'node:fs/promises'
const base = process.env.CHECKCHECK_BASE_URL
const secret = process.env.NEWS_INGEST_SECRET
if (!base || !secret) throw new Error('Configure CHECKCHECK_BASE_URL and NEWS_INGEST_SECRET securely before submitting')
const url = new URL('/api/news/edition', base)
if (url.protocol !== 'https:') throw new Error('HTTPS deployment URL required')
const file = process.argv[2]
const response = await fetch(url, { method: file ? 'POST' : 'GET', headers: { Authorization: `Bearer ${secret}`, ...(file ? { 'Content-Type': 'application/json' } : {}) }, ...(file ? { body: await readFile(file, 'utf8') } : {}), signal: AbortSignal.timeout(30_000) })
if (!response.ok) throw new Error(`Edition request failed (${response.status})`)
console.log(JSON.stringify(await response.json()))
