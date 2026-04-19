// Portfolio Report — auth-gated, plan-aware (Pro/Business unlock, Free sees blurred preview).
//
// Flow:
//   1. Visitor not signed in → SignInPanel (email + plan selector for demo).
//   2. Signed in (Free) → Header + blurred PortfolioBoard preview + UpgradeOverlay.
//   3. Signed in (Pro/Business) → Full PortfolioBoard with input bar, holdings, chart.
//
// Mocked CMC dataset comes from `lib/portfolio.ts`. Replace with real backend
// (see web-db-user upgrade) when wiring to live CoinMarketCap.
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  LogIn,
  LogOut,
  Lock,
  Sparkles,
  Loader2,
  PieChart,
} from "lucide-react";
import {
  Button,
  Chip,
  Eyebrow,
  Card,
  IconBtn,
  PulseDot,
} from "@/components/aw/Primitives";
import { Reveal } from "@/components/aw/motion";
import { ChainLogo, WalletInputBar } from "@/components/aw/WalletInputBar";
import { ChainCode, CHAIN_MAP } from "@/lib/constants";
import { useT } from "@/i18n";
import {
  Plan,
  Session,
  isPaidPlan,
  useSession,
} from "@/lib/session";
import {
  Portfolio as PortfolioData,
  Holding,
  generatePortfolio,
  formatUSD,
  formatAmount,
} from "@/lib/portfolio";

// ──────────────────────────────────────────────────────────────────────────────
// Sample addresses (used when free user views blurred preview)
const SAMPLE_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1";

export default function Portfolio() {
  const t = useT();
  const { session, signIn, signOut } = useSession();

  if (!session) {
    return <SignInPanel onSignIn={signIn} />;
  }

  return (
    <PortfolioBoard session={session} onSignOut={signOut} />
  );

  // suppress unused
  void t;
}

