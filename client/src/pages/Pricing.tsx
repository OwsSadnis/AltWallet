import { Eyebrow, Button } from "@/components/aw/Primitives";
import { Reveal } from "@/components/aw/motion";
import { PricingCards } from "@/components/aw/PricingCards";
import { Link } from "wouter";
import { Check, Minus, ArrowRight } from "lucide-react";
import { useT } from "@/i18n";

export default function Pricing() {
  const t = useT();

  const COMPARISON = [
    { feature: t("cmp.scans"), free: "1", pro: t("cmp.unlimited"), business: t("cmp.unlimited") },
    { feature: t("cmp.history_win"), free: t("cmp.30d"), pro: t("cmp.12m"), business: t("cmp.24m") },
    { feature: t("cmp.score"), free: true, pro: true, business: true },
    { feature: t("cmp.multichain"), free: true, pro: true, business: true },
    { feature: t("cmp.ai_sum"), free: false, pro: true, business: true },
    { feature: t("cmp.pdf"), free: false, pro: true, business: true },
    { feature: t("cmp.csv"), free: false, pro: false, business: true },
    { feature: t("cmp.seats"), free: "1", pro: "1", business: "3" },
    { feature: t("cmp.support"), free: t("cmp.community"), pro: t("cmp.email"), business: t("cmp.priority") },
  ];

  const FAQS = [
    { q: t("faq.cancel.q"), a: t("faq.cancel.a") },
    { q: t("faq.keys.q"), a: t("faq.keys.a") },
    { q: t("faq.acc.q"), a: t("faq.acc.a") },
    { q: t("faq.beta.q"), a: t("faq.beta.a") },
    { q: t("faq.api.q"), a: t("faq.api.a") },
    { q: t("faq.refund.q"), a: t("faq.refund.a") },
  ];

  return (
    <>
      <section style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div className="container">
          <div className="flex flex-col gap-4 max-w-2xl">
            <Reveal>
              <Eyebrow>{t("pricing.eyebrow")}</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="aw-hero-title" style={{ fontSize: "clamp(32px, 6vw, 60px)" }}>
                {t("price.page.title_1")}
                <br />
                {t("price.page.title_2")}
              </h1>
            </Reveal>
            <Reveal delay={140}>
              <p className="aw-hero-sub">{t("price.page.sub")}</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="aw-section-sm">
        <div className="container">
          <PricingCards />
          <Reveal>
            <div className="flex items-center justify-center gap-2 mt-8 text-[13px] text-[color:var(--fg-secondary)]">
              <Link href="/redeem">
                <Button variant="ghost" size="sm" trailingIcon={ArrowRight}>
                  {t("common.already_have_key")}
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="aw-section">
        <div className="container">
          <Reveal>
            <div className="aw-section-head">
              <Eyebrow>{t("price.compare.eyebrow")}</Eyebrow>
              <h2 className="aw-section-title">{t("price.compare.title")}</h2>
            </div>
          </Reveal>

          <Reveal>
            <div
              className="rounded-2xl border overflow-x-auto aw-cmp-table"
              style={{ background: "#111", borderColor: "#1a1a1a" }}
            >
              <div
                className="grid items-center px-4 md:px-6 py-4 text-[11px] uppercase tracking-[0.14em] text-[color:var(--fg-tertiary)] font-medium"
                style={{
                  background: "#0E0E0E",
                  borderBottom: "1px solid #1a1a1a",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  minWidth: 640,
                }}
              >
                <div>{t("cmp.feature")}</div>
                <div className="text-center">{t("plan.free.name")}</div>
                <div className="text-center">{t("plan.pro.name")}</div>
                <div className="text-center">{t("plan.biz.name")}</div>
              </div>
              {COMPARISON.map((row, i) => (
                <div
                  key={row.feature}
                  className="grid items-center px-4 md:px-6 py-4 text-[13px]"
                  style={{
                    gridTemplateColumns: "2fr 1fr 1fr 1fr",
                    borderTop: i === 0 ? "none" : "1px solid #1a1a1a",
                    minWidth: 640,
                  }}
                >
                  <div className="text-white">{row.feature}</div>
                  <ComparisonCell value={row.free} />
                  <ComparisonCell value={row.pro} />
                  <ComparisonCell value={row.business} />
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-6 text-[12px] text-[color:var(--fg-tertiary)] text-center">
              {t("price.beta_note")}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="aw-section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal>
            <div className="aw-section-head">
              <Eyebrow>{t("price.faq.eyebrow")}</Eyebrow>
              <h2 className="aw-section-title">{t("price.faq.title")}</h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-4">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 60}>
                <div
                  className="rounded-xl border p-5 md:p-6"
                  style={{ background: "#111", borderColor: "#1a1a1a" }}
                >
                  <h3 className="text-white text-[15px] font-semibold mb-2 tracking-tight">
                    {f.q}
                  </h3>
                  <p className="text-[13px] text-[color:var(--fg-secondary)] leading-relaxed">
                    {f.a}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function ComparisonCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return (
      <div className="flex justify-center">
        {value ? (
          <Check className="w-4 h-4 text-[color:var(--accent)]" />
        ) : (
          <Minus className="w-4 h-4 text-[color:var(--fg-tertiary)]" />
        )}
      </div>
    );
  }
  return (
    <div className="text-center text-[color:var(--fg-secondary)]">{value}</div>
  );
}
