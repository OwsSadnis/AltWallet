// Master translation dictionary. Every other language mirrors these keys.
export const en: Record<string, string> = {
  // Nav
  "nav.checker": "Checker",
  "nav.pricing": "Pricing",
  "nav.redeem": "Redeem",
  "nav.signin": "Sign In",
  "nav.get_started": "Get Started",
  "nav.open_menu": "Open menu",
  "nav.close_menu": "Close menu",
  "nav.language": "Language",

  // Common
  "common.try": "Try",
  "common.beta": "Beta",
  "common.most_popular": "Most Popular",
  "common.back": "Back",
  "common.scan_now": "Scan Now",
  "common.scan_wallet": "Scan Wallet",
  "common.upgrade": "Upgrade",
  "common.rescan": "Re-scan",
  "common.new_scan": "New scan",
  "common.live": "Live",
  "common.copied": "Copied",
  "common.search": "Search",
  "common.loading": "Loading",
  "common.activate": "Activate Plan",
  "common.activating": "Activating…",
  "common.see_pricing": "See pricing",
  "common.already_have_key": "Already have a token? Redeem here",

  // Hero
  "hero.trusted": "Trusted by Web3 teams worldwide",
  "hero.title_line_1": "Know Who You're",
  "hero.title_line_2": "Dealing With.",
  "hero.sub": "Instant risk analysis for any crypto wallet. Check sanctions, mixers, drainers, and counterparty patterns across 6 chains — before you send funds.",
  "hero.sub_mobile": "Instant wallet risk analysis across 6 chains. Spot sanctions, mixers and drainers before you send.",

  // Stats
  "stats.chains": "Chains supported",
  "stats.signals": "Risk signals",
  "stats.indexed": "Addresses indexed",
  "stats.median": "Median scan time",

  // Features
  "section.why.eyebrow": "Why AltWallet",
  "section.why.title_1": "The due diligence layer every Web3",
  "section.why.title_2": "transaction deserves.",
  "section.why.sub": "Risk signals from GoPlus Security, public chain explorers, and our own behavioural heuristics — merged into one clear score. Higher is safer.",

  "feat.score.title": "Risk Score Engine",
  "feat.score.desc": "A 0–100 score that blends sanctions data, mixer exposure, wallet age and counterparty behaviour. Higher means safer.",
  "feat.realtime.title": "Real-Time Analysis",
  "feat.realtime.desc": "Live lookups against chain explorers and GoPlus. Median scan time under four seconds across all supported networks.",
  "feat.multichain.title": "Multi-Chain Coverage",
  "feat.multichain.desc": "Ethereum, Bitcoin, Solana, Tron, XRP and Sui — one interface, one score format, consistent methodology.",
  "feat.ai.title": "AI Summary Reports",
  "feat.ai.desc": "Claude-powered plain-language explanations of every scan, in your language. No jargon, no investment advice.",
  "feat.history.title": "Transaction History",
  "feat.history.desc": "Up to 24 months of enriched transaction data with counterparty risk tags so you can spot patterns at a glance.",
  "feat.api.title": "API Access",
  "feat.api.desc": "Integrate risk checks into your own product, bot, or compliance workflow. Webhooks and CSV exports included on Business.",

  // How it works
  "how.eyebrow": "How it works",
  "how.title": "Three steps. No spreadsheets.",
  "how.s1.t": "Enter an address",
  "how.s1.d": "Paste any wallet across 6 chains and pick the network — or select from a known example.",
  "how.s2.t": "AI + rules analyse risk",
  "how.s2.d": "We query GoPlus, the chain explorer and run behavioural heuristics in parallel.",
  "how.s3.t": "Read your report",
  "how.s3.d": "Score, flags, transactions, and a plain-language AI summary — ready in seconds.",

  // Chains
  "chains.eyebrow": "Supported chains",
  "chains.title": "Six networks, one score format.",
  "chains.beta_note": "Beta chains (XRP, Sui): limited data accuracy. Scores are capped at 80 and include a 20% confidence reduction until parity is reached.",

  // Pricing preview
  "pricing.eyebrow": "Pricing",
  "pricing.title": "Start free. Upgrade when it matters.",
  "pricing.sub": "One scan per day is free, forever. Pro and Business are a one-click checkout on Whop — no card forms live in this app.",
  "pricing.per_month": "/ month",

  "plan.free.name": "Free",
  "plan.free.desc": "Try AltWallet with one scan per day.",
  "plan.free.cta": "Get Started Free",

  "plan.pro.name": "Pro",
  "plan.pro.desc": "For active traders and researchers.",
  "plan.pro.cta": "Buy on Whop",

  "plan.biz.name": "Business",
  "plan.biz.desc": "For teams doing serious due diligence.",
  "plan.biz.cta": "Buy on Whop",

  "feat.scans_1": "1 wallet scan / day",
  "feat.scans_unlimited": "Unlimited scans",
  "feat.score_flags": "Risk score & flags",
  "feat.history_30": "30 days transaction history",
  "feat.history_12": "12 months transaction history",
  "feat.history_24": "24 months transaction history",
  "feat.ai_summary": "AI-generated summary",
  "feat.pdf": "PDF report download",
  "feat.csv": "CSV export",
  "feat.seats_1": "1 seat",
  "feat.seats_3": "3 seats",
  "feat.support_community": "Community support",
  "feat.support_email": "Email support",
  "feat.support_priority": "Priority support",

  // Stablecoin banner
  "banner.stable": "If you choose to transact, consider using stablecoins (USDT/USDC) to minimise volatility risk. AltWallet does not facilitate transactions — we only provide risk analysis.",
  "banner.nowallet": "AltWallet never asks you to connect a wallet. We analyse public addresses only — your keys stay with you.",

  // Final CTA
  "cta.eyebrow": "Ready when you are",
  "cta.title": "One scan away from peace of mind.",
  "cta.sub": "Free tier runs forever. No credit card. No wallet connection — we never ask for it.",
  "cta.run": "Run a free scan",
  "cta.see_pricing": "See pricing",
  "cta.no_connect": "No wallet connection required",
  "cta.pdf_pro": "PDF reports on Pro & Business",

  // Checker
  "checker.eyebrow": "Wallet checker",
  "checker.sub": "Enter any wallet address to analyse risk, sanctions exposure, mixer contact, and transaction patterns across 6 chains. Free tier = 1 scan per day.",
  "checker.scanning": "Scanning",
  "checker.analysing": "Analysing",
  "checker.step_1": "Fetching chain data…",
  "checker.step_2": "Cross-checking sanctions & mixers…",
  "checker.step_3": "Running behavioural heuristics…",
  "checker.step_4": "Generating AI summary…",
  "checker.complete": "{pct}% complete",
  "checker.scan_result": "Scan result",
  "checker.beta_warning": "Beta chain — accuracy may be limited",
  "checker.one_layer": "This is one layer of due diligence — not a guarantee of safety. Consider using stablecoins (USDT/USDC) if you decide to transact, to minimise volatility risk.",

  // Score card
  "score.eyebrow": "Wallet risk score",
  "score.safe": "Safe",
  "score.medium": "Medium Risk",
  "score.high": "High Risk",
  "score.disclaimer": "Higher score = safer wallet. This is one layer of due diligence — not a guarantee of safety.",
  "score.vs_last": "vs last scan",

  // Vitals
  "vitals.eyebrow": "Wallet vitals",
  "vitals.checked": "47 signals checked",
  "vitals.red": "Red flags",
  "vitals.yellow": "Yellow flags",
  "vitals.green": "Green signals",
  "vitals.age": "Wallet age",
  "vitals.counterparties": "Counterparties",
  "vitals.approvals": "Active approvals",

  // Flags
  "flags.eyebrow": "Risk flags & signals",
  "flags.findings": "{n} findings",
  "flags.red": "Red flag",
  "flags.yellow": "Yellow flag",
  "flags.green": "Green signal",
  "flags.empty": "No risk findings. This can mean the wallet is clean, or that data coverage for this chain is limited.",

  // Tx
  "tx.eyebrow": "Transaction history",
  "tx.last_30": "Last 30 days",
  "tx.last_12": "Last 12 months",
  "tx.counterparty": "Counterparty",
  "tx.type": "Type",
  "tx.amount": "Amount",
  "tx.value": "Value",
  "tx.time": "Time",
  "tx.locked": "Older history is limited on the Free plan.",
  "tx.upgrade_pro": "Upgrade to Pro",
  "tx.high_short": "High",
  "tx.med_short": "Med",
  "tx.safe_short": "Safe",

  // AI
  "ai.eyebrow": "AI Analysis — for informational purposes only",
  "ai.locked_t": "AI summaries are a Pro feature",
  "ai.locked_d": "Upgrade to Pro to get a plain-language analysis of every scan, translated into your language.",

  // Education
  "edu.title": "What do these results mean?",
  "edu.sub": "Plain-language explainer of scores, flags, and what to do next.",
  "edu.red_t": "Red flags",
  "edu.red_d": "Strong negative signals such as sanctioned addresses, confirmed mixer interaction, or rapid wallet drains. Each red flag reduces the score significantly.",
  "edu.yellow_t": "Yellow flags",
  "edu.yellow_d": "Warning patterns like very new wallets or burst activity. They don't confirm wrongdoing but they justify caution.",
  "edu.green_t": "Green signals",
  "edu.green_d": "Positive evidence — long wallet history, known exchange counterparty, diverse activity — that raises the score.",

  // Download bar
  "dl.title": "Download this report",
  "dl.desc_pro": "Branded PDF with the full score breakdown.",
  "dl.desc_free": "Upgrade to Pro to download PDF reports.",
  "dl.pdf": "Download PDF",
  "dl.locked": "PDF locked",
  "dl.share": "Share",

  // Redeem
  "redeem.eyebrow": "Redeem",
  "redeem.title": "Activate Your Plan",
  "redeem.sub": "Enter the license key from your purchase email. Your plan activates instantly.",
  "redeem.placeholder": "Enter your license key",
  "redeem.hint": "Your key was emailed to you after purchase on Whop.",
  "redeem.err_used": "Token invalid or already used.",
  "redeem.no_key": "Don't have a key yet?",
  "redeem.welcome": "Welcome to AltWallet {plan}",
  "redeem.welcome_d_pro": "Your plan is now active. You have access to unlimited scans, AI summaries and PDF reports.",
  "redeem.welcome_d_biz": "Your plan is now active. You have access to unlimited scans, AI summaries, CSV export and 3 seats.",
  "redeem.run_first": "Run your first scan",
  "redeem.one_key": "One key per account. License keys are single-use and bound to your AltWallet account after activation.",
  "redeem.activated": "Plan activated",

  // Footer
  "footer.rights": "© 2026 AltNeurealms",
  "footer.terms": "Terms",
  "footer.privacy": "Privacy",
  "footer.contact": "Contact",
  "footer.note": "One layer of due diligence — not a guarantee.",

  // Pricing page
  "price.page.title_1": "Simple pricing.",
  "price.page.title_2": "Serious protection.",
  "price.page.sub": "Start free forever. Upgrade to Pro for unlimited scans and AI-generated reports, or Business for team seats and CSV exports. All payments are handled externally by Whop — no card forms live in this app.",
  "price.compare.eyebrow": "Feature comparison",
  "price.compare.title": "Feature-by-feature breakdown.",
  "price.faq.eyebrow": "FAQ",
  "price.faq.title": "Quick answers.",
  "price.beta_note": "XRP and Sui are in Beta — scores are capped at 80 and include a 20% confidence reduction while data coverage matures.",

  // 404
  "err.404.eye": "Error · 404",
  "err.404.p": "This page is off-chain. The link you followed doesn't match any route on AltWallet.",
  "err.404.home": "Back to home",
  "err.404.scan": "Scan a wallet",
};

