# Check Check V5 — assistant-authored daily news

## Current product contract

The assistant researches, verifies and writes one English edition daily using its built-in
web tools and existing ChatGPT/Codex allowance. The server receives the finished edition
and sends it through the existing Telegram Bot once daily. No Tavily, OpenRouter or other
paid generation API is invoked by the news server. No subscription upgrade, credit purchase
or automatic recharge is authorized. Usage of the assistant still consumes account allowance.

CHECK CHECK · Global AI. Asian Perspective. · Follow the Substance, Not the Hype.
Know Something. Have Something to Say.
Today in 30 Seconds; up to three AI & Business / Fun to Know stories; optional One Thing
Worth Your Time. Hooks, story, interesting part, implications and source links are in English.
Interests are collected, but Picked for You is not live. Zero qualified stories means no send.
One daily edition may be split into consecutive Telegram messages for readability.

## Architecture

Scheduled assistant (07:30 Singapore) → authenticated edition upload → Supabase cache →
once-daily Vercel dispatcher (08:00–09:00 Singapore) → existing Telegram Bot subscribers.
Vercel Hobby has a one-hour scheduling window; exact 08:00 delivery is not promised.
Local assistant tasks need this computer on and the app running. This is not cloud-only,
always-on operation. Account/tool access and sandbox permissions must allow unattended runs.

POST /api/news/edition receives {date,sources,draft}. GET on the same endpoint returns today's
edition and 14 recent editions for repeat checks. Both require NEWS_INGEST_SECRET and
BOT_MODE=news. Uploads are bounded, restricted to today's Singapore date, validate two
publisher domains per story, source dates within 48h, unique evidence IDs, safe URLs,
content shape, repeat keys/URLs and Telegram lengths. Fact verification is the assistant's
editorial responsibility: the server validates evidence structure, not semantic truth.
Client-supplied rendered messages are never trusted; the server renders its own messages.

Atomic edition claims prevent concurrent writes; a completed edition is immutable.
The retired /api/cron/news endpoint returns 410 and performs no paid work.
vercel.json contains only one cron: /api/cron/daily at 00:00 UTC every day.
News candidates are active and not paused, excluding every claimed delivery for this edition.
Individual timezone/delivery settings do not affect news sends. Existing BaZi settings remain.
The dispatcher drains candidates in batches of 50 within a bounded runtime. At higher
subscriber counts, measure throughput and ensure the daily invocation completes the queue;
if it cannot, change the batch architecture before launch to that audience. Do not claim
unlimited delivery capacity. The agent must not invent extra routine push schedules.

Delivery claims and per-message checkpoints prevent concurrent duplicates. Telegram lacks
sendMessage idempotency: timeout/crash deliveries require operator inspection, never blind
replay. /today allows an explicit user-requested repeat. If today's edition is unavailable,
no yesterday edition or fabricated filler is sent; upload itself never triggers a broadcast.

## Setup

1. pnpm install --frozen-lockfile; pnpm test; pnpm typecheck; pnpm build.
2. Apply supabase/migrations/20261013_news.sql, then 20261013_news_daily.sql.
   Fresh installations also need existing Supabase initialization/migrations.
3. Server secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN,
   TELEGRAM_WEBHOOK_SECRET, CRON_SECRET, NEWS_INGEST_SECRET. Set BOT_MODE=news.
   OpenRouter credentials in .env.example belong only to the preserved BaZi code.
4. Configure the existing Bot webhook and refresh /api/telegram/set-commands using
   Authorization: Bearer CRON_SECRET. All endpoints fail closed on missing secrets.
5. Secure local assistant environment: CHECKCHECK_BASE_URL and NEWS_INGEST_SECRET.
   Do not paste tokens into chat, commit them or print them. Example config is not credentials.
6. node scripts/submit-edition.mjs fetches history; append a researched JSON filename to
   submit it. HTTPS is required. No filename means read-only, never broadcast.
7. Test the deployed upload/cache and Bot with a staging subscriber before activation.
   The daily task can generate JSON locally before credentials exist; that is not delivery.

## Assistant daily workflow

Read recent saved editions if securely configured; otherwise use local published edition
files for history. Research global AI/business, Asian reporting and genuinely interesting
science/culture. Open reliable source articles, verify dates and key claims across two
independent publishers; syndicated duplicates do not count. Skip unsupported/hyped/stale
stories. Save only actual evidence excerpts (respect source copyright limits) with dates and
URLs. Source.content must contain >=200 characters of factual evidence/excerpt or an explicitly
labelled evidence summary, not invented article text. No need to send entire copyrighted
articles. Write with the V5 voice and independently review facts/numbers before submission.
Use content.ts schemas and limits. Fewer than three or zero stories is valid.
Save editions/YYYY-MM-DD.json and a readable Markdown version; do not edit sources/.
Submit only when deployment and secure local credentials exist. If today's edition exists,
reuse it, never overwrite. Report meaningful failure once; stay quiet on unchanged setup gaps.
No paid APIs, upgrades or purchases. The task should not promise successful delivery without
observing the real endpoint and dispatch result. The daily cron remains the sender.

## Preservation and verification

Origin main and backup-bazi-before-news-2026-10-13 remain at 6daae50; BaZi engines, old
message generation, UI and tables are retained. BOT_MODE=bazi or unset uses legacy handlers.
Rollback can refresh legacy commands; existing per-chat menus may need /language English
in legacy mode to reset their scoped command lists. The backup branch is untouched.

Tests cover source/date checks, rendering, exact repeats, claimed/ambiguous/empty dispatch,
Bot subscription/interests, BaZi regression, auth and assistant upload. tests/news-db.cjs
optionally runs PostgreSQL/PGlite migrations, RLS, claim fencing and candidate exclusion.
Real deployment, credentials and unattended task execution still need end-to-end validation.
The existing /history page emits a prerender warning; it is unchanged.
