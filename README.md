# Volt Store — Production-Grade Next.js Storefront

E-commerce storefront built with **Next.js 16 (App Router), React 19, TypeScript, TailwindCSS v4 and Supabase**. One deep, polished flow: browse → filter → product → cart → auth → checkout → persisted order.

> Portfolio project demonstrating senior frontend practices: rendering strategy per route, DB-enforced security, optimistic UI, a11y, SEO and CI.

## Live demo

- **URL:** _add Vercel URL_
- Demo checkout — no real payment.

## Architecture decisions

| Decision | Why |
|---|---|
| RSC + per-route rendering | `/` static + 1h ISR, `/products/[slug]` SSG + ISR, `/products` SSR (searchParams filters), `/orders/[id]` dynamic (auth) |
| Cookieless Supabase client for catalog reads | Cookie client forces dynamic rendering; public data stays static/ISR ([src/lib/data.ts](src/lib/data.ts)) |
| Server Actions for auth + checkout | Idiomatic App Router mutations; no API boilerplate |
| Cart: React Context + `useOptimistic` | Instant UI, localStorage persistence, zero deps ([src/components/cart/cart-context.tsx](src/components/cart/cart-context.tsx)) |
| Supabase Postgres + RLS | Ownership enforced at DB level, not just app level |
| Keep-alive cron | Free tier pauses after 7 idle days; `select 1` every 3 days prevents it |

## Security

| Risk | Mitigation |
|---|---|
| Secret key in browser | `server-only` import in [admin.ts](src/lib/supabase/admin.ts) → client import fails build; `.env*` gitignored |
| Reading others' orders | RLS: `auth.uid() = user_id` ([0001_init.sql](supabase/migrations/0001_init.sql)) |
| Price tampering | Checkout re-reads prices from DB, ignores client totals ([actions.ts](src/app/checkout/actions.ts)) |
| Unauthenticated writes | Every action checks `auth.getUser()` first |
| Input tampering | Zod validation on all action inputs |
| XSS | React escaping; JSON-LD `<` escaped |
| HTTP hardening | CSP, HSTS, X-Frame-Options via [next.config.ts](next.config.ts) |
| Vulnerable deps | `npm audit` in CI + Dependabot |

## Setup

```bash
npm i
cp .env.example .env.local   # fill from Supabase → Settings → API Keys
npx supabase login
npx supabase link --project-ref <REF>
npx supabase db push          # runs migrations
npm run seed                  # inserts demo catalog via admin client
npm run dev
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm test` | Vitest unit tests (cart logic) |
| `npm run test:e2e` | Playwright happy path |
| `npm run lint` | ESLint |

## CI

- [ci.yml](.github/workflows/ci.yml): lint → unit tests → `npm audit` → build
- [keep-alive.yml](.github/workflows/keep-alive.yml): pings DB every 3 days (`SUPABASE_DATABASE_URL` repo secret)

## Deploy (Vercel)

1. Import repo → set env vars from `.env.example` (+ `NEXT_PUBLIC_SITE_URL`).
2. Deploy. ISR + proxy work out of the box.