// Pricing comparison table
Object.assign(en, {
  "cmp.feature": "Feature",
  "cmp.scans": "Scans per day",
  "cmp.history_win": "Transaction history window",
  "cmp.score": "Risk score & flags",
  "cmp.multichain": "Multi-chain (ETH, BTC, SOL, TRX, XRP*, SUI*)",
  "cmp.ai_sum": "AI-generated summaries (4 languages)",
  "cmp.pdf": "PDF report download",
  "cmp.csv": "CSV export of scan history",
  "cmp.seats": "Team seats",
  "cmp.support": "Support",
  "cmp.unlimited": "Unlimited",
  "cmp.30d": "30 days",
  "cmp.12m": "12 months",
  "cmp.24m": "24 months",
  "cmp.community": "Community",
  "cmp.email": "Email",
  "cmp.priority": "Priority",

  "faq.cancel.q": "Can I cancel any time?",
  "faq.cancel.a": "Yes. Subscriptions are managed by Whop, so cancellation is a one-click action in your Whop dashboard. You keep access until the end of the current billing period.",
  "faq.keys.q": "Do you store my wallet private keys?",
  "faq.keys.a": "No. AltWallet never asks you to connect a wallet or share any private keys. We analyse public on-chain data only.",
  "faq.acc.q": "How accurate is the risk score?",
  "faq.acc.a": "Our score blends GoPlus Security data, public chain explorers, and behavioural heuristics. It's a strong first layer of due diligence, but not an absolute guarantee — always cross-check before moving meaningful value.",
  "faq.beta.q": "What are Beta chains?",
  "faq.beta.a": "XRP and Sui are currently in Beta because on-chain data coverage is less mature than EVM or Solana. We cap displayed scores at 80 and apply a 20% confidence reduction to compensate.",
  "faq.api.q": "Can I use AltWallet via API?",
  "faq.api.a": "API access is available on Business. It covers scan, history and CSV export endpoints, all rate-limited per plan.",
  "faq.refund.q": "Do you offer refunds?",
  "faq.refund.a": "Refund policy is handled by Whop per their standard terms. Reach out via hello@altwallet.id if something went wrong and we'll help.",

  // Legal — Terms
  "legal.updated": "Last updated",
  "legal.terms.title": "Terms of Service",
  "legal.privacy.title": "Privacy Policy",
  "legal.back": "Back to home",

  // Flagged detail
  "flagged.back": "Back to scan",
  "flagged.eyebrow": "Flagged counterparty",
  "flagged.severity": "Severity",
  "flagged.first_seen": "First seen",
  "flagged.last_seen": "Last seen",
  "flagged.tx_count": "Transactions",
  "flagged.exposure": "Total exposure",
  "flagged.why": "Why this was flagged",
  "flagged.sources": "Data sources",
  "flagged.recommend": "Recommended action",
  "flagged.recommend_body": "Do not transact with this address. If you have already done so, consider documenting the interaction for compliance purposes and avoid further contact.",

  // Dashboard (preview)
  "dash.title": "Your dashboard",
  "dash.sub": "This is a preview of your recent activity on AltWallet. Upgrade to persist history and unlock more features.",
  "dash.recent": "Recent scans",
  "dash.empty": "No scans yet. Run your first one.",
  "dash.new": "New scan",

  // Auth
  "auth.signin_t": "Sign in to continue",
  "auth.signin_d": "AltWallet uses a lightweight email-based session for the demo. Real production auth would use the user-management feature.",
  "auth.email": "Email address",
  "auth.email_ph": "you@company.com",
  "auth.plan": "Plan (demo)",
  "auth.signin_btn": "Sign in",
  "auth.signed_as": "Signed in as",
  "auth.signout": "Sign out",
  "auth.required": "Sign-in required to view this page.",

  // Navigation
  "nav.portfolio": "Portfolio",
  "nav.dashboard": "Dashboard",

  // Portfolio
  "port.eyebrow": "Portfolio report",
  "port.title": "Token holdings & allocation.",
  "port.sub": "Live token balances, prices and 24h change for any wallet across 6 chains. Powered by CoinMarketCap (demo dataset).",
  "port.placeholder": "Enter a wallet address to view holdings",
  "port.fetch": "Fetch portfolio",
  "port.fetching": "Fetching balances…",
  "port.empty_t": "Run a portfolio report",
  "port.empty_d": "Pick a chain, paste an address, and we'll show every token, its USD value, and your allocation breakdown.",
  "port.locked_t": "Portfolio reports are a Pro feature",
  "port.locked_d": "Upgrade to Pro or Business to unlock live token balances, prices and the allocation breakdown for any wallet.",
  "port.upgrade": "Upgrade to Pro",
  "port.signin_to_unlock": "Sign in to unlock",

  "port.total_value": "Total portfolio value",
  "port.h24": "24h change",
  "port.assets": "Assets",
  "port.allocation": "Allocation",
  "port.holdings_t": "Holdings",
  "port.token": "Token",
  "port.price": "Price",
  "port.amount": "Amount",
  "port.value": "Value",
  "port.share": "Share",
  "port.h24_short": "24h",
  "port.as_of": "As of",
  "port.disclaimer": "Prices via CoinMarketCap. Holdings reflect on-chain balances only — staked or off-chain assets may not be included.",
});
