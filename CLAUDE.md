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
- **Deploy**: Vercel Hobby (alt-wallet.vercel.app)
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
├── api/             # Vercel serverless entry point
├── shared/          # Shared types
├── .env             # Local env (never commit)
└── package.json
```

---

## Critical Rules — BACA SEBELUM EDIT APAPUN

1. **JANGAN modifikasi**: `Shell`, `ThemeProvider`, `I18nProvider` — jangan disentuh
2. **Router**: Gunakan `wouter`, bukan `react-router-dom`
3. **Clerk SignIn**: Pakai hash routing — `<SignIn routing="hash" fallbackRedirectUrl="/redeem" />`
4. **ProtectedRoute**: Via `useAuth()` dari Clerk — sudah ada di `client/src/components/aw/ProtectedRoute.tsx`
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
- `/admin` — requires auth + admin role check (Clerk publicMetadata.role === 'admin')

---

## Whop + Token Flow

```
Whop payment success
  → webhook POST /api/webhooks/whop
  → verify Whop HMAC-SHA256 signature
  → generate token BETA-AW-XXXXXX
  → insert into Supabase `tokens` table
  → Resend email → buyer (template: altwallet-pro-token / altwallet-business-token)

User redeem:
  POST /api/redeem { token }
  → Turnstile verify
  → validate token exists + !used
  → mark token used
  → update Clerk publicMetadata: { plan: "pro" | "business" }
  → return { success, plan }
```

---

## Supabase Schema (Sudah dibuat)

```sql
-- tokens
CREATE TABLE tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL,
  email TEXT,
  used BOOLEAN DEFAULT false,
  used_by TEXT,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- wallet_scans
CREATE TABLE wallet_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  risk_score INTEGER,
  result JSONB,
  scanned_at TIMESTAMPTZ DEFAULT now()
);

-- profiles
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- team_members (belum dibuat — Phase 5)
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id TEXT NOT NULL,
  member_id TEXT,
  member_email TEXT NOT NULL,
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ
);
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

### Risk Score (0-100)
- 0-30: Low risk (green)
- 31-69: Medium risk (yellow)
- 70-100: High risk (red)

---

## Plan Limits

| Feature | Free | Pro | Business |
|---------|------|-----|----------|
| Wallet scans/day | 3 | Unlimited | Unlimited |
| Chains | ETH, BTC | All 6 | All 6 |
| AI Summary | x | v | v |
| PDF/CSV Export | x | v | v |
| Transaction history | — | 30 days | 90 days |
| Team seats | 1 | 1 | Up to 3 |
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
CLERK_WEBHOOK_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
WHOP_WEBHOOK_SECRET=
WHOP_API_KEY=
WHOP_PRO_PLAN_ID=
WHOP_BUSINESS_PLAN_ID=
RESEND_API_KEY=
ANTHROPIC_API_KEY=
GOPLUS_API_KEY=
ETHERSCAN_API_KEY=
HELIUS_API_KEY=
CMC_API_KEY=
TURNSTILE_SECRET_KEY=
```

---

## Progress Status

### Selesai
- Phase 1: Visual fixes, i18n (274 keys EN/ID/AR/ZH), Vercel config
- Phase 2: Clerk auth, ProtectedRoute, Clerk webhook handler
- Phase 3: Whop webhook, /api/redeem, Turnstile CAPTCHA
- Phase 4: Scanner API (GoPlus+Etherscan+Helius+Tronscan), AI summary (Haiku), PDF/CSV export

### Phase 5 — Sekarang
- [ ] Team seats backend (Business, max 3 seats)
- [ ] Admin endpoints

### Setelah Phase 5
- Visual fixes minor (hero text terpotong, chain dropdown overlap)
- UI rombak total (Google AI Pro)
- Dashboard/Portfolio/Flagged/Admin UI (Manus)

---

## Phase 5 — Task Detail

### Team Seats (Business tier, max 3 seats)
```
POST /api/team/invite            — owner invite member by email
GET  /api/team/members           — list semua members
DELETE /api/team/members/:userId — remove member
```
- Buat tabel `team_members` di Supabase (schema di atas)
- Member yang di-invite dapat akses Business features
- Enforce max 3 seats per Business account

### Admin Endpoints
```
GET   /api/admin/users                — list semua users
GET   /api/admin/tokens               — list tokens + status
GET   /api/admin/scans                — list scan history
PATCH /api/admin/users/:userId/plan   — manual override plan
```
- Admin check: Clerk publicMetadata.role === 'admin'

---

## Code Style

- TypeScript strict mode — no `any` kecuali terpaksa
- Named exports untuk components
- Async/await, bukan `.then()`
- Error handling: selalu return `{ success, error }` dari API

---

## Catatan Penting

- **Repo**: github.com/OwsSadnis/AltWallet (branch: main)
- **Dev server**: `pnpm dev` → localhost:3000
- **Tagline ID** (jangan ubah): "Kenali Dulu Siapa Mitra Anda."
- Setelah Phase 5 selesai → push main → visual fixes → UI rombak → Manus