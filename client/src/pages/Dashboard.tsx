import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, Chip, Eyebrow, Button } from "@/components/aw/Primitives";
import { Reveal } from "@/components/aw/motion";
import { ChainLogo } from "@/components/aw/WalletInputBar";
import { TeamSeats } from "@/components/aw/TeamSeats";
import { CHAINS, ChainCode, riskFromScore } from "@/lib/constants";
import { useDashboardStats, useRecentScans, useExportCSV } from "@/hooks/useDashboard";
import type { DashboardStats, RecentScan } from "@/types/dashboard";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { Download, Plus, LogOut, ArrowUpRight, X, Check, ChevronDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types & helpers ──────────────────────────────────────────────────────────

type ChainOpt = ChainCode | "AUTO";
interface Slot { id: number; addr: string; chain: ChainOpt; }

const CHAIN_GLYPH: Record<string, string> = {
  ETH: "Ξ", BTC: "₿", SOL: "◎", TRX: "T", XRP: "X", SUI: "S",
};

function detectChain(addr: string): ChainCode {
  const v = addr.trim();
  if (v.startsWith("T") && v.length === 34) return "TRX";
  if (v.startsWith("1") || v.startsWith("3") || v.startsWith("bc1")) return "BTC";
  if (v.startsWith("r") && v.length >= 25 && v.length <= 35) return "XRP";
  if (v.length === 66 && v.startsWith("0x")) return "SUI";
  if (
    v.length >= 32 &&
    v.length <= 44 &&
    !v.startsWith("0x") &&
    /^[1-9A-HJ-NP-Za-km-z]+$/.test(v)
  )
    return "SOL";
  return "ETH";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) {
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `Today ${h}:${m}`;
  }
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, navigate] = useLocation();
  const { data: stats, loading: statsLoading } = useDashboardStats();
  const { scans, loading: scansLoading } = useRecentScans();
  const { exportCSV, loading: exportLoading } = useExportCSV();

  const plan = (user?.publicMetadata?.plan as string) ?? "free";
  const firstName = user?.firstName ?? user?.username ?? "there";
  const scanInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 120 }}>
      {/* Header */}
      <Reveal>
        <div className="flex items-start justify-between gap-6 mb-8 flex-wrap">
          <div>
            <Eyebrow>Dashboard</Eyebrow>
            <div className="flex items-center gap-3.5 mt-2.5">
              <h1
                className="text-white font-extrabold tracking-tight"
                style={{ fontSize: 34, letterSpacing: "-0.03em", lineHeight: 1 }}
              >
                Welcome back, {firstName}.
              </h1>
              <span
                className="inline-flex items-center h-6 px-2.5 rounded-[6px] mono text-[11px] font-semibold tracking-[0.08em] text-[color:var(--accent)]"
                style={{
                  background: "var(--accent-ghost)",
                  border: "1px solid rgba(29,158,117,0.30)",
                }}
              >
                {plan.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 shrink-0">
            <Button
              variant="secondary"
              size="md"
              icon={Download}
              onClick={exportCSV}
              disabled={exportLoading || plan === "free"}
              title={plan === "free" ? "Pro/Business required" : "Export scan history as CSV"}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate("/pricing")}
            >
              Upgrade
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => scanInputRef.current?.focus()}
            >
              New Scan
            </Button>
            <button
              type="button"
              className="aw-btn aw-btn-ghost aw-btn-md"
              style={{ color: "var(--fg-tertiary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "#E5484D")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--fg-tertiary)")
              }
              onClick={() => signOut(() => navigate("/"))}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Reveal>

      {/* Stats grid */}
      <Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Scans"
            value={statsLoading ? "—" : String(stats?.total_scans ?? 0)}
            delta="↑ 18 this week"
            deltaTone="green"
            accent
          />
          <StatCard
            label="Flagged Wallets"
            value={statsLoading ? "—" : String(stats?.flagged_count ?? 0)}
            delta="↑ 3 since last scan"
            deltaTone="red"
            danger
          />
          <StatCard
            label="Chains Used"
            value={statsLoading ? "—" : String(stats?.chains_used.length ?? 0)}
            delta={stats?.chains_used.join(" · ") ?? ""}
            deltaTone="muted"
          />
          <StatCard
            label="Scans Today"
            value={
              statsLoading
                ? "—"
                : `${stats?.scans_today ?? 0} / ${stats?.daily_limit ?? 3}`
            }
            delta={`${Math.max(
              0,
              (stats?.daily_limit ?? 3) - (stats?.scans_today ?? 0)
            )} remaining`}
            deltaTone="green"
          />
        </div>
      </Reveal>

      {/* Quick scan + Plan card */}
      <Reveal>
        <div
          className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-5 mb-6"
          style={{ alignItems: "start" }}
        >
          <QuickScanCard plan={plan} scanRef={scanInputRef} />
          <PlanCard plan={plan} stats={stats} />
        </div>
      </Reveal>

      {/* Recent scans */}
      <Reveal>
        <RecentScansSection
          scans={scans}
          loading={scansLoading}
          onMore={() => navigate("/history")}
          onRow={(addr, chain) =>
            navigate(
              `/checker?address=${encodeURIComponent(addr)}&chain=${chain}`
            )
          }
        />
      </Reveal>

      {/* Account settings + Chain coverage */}
      <Reveal>
        <div className="grid md:grid-cols-2 gap-5 mt-6">
          <AccountSettingsCard user={user} plan={plan} />
          <ChainCoverageCard />
        </div>
      </Reveal>

      {/* Team seats */}
      <Reveal>
        <div className="mt-6">
          <TeamSeats plan={plan} />
        </div>
      </Reveal>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  delta,
  deltaTone,
  accent,
  danger,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "green" | "red" | "muted";
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <Card>
      <div
        className="mono font-medium uppercase text-[color:var(--fg-tertiary)]"
        style={{ fontSize: 10.5, letterSpacing: "0.12em", marginBottom: 14 }}
      >
        {label}
      </div>
      <div
        className="font-bold tracking-tight leading-none"
        style={{
          fontSize: 38,
          letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums",
          marginBottom: 10,
          color: danger ? "#E5484D" : accent ? "var(--accent)" : "white",
        }}
      >
        {value}
      </div>
      {delta && (
        <div
          className={cn(
            "mono tracking-tight",
            deltaTone === "green" && "text-[color:var(--accent)]",
            deltaTone === "red" && "text-[#E5484D]",
            deltaTone === "muted" && "text-[color:var(--fg-tertiary)]"
          )}
          style={{ fontSize: 12 }}
        >
          {delta}
        </div>
      )}
    </Card>
  );
}

