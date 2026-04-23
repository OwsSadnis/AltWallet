// Results cards adapted from the provided DashboardCards.jsx.
// Key changes from the export:
//  - "Critical" tone removed; score aligned to spec (0-39 high / 40-69 medium / 70-100 safe)
//  - Uses our animated half-circle RiskGauge instead of the full-circle SVG
//  - Red/Yellow/Green flag taxonomy with expandable "what does this mean" per flag
import { useState } from "react";
import { Card, Chip, Eyebrow, Button, IconBtn } from "./Primitives";
import { RiskGauge } from "./RiskGauge";
import { CountUp } from "./motion";
import {
  ChevronDown,
  Copy,
  ExternalLink,
  Filter,
  ShieldAlert,
  Sparkles,
  FileDown,
  Lock,
  Info,
} from "lucide-react";
import {
  ChainCode,
  RiskFlag,
  RiskTone,
  ScanResult,
  riskFromScore,
} from "@/lib/constants";
import { ChainLogo } from "./WalletInputBar";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { useT } from "@/i18n";

export function ScoreCard({ scan }: { scan: ScanResult }) {
  const t = useT();
  const { tone } = riskFromScore(scan.score);
  const label =
    tone === "safe" ? t("score.safe") : tone === "medium" ? t("score.medium") : t("score.high");
  const cap = scan.chain === "XRP" || scan.chain === "SUI" ? 80 : 100;
  const short = shortAddress(scan.address);

  return (
    <Card className="aw-score-card">
      <div className="aw-score-left">
        <div className="aw-score-top">
          <Eyebrow>{t("score.eyebrow")}</Eyebrow>
          <Chip tone={tone} dot>
            {label}
          </Chip>
          {(scan.chain === "XRP" || scan.chain === "SUI") && (
            <Chip tone="beta">{t("checker.beta_warning")}</Chip>
          )}
        </div>
        <div className="aw-score-big">
          <span className="aw-score-num">
            <CountUp to={Math.min(scan.score, cap)} duration={1400} />
          </span>
          <span className="aw-score-denom">/100</span>
        </div>
        <div className="aw-score-meta">
          <ChainBadge chain={scan.chain} />
          <span className="mono">{short}</span>
          <CopyBtn value={scan.address} />
          {scan.delta !== 0 && (
            <span
              className="mono"
              style={{
                color:
                  scan.delta > 0 ? "var(--accent)" : "var(--risk-high)",
              }}
            >
              {scan.delta > 0 ? "+" : ""}
              {scan.delta} {t("score.vs_last")}
            </span>
          )}
        </div>
        <p className="text-[12px] text-[color:var(--fg-tertiary)] leading-relaxed max-w-md mt-2">
          {t("score.disclaimer")}
        </p>
      </div>
      <div className="hidden sm:flex shrink-0" style={{ width: 280 }}>
        <RiskGauge score={scan.score} maxScoreCap={cap} />
      </div>
    </Card>
  );
}

export function ChainBadge({ chain }: { chain: ChainCode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--fg-secondary)]">
      <ChainLogo code={chain} size={14} />
      <span className="mono">{chain}</span>
    </span>
  );
}

function CopyBtn({ value }: { value: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="text-[color:var(--fg-tertiary)] hover:text-white transition-colors"
      aria-label="Copy address"
    >
      <Copy className="w-3 h-3" />
      {copied && (
        <span className="ml-1 mono text-[11px] text-[color:var(--accent)]">
          {t("common.copied")}
        </span>
      )}
    </button>
  );
}

