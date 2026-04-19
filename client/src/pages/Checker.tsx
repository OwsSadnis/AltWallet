// Checker page — three states:
//  1) Entry (hero with address bar)
//  2) Scanning (pulse-ring loader + sequential status steps)
//  3) Results (staggered reveal of ScoreCard, VitalsCard, Flags, Tx, AI summary)
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ChainCode,
  EXAMPLE_ADDRESSES,
  CHAINS,
  ScanResult,
  generateScan,
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
import { ShieldCheck, RotateCw, Check, Loader2, Info } from "lucide-react";
import { useT } from "@/i18n";

type Stage = "entry" | "scanning" | "results";

export default function Checker() {
  const [location] = useLocation();
  const [stage, setStage] = useState<Stage>("entry");
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  const initial = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const address = params.get("address") || "";
    const chain = (params.get("chain") || "ETH") as ChainCode;
    return { address, chain };
  }, [location]);

  useEffect(() => {
    if (initial?.address) {
      startScan(initial.address, initial.chain);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.address]);

  const startScan = (address: string, chain: ChainCode) => {
    setStage("scanning");
    setProgress(0);
    setStepIdx(0);

    const total = 2600;
    const tStart = performance.now();
    let raf: number;
    const step = (t: number) => {
      const p = Math.min(1, (t - tStart) / total);
      setProgress(p);
      if (p > 0.25) setStepIdx((s) => Math.max(s, 1));
      if (p > 0.5) setStepIdx((s) => Math.max(s, 2));
      if (p > 0.75) setStepIdx((s) => Math.max(s, 3));
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        const result = generateScan(address, chain);
        setScan(result);
        setStage("results");
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  };

  const reset = () => {
    setStage("entry");
    setScan(null);
    setProgress(0);
    setStepIdx(0);
    window.history.replaceState({}, "", "/checker");
  };

  return (
    <div className="container aw-scan">
      {stage === "entry" && <EntryView onScan={startScan} />}
      {stage === "scanning" && (
        <ScanningView
          address={initial?.address || ""}
          progress={progress}
          stepIdx={stepIdx}
        />
      )}
      {stage === "results" && scan && (
        <ResultsView
          scan={scan}
          onReset={reset}
          onRescan={() => startScan(scan.address, scan.chain)}
        />
      )}
    </div>
  );
}

// ---------- Entry -----------

function EntryView({
  onScan,
}: {
  onScan: (addr: string, chain: ChainCode) => void;
}) {
  const t = useT();
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
          onSubmit={(a, c) => onScan(a, c)}
          autoFocus
          ctaLabel={t("common.scan_wallet")}
        />
        <div className="aw-examples-scroll">
          <span className="aw-examples-label">{t("common.try")}</span>
          <div className="aw-examples-row">
            {CHAINS.map((c) => (
              <button
                key={c.code}
                className="aw-example"
                onClick={() => onScan(EXAMPLE_ADDRESSES[c.code], c.code)}
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

// ---------- Scanning -----------

function ScanningView({
  address,
  progress,
  stepIdx,
}: {
  address: string;
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
  return (
    <div className="aw-scanning">
      <Eyebrow>{t("checker.scanning")}</Eyebrow>
      <h1 className="aw-hero-title">
        {t("checker.analysing")}
        <br />
        <span className="mono aw-addr-hero">
          {address.length > 28
            ? `${address.slice(0, 16)}…${address.slice(-10)}`
            : address}
        </span>
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
        <div className="aw-progress-fill" style={{ width: `${progress * 100}%` }} />
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

// ---------- Results -----------

function ResultsView({
  scan,
  onReset,
  onRescan,
}: {
  scan: ScanResult;
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
        <TxHistoryCard scan={scan} isPro={false} />
        <AiSummaryCard text={scan.aiSummary} isPro={false} />
        <EducationBanner />
        <DownloadBar isPro={false} />
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
