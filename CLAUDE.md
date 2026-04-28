# AltWallet — Claude Code Instructions

## Stack
- **Frontend**: Vite + React + TypeScript, Wouter (not React Router), Clerk auth, CSS modules/Tailwind, i18n (EN/ID/AR/ZH, 274 keys)
- **Backend**: Express + Supabase (RLS on) + Clerk JWT + Resend + Whop
- **APIs**: GoPlus, Etherscan, Helius (SOL), Tronscan, CoinMarketCap, Claude Haiku (AI summary)
- **Infra**: Vercel Hobby, altwallet.id via Cloudflare, Turnstile CAPTCHA

## Structure
```
client/src/
  components/   # UI components
  pages/        # Route pages
  providers/    # DO NOT TOUCH: Shell, ThemeProvider, I18nProvider
  main.tsx      # ClerkProvider here
server/         # Express backend
api/            # Vercel serverless entry
shared/         # Shared types
```

## Hard Rules
1. **DO NOT modify**: `Shell`, `ThemeProvider`, `I18nProvider`
2. **Router**: Wouter only — never react-router-dom
3. **Clerk SignIn**: `<SignIn routing="hash" fallbackRedirectUrl="/redeem" />`
4. **ProtectedRoute**: `client/src/components/aw/ProtectedRoute.tsx` — do not recreate
5. **Supabase**: Always use authenticated client (RLS on)
6. **Env vars**: Client = `VITE_` prefix, server = no prefix
7. **No new packages** unless explicitly requested

## Auth
```tsx
// ProtectedRoute pattern
const { isSignedIn, isLoaded } = useAuth()
if (!isLoaded) return <Loading />
if (!isSignedIn) return <Redirect to="/sign-in" />
```

**Protected routes**: `/dashboard`, `/portfolio`, `/flagged`, `/admin`  
**Public routes**: `/`, `/checker`, `/pricing`, `/redeem`  
**Admin**: Clerk `publicMetadata.role === 'admin'`

## Whop + Redeem Flow
```
Whop payment → webhook /api/webhooks/whop → generate BETA-AW-XXXXXX token
→ insert Supabase tokens → Resend email

POST /api/redeem { token }
→ Turnstile verify → validate token (!used) → mark used
→ update Clerk publicMetadata: { plan: "pro" | "business" }
```

## Plan Limits
| Feature | Free | Pro | Business |
|---------|------|-----|----------|
| Scans/day | 3 | Unlimited | Unlimited |
| Chains | ETH, BTC | All 6 | All 6 |
| AI Summary | ✗ | ✓ | ✓ |
| PDF/CSV Export | ✗ | ✓ | ✓ |
| Tx history | — | 30d | 90d |
| Team seats | 1 | 1 | Up to 3 |

**Whop plan IDs**: Pro = `prod_flh88ArQbJpMe`, Business = `prod_vDuBjbnt14kuA`  
**Brand color**: `#1D9E75`  
**Tagline ID** (jangan ubah): *"Kenali Dulu Siapa Mitra Anda."*

## Chains
ETH (GoPlus+Etherscan), BTC (GoPlus), TRX (GoPlus+Tronscan), SOL (Helius), XRP (GoPlus), SUI-beta (GoPlus)  
Risk score: 0–30 low, 31–69 medium, 70–100 high

## Supabase Tables
`tokens`, `wallet_scans`, `profiles`, `team_members`

## Current Phase (Phase 5)
- [ ] Team seats backend (Business, max 3) — `POST /api/team/invite`, `GET /api/team/members`, `DELETE /api/team/members/:userId`
- [ ] Admin endpoints — `GET /api/admin/users|tokens|scans`, `PATCH /api/admin/users/:userId/plan`

## Code Style
- TypeScript strict, no `any` unless forced
- Named exports, async/await
- API responses: always `{ success, error }`

## Dev
- **Repo**: github.com/OwsSadnis/AltWallet (branch: `main`)
- **Dev**: `pnpm dev` → localhost:3000