function shortAddress(addr: string) {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

// ---------------- Risk flags card ----------------

export function RiskFlagsCard({ scan }: { scan: ScanResult }) {
  const t = useT();
  const count = scan.redFlags.length + scan.yellowFlags.length + scan.greenSignals.length;
  return (
    <Card hover>
      <div className="aw-card-head">
        <Eyebrow>{t("flags.eyebrow")}</Eyebrow>
        <span className="aw-meta">{t("flags.findings", { n: count })}</span>
      </div>

      <div className="flex flex-col">
        {scan.redFlags.map((f) => (
          <FlagRow key={f.id} tone="high" flag={f} />
        ))}
        {scan.yellowFlags.map((f) => (
          <FlagRow key={f.id} tone="medium" flag={f} />
        ))}
        {scan.greenSignals.map((f) => (
          <FlagRow key={f.id} tone="safe" flag={f} />
        ))}
        {scan.redFlags.length === 0 &&
          scan.yellowFlags.length === 0 &&
          scan.greenSignals.length === 0 && (
            <div className="py-8 text-center text-[color:var(--fg-tertiary)] text-[13px]">
              {t("flags.empty")}
            </div>
          )}
      </div>
    </Card>
  );
}

function FlagRow({
  tone,
  flag,
}: {
  tone: RiskTone;
  flag: RiskFlag;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const label =
    tone === "high"
      ? t("flags.red")
      : tone === "medium"
      ? t("flags.yellow")
      : t("flags.green");

  return (
    <div className={cn("aw-flag", open && "open")}>
      <button className="aw-flag-head" onClick={() => setOpen((o) => !o)}>
        <Chip tone={tone} dot>
          {label}
        </Chip>
        <span className="aw-flag-title">{flag.title}</span>
        <ChevronDown className="aw-flag-icon" />
      </button>
      <div className="aw-flag-body">{flag.detail}</div>
    </div>
  );
}

// ---------------- Transaction history ----------------

export function TxHistoryCard({
  scan,
  isPro = false,
}: {
  scan: ScanResult;
  isPro?: boolean;
}) {
  const t = useT();
  return (
    <Card className="aw-table-card" hover>
      <div className="aw-card-head">
        <Eyebrow>{t("tx.eyebrow")}</Eyebrow>
        <div className="aw-card-actions">
          <button className="aw-link">
            {isPro ? t("tx.last_12") : t("tx.last_30")}
          </button>
          <IconBtn icon={Filter} aria-label="Filter" />
        </div>
      </div>
      <div className="aw-tbl">
        <div className="aw-tbl-head">
          <div>{t("tx.counterparty")}</div>
          <div>{t("tx.type")}</div>
          <div className="aw-tbl-hide-sm">{t("tx.amount")}</div>
          <div className="aw-tbl-hide-sm" style={{ textAlign: "right" }}>
            {t("tx.value")}
          </div>
          <div style={{ textAlign: "right" }}>{t("tx.time")}</div>
        </div>
        {scan.txHistory.slice(0, 10).map((r, i) => (
          <div
            key={i}
            className="aw-tbl-row"
            style={
              !isPro && i > 5
                ? {
                    filter: "blur(3px)",
                    pointerEvents: "none",
                    opacity: 0.6,
                  }
                : undefined
            }
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="mono aw-addr truncate">{r.counterparty}</span>
              {r.risk && (
                <Chip tone={r.risk}>
                  {r.risk === "high"
                    ? t("tx.high_short")
                    : r.risk === "medium"
                    ? t("tx.med_short")
                    : t("tx.safe_short")}
                </Chip>
              )}
            </div>
            <div className="aw-tbl-kind truncate">{r.type}</div>
            <div className="aw-tbl-hide-sm mono text-[12px]">
              {r.amount} {r.token}
            </div>
            <div
              className="aw-tbl-hide-sm mono"
              style={{ textAlign: "right", color: "#F5F5F5" }}
            >
              ${(parseFloat(r.amount) * 18.4).toFixed(2)}
            </div>
            <div className="aw-tbl-time" style={{ textAlign: "right" }}>
              {r.date}
            </div>
          </div>
        ))}
      </div>
      {!isPro && (
        <div
          className="flex items-center justify-between gap-4 px-6 py-4 border-t"
          style={{ borderColor: "#1a1a1a", background: "#0E0E0E" }}
        >
          <div className="flex items-center gap-2 text-[12px] text-[color:var(--fg-tertiary)]">
            <Lock className="w-3.5 h-3.5" />
            {t("tx.locked")}
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => (window.location.href = "/pricing")}
          >
            {t("tx.upgrade_pro")}
          </Button>
        </div>
      )}
    </Card>
  );
}

// ---------------- AI Summary ----------------

export function AiSummaryCard({
  text,
  isPro = false,
}: {
  text: string;
  isPro?: boolean;
}) {
  const t = useT();
  const [streamed, setStreamed] = useState("");
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!isPro) return;
    setStreamed("");
    let i = 0;
    const tick = () => {
      i += Math.max(1, Math.floor(text.length / 240));
      setStreamed(text.slice(0, i));
      if (i < text.length) ref.current = window.setTimeout(tick, 18) as unknown as number;
    };
    tick();
    return () => {
      if (ref.current) window.clearTimeout(ref.current);
    };
  }, [text, isPro]);

  return (
    <Card hover>
      <div className="aw-card-head">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[color:var(--accent)]" />
          <Eyebrow>{t("ai.eyebrow")}</Eyebrow>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-[color:var(--fg-tertiary)]">
          <span className="aw-pulse-dot" />
          {t("common.live")}
        </span>
      </div>
      {isPro ? (
        <p className="text-[14px] text-[color:var(--fg-secondary)] leading-[1.7]">
          {streamed}
          <span
            className="inline-block w-[7px] h-[16px] align-middle ml-[2px]"
            style={{
              background: "var(--accent)",
              opacity: streamed.length < text.length ? 1 : 0,
              transition: "opacity 200ms",
            }}
          />
        </p>
      ) : (
        <div
          className="rounded-xl p-5 flex items-start gap-3"
          style={{ background: "#0E0E0E", border: "1px solid #1a1a1a" }}
        >
          <div className="aw-banner-icon">
            <Lock className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-white text-[14px] font-medium mb-1">
              {t("ai.locked_t")}
            </div>
            <p className="text-[13px] text-[color:var(--fg-secondary)] leading-relaxed">
              {t("ai.locked_d")}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => (window.location.href = "/pricing")}
          >
            {t("common.upgrade")}
          </Button>
        </div>
      )}
    </Card>
  );
}

