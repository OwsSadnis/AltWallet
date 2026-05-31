// Checker page — three states:
//  1) Entry (hero with address bar)
//  2) Scanning (pulse-ring loader + sequential status steps)
//  3) Results (staggered reveal of ScoreCard, VitalsCard, Flags, Tx, AI summary)
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  ChainCode,
  EXAMPLE_ADDRESSES,
  CHAINS,
  CHAIN_MAP,
  ScanResult,
  generateScan,
  riskFromScore,
} from "@/lib/constants";
import { WalletInputBar, ChainLogo } from "@/components/aw/WalletInputBar";
import { Button, Chip, Eyebrow } from "@/components/aw/Primitives";
import { Reveal } from "@/components/aw/motion";
import {
  ScoreCard,
  VitalsCard,
  RiskFlagsCard,
  TxHistoryCard,
  AiSummaryCard,
  DownloadBar,
  EducationBanner,
} from "@/components/aw/ResultCards";
import {
  ShieldCheck,
  RotateCw,
  Check,
  Loader2,
  Info,
  Plus,
  X,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import { useI18n } from "@/i18n";

type Stage = "entry" | "scanning" | "results";
type WalletSlot = { address: string; chain: ChainCode };

// ─── API helpers ──────────────────────────────────────────────────────────────
interface ScanApiResponse extends ScanResult {
  scanId?: string;
  plan?: string;
  error?: string;
  code?: string;
}

async function callScanApi(
  address: string,
  chain: ChainCode,
  lang: string,
  getToken: () => Promise<string | null>
): Promise<ScanApiResponse> {
  const token = await getToken();
  const res = await fetch("/api/scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ address, chain, lang }),
  });
  return (await res.json()) as ScanApiResponse;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Checker() {
  const [location] = useLocation();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { lang } = useI18n();

  const [stage, setStage] = useState<Stage>("entry");
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [scanIds, setScanIds] = useState<(string | null)[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [lastSlots, setLastSlots] = useState<WalletSlot[]>([]);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [scanError, setScanError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  // Sync plan from Clerk metadata
  useEffect(() => {
    const plan = (user?.publicMetadata?.plan as string) ?? "free";
    setUserPlan(plan);
  }, [user]);

  const initial = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const address = params.get("address") || "";
    const chain = (params.get("chain") || "ETH") as ChainCode;
    return { address, chain };
  }, [location]);

  useEffect(() => {
    if (initial?.address) {
      startMultiScan([{ address: initial.address, chain: initial.chain }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.address]);

  const startMultiScan = (slots: WalletSlot[]) => {
    const validSlots = slots.filter((s) => s.address.trim());
    if (!validSlots.length) return;

    setLastSlots(validSlots);
    setStage("scanning");
    setProgress(0);
    setStepIdx(0);
    setScanError(null);
    setScans([]);
    setScanIds([]);
    setActiveTab(0);

    const ANIM_DURATION = 3000;
    const tStart = performance.now();
    let raf: number;
    let animDone = false;
    let apiResults: (ScanResult | null)[] = [];
    let newScanIds: (string | null)[] = [];
    let apiError: string | null = null;
    let apiDone = false;

    const step = (t: number) => {
      const p = Math.min(0.95, (t - tStart) / ANIM_DURATION);
      setProgress(p);
      if (p > 0.25) setStepIdx((s) => Math.max(s, 1));
      if (p > 0.5) setStepIdx((s) => Math.max(s, 2));
      if (p > 0.75) setStepIdx((s) => Math.max(s, 3));
      if (p < 0.95) {
        raf = requestAnimationFrame(step);
      } else {
        animDone = true;
        if (apiDone) finish(apiResults, newScanIds, apiError);
      }
    };
    raf = requestAnimationFrame(step);

    const finish = (
      results: (ScanResult | null)[],
      ids: (string | null)[],
      error: string | null
    ) => {
      cancelAnimationFrame(raf);
      setProgress(1);
      setStepIdx(3);
      const pairs = results.map((r, i) => ({ result: r, id: ids[i] ?? null }));
      const valid = pairs.filter((p) => p.result !== null);
      if (valid.length) {
        setScans(valid.map((p) => p.result as ScanResult));
        setScanIds(valid.map((p) => p.id));
        setStage("results");
      } else {
        setScanError(error ?? "Scan failed.");
        setStage("entry");
      }
    };

    const scanAll = async () => {
      try {
        if (isSignedIn) {
          const responses = await Promise.all(
            validSlots.map((s) =>
              callScanApi(s.address, s.chain, lang, getToken).catch((err) => {
                console.warn("[checker] API call failed, using mock data:", err);
                return generateScan(s.address, s.chain) as ScanApiResponse;
              })
            )
          );
          for (const data of responses) {
            if (data.error) {
              apiError = data.error;
              apiResults.push(null);
            } else {
              apiResults.push(data as ScanResult);
            }
            newScanIds.push((data as ScanApiResponse).scanId ?? null);
            if ((data as ScanApiResponse).plan) {
              setUserPlan((data as ScanApiResponse).plan!);
            }
          }
        } else {
          // Demo mode — mock data for unauthenticated visitors
          await new Promise((r) => setTimeout(r, 1200));
          apiResults = validSlots.map((s) => generateScan(s.address, s.chain));
          newScanIds = validSlots.map(() => null);
        }
      } catch {
        apiError = "Scan failed.";
      }
      apiDone = true;
      if (animDone) finish(apiResults, newScanIds, apiError);
    };
    scanAll();
  };

  const reset = () => {
    setStage("entry");
    setScans([]);
    setScanIds([]);
    setActiveTab(0);
    setLastSlots([]);
    setScanError(null);
    setProgress(0);
    setStepIdx(0);
    window.history.replaceState({}, "", "/checker");
  };

  const isPro = userPlan === "pro" || userPlan === "business";

  return (
    <div className="container aw-scan">
      {stage === "entry" && (
        <EntryView
          onMultiScan={startMultiScan}
          errorMsg={scanError}
          isPro={isPro}
        />
      )}
      {stage === "scanning" && (
        <ScanningView
          address={lastSlots[0]?.address || ""}
          walletCount={lastSlots.length}
          progress={progress}
          stepIdx={stepIdx}
        />
      )}
      {stage === "results" && scans.length > 0 && (
        <>
          <WalletTabs
            scans={scans}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          <ResultsView
            scan={scans[activeTab]}
            scanId={scanIds[activeTab] ?? null}
            isPro={isPro}
            onReset={reset}
            onRescan={() => startMultiScan(lastSlots)}
          />
        </>
      )}
    </div>
  );
}

// ─── Extra slot row (additional wallets beyond the first) ─────────────────────
function ExtraSlotRow({
  slot,
  onChange,
  onRemove,
}: {
  slot: WalletSlot;
  onChange: (s: WalletSlot) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const detectChain = (val: string): ChainCode | null => {
    const v = val.trim();
    if (!v) return null;
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
    if (v.startsWith("0x") && v.length === 42) return "ETH";
    return null;
  };

  const info = CHAIN_MAP[slot.chain];

  return (
    <div className="aw-extra-slot">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + 8, left: rect.left });
          }
          setOpen((o) => !o);
        }}
        className="aw-extra-slot-chain"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <ChainLogo code={slot.chain} size={16} />
        <span className="text-[13px] font-semibold tracking-tight">
          {slot.chain}
        </span>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-[color:var(--fg-tertiary)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <div className="w-px h-5 bg-[#1a1a1a] shrink-0" aria-hidden />

      <div className="flex-1 flex items-center px-3 min-w-0">
        <input
          className="flex-1 min-w-0 bg-transparent outline-none mono text-[13px] text-white placeholder:text-[color:var(--fg-tertiary)]"
          placeholder={info.placeholder}
          value={slot.address}
          onChange={(e) => {
            const val = e.target.value;
            const detected = detectChain(val);
            onChange({ address: val, chain: detected ?? slot.chain });
          }}
        />
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="aw-extra-slot-remove"
        aria-label="Remove wallet"
      >
        <X className="w-3.5 h-3.5" />
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
              minWidth: 260,
              padding: 6,
              backgroundColor: "#111111",
              border: "1px solid #2a2a2a",
              borderRadius: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            }}
          >
            {CHAINS.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ ...slot, chain: c.code });
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  slot.chain === c.code ? "bg-[#151515]" : "hover:bg-[#151515]"
                )}
                role="option"
                aria-selected={slot.chain === c.code}
              >
                <ChainLogo code={c.code} size={20} />
                <span className="text-white text-[13px] font-medium flex-1">
                  {c.name}
                </span>
                <span className="text-[11px] text-[color:var(--fg-tertiary)] mono">
                  {c.code}
                </span>
                {c.beta && <Chip tone="beta">{t("common.beta")}</Chip>}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

