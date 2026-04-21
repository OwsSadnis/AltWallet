# AltWallet — Claude Code Instructions

## Project Overview

AltWallet (altwallet.id) adalah crypto wallet checker + portfolio tool. Target: crypto beginners. Pricing: Free / Pro $5mo / Business $15mo. Brand color: `#1D9E75`.

---

## Tech Stack

### Frontend
- **Framework**: Vite + React + TypeScript
- **Router**: Wouter (bukan React Router)
- **Auth**: Clerk (Google + Email)
- **Styling**: CSS modules / Tailwind (cek existing pattern)
- **i18n**: Custom i18n provider — EN / ID / AR / ZH (Simplified Chinese)

### Backend
- **Server**: Express (Node.js)
- **DB**: Supabase (Postgres, RLS enabled)
- **Auth middleware**: Clerk JWT verification
- **Email**: Resend
- **Payment**: Whop (webhooks + license key)

### External APIs
- **GoPlus** — wallet risk scoring
- **Etherscan** — ETH/ERC20 transactions
- **Helius** — Solana (SOL)
- **Tronscan** — TRON (TRX)
- **CoinMarketCap** — price data
- **Claude Haiku** — AI summary di hasil scan

### Infra
- **Deploy**: Vercel Hobby
- **Domain**: altwallet.id (Cloudflare)
- **Security**: Cloudflare Turnstile (CAPTCHA)

---

## Project Structure

```
C:\AltWallet\altwallet\
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── providers/   # DO NOT MODIFY: Shell, ThemeProvider, I18nProvider
│   │   └── main.tsx     # ClerkProvider wraps here
├── server/          # Express backend
│   ├── routes/
│   ├── middleware/
│   └── index.ts
├── shared/          # Shared types
├── .env             # Local env (never commit)
└── package.json
```

---

## Critical Rules — BACA SEBELUM EDIT APAPUN

1. **JANGAN modifikasi**: `Shell`, `ThemeProvider`, `I18nProvider` — ini sudah di-setup Manus, jangan disentuh
2. **Router**: Gunakan `wouter`, bukan `react-router-dom`
3. **Clerk SignIn**: Pakai hash routing — `<SignIn routing="hash" fallbackRedirectUrl="/redeem" />`
4. **ProtectedRoute**: Via `useAuth()` dari Clerk
5. **Supabase RLS**: Selalu aktif — setiap query harus pakai authenticated client
6. **Environment variables**: Client-side pakai prefix `VITE_`, server-side tanpa prefix
7. **Jangan install package baru** tanpa explicit request

---

## Auth Architecture

### Clerk Setup
```tsx
// main.tsx — ClerkProvider sudah wraps semua
<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
  ...
</ClerkProvider>

// SignIn page — hash routing
<SignIn routing="hash" fallbackRedirectUrl="/redeem" />

// ProtectedRoute pattern
const { isSignedIn, isLoaded } = useAuth()
if (!isLoaded) return <Loading />
if (!isSignedIn) return <Redirect to="/sign-in" />
```

### Protected Routes
- `/dashboard` — requires auth
- `/portfolio` — requires auth
- `/flagged` — requires auth
- `/admin` — requires auth + admin role check

---

## Whop + Token Flow

```
Whop payment success
  → webhook POST /api/whop/webhook
  → verify Whop signature
  → insert into Supabase `tokens` table (token: BETA-AW-XXX, plan, email, used: false)
  → Resend email → buyer (token delivery)

User redeem:
  POST /api/redeem { token, userId }
  → validate token exists + !used
  → mark token as used
  → update Clerk publicMetadata: { plan: "pro" | "business" }
  → return success
```

---

## Supabase Schema (Target)

```sql
-- Tokens table
CREATE TABLE tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,         -- format: BETA-AW-XXX
  plan TEXT NOT NULL,                  -- 'free' | 'pro' | 'business'
  email TEXT,
  used BOOLEAN DEFAULT false,
  used_by TEXT,                        -- clerk user_id
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Wallets scanned (history)
CREATE TABLE wallet_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,               -- clerk user_id
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  risk_score INTEGER,
  result JSONB,
  scanned_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: users only see their own data
ALTER TABLE wallet_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_scans" ON wallet_scans
  FOR ALL USING (user_id = auth.uid()::text);
```

