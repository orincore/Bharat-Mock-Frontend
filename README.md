# BharatMock Frontend

**Live site:** https://bharatmock.com

India's leading platform for government exam preparation — mock tests, previous year papers, current affairs, and live exams for SSC, Banking, Railway, Police, and more.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui + Radix UI |
| Data Fetching | TanStack Query + Apollo Client |
| Deployment | Vercel (Mumbai region — `bom1`) |

---

## Local Setup

### Prerequisites
- Node.js 18+
- npm 9+

### Steps

```bash
git clone <repo-url>
cd Bharat-Mock-Frontend
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `https://api.bharatmock.com/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | Public site URL | `https://bharatmock.com` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay payment key | `rzp_live_...` |

All variables are documented in `.env.example`.

---

## Available Scripts

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run postbuild    # Generate sitemap (runs automatically after build)
npm run start        # Start production server
npm run lint         # Lint with ESLint
npm run test         # Run Vitest test suite
```

---

## Project Structure

```
src/
  app/           # Next.js App Router pages
  components/    # Shared UI components
  lib/           # API clients, utilities, constants
  context/       # React context providers
  hooks/         # Custom React hooks
  types/         # TypeScript types
public/          # Static assets
scripts/         # One-off migration/patch scripts (already applied to source)
```

---

## Deployment

The app deploys on **Vercel** in the **Mumbai (bom1)** region for optimal performance for Indian users.

- Push to `main` → automatic production deploy
- Vercel config: `vercel.json`
- Post-build sitemap generation: `next-sitemap.config.js`

---

## SEO

- All public pages use server-side rendering (SSR/ISR) for Google indexability
- JSON-LD structured data on all exam, blog, and listing pages
- Sitemap auto-generated via `next-sitemap` after each build
- Robots rules in `src/app/robots.ts`
