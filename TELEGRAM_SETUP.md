# Telegram-Only Deployment Guide

This project now includes:

- Telegram webhook endpoint: `POST /api/telegram/webhook`
- Daily scheduler endpoint: `GET|POST /api/cron/daily`
- Supabase REST-backed persistence for profiles, onboarding state, history, feedback, and update idempotency

## 1) Supabase setup

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/telegram_init.sql`.
3. Save these values:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY` (optional for future web clients)

## 2) Telegram bot setup

1. Create a bot in BotFather and copy your bot token.
2. Pick a webhook secret string.
3. Set environment variables:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET=YOUR_RANDOM_WEBHOOK_SECRET
CRON_SECRET=YOUR_RANDOM_CRON_SECRET
```

4. Set webhook (replace URL, token, secret):

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_DOMAIN/api/telegram/webhook",
    "secret_token": "YOUR_RANDOM_WEBHOOK_SECRET",
    "drop_pending_updates": true
  }'
```

## 3) Cron setup (daily delivery)

Call `GET /api/cron/daily` on a schedule (recommended every 5 minutes).

If you call manually:

```bash
curl -X GET "https://YOUR_DOMAIN/api/cron/daily" \
  -H "Authorization: Bearer YOUR_RANDOM_CRON_SECRET"
```

The scheduler:

- finds due active users (`next_delivery_at <= now`)
- skips paused users
- sends Telegram message
- stores/updates daily payload
- schedules the next delivery time in user timezone

## 4) Local testing

Webhook local test:

```bash
curl -X POST "http://localhost:3000/api/telegram/webhook" \
  -H "Content-Type: application/json" \
  -H "x-telegram-bot-api-secret-token: YOUR_RANDOM_WEBHOOK_SECRET" \
  -d '{
    "update_id": 1,
    "message": {
      "message_id": 10,
      "date": 1700000000,
      "text": "/start",
      "chat": { "id": 123456, "type": "private" },
      "from": {
        "id": 123456,
        "is_bot": false,
        "first_name": "Cassie",
        "username": "cassie"
      }
    }
  }'
```

## 5) Auth model used

Telegram users are identified by `telegram_user_id`.  
`auth_user_id` is included for future web/dashboard accounts via Supabase Auth.

This lets you:

- run Telegram-only immediately
- add Supabase Auth web login later without schema changes

## 6) Supported bot commands

- `/start`
- `/today`
- `/history`
- `/settings`
- `/pause [days]`
- `/resume`
- `/edit [field]`
- `/timezone [tz]`
- `/language [lang]`
- `/feedback [text]`
- `/stop`
- `/help`
