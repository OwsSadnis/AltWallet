// Landing page for AltWallet
// Design: Terminal-Grade Minimalism — dark canvas, single teal signal color,
// monospace instruments, hairline borders, eyebrow HUD labels above every section.
// All user-facing text is translated via the i18n layer.
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { WalletInputBar, ChainLogo } from "@/components/aw/WalletInputBar";
import { Chip, Button, PulseDot } from "@/components/aw/Primitives";
import { Reveal, CountUp } from "@/components/aw/motion";
import { PricingCards } from "@/components/aw/PricingCards";
import {
  CHAINS,
  ChainCode,
  HERO_ORB_URL,
  EXAMPLE_ADDRESSES,
} from "@/lib/constants";
import {
  Gauge,
  Zap,
  Network,
  Sparkles,
  Clock,
  Code,
  Info,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  FileText,
} from "lucide-react";
import { useT } from "@/i18n";

// Detect small viewport for the stats formatter + subheadline variant.
function useIsMobile(breakpoint = 640) {
  const [m, setM] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setM(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return m;
}

export default function Landing() {
  const t = useT();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile(640);
  // isMobile is used to swap hero subheadline; keep variable
  void isMobile;

  const handleScan = (address: string, chain: ChainCode) => {
    navigate(`/checker?address=${encodeURIComponent(address)}&chain=${chain}`);
  };

  return (
    <>
      {/* HERO */}
      <section
        className="aw-hero-section relative overflow-hidden"
        style={{ paddingBottom: 96 }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${HERO_ORB_URL})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            opacity: 0.5,
            maskImage:
              "radial-gradient(ellipse 60% 60% at center, black 40%, transparent 85%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 60% 60% at center, black 40%, transparent 85%)",
          }}
        />
        <div className="container relative">
          <div className="flex flex-col items-start gap-5 max-w-3xl">
            <Reveal delay={0}>
              <div
                className="inline-flex items-center gap-2.5 rounded-full border px-3 py-1.5 text-[11px] text-[color:var(--fg-secondary)] uppercase tracking-[0.14em]"
                style={{
                  borderColor: "#1a1a1a",
                  background: "rgba(17,17,17,0.6)",
                }}
              >
                <PulseDot />
                <span>{t("hero.trusted")}</span>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="aw-hero-title">
                {t("hero.title_line_1")}
                <br />
                {t("hero.title_line_2")}
              </h1>
            </Reveal>

            <Reveal delay={140}>
              <p className="aw-hero-sub">
                {isMobile ? t("hero.sub_mobile") : t("hero.sub")}
              </p>
            </Reveal>

            <Reveal delay={220} className="w-full mt-2">
              <div className="w-full max-w-[760px]">
                <WalletInputBar size="lg" onSubmit={handleScan} />
                <div className="aw-examples-scroll">
                  <span className="aw-examples-label">{t("common.try")}</span>
                  <div className="aw-examples-row">
                    {CHAINS.map((c) => (
                      <button
                        key={c.code}
                        className="aw-example"
                        onClick={() =>
                          handleScan(EXAMPLE_ADDRESSES[c.code], c.code)
                        }
                      >
                        <ChainLogo code={c.code} size={14} />
                        {c.code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={320} className="w-full">
              <div className="aw-scan-stats w-full max-w-[760px]">
                <div className="aw-stat">
                  <div className="aw-stat-num">
                    <CountUp to={6} />
                  </div>
                  <div className="aw-stat-lbl">{t("stats.chains")}</div>
                </div>
                <div className="aw-stat">
                  <div className="aw-stat-num">
                    <CountUp to={47} />
                  </div>
                  <div className="aw-stat-lbl">{t("stats.signals")}</div>
                </div>
                <div className="aw-stat">
                  <div className="aw-stat-num">
                    1.2B<span className="text-[color:var(--fg-tertiary)]">+</span>
                  </div>
                  <div className="aw-stat-lbl">{t("stats.indexed")}</div>
                </div>
                <div className="aw-stat">
                  <div className="aw-stat-num">&lt;4s</div>
                  <div className="aw-stat-lbl">{t("stats.median")}</div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="aw-section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal>
            <div className="aw-section-head">
              <div className="aw-eyebrow">{t("section.why.eyebrow")}</div>
              <h2 className="aw-section-title">
                {t("section.why.title_1")}
                <br />
                {t("section.why.title_2")}
              </h2>
              <p className="aw-section-sub">{t("section.why.sub")}</p>
            </div>
          </Reveal>

          <div className="aw-feat-grid">
            {[
              { Icon: Gauge, title: t("feat.score.title"), desc: t("feat.score.desc") },
              { Icon: Zap, title: t("feat.realtime.title"), desc: t("feat.realtime.desc") },
              { Icon: Network, title: t("feat.multichain.title"), desc: t("feat.multichain.desc") },
              { Icon: Sparkles, title: t("feat.ai.title"), desc: t("feat.ai.desc") },
              { Icon: Clock, title: t("feat.history.title"), desc: t("feat.history.desc") },
              { Icon: Code, title: t("feat.api.title"), desc: t("feat.api.desc") },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <Tilt>
                  <div className="aw-feat-card">
                    <div className="aw-feat-icon">
                      <f.Icon />
                    </div>
                    <h3 className="aw-feat-title">{f.title}</h3>
                    <p className="aw-feat-desc">{f.desc}</p>
                  </div>
                </Tilt>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="aw-section" style={{ paddingTop: 32 }}>
        <div className="container">
          <Reveal>
            <div className="aw-section-head">
              <div className="aw-eyebrow">{t("how.eyebrow")}</div>
              <h2 className="aw-section-title">{t("how.title")}</h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { n: "01", t: t("how.s1.t"), d: t("how.s1.d") },
              { n: "02", t: t("how.s2.t"), d: t("how.s2.d") },
              { n: "03", t: t("how.s3.t"), d: t("how.s3.d") },
            ].map((s) => (
              <Reveal key={s.n}>
                <div
                  className="rounded-2xl border p-6 h-full flex flex-col gap-3"
                  style={{ background: "#111", borderColor: "#1a1a1a" }}
                >
                  <span className="mono text-[color:var(--fg-tertiary)] text-[13px]">
                    {s.n}
                  </span>
                  <h3 className="text-white text-[18px] font-semibold tracking-tight">
                    {s.t}
                  </h3>
                  <p className="text-[13px] text-[color:var(--fg-secondary)] leading-relaxed">
                    {s.d}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CHAINS */}
      <section className="aw-section" style={{ paddingTop: 32 }}>
        <div className="container">
          <Reveal>
            <div className="aw-section-head">
              <div className="aw-eyebrow">{t("chains.eyebrow")}</div>
              <h2 className="aw-section-title">{t("chains.title")}</h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {CHAINS.map((c, i) => (
              <Reveal key={c.code} delay={i * 60}>
                <div
                  className="rounded-xl border p-5 flex flex-col gap-3 h-full"
                  style={{ background: "#111", borderColor: "#1a1a1a" }}
                >
                  <div className="flex items-center justify-between">
                    <ChainLogo code={c.code} size={28} />
                    {c.beta && <Chip tone="beta">{t("common.beta")}</Chip>}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-[15px]">
                      {c.name}
                    </div>
                    <div className="mono text-[11px] text-[color:var(--fg-tertiary)] mt-1">
                      {c.code}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="aw-banner mt-6">
              <div className="aw-banner-icon">
                <Info className="w-4 h-4" />
              </div>
              <div>{t("chains.beta_note")}</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className="aw-section" style={{ paddingTop: 32 }}>
        <div className="container">
          <Reveal>
            <div className="aw-section-head">
              <div className="aw-eyebrow">{t("pricing.eyebrow")}</div>
              <h2 className="aw-section-title">{t("pricing.title")}</h2>
              <p className="aw-section-sub">{t("pricing.sub")}</p>
            </div>
          </Reveal>
          <PricingCards />
          <Reveal>
            <div className="flex justify-center mt-8">
              <Link href="/redeem">
                <Button variant="ghost" size="md" trailingIcon={ArrowRight}>
                  {t("common.already_have_key")}
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* STABLECOIN BANNER */}
      <section className="aw-section-sm">
        <div className="container">
          <Reveal>
            <div className="aw-banner aw-banner-center aw-banner-warn">
              <div className="aw-banner-icon">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>{t("banner.stable")}</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="aw-section" style={{ paddingTop: 16 }}>
        <div className="container">
          <Reveal>
            <div
              className="rounded-3xl border p-8 md:p-14 relative overflow-hidden"
              style={{
                background:
                  "radial-gradient(600px 300px at 85% 110%, rgba(29,158,117,0.12), transparent 60%), #0E0E0E",
                borderColor: "#1a1a1a",
              }}
            >
              <div className="max-w-2xl flex flex-col gap-4 relative">
                <div className="aw-eyebrow">{t("cta.eyebrow")}</div>
                <h2 className="aw-section-title">{t("cta.title")}</h2>
                <p className="aw-section-sub">{t("cta.sub")}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <Link href="/checker">
                    <Button
                      variant="primary"
                      size="lg"
                      trailingIcon={ArrowRight}
                    >
                      {t("cta.run")}
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button variant="secondary" size="lg">
                      {t("cta.see_pricing")}
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-4 mt-6 flex-wrap">
                  <div className="flex items-center gap-2 text-[12px] text-[color:var(--fg-tertiary)]">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {t("cta.no_connect")}
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[color:var(--fg-tertiary)]">
                    <FileText className="w-3.5 h-3.5" />
                    {t("cta.pdf_pro")}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

// 3D tilt wrapper
function Tilt({ children }: { children: React.ReactNode }) {
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-2px)`;
  };
  const onLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "";
  };
  return (
    <div
      className="aw-tilt"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ height: "100%" }}
    >
      {children}
    </div>
  );
}
