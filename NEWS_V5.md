# Check Check V5 — automatic English news

## Product contract (2026-10-13)

CHECK CHECK · Global AI. Asian Perspective. · Follow the Substance, Not the Hype.
Know Something. Have Something to Say.

Reuse the existing Telegram Bot, direct messages and delivery slots. Everyone receives
one shared English edition: Today in 30 Seconds; up to three AI & Business / Fun to Know
stories; optional One Thing Worth Your Time (Following / Trying / Saving).
Stories use Hook → The Story → optional The Interesting Part → Why It Matters → Sources.
Quality takes priority over quantity; no qualified stories means no automatic send.
Interests are stored now. Picked for You, banners and share cards are future work.

## Architecture and preservation

The inspected origin/main and backup-bazi-before-news-2026-10-13 both point to
6daae50. The existing app is Next.js 16 / React 19, Supabase REST and Vercel cron.
There was no news pipeline. The old cron generated a personalized BaZi reading per
profile, then advanced next_delivery_at. Bot onboarding required birth information.

V5 adds lib/server/news/{config,content,storage,production,dispatch,bot}.ts.
The same webhook and daily dispatcher route switch on BOT_MODE=news. With BOT_MODE=bazi
(or unset), the original handlers and readings remain available. Existing BaZi engines,
UI pages, profiles, bot_state and daily_messages are retained. News owns separate
news_subscriptions, news_editions and news_deliveries tables. The backup branch is untouched.
Existing completed active subscribers with delivery timestamps are copied into the new
subscription table by the additive migration; stopped/incomplete users are not activated.
Changes to news delivery settings never modify birth profiles or old delivery settings.

Production searches three subjects via Tavily, restricting publishers to a configured
allowlist. Only HTTPS sources with raw article evidence and a valid publication date
within 48 hours are accepted. An OpenRouter editor selects and writes, a second request
independently reviews the draft against the evidence, and local schema/source/date/size
checks reject invalid content. Two distinct publisher domains are mandatory; the reviewer
must additionally reject syndicated reports. Model review is probabilistic, not a guarantee
of truth. Search failures do not become an empty edition; they fail and can retry.
Empty editions are deliberately saved so the system does not keep paying to fill quotas.

Editions save evidence, source dates, URLs and rendered messages. Recent 14 editions are
provided for semantic repeat checks; stable event keys and source URLs enforce exact
repeat rejection. Evidence and model input are treated as untrusted data.

An atomic database production claim with a 15-minute lease prevents concurrent runs.
Token-fenced completion discards results from expired owners. Failed production releases
its claim for retry. The webhook never invokes paid generation; /today reads the cache.
Atomic per-profile/edition delivery claims prevent overlapping cron requests from
sending the same edition twice. Parts are checkpointed after Telegram confirms each one.

Telegram has no sendMessage idempotency key: a timeout may occur after successful receipt.
Such deliveries are marked uncertain and never automatically replayed. A process crash
can leave sending rows; these also require operator review. This chooses protection from
duplicates over automatic retries of ambiguous sends. /today deliberately permits a user
to fetch an edition again and is separate from scheduled-send deduplication.

## Setup and run

1. Node.js >=20.9; pnpm install --frozen-lockfile.
2. On an existing Supabase database apply supabase/migrations/20261013_news.sql.
   On a fresh database first apply supabase/telegram_init.sql and existing migrations.
   The news tables have RLS and RPC access only for service_role.
3. Configure server-only secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
   TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, CRON_SECRET, OPENROUTER_API_KEY,
   TAVILY_API_KEY. Set NEWS_MODEL to a currently available OpenRouter model supporting
   JSON object output. BOT_MODE=news activates V5. NEWS_SOURCE_DOMAINS is optional.
   SUPABASE_ANON_KEY and OPENROUTER_MODEL are legacy config; the news server does not
   need the anon key. Never expose the service-role key in NEXT_PUBLIC variables.
