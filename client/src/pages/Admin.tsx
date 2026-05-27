// Admin operations dashboard — server-side auth via /api/admin/users (requireAdmin middleware).
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  Card,
  Chip,
  Eyebrow,
  Button,
  IconBtn,
} from "@/components/aw/Primitives";
import { Reveal, CountUp } from "@/components/aw/motion";
import { ChainBadge } from "@/components/aw/ResultCards";
import { ChainLogo } from "@/components/aw/WalletInputBar";
import {
  ChainCode,
  CHAINS,
  riskFromScore,
  generateScan,
} from "@/lib/constants";
import {
  Plus,
  Search,
  Mail,
  Copy,
  ChevronUp,
  ChevronDown,
  X,
  Shield,
  Check,
} from "lucide-react";

// ---------- Seed data (scans/stats only — tokens loaded from API) ----------
type ScanRow = {
  id: string;
  addr: string;
  chain: ChainCode;
  email: string;
  ts: number;
  score: number;
};

const ADDRS: Record<ChainCode, string[]> = {
  ETH: [
    "0x7a3f4b2cde918f2c88f09a7b4ce4e91c8d1a2a94",
    "0x3b9aca00e1a24c21c89f57a9d88e7bb3dc1f0c5a",
    "0x52908400098527886e0f7030069857d2e4169ee7",
    "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
  ],
  BTC: [
    "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
    "bc1q9h7rj0yf8p0xtk2xzg5n67w8dyaqe3l5s9mh8k",
  ],
  SOL: [
    "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  ],
  TRX: [
    "TNPeeaaFB7K9cmo4uQpcU32zGK8G1NYqeL",
    "TKHuVq1oKVruCGLvqVexFs6dawKv6fQgFs",
  ],
  XRP: ["rLNaPoKeeBjZe2qs6x52yVPZpZ8td4dc6w"],
  SUI: ["0x2::sui::SUI0x9b7e8fb6c0e3ab21dca90a4b7f0bcd"],
};

const EMAILS = [
  "sasha@altwallet.id",
  "leo@acme.co",
  "amir@studio.dev",
  "user@web3.fi",
  "hana@altwallet.id",
  "min@alpha.xyz",
  "rk@defi-research.com",
  "j.dae@sentinel.io",
  "research@northlab.io",
  "team@altwallet.id",
];

function seedScans(): ScanRow[] {
  const rows: ScanRow[] = [];
  const now = Date.now();
  let idx = 0;
  for (const chain of Object.keys(ADDRS) as ChainCode[]) {
    for (const a of ADDRS[chain]) {
      const ageMin = Math.floor(5 + Math.random() * 60 * 24 * 40);
      const ts = now - ageMin * 60_000;
      const s = generateScan(a, chain);
      rows.push({
        id: `scan-${idx++}`,
        addr: a,
        chain,
        email: EMAILS[idx % EMAILS.length],
        ts,
        score: s.score,
      });
    }
  }
  for (let i = 0; i < 10; i++) {
    const base = rows[i % rows.length];
    rows.push({
      ...base,
      id: `scan-${idx++}`,
      ts: base.ts - (i + 1) * 3_600_000,
      email: EMAILS[(idx + i) % EMAILS.length],
      score: Math.max(10, Math.min(95, base.score + (Math.random() * 20 - 10))),
    });
  }
  return rows.sort((a, b) => b.ts - a.ts);
}

type TokenRow = {
  code: string;
  plan: "Pro" | "Business";
  used: boolean;
  email: string | null;
  when: string;
};

// ---------- Main component — auth gated by server ----------
export default function Admin() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [, navigate] = useLocation();
  const { isLoaded, getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    getToken()
      .then(async (token) => {
        const r = await fetch("/api/admin/users", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (r.ok) {
          setAuthed(true);
        } else {
          navigate("/");
        }
      })
      .catch(() => navigate("/"))
      .finally(() => setChecking(false));
  }, [isLoaded, getToken, navigate]);

  if (checking || !isLoaded) {
    return (
      <div className="container" style={{ paddingTop: 96 }}>
        <div className="flex items-center justify-center gap-3 text-[color:var(--fg-tertiary)]">
          <Shield className="w-5 h-5 animate-pulse" />
          <span className="text-[13px]">Verifying access…</span>
        </div>
      </div>
    );
  }

  if (!authed) return null;
  return <AdminDashboard />;
}

