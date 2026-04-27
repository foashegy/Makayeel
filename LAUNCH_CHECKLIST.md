# Makayeel — Launch Checklist

> Follow top-to-bottom. Check each box before moving on. Absolute prerequisites are marked **[REQUIRED]**.

---

## 0. Local dry run (before touching any cloud)

```bash
# 1. Install deps and prep DB
pnpm install
cp .env.example .env                   # fill DATABASE_URL, NEXTAUTH_SECRET, CRON_SECRET, ADMIN_EMAIL
docker compose up -d postgres          # local Postgres 16 on :5432
pnpm db:generate
pnpm db:migrate                        # creates schema + initial migration
pnpm db:seed                           # 8 commodities × 4 sources × 30d prices

# 2. Run everything
pnpm dev                               # web :3000, bot in polling mode
```

Verify:
- [ ] http://localhost:3000 redirects to /ar
- [ ] /ar renders RTL with Tajawal, prices widget populated
- [ ] /en renders LTR with Inter
- [ ] `curl http://localhost:3000/api/v1/prices/today` returns JSON with 32 price rows
- [ ] Sign in as `ADMIN_EMAIL` (magic link logs will appear in the Next.js dev console)
- [ ] /ar/admin/prices shows the 8×4 grid, inline edit + save works
- [ ] /ar/dashboard/link-telegram shows a 6-char code
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all pass

---

## 1. Telegram BotFather [REQUIRED]