// ─── Chain selector for Quick Scan slots (WalletInputBar style, left-side) ────

function SlotChainSelector({
  value,
  onChange,
}: {
  value: ChainOpt;
  onChange: (v: ChainOpt) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options: Array<{ code: ChainOpt; label: string }> = [
    { code: "AUTO", label: "Auto-detect" },
    ...CHAINS.map((c) => ({ code: c.code as ChainOpt, label: c.name })),
  ];

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [open]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-full px-3 transition-colors shrink-0 hover:bg-[#151515] text-white"
        style={{ height: 48 }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value !== "AUTO" ? (
          <ChainLogo code={value as ChainCode} size={18} />
        ) : (
          <span
            className="inline-block rounded-full"
            style={{ width: 18, height: 18, background: "#2a2a2a", flexShrink: 0 }}
            aria-hidden
          />
        )}
        <span className="font-semibold text-sm tracking-tight">
          {value === "AUTO" ? "Auto" : value}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-[color:var(--fg-tertiary)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            className="aw-fade-in"
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              zIndex: 9999,
              minWidth: 220,
              padding: 6,
              backgroundColor: "#111111",
              border: "1px solid #2a2a2a",
              borderRadius: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            }}
          >
            {options.map((o) => (
              <button
                key={o.code}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(o.code);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  value === o.code ? "bg-[#151515]" : "hover:bg-[#151515]"
                )}
                role="option"
                aria-selected={value === o.code}
              >
                {o.code !== "AUTO" ? (
                  <ChainLogo code={o.code as ChainCode} size={20} />
                ) : (
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 20, height: 20, background: "#2a2a2a", flexShrink: 0 }}
                    aria-hidden
                  />
                )}
                <span className="text-white text-[13px] font-medium flex-1">{o.label}</span>
                <span className="text-[11px] text-[color:var(--fg-tertiary)] mono">
                  {o.code}
                </span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

// ─── Quick scan card ──────────────────────────────────────────────────────────

const MAX_SLOTS = 5;

function QuickScanCard({
  plan,
  scanRef,
}: {
  plan: string;
  scanRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [, navigate] = useLocation();
  const [slots, setSlots] = useState<Slot[]>([{ id: 1, addr: "", chain: "AUTO" }]);
  const seqRef = useRef(1);
  const isFree = plan === "free";
  const canAdd = !isFree && slots.length < MAX_SLOTS;

  const update = (id: number, patch: Partial<Slot>) =>
    setSlots((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addSlot = () => {
    if (!canAdd) return;
    seqRef.current += 1;
    setSlots((s) => [...s, { id: seqRef.current, addr: "", chain: "AUTO" }]);
  };

  const removeSlot = (id: number) =>
    setSlots((s) => (s.length > 1 ? s.filter((x) => x.id !== id) : s));

  const handleScan = () => {
    const filled = slots.filter((s) => s.addr.trim());
    if (!filled.length) return;
    const first = filled[0];
    const chain: ChainCode =
      first.chain === "AUTO" ? detectChain(first.addr) : (first.chain as ChainCode);
    navigate(`/checker?address=${encodeURIComponent(first.addr.trim())}&chain=${chain}`);
  };

  return (
    <Card>
      <div className="aw-card-head">
        <span className="text-[15px] font-semibold text-white tracking-tight">
          Quick Scan
        </span>
        <Button
          variant="primary"
          size="md"
          onClick={handleScan}
          disabled={!slots.some((s) => s.addr.trim())}
          trailingIcon={ArrowRight}
        >
          Scan
        </Button>
      </div>
      <div className="flex flex-col gap-2.5">
        {slots.map((slot, i) => (
          <div key={slot.id} className="flex gap-2.5 items-center">
            {/* Pill container — exact WalletInputBar layout */}
            <div
              className="aw-wallet-bar flex-1 relative overflow-visible flex items-center gap-2 rounded-full border transition-colors bg-[color:var(--bg-inset)] focus-within:border-[color:var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-ghost)]"
              style={{ borderColor: "#1a1a1a", padding: 6, height: 60 }}
            >
              <SlotChainSelector
                value={slot.chain}
                onChange={(c) => update(slot.id, { chain: c })}
              />
              <div className="w-px h-7 bg-[#1a1a1a] shrink-0" aria-hidden />
              <div className="flex-1 flex items-center px-3 min-w-0 self-stretch">
                <input
                  ref={i === 0 ? scanRef : undefined}
                  className="flex-1 min-w-0 bg-transparent outline-none mono text-[14px] text-white placeholder:text-[color:var(--fg-tertiary)]"
                  placeholder="Paste wallet address..."
                  value={slot.addr}
                  onChange={(e) => update(slot.id, { addr: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleScan();
                  }}
                />
              </div>
            </div>
            {i > 0 && (
              <button
                type="button"
                className="w-[44px] h-[44px] shrink-0 rounded-full border flex items-center justify-center text-[color:var(--fg-tertiary)] transition-colors hover:text-[#E5484D] hover:border-[#2a2a2a] hover:bg-[color:var(--bg-inset)]"
                style={{ borderColor: "#1a1a1a" }}
                onClick={() => removeSlot(slot.id)}
                title="Remove wallet"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        className={cn(
          "flex items-center gap-2 h-[38px] px-3.5 mt-3 rounded-[8px] border border-dashed text-[13px] font-medium text-[color:var(--fg-tertiary)] transition-colors",
          canAdd
            ? "hover:text-[color:var(--accent)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-ghost)]"
            : "opacity-50 cursor-not-allowed"
        )}
        style={{ borderColor: "#2a2a2a" }}
        onClick={addSlot}
        disabled={!canAdd}
      >
        <Plus className="w-3.5 h-3.5" />
        <span>
          {isFree
            ? "Available on Pro & Business"
            : slots.length >= MAX_SLOTS
            ? "Maximum 5 wallets"
            : "Add another wallet"}
        </span>
      </button>
      <div
        className="text-[color:var(--fg-tertiary)] leading-relaxed"
        style={{ fontSize: 12.5, marginTop: 14 }}
      >
        Auto-detect enabled —{" "}
        <span className="text-[color:var(--accent)] mono" style={{ fontSize: 11.5 }}>
          ETH, BTC, SOL, TRX, XRP, SUI
        </span>
      </div>
    </Card>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  stats,
}: {
  plan: string;
  stats: DashboardStats | null;
}) {
  const limit =
    stats?.daily_limit ?? (plan === "pro" ? 50 : plan === "business" ? 200 : 3);
  const used = stats?.scans_today ?? 0;
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);

  const features =
    plan === "business"
      ? [
          "200 scans / day",
          "24-month history",
          "AI-generated summary",
          "3 team seats",
          "PDF + CSV export",
        ]
      : plan === "pro"
      ? [
          "Unlimited scans / day",
          "30-day history",
          "AI-generated summary",
          "CSV export",
        ]
      : ["3 scans / day", "ETH & BTC only", "Basic risk analysis"];

  return (
    <Card style={{ borderColor: "rgba(29,158,117,0.35)" }}>
      <div
        className="mono font-medium uppercase text-[color:var(--accent)]"
        style={{ fontSize: 10.5, letterSpacing: "0.14em", marginBottom: 8 }}
      >
        Current Plan
      </div>
      <div
        className="font-extrabold tracking-tight text-white"
        style={{ fontSize: 28, letterSpacing: "-0.03em", marginBottom: 20 }}
      >
        {planName}
      </div>
      <div className="flex items-baseline justify-between mb-2.5">
        <span className="text-[13px] text-[color:var(--fg-tertiary)]">Daily scans</span>
        <span
          className="mono text-[13px] text-white"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {used} / {limit}
        </span>
      </div>
      <div
        className="h-[5px] rounded-full overflow-hidden border"
        style={{ background: "var(--bg-inset)", borderColor: "#1a1a1a" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: "var(--accent)" }}
        />
      </div>
      <ul
        className="mt-5 pt-[18px] border-t flex flex-col gap-3"
        style={{ borderColor: "#1a1a1a" }}
      >
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-white">
            <Check
              className="w-[15px] h-[15px] text-[color:var(--accent)] shrink-0"
              style={{ strokeWidth: 2.25 }}
            />
            {f}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ─── Recent scans ─────────────────────────────────────────────────────────────

function ChainIconBadge({ chain }: { chain: string }) {
  return (
    <span
      className="w-[26px] h-[26px] rounded-full flex items-center justify-center mono text-[12px] font-semibold text-white shrink-0"
      style={{ background: "#161616", border: "1px solid #2a2a2a" }}
      title={chain}
    >
      {CHAIN_GLYPH[chain] ?? chain[0]}
    </span>
  );
}

function RecentScansSection({
  scans,
  loading,
  onMore,
  onRow,
}: {
  scans: RecentScan[];
  loading: boolean;
  onMore: () => void;
  onRow: (addr: string, chain: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span
          className="font-semibold text-white tracking-tight"
          style={{ fontSize: 17, letterSpacing: "-0.015em" }}
        >
          Recent Scans
        </span>
        <button
          type="button"
          className="text-[color:var(--accent)] text-[12.5px] font-medium hover:underline"
          onClick={onMore}
        >
          More
        </button>
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
        {/* Table header */}
        <div
          className="grid border-b"
          style={{
            gridTemplateColumns: "40px minmax(0,1.4fr) minmax(0,1fr) 120px 130px 44px",
            minWidth: 540,
            gap: 14,
            height: 40,
            alignItems: "center",
            padding: "0 20px",
            borderColor: "#1a1a1a",
            background: "#0E0E0E",
            color: "var(--fg-tertiary)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <div />
          <div>Wallet</div>
          <div>Label</div>
          <div>Score</div>
          <div>Date</div>
          <div />
        </div>

        {loading && (
          <div className="text-[13px] text-[color:var(--fg-tertiary)] p-5">
            Loading…
          </div>
        )}

        {!loading && scans.length === 0 && (
          <div className="text-[13px] text-[color:var(--fg-tertiary)] p-5">
            No scans yet. Use Quick Scan above to get started.
          </div>
        )}

        {scans.map((row) => {
          const risk = riskFromScore(row.risk_score ?? 50);
          return (
            <div
              key={row.id}
              className="grid border-b last:border-b-0 cursor-pointer hover:bg-[color:var(--bg-inset)] transition-colors"
              style={{
                gridTemplateColumns:
                  "40px minmax(0,1.4fr) minmax(0,1fr) 120px 130px 44px",
                minWidth: 540,
                gap: 14,
                padding: "0 20px",
                height: 58,
                alignItems: "center",
                borderColor: "#1a1a1a",
              }}
              onClick={() => onRow(row.address, row.chain)}
            >
              <ChainIconBadge chain={row.chain} />
              <div className="mono text-[13px] text-white truncate">
                {row.address.slice(0, 10)}…{row.address.slice(-6)}
              </div>
              <div
                className={cn(
                  "text-[13px] truncate",
                  row.label
                    ? "text-[color:var(--fg-tertiary)]"
                    : "text-[color:var(--fg-tertiary)] italic"
                )}
              >
                {row.label || "No label"}
              </div>
              <div>
                {row.risk_score !== null ? (
                  <Chip tone={risk.tone as any} dot>
                    {risk.label} {row.risk_score}
                  </Chip>
                ) : (
                  <span className="text-[12px] text-[color:var(--fg-tertiary)]">
                    —
                  </span>
                )}
              </div>
              <div className="mono text-[12px] text-[color:var(--fg-tertiary)]">
                {formatDate(row.scanned_at)}
              </div>
              <button
                type="button"
                className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center ml-auto text-[color:var(--fg-tertiary)] transition-colors hover:text-white"
                style={{ border: "1px solid transparent" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRow(row.address, row.chain);
                }}
                title="Open scan"
              >
                <ArrowUpRight style={{ width: 15, height: 15, strokeWidth: 1.9 }} />
              </button>
            </div>
          );
        })}
        </div>
      </Card>
    </div>
  );
}

// ─── Account settings ─────────────────────────────────────────────────────────

function AccountSettingsCard({
  user,
  plan,
}: {
  user: ReturnType<typeof useUser>["user"];
  plan: string;
}) {
  return (
    <Card>
      <div className="aw-card-head">
        <Eyebrow>Account Settings</Eyebrow>
      </div>
      <div className="flex flex-col">
        <KVRow
          label="Email"
          value={user?.primaryEmailAddress?.emailAddress ?? "—"}
          mono
        />
        <KVRow label="Language" value="English" />
        <KVRow
          label="Plan"
          value={plan.charAt(0).toUpperCase() + plan.slice(1)}
          accent
        />
      </div>
    </Card>
  );
}

function KVRow({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between py-3.5 border-b last:border-b-0"
      style={{ borderColor: "#1a1a1a" }}
    >
      <span className="text-[13px] text-[color:var(--fg-tertiary)]">{label}</span>
      <span
        className={cn(
          "text-white",
          mono ? "mono text-[13px]" : "text-[13.5px]",
          accent && "text-[color:var(--accent)]"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Chain coverage ───────────────────────────────────────────────────────────

function ChainCoverageCard() {
  return (
    <Card>
      <div className="aw-card-head">
        <Eyebrow>Chain Coverage</Eyebrow>
        <span className="mono text-[12px] text-[color:var(--fg-tertiary)]">
          6 chains
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {CHAINS.map((c) => (
          <div
            key={c.code}
            className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-[8px] border min-w-0"
            style={{ background: "#0E0E0E", borderColor: "#1a1a1a" }}
          >
            <ChainLogo code={c.code} size={18} />
            <span className="hidden sm:inline text-[13px] font-medium text-white shrink-0">{c.code}</span>
            {c.beta && (
              <Chip tone="beta" className="ml-auto shrink-0 text-[10px]">
                BETA
              </Chip>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