// ---------- Dashboard ----------
function AdminDashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [scans] = useState<ScanRow[]>(() => seedScans());
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [genLoading, setGenLoading] = useState(false);

  // Scan table state
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof ScanRow | "score">("ts");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Token filter
  const [tokenFilter, setTokenFilter] = useState<"all" | "used" | "unused">("all");
  const [showGen, setShowGen] = useState(false);

  // Load real tokens from API on mount
  useEffect(() => {
    getToken().then(async (token) => {
      const r = await fetch("/api/admin/tokens", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) return;
      const data = await r.json();
      if (data.success && Array.isArray(data.tokens)) {
        setTokens(
          data.tokens.map(
            (t: {
              token: string;
              plan: string;
              used: boolean;
              used_by?: string | null;
              used_at?: string | null;
            }) => ({
              code: t.token,
              plan: (t.plan === "business" ? "Business" : "Pro") as "Pro" | "Business",
              used: t.used,
              email: t.used_by ?? null,
              when: t.used_at
                ? new Date(t.used_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—",
            })
          )
        );
      }
    });
  }, [getToken]);

  // Derived stats
  const todayCount = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return scans.filter((s) => s.ts >= start.getTime()).length;
  }, [scans]);

  const uniqueUsers = useMemo(
    () => new Set(scans.map((s) => s.email)).size,
    [scans]
  );

  const chainBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    scans.forEach((s) => {
      map[s.chain] = (map[s.chain] || 0) + 1;
    });
    const max = Math.max(...Object.values(map), 1);
    return CHAINS.map((c) => ({
      ...c,
      count: map[c.code] || 0,
      pct: Math.round(((map[c.code] || 0) / max) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [scans]);

  // Filter + sort scans
  const filteredScans = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? scans.filter(
          (s) =>
            s.addr.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q) ||
            s.chain.toLowerCase().includes(q)
        )
      : scans;
    const sorted = [...list].sort((a, b) => {
      const av = a[sortKey as keyof ScanRow];
      const bv = b[sortKey as keyof ScanRow];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return sorted;
  }, [scans, query, sortKey, sortDir]);

  const toggleSort = (k: keyof ScanRow | "score") => {
    if (sortKey === k) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const filteredTokens = tokens.filter((r) =>
    tokenFilter === "all" ? true : tokenFilter === "used" ? r.used : !r.used
  );

  const generateToken = async (plan: "Pro" | "Business") => {
    setGenLoading(true);
    try {
      const authToken = await getToken();
      const r = await fetch("/api/admin/generate-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ plan: plan.toLowerCase(), quantity: 1 }),
      });
      const data = await r.json();
      if (data.success && Array.isArray(data.tokens)) {
        const newRows: TokenRow[] = data.tokens.map((code: string) => ({
          code,
          plan,
          used: false,
          email: null,
          when: "—",
        }));
        setTokens((prev) => [...newRows, ...prev]);
      }
    } finally {
      setGenLoading(false);
      setShowGen(false);
    }
  };

  const adminEmail = user?.primaryEmailAddress?.emailAddress ?? "admin";

  return (
    <div className="container aw-admin" style={{ paddingTop: 56, paddingBottom: 120 }}>
      <Reveal>
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <Eyebrow>Admin · Internal</Eyebrow>
            <h1 className="text-white text-[28px] md:text-[34px] font-bold tracking-tight mt-2">
              Operations dashboard
            </h1>
            <div className="text-[12px] text-[color:var(--fg-tertiary)] mt-2">
              Logged in as <span className="mono text-white">{adminEmail}</span>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setShowGen(true)}
          >
            Generate manual token
          </Button>
        </div>
      </Reveal>

      {/* ---------- Stats grid ---------- */}
      <Reveal>
        <div className="aw-admin-stats mb-8">
          <Stat label="Total scans" value={scans.length * 632 + 1241} />
          <Stat label="Scans today" value={todayCount * 47 + 12} />
          <Stat label="Active users" value={uniqueUsers * 214} />
          <Stat label="Paid conversions" value={218} suffix=" / mo" />
        </div>
      </Reveal>

      {/* ---------- Top chains ---------- */}
      <Reveal>
        <Card hover>
          <div className="aw-card-head">
            <Eyebrow>Top chains · last 30 days</Eyebrow>
            <span className="aw-meta">{CHAINS.length} tracked</span>
          </div>
          <div className="flex flex-col gap-3">
            {chainBreakdown.map((c) => (
              <div key={c.code} className="aw-chain-row">
                <div className="aw-chain-row-l">
                  <ChainLogo code={c.code} size={16} />
                  <span className="text-white text-[13px] font-medium">
                    {c.name}
                  </span>
                  {c.beta && <Chip tone="beta">Beta</Chip>}
                </div>
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ background: "#151515" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${c.pct}%`,
                      background: c.color,
                      transition: "width 900ms cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                </div>
                <div className="mono text-[12px] text-[color:var(--fg-tertiary)] w-20 text-right">
                  {c.count.toLocaleString()} scans
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>

      {/* ---------- All scans ---------- */}
      <Reveal>
        <Card className="aw-table-card mt-6">
          <div className="aw-card-head flex-wrap gap-3">
            <Eyebrow>All scans · {filteredScans.length}</Eyebrow>
            <div className="aw-input aw-input-sm" style={{ maxWidth: 280 }}>
              <Search className="aw-input-icon" />
              <input
                placeholder="Search address, user or chain…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  className="aw-input-clear"
                  onClick={() => setQuery("")}
                  aria-label="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="aw-tbl">
            <div
              className="aw-tbl-head"
              style={{ gridTemplateColumns: "1.6fr 0.7fr 0.7fr 1.2fr 0.9fr" }}
            >
              <SortHeader label="Wallet" active={sortKey === "addr"} dir={sortDir} onClick={() => toggleSort("addr")} />
              <SortHeader label="Chain" active={sortKey === "chain"} dir={sortDir} onClick={() => toggleSort("chain")} />
              <SortHeader label="Score" active={sortKey === "score"} dir={sortDir} onClick={() => toggleSort("score")} />
              <SortHeader
                label="User"
                active={sortKey === "email"}
                dir={sortDir}
                onClick={() => toggleSort("email")}
                className="aw-tbl-hide-sm"
              />
              <SortHeader
                label="Time"
                active={sortKey === "ts"}
                dir={sortDir}
                onClick={() => toggleSort("ts")}
                align="right"
              />
            </div>

            {filteredScans.slice(0, 25).map((row) => {
              const risk = riskFromScore(row.score);
              return (
                <div
                  key={row.id}
                  className="aw-tbl-row"
                  style={{ gridTemplateColumns: "1.6fr 0.7fr 0.7fr 1.2fr 0.9fr" }}
                >
                  <div className="mono aw-addr truncate">
                    {row.addr.slice(0, 10)}…{row.addr.slice(-6)}
                  </div>
                  <div>
                    <ChainBadge chain={row.chain} />
                  </div>
                  <div>
                    <Chip tone={risk.tone} dot>
                      {Math.round(row.score)}
                    </Chip>
                  </div>
                  <div className="aw-tbl-hide-sm text-[color:var(--fg-secondary)] truncate">
                    {row.email}
                  </div>
                  <div className="aw-tbl-time" style={{ textAlign: "right" }}>
                    {relTime(row.ts)}
                  </div>
                </div>
              );
            })}
            {filteredScans.length === 0 && (
              <div className="py-10 text-center text-[13px] text-[color:var(--fg-tertiary)]">
                No scans match "{query}".
              </div>
            )}
          </div>
        </Card>
      </Reveal>

      {/* ---------- License tokens ---------- */}
      <Reveal>
        <Card className="mt-6">
          <div className="aw-card-head flex-wrap gap-3">
            <Eyebrow>License tokens · {filteredTokens.length}</Eyebrow>
            <div className="flex items-center gap-1 flex-wrap">
              {(["all", "unused", "used"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setTokenFilter(f)}
                  className={`aw-tok-pill ${tokenFilter === f ? "active" : ""}`}
                >
                  {f}
                </button>
              ))}
              <Button
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={() => setShowGen(true)}
              >
                New
              </Button>
            </div>
          </div>

          <div className="aw-tok-list">
            {filteredTokens.map((row) => (
              <div key={row.code} className="aw-tok-row">
                <span className="mono text-[13px] text-white aw-tok-code">
                  {row.code}
                </span>
                <Chip tone={row.plan === "Business" ? "info" : "safe"}>
                  {row.plan}
                </Chip>
                <Chip tone={row.used ? "neutral" : ("solid" as any)}>
                  {row.used ? "Used" : "Unused"}
                </Chip>
                <span className="text-[12px] text-[color:var(--fg-secondary)] truncate aw-tok-email">
                  {row.email || "—"}
                </span>
                <span className="text-[12px] mono text-[color:var(--fg-tertiary)] aw-tok-when">
                  {row.when}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <IconBtn
                    icon={Copy}
                    aria-label="Copy"
                    onClick={() => navigator.clipboard.writeText(row.code)}
                  />
                  <IconBtn icon={Mail} aria-label="Re-send email" />
                </div>
              </div>
            ))}
            {filteredTokens.length === 0 && (
              <div className="py-10 text-center text-[13px] text-[color:var(--fg-tertiary)]">
                No tokens.
              </div>
            )}
          </div>
        </Card>
      </Reveal>

      {/* ---------- Generate token modal ---------- */}
      {showGen && (
        <div
          className="aw-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGen(false);
          }}
        >
          <div className="aw-modal">
            <div className="flex items-start justify-between mb-6">
              <div>
                <Eyebrow>Manual token</Eyebrow>
                <h3 className="text-white text-[20px] font-bold mt-2">
                  Generate license key
                </h3>
                <p className="text-[12px] text-[color:var(--fg-tertiary)] mt-2 max-w-xs">
                  Use this for support cases or enterprise onboarding. The token
                  is single-use and bound to the first account that redeems it.
                </p>
              </div>
              <IconBtn icon={X} aria-label="Close" onClick={() => setShowGen(false)} />
            </div>
            <div className="flex flex-col gap-3">
              <button
                className="aw-plan-pick"
                disabled={genLoading}
                onClick={() => generateToken("Pro")}
              >
                <div>
                  <div className="text-white text-[14px] font-semibold">Pro</div>
                  <div className="text-[12px] text-[color:var(--fg-tertiary)]">
                    Unlimited scans · 12-month history · AI summaries
                  </div>
                </div>
                <Check className="w-4 h-4 text-[color:var(--accent)]" />
              </button>
              <button
                className="aw-plan-pick"
                disabled={genLoading}
                onClick={() => generateToken("Business")}
              >
                <div>
                  <div className="text-white text-[14px] font-semibold">
                    Business
                  </div>
                  <div className="text-[12px] text-[color:var(--fg-tertiary)]">
                    3 seats · 24-month history · CSV export · API
                  </div>
                </div>
                <Check className="w-4 h-4 text-[color:var(--accent)]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- helpers ----------
function relTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <Card hover>
      <Eyebrow>{label}</Eyebrow>
      <div className="text-white font-bold mt-3 tracking-tight mono text-[28px] md:text-[32px]">
        <CountUp to={value} />
        {suffix}
      </div>
    </Card>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
  align,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  className?: string;
  align?: "right";
}) {
  return (
    <button
      onClick={onClick}
      className={`aw-sort ${className || ""}`}
      style={{ textAlign: align === "right" ? "right" : "left", justifyContent: align === "right" ? "flex-end" : "flex-start" }}
    >
      <span>{label}</span>
      {active ? (
        dir === "asc" ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )
      ) : null}
    </button>
  );
}
