# ProfitPro - Hotel Revenue & Distribution

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Framer Motion · Lenis

---

## What's new vs V1

| Issue | Fix |
|---|---|
| Blurry background | Removed all radial-gradient layering. Background is `#09090B` - pure, no blur |
| Lag / jank | Dropped GSAP entirely. Framer Motion only = one animation library, 60fps |
| Heavy intro | Gone. Instant hero load |
| Dual accent colours fighting | Single electric blue `#3B82F6` accent throughout |
| Doors concept | Replaced with slide-in editorial service cards + live revenue ticker |

---

## Architecture

```
src/app/
  page.tsx              ← Homepage
  revenue/page.tsx      ← Revenue Management
  onboarding/page.tsx   ← Hotel Onboarding

src/components/
  layout/
    Nav.tsx             ← Scroll-aware, opaque (no backdrop-filter)
    Footer.tsx
    SmoothScroll.tsx    ← Lenis, minimal config
  sections/
    Ticker.tsx          ← Live revenue metrics ticker (pure CSS anim)
    ServiceCards.tsx    ← Two-service split, slides from sides
    Stats.tsx           ← Animated counters
    OTAGrid.tsx         ← 7-platform grid
    HomeCTA.tsx

src/hooks/
  useInView.ts          ← IntersectionObserver, trigger once
  useCounter.ts         ← easeOutQuart counter
```

---

## Design Tokens

| Token | Value | Role |
|---|---|---|
| `zinc-1000` | `#09090B` | Background - pure black |
| `zinc-900` | `#111113` | Surface |
| `zinc-800` | `#1C1C1F` | Raised surface |
| `zinc-700` | `#27272A` | Borders |
| `blue-500` | `#3B82F6` | Primary accent |
| `blue-400` | `#60A5FA` | Accent light / serif highlight |
| `ink` | `#FAFAFA` | Primary text |
| `sub` | `#A1A1AA` | Secondary text |
| `ghost` | `#52525B` | Tertiary / disabled |

**Typography:**
- Display: Inter (grotesque, tight negative tracking, weight 700)
- Accent/Serif: Instrument Serif italic (editorial contrast)
- Body: Inter regular

---

## Deploy

```bash
npm install
npm run dev       # localhost:3000

# Vercel
# 1. Push to GitHub
# 2. vercel.com/new → import repo
# 3. Framework: Next.js (auto-detected)
# 4. Deploy - live in ~60s
# Region: bom1 (Mumbai) pre-configured
```

No environment variables required.