---

## Wallet Scanner Logic

### Supported Chains
| Chain | API | Status |
|-------|-----|--------|
| ETH | GoPlus + Etherscan | Active |
| BTC | GoPlus | Active |
| TRX | GoPlus + Tronscan | Active |
| SOL | Helius | Active |
| XRP | GoPlus | Active |
| SUI | GoPlus | Beta |

### Risk Score (0–100)
- 0–30: Low risk (green)
- 31–69: Medium risk (yellow)
- 70–100: High risk (red)

### AI Summary
Setelah scan selesai, POST ke Claude Haiku API dengan hasil scan → generate plain language summary (max 150 kata, bahasa sesuai i18n user).

---

## Plan Limits

| Feature | Free | Pro | Business |
|---------|------|-----|----------|
| Wallet scans/day | 3 | Unlimited | Unlimited |
| Chains | ETH, BTC | All 6 | All 6 |
| AI Summary | ✗ | ✓ | ✓ |
| PDF/CSV Export | ✗ | ✓ | ✓ |
| Transaction history | — | 30 days | 90 days |
| Team seats | 1 | 1 | Up to 5 |
| Support | Email | Priority Email | Priority Email |

---

## Environment Variables

```env
# Client-side (VITE_ prefix)
VITE_CLERK_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TURNSTILE_SITE_KEY=

# Server-side
CLERK_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WHOP_WEBHOOK_SECRET=
WHOP_API_KEY=
RESEND_API_KEY=
ANTHROPIC_API_KEY=
GOPLUS_API_KEY=
ETHERSCAN_API_KEY=
HELIUS_API_KEY=
CMC_API_KEY=
```

---

## Task Priority Order

Kerjakan berurutan:

### Phase 1 — Foundation (Wajib dulu)
1. [x] ~~Fix LOGO_URL path~~ — done
2. [ ] Fix visual bugs: button alignment, chain pills
2. [ ] Vercel config — `vercel.json`, env vars, build settings
3. [ ] i18n fix — pastikan EN/ID/AR/TR semua keys tersedia

### Phase 2 — Auth
4. [ ] Clerk auth wiring di `main.tsx`
5. [ ] ProtectedRoute component
6. [ ] Clerk webhook handler → sync ke Supabase

### Phase 3 — Payment Flow
7. [ ] Whop webhook endpoint (`/api/whop/webhook`) + signature verification
8. [ ] Insert token ke Supabase setelah payment
9. [ ] Resend email token ke buyer
10. [ ] `/api/redeem` endpoint
11. [ ] Turnstile CAPTCHA di redeem form

### Phase 4 — Core Features
12. [ ] Scanner API integration (GoPlus, Etherscan, Helius, Tronscan)
13. [ ] Risk score calculation (0–100)
14. [ ] Claude Haiku AI summary
15. [ ] PDF/CSV export

### Phase 5 — Business Features
16. [ ] Team seats backend (Business tier)
17. [ ] Admin page endpoints

---

## Code Style

- TypeScript strict mode — no `any` kecuali terpaksa
- Named exports untuk components
- Async/await, bukan `.then()`
- Error handling: selalu return `{ success, error }` dari API
- Console.log boleh untuk development, tapi tandai dengan `// TODO: remove`

---

## Testing Sebelum Push

Sebelum setiap push ke main, pastikan:
- [ ] `pnpm build` tidak error
- [ ] Auth flow: sign in → redirect ke /dashboard
- [ ] Protected routes reject unauthenticated users
- [ ] .env tidak ikut ke-commit (cek .gitignore)

---

## Catatan Penting

- **Repo**: github.com/OwsSadnis/AltWallet (branch: main)
- **Dev server**: `pnpm dev` → localhost:3000
- **Manus akan handle**: Dashboard UI, Portfolio UI, Flagged UI, Admin UI — jangan buat halaman ini dari scratch
- **Tagline ID** (jangan ubah): *"Kenali Dulu Siapa Mitra Anda."*
- Setelah Claude Code selesai → push main → baru Manus