1. Open [@BotFather](https://t.me/BotFather) on Telegram.
2. `/newbot` → name: `Makayeel`, handle: `MakayeelBot` (or whatever's available).
3. Copy the token, paste into `.env` as `TELEGRAM_BOT_TOKEN`.
4. `/setdescription` → paste: `أسعار خامات الأعلاف اليومية في السوق المصري. Daily feed-grain prices from Egypt's ports and wholesalers.`
5. `/setabouttext` → `مكاييل — سعر يومك من الحقل.`
6. `/setuserpic` → upload `apps/web/public/logo.svg` (convert to PNG 512×512 first).
7. `/setcommands` → paste:
   ```
   start - ابدأ / Start
   prices - أسعار اليوم / Today's prices
   price - سعر خامة / Single commodity
   chart - شارت / Chart
   alert - تنبيه / Alert
   alerts - تنبيهاتي / My alerts
   link - اربط حسابك / Link account
   lang - لغة / Language
   help - مساعدة / Help
   ```

---

## 2. Google OAuth (optional, recommended)

1. https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID → Web application.
3. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://makayeel.com/api/auth/callback/google`
4. Copy ID + Secret into `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

---

## 3. Resend (email magic link + alerts)

1. https://resend.com → create account.
2. Verify `makayeel.com` domain (add DNS records).
3. Create API key → paste into `.env` as `RESEND_API_KEY`.
4. Set `EMAIL_FROM="Makayeel <no-reply@makayeel.com>"`.
5. For magic-link login, also set `EMAIL_SERVER="smtp://resend:$RESEND_API_KEY@smtp.resend.com:465"`.

---

## 4. Railway (Postgres + bot worker) [REQUIRED]

1. https://railway.app → new project.
2. **Add Postgres 16** service → copy the `DATABASE_URL`.
3. **Add New Service** → "Deploy from GitHub" → select the repo.
4. Service settings:
   - Root directory: `/`
   - Build command: `pnpm install --frozen-lockfile && pnpm --filter @makayeel/db generate && pnpm --filter @makayeel/bot build`
   - Start command: `node apps/bot/dist/index.js`
   - Dockerfile path: `apps/bot/Dockerfile` (if using Dockerfile deploy)
5. Environment variables on the bot service:
   ```
   DATABASE_URL       = <from Railway Postgres>
   TELEGRAM_BOT_TOKEN = <from BotFather>
   TELEGRAM_WEBHOOK_URL = https://<bot-service>.up.railway.app/
   NEXT_PUBLIC_SITE_URL = https://makayeel.com
   CRON_SECRET        = <matches the secret on Vercel>
   TZ                 = Africa/Cairo
   NODE_ENV           = production
   ```
6. Once the service is up, run migrations one-off:
   ```bash
   railway run pnpm db:migrate:deploy
   railway run pnpm db:seed
   ```

---

## 5. Vercel (web + API) [REQUIRED]

1. https://vercel.com → import GitHub repo.
2. **Project settings:**
   - Framework preset: Next.js
   - Root directory: `apps/web`
   - Build command: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @makayeel/db generate && pnpm --filter @makayeel/web build`
   - Install command: `echo "skipped — build command handles it"`
3. **Environment variables** (Production scope):
   ```
   DATABASE_URL          = <Railway Postgres URL>
   NEXTAUTH_SECRET       = <openssl rand -base64 32>
   NEXTAUTH_URL          = https://makayeel.com
   GOOGLE_CLIENT_ID      = <from Google Cloud>
   GOOGLE_CLIENT_SECRET  = <from Google Cloud>
   EMAIL_SERVER          = smtp://resend:<key>@smtp.resend.com:465
   EMAIL_FROM            = "Makayeel <no-reply@makayeel.com>"
   RESEND_API_KEY        = <from Resend>
   ADMIN_EMAIL           = <your email>
   CRON_SECRET           = <same as Railway>
   NEXT_PUBLIC_SITE_URL  = https://makayeel.com
   ```
4. **Cron:** `apps/web/vercel.json` already declares the `/api/v1/cron/check-alerts` cron every 30 min. Verify it appears in Project → Settings → Cron Jobs after first deploy.
5. **Domain:** Project → Settings → Domains → add `makayeel.com` + `www.makayeel.com`.

---

## 6. DNS (Namecheap/Cloudflare/Route53)

- `A` / `CNAME` → `makayeel.com` → Vercel target (Vercel will give exact records).
- `TXT` verification record for Resend (step 3).
- `MX` records if you want to receive email at `hello@makayeel.com` (optional, separate provider).

---

## 7. Post-launch smoke test

After first production deploy:

- [ ] https://makayeel.com redirects to /ar
- [ ] https://makayeel.com/ar renders fonts + logo + prices
- [ ] https://makayeel.com/en switches correctly
- [ ] `curl https://makayeel.com/api/v1/prices/today` returns seeded rows
- [ ] Sign in via magic link → lands on /ar/dashboard
- [ ] /ar/admin/prices loads (only for admin email)
- [ ] /ar/dashboard/link-telegram → `/link CODE` on the bot links successfully
- [ ] `/اسعار` on the bot returns a formatted Arabic snapshot
- [ ] Vercel Cron → Settings shows "check-alerts" firing every 30 min
- [ ] Lighthouse on landing: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95

---

## 8. Daily operations (ADMIN routine)

Every morning before 7 AM Cairo:

1. Collect price quotes (phone/WhatsApp/on-site).
2. Log in at https://makayeel.com/ar/admin/prices.
3. Fill the grid for today. Save.
4. Price page and API reflect the update immediately (ISR revalidates every 5 min).
5. The bot's 07:00 digest and 30-min alert poll both pick up the new prices automatically.

---

## 9. Phase 2 — not included in this launch

Leave these as roadmap items:

- Mobile app (Expo / React Native)
- WhatsApp bot (Baileys)
- Payment integration (Paymob EGP, Stripe USD)
- Web scraping for automatic price collection
- PDF reports for Enterprise tier
- SMS alerts
- Multi-currency display (USD / EUR)
- Web push notifications
- Redis-backed rate limiter (in-memory is adequate for MVP)

---

## Rollback plan

If the production deploy breaks:

1. Vercel → Deployments → click previous green deploy → **Promote to Production**.
2. Railway → Deployments → rollback bot to previous revision.
3. If data corruption: `railway run pnpm db:migrate:reset` is destructive — only use if you're sure. Otherwise restore from Railway's automatic Postgres backups (Settings → Backups).
