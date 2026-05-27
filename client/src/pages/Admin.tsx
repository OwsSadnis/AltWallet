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
  Megaphone,
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

type Tab = "ops" | "stats" | "monitor" | "announcements";

// ---------- Dashboard ----------
function AdminDashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [scans] = useState<ScanRow[]>(() => seedScans());
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("ops");

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

  const TABS: { id: Tab; label: string }[] = [
    { id: "ops", label: "Operations" },
    { id: "stats", label: "Usage Stats" },
    { id: "monitor", label: "API Monitor" },
    { id: "announcements", label: "Announcements" },
  ];

  return (
    <div className="container aw-admin" style={{ paddingTop: 56, paddingBottom: 120 }}>
      <Reveal>
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
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

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 border-b" style={{ borderColor: "#1a1a1a" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="px-4 py-2.5 text-[13px] font-medium transition-colors"
              style={{
                color: activeTab === t.id ? "var(--accent)" : "var(--fg-tertiary)",
                borderBottom: activeTab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Reveal>

      {/* ========== Operations tab ========== */}
      {activeTab === "ops" && (
        <>
          <Reveal>
            <div className="aw-admin-stats mb-8">
              <Stat label="Total scans" value={scans.length * 632 + 1241} />
              <Stat label="Scans today" value={todayCount * 47 + 12} />
              <Stat label="Active users" value={uniqueUsers * 214} />
              <Stat label="Paid conversions" value={218} suffix=" / mo" />
            </div>
          </Reveal>

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
        </>
      )}

      {/* ========== Usage Stats tab ========== */}
      {activeTab === "stats" && <UsageStatsTab getToken={getToken} />}

      {/* ========== API Monitor tab ========== */}
      {activeTab === "monitor" && <ApiMonitorTab getToken={getToken} />}

      {/* ========== Announcements tab ========== */}
      {activeTab === "announcements" && <AnnouncementsTab getToken={getToken} />}

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

// ---------- Usage Stats Tab ----------
interface StatsData {
  today: number;
  week: number;
  month: number;
  chains: Record<string, number>;
  active_users: number;
}

function UsageStatsTab({ getToken }: { getToken: () => Promise<string | null> }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getToken()
      .then(async (token) => {
        const r = await fetch("/api/admin/stats", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const d = await r.json();
        if (d.success) setData(d);
        else setError(d.error ?? "Failed to load stats.");
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [getToken]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const chainEntries = Object.entries(data.chains).sort((a, b) => b[1] - a[1]);
  const maxChain = Math.max(...chainEntries.map((e) => e[1]), 1);

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Scans today" value={data.today} />
          <StatCard label="Scans this week" value={data.week} />
          <StatCard label="Scans this month" value={data.month} />
        </div>
      </Reveal>

      <Reveal>
        <div className="grid sm:grid-cols-2 gap-4">
          <Card hover>
            <Eyebrow>Active users · last 7 days</Eyebrow>
            <div className="text-white font-bold mt-3 tracking-tight mono text-[40px]">
              <CountUp to={data.active_users} />
            </div>
          </Card>

          <Card hover>
            <div className="aw-card-head mb-4">
              <Eyebrow>Scans by chain</Eyebrow>
            </div>
            <div className="flex flex-col gap-2.5">
              {chainEntries.map(([chain, count]) => (
                <div key={chain} className="flex items-center gap-3">
                  <span className="mono text-[12px] text-white w-10 uppercase">{chain}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#151515" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((count / maxChain) * 100)}%`,
                        background: "var(--accent)",
                        transition: "width 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>
                  <span className="mono text-[12px] text-[color:var(--fg-tertiary)] w-10 text-right">
                    {count}
                  </span>
                </div>
              ))}
              {chainEntries.length === 0 && (
                <p className="text-[13px] text-[color:var(--fg-tertiary)]">No scan data yet.</p>
              )}
            </div>
          </Card>
        </div>
      </Reveal>
    </div>
  );
}

// ---------- API Monitor Tab ----------
interface ServiceRow {
  name: string;
  calls_today: number;
  limit: number | null;
}

function ApiMonitorTab({ getToken }: { getToken: () => Promise<string | null> }) {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getToken()
      .then(async (token) => {
        const r = await fetch("/api/admin/api-monitor", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const d = await r.json();
        if (d.success) setServices(d.services);
        else setError(d.error ?? "Failed to load monitor data.");
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [getToken]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <Reveal>
      <Card>
        <div className="aw-card-head mb-4">
          <Eyebrow>API usage · today</Eyebrow>
        </div>
        <div className="aw-tbl">
          <div
            className="aw-tbl-head"
            style={{ gridTemplateColumns: "1.5fr 1fr 1fr 80px" }}
          >
            <div>Service</div>
            <div>Calls today</div>
            <div>Daily limit</div>
            <div style={{ textAlign: "right" }}>Status</div>
          </div>
          {services.map((svc) => {
            const pct = svc.limit ? (svc.calls_today / svc.limit) * 100 : 0;
            const status = svc.limit === null ? "ok" : pct >= 80 ? "warn" : "ok";
            return (
              <div
                key={svc.name}
                className="aw-tbl-row"
                style={{ gridTemplateColumns: "1.5fr 1fr 1fr 80px" }}
              >
                <div className="text-white text-[13px] font-medium">{svc.name}</div>
                <div className="mono text-[13px]">{svc.calls_today.toLocaleString()}</div>
                <div className="mono text-[12px] text-[color:var(--fg-tertiary)]">
                  {svc.limit ? svc.limit.toLocaleString() : "—"}
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: status === "warn" ? "#F5A623" : "#1D9E75" }}
                    title={status === "warn" ? `${Math.round(pct)}% of limit used` : "OK"}
                  />
                </div>
              </div>
            );
          })}
          {services.length === 0 && (
            <div className="py-10 text-center text-[13px] text-[color:var(--fg-tertiary)]">
              No data available.
            </div>
          )}
        </div>
      </Card>
    </Reveal>
  );
}

// ---------- Announcements Tab ----------
interface AnnouncementRow {
  id: string;
  message: string;
  active: boolean;
  created_at: string;
  expires_at: string | null;
}

function AnnouncementsTab({ getToken }: { getToken: () => Promise<string | null> }) {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const r = await fetch("/api/admin/announcements", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const d = await r.json();
      if (d.success) setAnnouncements(d.announcements ?? []);
      else setError(d.error ?? "Failed to load announcements.");
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handlePost = async () => {
    setPostError("");
    if (!message.trim()) return;
    setPosting(true);
    try {
      const token = await getToken();
      const r = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: message.trim(), expires_at: expiresAt || undefined }),
      });
      const d = await r.json();
      if (d.success) {
        setMessage("");
        setExpiresAt("");
        fetchAnnouncements();
      } else {
        setPostError(d.error ?? "Failed to post.");
      }
    } finally {
      setPosting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    const token = await getToken();
    await fetch(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    fetchAnnouncements();
  };

  const getStatus = (a: AnnouncementRow): { label: string; tone: "safe" | "neutral" | "medium" } => {
    if (!a.active) return { label: "Deactivated", tone: "neutral" };
    if (a.expires_at && new Date(a.expires_at) < new Date()) return { label: "Expired", tone: "medium" };
    return { label: "Active", tone: "safe" };
  };

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <Card hover>
          <div className="aw-card-head mb-4">
            <Eyebrow>Post announcement</Eyebrow>
            <Megaphone className="w-4 h-4 text-[color:var(--fg-tertiary)]" />
          </div>
          <div className="flex flex-col gap-3">
            <textarea
              className="aw-input"
              style={{ minHeight: 80, resize: "vertical", padding: "10px 12px" }}
              placeholder="Announcement message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[color:var(--fg-tertiary)]">
                  Expires at (optional)
                </label>
                <input
                  type="datetime-local"
                  className="aw-input"
                  style={{ padding: "6px 10px", fontSize: 12 }}
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handlePost}
                disabled={posting || !message.trim()}
                style={{ alignSelf: "flex-end" }}
              >
                {posting ? "Posting…" : "Post Announcement"}
              </Button>
            </div>
            {postError && (
              <p className="text-[12px]" style={{ color: "#E53E3E" }}>{postError}</p>
            )}
          </div>
        </Card>
      </Reveal>

      <Reveal>
        <Card>
          <div className="aw-card-head mb-4">
            <Eyebrow>Past announcements</Eyebrow>
          </div>
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : announcements.length === 0 ? (
            <p className="text-[13px] text-[color:var(--fg-tertiary)] py-4">
              No announcements yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {announcements.map((a) => {
                const { label, tone } = getStatus(a);
                return (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-4 py-3 border-t"
                    style={{ borderColor: "#1a1a1a" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white mb-1">{a.message}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Chip tone={tone}>{label}</Chip>
                        <span className="text-[11px] text-[color:var(--fg-tertiary)] mono">
                          {new Date(a.created_at).toLocaleString("en-US", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        {a.expires_at && (
                          <span className="text-[11px] text-[color:var(--fg-tertiary)]">
                            Expires {new Date(a.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    {a.active && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDeactivate(a.id)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Reveal>
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card hover>
      <Eyebrow>{label}</Eyebrow>
      <div className="text-white font-bold mt-3 tracking-tight mono text-[36px]">
        <CountUp to={value} />
      </div>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="py-12 text-center text-[13px] text-[color:var(--fg-tertiary)]">
      Loading…
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-[13px]" style={{ color: "#E53E3E" }}>
      {message}
    </div>
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
