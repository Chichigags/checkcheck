// Optional PostgreSQL integration checks. Supply PGLITE_MODULE or install @electric-sql/pglite.
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
async function run() {
 const db = new PGlite()
 try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table profiles(id uuid primary key, onboarding_complete boolean, status text, paused_until timestamptz, timezone text, delivery_time text, next_delivery_at timestamptz);
    insert into profiles values('00000000-0000-0000-0000-000000000001',true,'active',null,'Asia/Singapore','Morning',now()),
    ('00000000-0000-0000-0000-000000000002',true,'stopped',null,'Asia/Singapore','Morning',now());`)
  const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261013_news.sql'), 'utf8')
  await db.exec(migration); await db.exec(migration)
  const daily = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261013_news_daily.sql'), 'utf8')
  await db.exec(daily); await db.exec(daily)
  assert.equal((await db.query('select * from profiles')).rows.length, 2)
  assert.equal((await db.query('select * from news_subscriptions')).rows.length, 1)
  const date = '2026-10-13'
  const claim = async () => (await db.query('select claim_news_edition($1) as token', [date])).rows[0].token
  const [first, duplicate] = await Promise.all([claim(), claim()])
  assert.ok(first); assert.equal(duplicate, null)
  await db.exec("update news_editions set claimed_at=now()-interval '16 minutes'")
  const replacement = await claim(); assert.ok(replacement); assert.notEqual(replacement, first)
  const payload = JSON.stringify({ draft: { stories: [] }, messages: [] })
  const finish = async token => (await db.query('select finish_news_edition($1,$2,$3::jsonb) as saved', [date,token,payload])).rows[0].saved
  assert.equal(await finish(first), false); assert.equal(await finish(replacement), true)
  assert.equal(await claim(), null)
  const id = '00000000-0000-0000-0000-000000000001'
  assert.equal((await db.query('select * from news_dispatch_candidates($1)', [date])).rows.length, 1)
  const delivery = async () => (await db.query('select claim_news_delivery($1,$2) as claimed', [id,date])).rows[0].claimed
  const claims = await Promise.all([delivery(), delivery()]); assert.deepEqual(claims, [true,false])
  assert.equal((await db.query('select * from news_dispatch_candidates($1)', [date])).rows.length, 0)
  await db.exec(`grant select on news_editions,news_subscriptions,news_deliveries to anon; set role anon;`)
  assert.equal((await db.query('select * from news_editions')).rows.length, 0)
  await assert.rejects(db.query('select claim_news_edition($1)', [date]), /permission denied/)
  await db.exec('reset role')
  console.log('PASS: repeatable additive migration, existing subscription transfer, atomic claims, lease fencing, delivery deduplication, RLS and RPC permissions')
 } finally { await db.close() }
}
run().catch(e => { console.error(e); process.exitCode = 1 })