// ---------------- Wallet vitals ----------------

export function VitalsCard({ scan }: { scan: ScanResult }) {
  const t = useT();
  const { tone } = riskFromScore(scan.score);
  const signals = [
    {
      label: t("vitals.red"),
      value: scan.redFlags.length.toString(),
      tone: scan.redFlags.length > 0 ? ("high" as RiskTone) : ("safe" as RiskTone),
    },
    {
      label: t("vitals.yellow"),
      value: scan.yellowFlags.length.toString(),
      tone:
        scan.yellowFlags.length > 0 ? ("medium" as RiskTone) : ("safe" as RiskTone),
    },
    {
      label: t("vitals.green"),
      value: scan.greenSignals.length.toString(),
      tone: "safe" as RiskTone,
    },
    {
      label: t("vitals.age"),
      value: scan.walletAge,
      tone,
    },
    {
      label: t("vitals.counterparties"),
      value: scan.counterparties.toString(),
      tone: "info" as const,
    },
    {
      label: t("vitals.approvals"),
      value: scan.activeApprovals.toString(),
      tone: scan.activeApprovals > 2 ? ("high" as RiskTone) : ("safe" as RiskTone),
    },
  ];
  return (
    <Card hover>
      <div className="aw-card-head">
        <Eyebrow>{t("vitals.eyebrow")}</Eyebrow>
        <span className="aw-meta">{t("vitals.checked")}</span>
      </div>
      <div className="aw-signals" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        {signals.map((s) => (
          <div key={s.label} className="aw-signal">
            <div className="aw-signal-val">
              <span className={`aw-signal-dot tone-${s.tone}`} />
              <span className="aw-signal-num mono">{s.value}</span>
            </div>
            <div className="aw-signal-lbl">{s.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------- Download / action bar ----------------

export function DownloadBar({
  isPro = false,
  scanId = null,
}: {
  isPro?: boolean;
  scanId?: string | null;
}) {
  const t = useT();

  const downloadPdf = () => {
    if (!scanId) return;
    window.location.href = `/api/export/pdf?scanId=${encodeURIComponent(scanId)}`;
  };

  const downloadCsv = () => {
    window.location.href = "/api/export/csv";
  };

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-2xl border p-5 flex-wrap"
      style={{ background: "#0E0E0E", borderColor: "#1a1a1a" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="aw-banner-icon">
          <FileDown className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-white text-[14px] font-medium">
            {t("dl.title")}
          </div>
          <div className="text-[12px] text-[color:var(--fg-tertiary)]">
            {isPro ? t("dl.desc_pro") : t("dl.desc_free")}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isPro ? (
          <>
            <Button
              variant="primary"
              size="md"
              icon={FileDown}
              onClick={downloadPdf}
              disabled={!scanId}
            >
              {t("dl.pdf")}
            </Button>
            <Button variant="secondary" size="md" icon={FileDown} onClick={downloadCsv}>
              CSV
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="md" icon={Lock} disabled>
            {t("dl.locked")}
          </Button>
        )}
        <Button variant="secondary" size="md" icon={ExternalLink}>
          {t("dl.share")}
        </Button>
      </div>
    </div>
  );
}

// ---------------- Education banner ----------------

export function EducationBanner() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Card hover>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 text-left"
      >
        <div className="aw-banner-icon">
          <Info className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="text-white text-[14px] font-medium">
            {t("edu.title")}
          </div>
          <div className="text-[12px] text-[color:var(--fg-tertiary)]">
            {t("edu.sub")}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-[color:var(--fg-tertiary)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="mt-5 grid md:grid-cols-3 gap-4">
          <EduItem tone="high" title={t("edu.red_t")} desc={t("edu.red_d")} />
          <EduItem tone="medium" title={t("edu.yellow_t")} desc={t("edu.yellow_d")} />
          <EduItem tone="safe" title={t("edu.green_t")} desc={t("edu.green_d")} />
        </div>
      )}
    </Card>
  );
}

function EduItem({
  tone,
  title,
  desc,
}: {
  tone: RiskTone;
  title: string;
  desc: string;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "#0E0E0E", borderColor: "#1a1a1a" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert
          className="w-4 h-4"
          style={{
            color:
              tone === "high"
                ? "var(--risk-high)"
                : tone === "medium"
                ? "var(--risk-medium)"
                : "var(--risk-safe)",
          }}
        />
        <span className="text-white text-[13px] font-semibold">{title}</span>
      </div>
      <p className="text-[12px] text-[color:var(--fg-secondary)] leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
