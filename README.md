# مكاييل — Makayeel

> **سعر يومك من الحقل** — منصة أسعار الخامات اليومية للأعلاف في السوق المصري.
> Daily prices for Egyptian animal-feed raw materials — trusted, Arabic-first, API-enabled.

---

## بالعربية (Arabic)

### نظرة سريعة

منصّة **مكاييل** بتجيب أسعار الذرة وفول الصويا والنخالة والشعير وباقي خامات الأعلاف من موانئ الإسكندرية ودمياط والتجار الرئيسيين، وتبعتلك إياها يوميًا:

- **موقع** للأسعار الحيّة + مقارنة تاريخية (7/30/90 يوم).
- **لوحة تحكم** للمشتركين: متابعة خاماتك + تنبيهات سعر.
- **API** مفتوح للشركات والمصانع.
- **بوت تليجرام** يرد بأسعار اليوم ويبعت تنبيه لما السعر يوصل للرقم اللي حددته.

### البنية (monorepo)

```
apps/web    — موقع Next.js (عام + لوحة تحكم + API)
apps/bot    — بوت تليجرام (grammY) + مهام مجدولة
packages/db — سكيمة Prisma + بيانات تجريبية
packages/ui — مكونات shadcn/ui + هوية العلامة
packages/i18n — ملفات الترجمة (ar/en)
packages/config — إعدادات TypeScript و ESLint و Tailwind المشتركة
```

### تشغيل محلي

```bash
# متطلبات: Node 20 LTS + pnpm 9 + Postgres 16 (ممكن تشغّله بـ docker-compose)
pnpm install
cp .env.example .env          # عدّل القيم
pnpm db:migrate               # ينشئ قاعدة البيانات
pnpm db:seed                  # يملأها ببيانات تجريبية
pnpm dev                      # يشغّل الموقع على :3000 والبوت بوضع polling
```

### اللغة والاتجاه

العربي هو الأساس (RTL) — الإنجليزي تبع. كل نص ظاهر للمستخدم في `packages/i18n/src/messages/ar.json`. ممنوع النصوص الثابتة في الكود.

---

## In English

### Overview

Makayeel publishes daily prices for Egyptian animal-feed raw materials — corn, soybean meal, wheat bran, barley, sunflower meal, DDGS — sourced from Alexandria/Damietta ports and major wholesalers.

- **Web:** live prices table + 7/30/90d commodity history charts.
- **Dashboard:** watchlist, price alerts, API keys (Free / Pro / Enterprise).
- **Public REST API** with per-key rate limiting.
- **Telegram bot** for quick price lookups + alerts.

### Monorepo layout

```
apps/web        Next.js 15 App Router — site, dashboard, admin, /api/v1/*
apps/bot        grammY Telegram bot + node-cron scheduler
packages/db     Prisma schema, client, seed
packages/ui     Brand tokens + shadcn/ui components
packages/i18n   next-intl messages (ar primary, en secondary)
packages/config Shared tsconfig/eslint/tailwind presets
```

### Quickstart

```bash
# Requires: Node 20 LTS, pnpm 9, Postgres 16
pnpm install
cp .env.example .env          # fill real values
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:3000/ar for the Arabic (RTL) site, http://localhost:3000/en for English.

### Stack

Next.js 15 · TypeScript (strict) · Prisma 5 · Postgres 16 · Auth.js v5 · Tailwind v4 · shadcn/ui · Recharts · next-intl · grammY · Vercel + Railway.

### Deployment

See [`LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md) for the Vercel / Railway / BotFather checklist.

### License

Proprietary — © ATEN STUDIO, 2026.
