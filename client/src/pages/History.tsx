// Scan History page (/history). Protected route — Clerk-authenticated user;
// rows are RLS-filtered by user_id on the server.
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/clerk-react";
import { Search, Download, Pencil, RefreshCw, ArrowRight, FilterX, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/aw/Primitives";
import { Reveal } from "@/components/aw/motion";
import { useT } from "@/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanRow {
  id: string;
  label: string | null;
  address: string;
  chain: string;
  risk_score: number;
  scanned_at: string;
}

type RiskLevel = "safe" | "medium" | "high";

interface Scan extends ScanRow {
  risk_level: RiskLevel;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;
const CHAIN_TABS = ["All", "ETH", "SOL", "TRX", "BTC", "XRP", "SUI"] as const;

const RISK_META: Record<RiskLevel, { label: string; color: string; bg: string; border: string; dot: string }> = {
  safe:   { label: "SAFE", color: "#22c55e", bg: "#0f2018", border: "rgba(34,197,94,0.19)",   dot: "#22c55e" },
  medium: { label: "MED",  color: "#f59e0b", bg: "#1f1800", border: "rgba(245,158,11,0.19)",  dot: "#f59e0b" },
  high:   { label: "HIGH", color: "#ef4444", bg: "#1f0a0a", border: "rgba(239,68,68,0.19)",   dot: "#ef4444" },
};

const CHAIN_STYLES: Record<string, { fg: string; bg: string }> = {
  ETH: { fg: "#627eea", bg: "#1c2340" },
  SOL: { fg: "#9945ff", bg: "#1a1230" },
  TRX: { fg: "#ef0027", bg: "#2a0a0a" },
  BTC: { fg: "#f7931a", bg: "#2a1800" },
  XRP: { fg: "#00aae4", bg: "#0a1a2a" },
  SUI: { fg: "#4DA2FF", bg: "#0a1830" },
};

const SORT_KEYS: Record<string, string> = {
  newest:       "history.sort_newest",
  oldest:       "history.sort_oldest",
  "score-high": "history.sort_score_high",
  "score-low":  "history.sort_score_low",
};

const SORT_TO_API: Record<string, string> = {
  newest:       "newest",
  oldest:       "oldest",
  "score-high": "highest",
  "score-low":  "lowest",
};

const PLAN_RETENTION: Record<string, string> = {
  free: "30d",
  pro:  "12mo",
  biz:  "24mo",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toRiskLevel(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "safe";
}

function enrichScan(row: ScanRow): Scan {
  return { ...row, risk_level: toRiskLevel(row.risk_score) };
}

function displayLabel(scan: Scan): string {
  return scan.label?.trim() || scan.address.slice(0, 8) + "…";
}

function hasRealLabel(scan: Scan): boolean {
  return !!(scan.label?.trim());
}

function scanDate(iso: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const HOUR = 3_600_000, DAY = 86_400_000;
  if (diff < HOUR) return t("history.time_m", { n: Math.max(1, Math.round(diff / 60000)) });
  if (diff < DAY)  return t("history.time_h", { n: Math.round(diff / HOUR) });
  const days = Math.round(diff / DAY);
  if (days < 7)   return t("history.time_d", { n: days });
  if (days < 30)  return t("history.time_w", { n: Math.round(days / 7) });
  return t("history.time_mo", { n: Math.round(days / 30) });
}

// ─── ScanChainLogo ────────────────────────────────────────────────────────────

function ScanChainLogo({ chain, size = 32 }: { chain: string; size?: number }) {
  const style = CHAIN_STYLES[chain] ?? CHAIN_STYLES.ETH;
  return (
    <span
      className="sh-chainlogo"
      title={chain}
      style={{
        width: size,
        height: size,
        background: style.bg,
        color: style.fg,
        fontSize: size <= 24 ? 8 : 9,
      }}
    >
      {chain}
    </span>
  );
}

// ─── ScanCard ─────────────────────────────────────────────────────────────────

interface ScanCardProps {
  scan: Scan;
  planRetention: string;
  isEditing: boolean;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveLabel: (id: string, value: string) => void;
  onRescan: (scan: Scan) => void;
}

function ScanCard({ scan, planRetention, isEditing, onStartEdit, onCancelEdit, onSaveLabel, onRescan }: ScanCardProps) {
  const t = useT();
  const real = hasRealLabel(scan);
  const [draft, setDraft] = useState(scan.label ?? "");
  const [spinning, setSpinning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(scan.label ?? "");
      requestAnimationFrame(() => { inputRef.current?.select(); });
    }
  }, [isEditing, scan.label]);

