# Project status: PAUSED (2026-07-23)
#
# Intent: Keep this repo; do not delete. May be repurposed later.
#
# What was done locally:
# - vercel.json crons cleared (daily cron disabled in config)
#
# Still needed on live services (run once in Terminal if not done):
# 1) Stop Telegram webhook:
#    cd ~/Documents/CheckCheck
#    source .env 2>/dev/null || true
#    TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' .env | cut -d= -f2-)
#    curl "https://api.telegram.org/bot${TOKEN}/deleteWebhook?drop_pending_updates=true"
#
# 2) Redeploy so Vercel picks up empty crons, OR pause/archive the Vercel project
#    in the dashboard: https://vercel.com (project checkcheck-red)
#
# To resume later: restore vercel.json cron, set webhook again, redeploy.