// ─── Wallet tabs (shown above result when 2+ wallets scanned) ─────────────────
function WalletTabs({
  scans,
  activeTab,
  onTabChange,
}: {
  scans: ScanResult[];
  activeTab: number;
  onTabChange: (idx: number) => void;
}) {
  if (scans.length < 2) return null;

  return (
    <div className="aw-wallet-tabs">
      {scans.map((scan, i) => {
        const addr = scan.address;
        const truncated =
          addr.length > 14
            ? `${addr.slice(0, 6)}...${addr.slice(-4)}`
            : addr;
        const { tone } = riskFromScore(scan.score);
        const dotColor =
          tone === "safe"
            ? "#1D9E75"
            : tone === "medium"
            ? "#F5A623"
            : "#E5484D";
        return (
          <button
            key={i}
            className={cn("aw-wallet-tab", activeTab === i && "active")}
            onClick={() => onTabChange(i)}
          >
            <span
              className="aw-wallet-tab-dot"
              style={{ background: dotColor }}
            />
            <div className="aw-wallet-tab-inner">
              <span className="aw-wallet-tab-label">Wallet {i + 1}</span>
              <span className="aw-wallet-tab-addr mono">{truncated}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Entry view ───────────────────────────────────────────────────────────────
function EntryView({
  onMultiScan,
  errorMsg,
  isPro,
}: {
  onMultiScan: (slots: WalletSlot[]) => void;
  errorMsg: string | null;
  isPro: boolean;
}) {
  const t = useT();
  const [extraSlots, setExtraSlots] = useState<WalletSlot[]>([]);
  const maxExtra = isPro ? 4 : 0;

  const addSlot = () => {
    if (extraSlots.length < maxExtra) {
      setExtraSlots((prev) => [...prev, { address: "", chain: "ETH" }]);
    }
  };

  const removeSlot = (i: number) =>
    setExtraSlots((prev) => prev.filter((_, idx) => idx !== i));

  const updateSlot = (i: number, s: WalletSlot) =>
    setExtraSlots((prev) => prev.map((slot, idx) => (idx === i ? s : slot)));

  return (
    <>
      <Reveal>
        <Eyebrow>{t("checker.eyebrow")}</Eyebrow>
      </Reveal>
      <Reveal delay={80}>
        <h1 className="aw-hero-title">
          {t("hero.title_line_1")}
          <br />
          {t("hero.title_line_2")}
        </h1>
      </Reveal>
      <Reveal delay={140}>
        <p className="aw-hero-sub">{t("checker.sub")}</p>
      </Reveal>

      <Reveal delay={220} className="aw-scan-input">
        <WalletInputBar
          size="lg"
          onSubmit={(a, c) =>
            onMultiScan([
              { address: a, chain: c },
              ...extraSlots.filter((s) => s.address.trim()),
            ])
          }
          autoFocus
          ctaLabel={t("common.scan_wallet")}
        />

        {extraSlots.map((slot, i) => (
          <ExtraSlotRow
            key={i}
            slot={slot}
            onChange={(s) => updateSlot(i, s)}
            onRemove={() => removeSlot(i)}
          />
        ))}

        <div className="aw-add-wallet-wrap">
          {isPro ? (
            extraSlots.length < maxExtra ? (
              <button
                type="button"
                className="aw-add-wallet-btn"
                onClick={addSlot}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Wallet
              </button>
            ) : null
          ) : (
            <div className="aw-add-wallet-lock-wrap">
              <button
                type="button"
                className="aw-add-wallet-btn aw-add-wallet-btn-locked"
                disabled
              >
                <Plus className="w-3.5 h-3.5" />
                Add Wallet
              </button>
              <span className="aw-lock-tooltip">Pro / Business only</span>
            </div>
          )}
        </div>

        {errorMsg && (
          <div
            className="mt-3 text-[13px] px-4 py-3 rounded-xl"
            style={{
              background: "rgba(229,62,62,0.08)",
              color: "var(--risk-high)",
              border: "1px solid rgba(229,62,62,0.2)",
            }}
          >
            {errorMsg}
            {errorMsg.includes("limit") || errorMsg.includes("chain") ? (
              <a
                href="/pricing"
                className="ml-2 underline"
                style={{ color: "var(--accent)" }}
              >
                Upgrade →
              </a>
            ) : null}
          </div>
        )}

        <div className="aw-examples-scroll">
          <span className="aw-examples-label">{t("common.try")}</span>
          <div className="aw-examples-row">
            {CHAINS.map((c) => (
              <button
                key={c.code}
                className="aw-example"
                onClick={() =>
                  onMultiScan([
                    { address: EXAMPLE_ADDRESSES[c.code], chain: c.code },
                  ])
                }
              >
                <ChainLogo code={c.code} size={14} />
                <span className="mono">{c.code}</span>
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={320}>
        <div className="aw-scan-stats">
          <div className="aw-stat">
            <div className="aw-stat-num">6</div>
            <div className="aw-stat-lbl">{t("stats.chains")}</div>
          </div>
          <div className="aw-stat">
            <div className="aw-stat-num">47</div>
            <div className="aw-stat-lbl">{t("stats.signals")}</div>
          </div>
          <div className="aw-stat">
            <div className="aw-stat-num">1.2B+</div>
            <div className="aw-stat-lbl">{t("stats.indexed")}</div>
          </div>
          <div className="aw-stat">
            <div className="aw-stat-num">&lt;4s</div>
            <div className="aw-stat-lbl">{t("stats.median")}</div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={420}>
        <div className="aw-banner mt-10">
          <div className="aw-banner-icon">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>{t("banner.nowallet")}</div>
        </div>
      </Reveal>
    </>
  );
}

// ─── Scanning view ────────────────────────────────────────────────────────────
function ScanningView({
  address,
  walletCount,
  progress,
  stepIdx,
}: {
  address: string;
  walletCount: number;
  progress: number;
  stepIdx: number;
}) {
  const t = useT();
  const STEPS = [
    t("checker.step_1"),
    t("checker.step_2"),
    t("checker.step_3"),
    t("checker.step_4"),
  ];
  const addrDisplay =
    walletCount > 1
      ? `${walletCount} wallets`
      : address.length > 28
      ? `${address.slice(0, 16)}…${address.slice(-10)}`
      : address;

  return (
    <div className="aw-scanning">
      <Eyebrow>{t("checker.scanning")}</Eyebrow>
      <h1 className="aw-hero-title">
        {t("checker.analysing")}
        <br />
        <span className="mono aw-addr-hero">{addrDisplay}</span>
      </h1>

      <div className="flex items-center gap-5 mt-8">
        <div className="aw-pulse-ring" aria-hidden />
        <div className="flex-1 min-w-0">
          <div className="text-white text-[15px] font-medium mb-1">
            {STEPS[stepIdx]}
          </div>
          <div className="text-[color:var(--fg-tertiary)] text-[12px]">
            {t("checker.complete", { pct: Math.round(progress * 100) })}
          </div>
        </div>
      </div>

      <div className="aw-progress">
        <div
          className="aw-progress-fill"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="aw-steps mt-6">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`aw-step ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}
          >
            {i < stepIdx ? <Check /> : <Loader2 />}
            <span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Results view ─────────────────────────────────────────────────────────────
function ResultsView({
  scan,
  scanId,
  isPro,
  onReset,
  onRescan,
}: {
  scan: ScanResult;
  scanId: string | null;
  isPro: boolean;
  onReset: () => void;
  onRescan: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-5" style={{ maxWidth: "100%" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Eyebrow>{t("checker.scan_result")}</Eyebrow>
          {(scan.chain === "XRP" || scan.chain === "SUI") && (
            <Chip tone="beta" dot>
              {t("checker.beta_warning")}
            </Chip>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={RotateCw} onClick={onRescan}>
            {t("common.rescan")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>
            {t("common.new_scan")}
          </Button>
        </div>
      </div>

      <div className="aw-stagger flex flex-col gap-5">
        <ScoreCard scan={scan} />
        <div className="aw-dash-grid">
          <VitalsCard scan={scan} />
          <RiskFlagsCard scan={scan} />
        </div>
        <TxHistoryCard scan={scan} isPro={isPro} />
        <AiSummaryCard text={scan.aiSummary} isPro={isPro} />
        <EducationBanner />
        <DownloadBar isPro={isPro} scanId={scanId} />
      </div>

      <div className="aw-banner mt-4">
        <div className="aw-banner-icon">
          <Info className="w-4 h-4" />
        </div>
        <div>{t("checker.one_layer")}</div>
      </div>
    </div>
  );
}