  const risk = RISK_META[scan.risk_level];
  const dirty = draft.trim() !== (scan.label ?? "").trim();

  function commit() {
    if (!dirty) return;
    onSaveLabel(scan.id, draft.trim());
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") onCancelEdit();
  }
  function handleRescan() {
    if (spinning) return;
    setSpinning(true);
    onRescan(scan);
    setTimeout(() => setSpinning(false), 800);
  }

  return (
    <div className="sh-card">
      <ScanChainLogo chain={scan.chain} />

      <div className="sh-main">
        {isEditing ? (
          <div className="sh-editrow">
            <input
              ref={inputRef}
              className="sh-editinput"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKey}
              placeholder={t("history.edit_placeholder")}
              maxLength={50}
            />
            <button className={cn("sh-save", dirty ? "dirty" : "clean")} onClick={commit}>{t("history.save")}</button>
            <button className="sh-cancel" onClick={onCancelEdit}>{t("history.cancel")}</button>
          </div>
        ) : (
          <div className="sh-labelrow">
            <span className={cn("sh-label", !real && "fallback")}>
              {displayLabel(scan)}
            </span>
            <button className="sh-pencil" onClick={() => onStartEdit(scan.id)} title="Edit label">
              <Pencil />
            </button>
          </div>
        )}
        <div className="sh-addr mono">{scan.address}</div>
      </div>