// ──────────────────────────────────────────────────────────────────────────────
// 1) Sign-in panel
function SignInPanel({ onSignIn }: { onSignIn: (s: Session) => void }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) {
      setErr("Enter a valid email address.");
      return;
    }
    onSignIn({ email: e, plan });
  };

  return (
    <section className="aw-section">
      <div className="aw-container">
        <Reveal>
          <div className="aw-eyebrow-row">
            <Eyebrow>{t("port.eyebrow")}</Eyebrow>
          </div>
          <h1 className="aw-h1" style={{ marginBottom: 12 }}>
            {t("auth.signin_t")}
          </h1>
          <p className="aw-lead" style={{ maxWidth: 560 }}>
            {t("auth.signin_d")}
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <Card className="aw-signin-card">
            <label className="aw-field">
              <span className="aw-field-label">{t("auth.email")}</span>
              <input
                className="aw-field-input mono"
                placeholder={t("auth.email_ph")}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErr(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                autoFocus
              />
            </label>

            <div className="aw-field">
              <span className="aw-field-label">{t("auth.plan")}</span>
              <div className="aw-plan-grid">
                {(["free", "pro", "business"] as Plan[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={
                      "aw-plan-pick" + (plan === p ? " is-active" : "")
                    }
                    onClick={() => setPlan(p)}
                  >
                    <span className="aw-plan-pick-name">
                      {p === "free"
                        ? t("plan.free.name")
                        : p === "pro"
                        ? t("plan.pro.name")
                        : t("plan.biz.name")}
                    </span>
                    <span className="aw-plan-pick-tag">
                      {p === "free" ? "Demo" : "Pro+"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {err && <div className="aw-field-err">{err}</div>}

            <div className="aw-signin-actions">
              <Button variant="primary" size="md" icon={LogIn} onClick={submit}>
                {t("auth.signin_btn")}
              </Button>
              <span className="aw-signin-hint">
                {t("auth.required")}
              </span>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 2) Portfolio board — input + table + chart, with plan gating
function PortfolioBoard({
  session,
  onSignOut,
}: {
  session: Session;
  onSignOut: () => void;
}) {
  const t = useT();
  const [, navigate] = useLocation();
  const [chain, setChain] = useState<ChainCode>("ETH");
  const [address, setAddress] = useState<string>("");
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);

  const paid = isPaidPlan(session.plan);

  // Free users: always render blurred preview built from a known sample address.
  const displayPortfolio = useMemo(() => {
    if (paid) return portfolio;
    return generatePortfolio(SAMPLE_ADDRESS, "ETH");
  }, [paid, portfolio]);

  const handleFetch = (addr: string, ch: ChainCode) => {
    setAddress(addr);
    setChain(ch);
    setLoading(true);
    setPortfolio(null);
    // Simulate latency for the "fetching" state
    window.setTimeout(() => {
      setPortfolio(generatePortfolio(addr, ch));
      setLoading(false);
    }, 900);
  };

  return (
    <section className="aw-section">
      <div className="aw-container">
        {/* Header row */}
        <Reveal>
          <div className="aw-eyebrow-row">
            <Eyebrow>{t("port.eyebrow")}</Eyebrow>
            <SessionBadge session={session} onSignOut={onSignOut} />
          </div>
          <h1 className="aw-h1" style={{ marginBottom: 12 }}>
            {t("port.title")}
          </h1>
          <p className="aw-lead" style={{ maxWidth: 720 }}>
            {t("port.sub")}
          </p>
        </Reveal>

        {/* Input bar — disabled visually for Free users */}
        <Reveal delay={0.05}>
          <div className={"aw-port-input " + (paid ? "" : "is-locked")}>
            <WalletInputBar
              defaultChain={chain}
              defaultAddress={address}
              onSubmit={paid ? handleFetch : () => {}}
              ctaLabel={t("port.fetch")}
              size="md"
            />
          </div>
        </Reveal>

        {/* Body */}
        <div className="aw-port-body">
          {loading ? (
            <FetchingState />
          ) : displayPortfolio ? (
            <div className={"aw-port-stage " + (paid ? "" : "is-locked")}>
              <PortfolioReport
                p={displayPortfolio}
                chain={paid ? chain : "ETH"}
              />
              {!paid && <UpgradeOverlay onCta={() => navigate("/pricing")} />}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
function SessionBadge({
  session,
  onSignOut,
}: {
  session: Session;
  onSignOut: () => void;
}) {
  const t = useT();
  return (
    <div className="aw-session-badge">
      <PulseDot />
      <span className="aw-session-email mono">{session.email}</span>
      <span className="aw-session-plan">
        {session.plan === "free"
          ? t("plan.free.name")
          : session.plan === "pro"
          ? t("plan.pro.name")
          : t("plan.biz.name")}
      </span>
      <IconBtn icon={LogOut} aria-label={t("auth.signout")} onClick={onSignOut} />
    </div>
  );
}

function FetchingState() {
  const t = useT();
  return (
    <div className="aw-port-fetching">
      <Loader2 className="animate-spin" />
      <span>{t("port.fetching")}</span>
    </div>
  );
}

function EmptyState() {
  const t = useT();
  return (
    <Card className="aw-port-empty">
      <div className="aw-port-empty-icon">
        <Wallet />
      </div>
      <h3>{t("port.empty_t")}</h3>
      <p>{t("port.empty_d")}</p>
    </Card>
  );
}

function UpgradeOverlay({ onCta }: { onCta: () => void }) {
  const t = useT();
  return (
    <div className="aw-port-overlay">
      <div className="aw-port-overlay-card">
        <div className="aw-port-overlay-icon">
          <Lock />
        </div>
        <h3>{t("port.locked_t")}</h3>
        <p>{t("port.locked_d")}</p>
        <Button variant="primary" size="md" icon={Sparkles} onClick={onCta}>
          {t("port.upgrade")}
        </Button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 3) Visualisation primitives

function PortfolioReport({ p, chain }: { p: PortfolioData; chain: ChainCode }) {
  const t = useT();
  const positive = p.change24h >= 0;
  const ChangeIcon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="aw-port-grid">
      {/* TOTAL VALUE CARD */}
      <Card className="aw-port-total">
        <div className="aw-port-total-head">
          <Eyebrow>{t("port.total_value")}</Eyebrow>
          <ChainBadgeMini chain={chain} />
        </div>
        <div className="aw-port-total-num">{formatUSD(p.totalValue)}</div>
        <div className="aw-port-total-meta">
          <span
            className={
              "aw-port-change " +
              (positive ? "is-positive" : "is-negative")
            }
          >
            <ChangeIcon className="w-3.5 h-3.5" />
            {(positive ? "+" : "") + p.change24h.toFixed(2)}%
            <span className="aw-port-change-lbl">{t("port.h24")}</span>
          </span>
          <span className="aw-port-as-of">
            {t("port.as_of")} {p.asOf}
          </span>
        </div>
      </Card>

      {/* ALLOCATION CHART */}
      <Card className="aw-port-alloc">
        <div className="aw-port-section-head">
          <Eyebrow>{t("port.allocation")}</Eyebrow>
          <span className="aw-port-section-meta">
            {p.holdings.length} {t("port.assets")}
          </span>
        </div>
        <AllocationChart holdings={p.holdings} />
      </Card>

      {/* HOLDINGS TABLE */}
      <Card className="aw-port-table-card">
        <div className="aw-port-section-head">
          <Eyebrow>{t("port.holdings_t")}</Eyebrow>
          <span className="aw-port-section-meta">
            <PieChart className="inline w-3.5 h-3.5 mr-1.5 -mt-px" />
            {p.holdings.length} {t("port.assets")}
          </span>
        </div>
        <HoldingsTable holdings={p.holdings} />
        <div className="aw-port-disclaimer">{t("port.disclaimer")}</div>
      </Card>
    </div>
  );
}

function ChainBadgeMini({ chain }: { chain: ChainCode }) {
  const info = CHAIN_MAP[chain];
  return (
    <span className="aw-chain-badge-mini">
      <ChainLogo code={chain} size={14} />
      <span>{info.code}</span>
      {info.beta && <Chip tone="beta">Beta</Chip>}
    </span>
  );
}

// Horizontal stacked bar + legend = "allocation chart" (no chart lib needed).
function AllocationChart({ holdings }: { holdings: Holding[] }) {
  return (
    <div className="aw-alloc">
      {/* Stacked bar */}
      <div className="aw-alloc-bar" role="img" aria-label="Allocation breakdown">
        {holdings.map((h) => (
          <div
            key={h.symbol}
            className="aw-alloc-bar-seg"
            style={{
              width: `${h.pct}%`,
              background: h.color,
            }}
            title={`${h.symbol} · ${h.pct.toFixed(1)}%`}
          />
        ))}
      </div>
      {/* Legend */}
      <ul className="aw-alloc-legend">
        {holdings.map((h) => (
          <li key={h.symbol} className="aw-alloc-legend-row">
            <span
              className="aw-alloc-dot"
              style={{ background: h.color }}
              aria-hidden
            />
            <img
              src={h.logo}
              alt=""
              width={16}
              height={16}
              className="aw-alloc-logo"
              loading="lazy"
            />
            <span className="aw-alloc-sym">{h.symbol}</span>
            <span className="aw-alloc-pct mono">{h.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  const t = useT();
  return (
    <div className="aw-port-table-wrap">
      <table className="aw-port-table">
        <thead>
          <tr>
            <th className="aw-port-th-l">{t("port.token")}</th>
            <th className="aw-port-th-r">{t("port.price")}</th>
            <th className="aw-port-th-r aw-tbl-hide-sm">
              {t("port.h24_short")}
            </th>
            <th className="aw-port-th-r aw-tbl-hide-md">{t("port.amount")}</th>
            <th className="aw-port-th-r">{t("port.value")}</th>
            <th className="aw-port-th-r aw-tbl-hide-md">{t("port.share")}</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const positive = h.change24h >= 0;
            return (
              <tr key={h.symbol}>
                <td className="aw-port-td-token">
                  <img
                    src={h.logo}
                    alt=""
                    width={28}
                    height={28}
                    className="aw-port-token-logo"
                    loading="lazy"
                  />
                  <span>
                    <span className="aw-port-token-sym">{h.symbol}</span>
                    <span className="aw-port-token-name">{h.name}</span>
                  </span>
                </td>
                <td className="aw-port-td-num mono">{formatUSD(h.price)}</td>
                <td
                  className={
                    "aw-port-td-num mono aw-tbl-hide-sm " +
                    (positive ? "is-positive" : "is-negative")
                  }
                >
                  {(positive ? "+" : "") + h.change24h.toFixed(2)}%
                </td>
                <td className="aw-port-td-num mono aw-tbl-hide-md">
                  {formatAmount(h.amount, h.symbol)}
                </td>
                <td className="aw-port-td-num mono aw-port-td-val">
                  {formatUSD(h.value)}
                </td>
                <td className="aw-port-td-num mono aw-tbl-hide-md">
                  <span className="aw-port-share">
                    <span
                      className="aw-port-share-bar"
                      style={{
                        width: `${Math.min(100, h.pct)}%`,
                        background: h.color,
                      }}
                      aria-hidden
                    />
                    <span className="aw-port-share-num">
                      {h.pct.toFixed(1)}%
                    </span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
