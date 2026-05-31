import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/clerk-react";
import { RefreshCw, Download, ShieldCheck, Clock, ArrowRight } from "lucide-react";
import { ProtectedRoute } from "../components/aw/ProtectedRoute";
import ChainLogo from "../components/aw/ChainLogo";
import { Reveal } from "@/components/aw/motion";
import { useT } from "@/i18n";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FlaggedWallet {
  id: string;
  address: string;
  chain: string;
  score: number;
  label: string | null;
  scannedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CHAIN_NAMES: Record<string, string> = {
  ETH: "Ethereum", SOL: "Solana", TRX: "TRON",
  BTC: "Bitcoin", XRP: "XRP Ledger", SUI: "Sui",
};

function truncateMiddle(addr: string, head = 8, tail = 6): string {
  if (!addr || addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

function relativeDay(iso: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return t("flagged.scanned_today");
  if (days === 1) return t("flagged.scanned_one_day");
  if (days < 7) return t("flagged.scanned_n_days", { n: days });
  return t("flagged.scanned_date", { date: new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
}

function chainDisplayName(chain: string): string {
  return CHAIN_NAMES[chain.toUpperCase()] ?? chain.toUpperCase();
}

// ── FlaggedCard ───────────────────────────────────────────────────────────────

interface FlaggedCardProps {
  wallet: FlaggedWallet;
  rescanning: boolean;
  onRescan: (w: FlaggedWallet) => void;
  onViewDetail: (w: FlaggedWallet) => void;
}

function FlaggedCard({ wallet, rescanning, onRescan, onViewDetail }: FlaggedCardProps) {
  const t = useT();
  return (
    <div className={`fl-card${rescanning ? " is-rescanning" : ""}`}>
      <div className="fl-card-left">
        <div className="fl-chain-row">
          <ChainLogo chain={wallet.chain} size={24} />
          <span className="fl-chain-name">{chainDisplayName(wallet.chain)}</span>
        </div>
        <div className="fl-addr mono">{truncateMiddle(wallet.address)}</div>
        {wallet.label && <div className="fl-label">{wallet.label}</div>}
        <div className="fl-date">
          <Clock style={{ width: 12, height: 12, strokeWidth: 1.75 }} />
          {relativeDay(wallet.scannedAt, t)}
        </div>
      </div>

      <div className="fl-card-right">
        <div className="fl-score-row">
          <span className="fl-score">{wallet.score}</span>
          <span className="fl-score-denom">/ 100</span>
        </div>
        <span className="fl-chip-high">
          <span className="aw-dot-sm" />
          {t("flagged.chip_high")}
        </span>
        <div className="fl-card-btns">
          <button
            className="fl-btn fl-btn-outline"
            disabled={rescanning}
            onClick={() => onRescan(wallet)}
          >
            {rescanning ? (
              <><span className="fl-rescan-spinner" />{t("flagged.rescanning")}</>
            ) : (
              <><RefreshCw style={{ width: 13, height: 13, strokeWidth: 1.85 }} />{t("common.rescan")}</>
            )}
          </button>
          <button className="fl-btn fl-btn-accent" onClick={() => onViewDetail(wallet)}>
            {t("flagged.view_detail")}
            <ArrowRight style={{ width: 13, height: 13, strokeWidth: 1.85 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="fl-card fl-skel">
      <div className="fl-card-left" style={{ gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="fl-skel-line" style={{ width: 24, height: 24, borderRadius: 7 }} />
          <div className="fl-skel-line" style={{ width: 80, height: 13 }} />
        </div>
        <div className="fl-skel-line" style={{ width: 240, height: 12 }} />
        <div className="fl-skel-line" style={{ width: 110, height: 11 }} />
        <div className="fl-skel-line" style={{ width: 130, height: 11 }} />
      </div>
      <div className="fl-card-right" style={{ gap: 12 }}>
        <div className="fl-skel-line" style={{ width: 90, height: 34 }} />
        <div className="fl-skel-line" style={{ width: 52, height: 18, borderRadius: 999 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <div className="fl-skel-line" style={{ width: 88, height: 30, borderRadius: 999 }} />
          <div className="fl-skel-line" style={{ width: 96, height: 30, borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState() {
  const t = useT();
  return (
    <div className="fl-empty">
      <div className="fl-empty-art">
        <ShieldCheck style={{ width: 30, height: 30, strokeWidth: 1.5 }} />
      </div>
      <div className="fl-empty-title">{t("flagged.empty_title")}</div>
      <div className="fl-empty-sub">
        {t("flagged.empty_sub")}
      </div>
    </div>
  );
}

// ── FlaggedInner ──────────────────────────────────────────────────────────────

function FlaggedInner() {
  const t = useT();
  const [, setLocation] = useLocation();
  const { getToken } = useAuth();
  const [wallets, setWallets] = useState<FlaggedWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [rescanningId, setRescanningId] = useState<string | null>(null);

  const fetchWallets = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/flagged", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = (await res.json()) as { wallets: FlaggedWallet[] };
      setWallets(data.wallets ?? []);
    } catch (err) {
      console.error("[Flagged] fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);

  function handleViewDetail(wallet: FlaggedWallet) {
    setLocation(`/checker?address=${encodeURIComponent(wallet.address)}&chain=${wallet.chain}`);
  }

  async function handleRescan(wallet: FlaggedWallet) {
    setRescanningId(wallet.id);
    await fetchWallets();
    setRescanningId(null);
  }

  function handleExport() {
    if (isExporting || !wallets.length) return;
    setIsExporting(true);
    setTimeout(() => {
      const header = ["address", "chain", "score", "label", "scanned_at"];
      const rows = wallets.map((w) =>
        [
          w.address,
          w.chain,
          w.score,
          w.label ? `"${w.label.replace(/"/g, '""')}"` : "",
          w.scannedAt,
        ].join(",")
      );
      const csv = [header.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `altwallet-flagged-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setIsExporting(false);
    }, 650);
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      <Reveal>
        <header className="fl-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 className="fl-title" style={{ fontSize: 32 }}>{t("flagged.list_title")}</h1>
              {!isLoading && wallets.length > 0 && (
                <span className="fl-count-pill">
                  <span className="aw-dot-sm" />
                  {t("flagged.count_pill", { n: wallets.length })}
                </span>
              )}
            </div>
            <p className="fl-subtitle">
              {t("flagged.list_sub")}
            </p>
          </div>
          <div className="fl-header-actions">
            <button
              className="fl-btn fl-btn-outline"
              disabled={isExporting || isLoading || !wallets.length}
              onClick={handleExport}
            >
              {isExporting ? (
                <><span className="fl-export-spinner" />{t("flagged.exporting")}</>
              ) : (
                <><Download style={{ width: 13, height: 13, strokeWidth: 1.85 }} />{t("dash.export_csv")}</>
              )}
            </button>
          </div>
        </header>
      </Reveal>

      <Reveal delay={120}>
        {isLoading ? (
          <div className="fl-list">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : wallets.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="fl-list">
            {wallets.map((w) => (
              <FlaggedCard
                key={w.id}
                wallet={w}
                rescanning={rescanningId === w.id}
                onRescan={handleRescan}
                onViewDetail={handleViewDetail}
              />
            ))}
          </div>
        )}
      </Reveal>
    </div>
  );
}

// ── Flagged ───────────────────────────────────────────────────────────────────

export default function Flagged() {
  return (
    <ProtectedRoute>
      <FlaggedInner />
    </ProtectedRoute>
  );
}