4. Run pnpm test, pnpm typecheck, pnpm build; pnpm dev for local work.
5. Deploy to the existing Vercel project and register the existing Bot webhook at
   https://YOUR_HOST/api/telegram/webhook with Telegram setWebhook secret_token equal
   to TELEGRAM_WEBHOOK_SECRET. Do not drop pending updates without deciding to do so.
6. Authenticated GET /api/telegram/set-commands updates the English news menu (also
   replaces old Chinese scoped menu). Header: Authorization: Bearer CRON_SECRET.
7. Authenticated POST /api/cron/news produces today's Singapore-date edition;
   authenticated POST /api/cron/daily dispatches that saved edition to due subscribers.
   Both use Authorization: Bearer CRON_SECRET. Missing secrets fail closed.
8. Test /start, /today, /settings, /delivery, /timezone, /pause, /resume, /stop,
   /interests on a test Bot/database before enabling live delivery.

vercel.json schedules production checks and dispatch every 10 minutes. Scheduled GET
production starts from 07:30 Singapore; it skips earlier checks and already completed
editions. The production call normally completes before the default 08:00 send.
Authenticated POST permits a manual run before that window.
Daily editions use Singapore dates; recipient delivery slots use their own IANA timezone.
Failed production retries on the next scheduled check; crashed production retries after
the claim lease expires. Do not dispatch yesterday's
edition while today's generation is unavailable. Up to 50 due subscribers are processed per
invocation, with a time budget; subsequent cron calls drain the remaining queue.

Vercel Hobby restricts cron frequency to daily. This schedule requires a plan supporting
frequent cron and a function duration of 300 seconds, or an external authenticated
scheduler. For Hobby, remove Vercel's cron entries and use an external scheduler with the
same endpoints. Set production timeout >=180 seconds and dispatcher timeout >=300 seconds.
Local builds and tests do not require any live credentials and never contact real Telegram.

## Operations and rollback

Inspect news_editions.status (generating/ready/empty/failed), news_deliveries.status
(sending/sent/uncertain) and cron JSON counters. Failed generation can retry immediately;
crashed generation may retry after 15 minutes. Empty editions advance due schedules without
sending. A not-ready edition leaves schedules due so the next dispatch can catch up.
Paused subscriptions resume automatically once paused_until has elapsed; stopped ones stay
inactive until /start or /resume. Interest strings are limited to 500 characters and never
used as editor instructions. No birth data is sent to the news model.

For uncertain/stale sending deliveries, inspect the actual Telegram chat and next_part.
Do not delete delivery claims blindly. If resuming manually, send only confirmed missing
parts and then mark sent; the last unconfirmed part may already have arrived. There is no
automatic administrative replay endpoint in V5.

Rollback: set BOT_MODE=bazi, redeploy, restore original daily cron schedule `0 0 * * *`
if desired, and refresh Bot commands. The old settings/readings/tables still exist.
Do not modify backup-bazi-before-news-2026-10-13. PAUSED.md is historical and does not prove
that the live deployment/webhook is paused; verify current hosting state separately.

## Verification limits

Automated tests cover evidence rejection, content format, deduplication, daily dispatch
claims and checkpoints, ambiguous failures, empty/not-ready editions, interest collection,
news onboarding and production failure handling. The additive migration was also verified with PGlite PostgreSQL, including repeat
execution, subscriber transfer, atomic claims, expired-owner fencing, RLS and RPC
permissions (tests/news-db.cjs; requires @electric-sql/pglite via PGLITE_MODULE).
Real API credentials, a deployed Supabase
migration and a live Telegram delivery must be verified in staging before rollout.

API references: https://docs.tavily.com/documentation/api-reference/endpoint/search
https://openrouter.ai/docs/guides/features/structured-outputs
https://vercel.com/docs/cron-jobs/usage-and-pricing

The production webpack build completed. The existing /history client page emits a
`location is not defined` prerender warning; this page is unchanged by V5. The existing
Next config skips build-time type validation, so the separate typecheck command is required.