      <div className="sh-right">
        <span className="sh-chainbadge">
          <ScanChainLogo chain={scan.chain} size={16} />
          {scan.chain}
        </span>
        <span
          className="sh-score"
          style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.border}` }}
        >
          <span className="sh-scoredot" style={{ background: risk.dot }} />
          {risk.label}
          <span className="sh-scorenum">{scan.risk_score}</span>
        </span>
        <span className="sh-date">{scanDate(scan.scanned_at, t)}</span>
        <span className="sh-retention" title="Retention period">{planRetention}</span>
        <div className="sh-actions">
          <button
            className={cn("sh-rescan", spinning && "spinning")}
            onClick={handleRescan}
            disabled={spinning}
          >
            <RefreshCw />
            {spinning ? t("history.opening") : t("history.rescan")}
          </button>
          <button className="sh-view" onClick={() => onRescan(scan)}>
            {t("history.view_detail")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (n: number) => void }) {
  const t = useT();
  if (pages <= 1) return null;
  const items: (number | "…")[] = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) items.push(i);
  } else {
    items.push(1);
    if (page > 3) items.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) items.push(i);
    if (page < pages - 2) items.push("…");
    items.push(pages);
  }
  return (
    <div className="sh-pagination">
      <button className="sh-pagebtn" disabled={page === 1} onClick={() => onPage(page - 1)}>{t("history.prev")}</button>
      {items.map((it, i) =>
        it === "…"
          ? <span key={"e" + i} className="sh-pageellipsis">…</span>
          : <button
              key={it}
              className={cn("sh-pagebtn", it === page && "active")}
              onClick={() => onPage(it as number)}
            >{it}</button>
      )}
      <button className="sh-pagebtn" disabled={page === pages} onClick={() => onPage(page + 1)}>{t("history.next")}</button>
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyDefault({ onCta }: { onCta: () => void }) {
  const t = useT();
  return (
    <div className="sh-empty">
      <div className="sh-empty-icon"><SearchX /></div>
      <h3>{t("history.no_history_title")}</h3>
      <p>{t("history.no_history_sub")}</p>
      <button className="sh-cta" onClick={onCta}>
        {t("history.no_history_cta")} <ArrowRight />
      </button>
    </div>
  );
}

function EmptyFiltered({ chain }: { chain: string }) {
  const t = useT();
  return (
    <div className="sh-empty filtered">
      <div className="sh-empty-icon"><FilterX /></div>
      <h3>{chain !== "All" ? t("history.no_filtered_chain", { chain }) : t("history.no_filtered_all")}</h3>
      <p>{t("history.no_filtered_sub")}</p>
    </div>
  );
}

// ─── HistoryPage ──────────────────────────────────────────────────────────────

export default function History() {
  const t = useT();
  const [, navigate] = useLocation();
  const { getToken } = useAuth();

  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [chain, setChain] = useState<string>("All");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  // plan retention — derived from Clerk user metadata would be ideal,
  // but use a safe default until a user hook exposes it.
  const planRetention = PLAN_RETENTION.pro;

  // ── Fetch scans from server ───────────────────────────────────────────────

  const fetchScans = useCallback(async (activeChain: string, activeSort: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const params = new URLSearchParams({
        sort:  SORT_TO_API[activeSort] ?? "newest",
        limit: "100",
        page:  "1",
      });
      if (activeChain !== "All") params.set("chain", activeChain);

      const res = await fetch(`/api/history?${params}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json() as { scans: ScanRow[] };
      setScans((data.scans ?? []).map(enrichScan));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("history.failed_load");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [getToken, t]);

  useEffect(() => { fetchScans(chain, sort); }, [chain, sort, fetchScans]);

  // ── Client-side search + pagination ──────────────────────────────────────

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scans;
    return scans.filter(s =>
      (s.label ?? "").toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q)
    );
  }, [scans, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [chain, sort, query]);

  // ── Label save ────────────────────────────────────────────────────────────

  async function saveLabel(id: string, value: string) {
    const prev = scans.find(s => s.id === id);
    // Optimistic update
    setScans(s => s.map(r => r.id === id ? { ...r, label: value || null } : r));
    setEditingId(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/history/${id}/label`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ label: value }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
    } catch {
      // Roll back on failure
      if (prev) setScans(s => s.map(r => r.id === id ? prev : r));
    }
  }

  // ── Export CSV ────────────────────────────────────────────────────────────

  async function exportCSV() {
    const token = await getToken();
    const params = new URLSearchParams();
    if (chain !== "All") params.set("chain", chain);
    const url = `/api/history/export${params.toString() ? "?" + params : ""}`;
    const res = await fetch(url, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = "altwallet-history.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  }

  // ── Rescan / View detail ──────────────────────────────────────────────────

  function handleRescan(scan: Scan) {
    navigate(`/checker?address=${encodeURIComponent(scan.address)}&chain=${scan.chain}`);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const hasAny = scans.length > 0;

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      <Reveal>
        <div className="sh-head">
          <Eyebrow>{t("history.eyebrow")}</Eyebrow>
          <h1
            className="aw-gradient-text tracking-tight"
            style={{
              fontSize: 34,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              fontWeight: 900,
              background: "linear-gradient(180deg, #FFFFFF 0%, #AAAAAA 130%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {t("history.title")}
          </h1>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="sh-controls">
          <div className="sh-search">
            <Search />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t("history.search_placeholder")}
            />
          </div>
          <div className="sh-chainfilter">
            {CHAIN_TABS.map(c => (
              <button
                key={c}
                className={cn("sh-pill", chain === c && "active")}
                onClick={() => setChain(c)}
              >{c}</button>
            ))}
          </div>
          <div className="sh-sort">
            <select value={sort} onChange={e => setSort(e.target.value)}>
              {Object.keys(SORT_KEYS).map(k => (
                <option key={k} value={k}>{t(SORT_KEYS[k])}</option>
              ))}
            </select>
          </div>
        </div>
      </Reveal>

      <Reveal delay={160}>
        <div className="sh-listhead">
          <span className="sh-count">
            {loading ? `${t("common.loading")}…` : (filtered.length === 1 ? t("history.n_scan", { n: 1 }) : t("history.n_scans", { n: filtered.length }))}
          </span>
          <button className="sh-export" onClick={exportCSV} disabled={loading || !hasAny}>
            <Download /> {t("dash.export_csv")}
          </button>
        </div>
      </Reveal>

      <Reveal delay={240}>
        {loading ? (
          <div className="sh-empty">
            <div className="sh-empty-icon" style={{ animation: "sh-spin 1s linear infinite" }}>
              <RefreshCw />
            </div>
            <p>{t("history.loading")}</p>
          </div>
        ) : error ? (
          <div className="sh-empty filtered">
            <div className="sh-empty-icon"><FilterX /></div>
            <h3>{t("history.failed_load")}</h3>
            <p>{error}</p>
            <button className="sh-cta" onClick={() => fetchScans(chain, sort)}>
              {t("history.retry")} <ArrowRight />
            </button>
          </div>
        ) : !hasAny ? (
          <EmptyDefault onCta={() => navigate("/checker")} />
        ) : filtered.length === 0 ? (
          <EmptyFiltered chain={chain} />
        ) : (
          <>
            <div className="sh-list">
              {pageRows.map(s => (
                <ScanCard
                  key={s.id}
                  scan={s}
                  planRetention={planRetention}
                  isEditing={editingId === s.id}
                  onStartEdit={setEditingId}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveLabel={saveLabel}
                  onRescan={handleRescan}
                />
              ))}
            </div>
            <Pagination page={safePage} pages={pages} onPage={setPage} />
          </>
        )}
      </Reveal>
    </div>
  );
}
