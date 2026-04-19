import { Check, Minus, ArrowRight } from "lucide-react";
import { Button } from "./Primitives";
import { WHOP_PRO_URL, WHOP_BUSINESS_URL } from "@/lib/constants";
import { Reveal } from "./motion";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

interface Feature {
  key: string;
  included: boolean;
}

export function PricingCards() {
  const t = useT();
  const [, navigate] = useLocation();

  const PLANS = [
    {
      name: t("plan.free.name"),
      price: "$0",
      description: t("plan.free.desc"),
      cta: t("plan.free.cta"),
      ctaHref: "/checker",
      features: [
        { key: "feat.scans_1", included: true },
        { key: "feat.score_flags", included: true },
        { key: "feat.history_30", included: true },
        { key: "feat.ai_summary", included: false },
        { key: "feat.pdf", included: false },
        { key: "feat.csv", included: false },
        { key: "feat.seats_1", included: true },
        { key: "feat.support_community", included: true },
      ] as Feature[],
    },
    {
      name: t("plan.pro.name"),
      price: "$5",
      description: t("plan.pro.desc"),
      cta: t("plan.pro.cta"),
      ctaHref: WHOP_PRO_URL,
      external: true,
      popular: true,
      features: [
        { key: "feat.scans_unlimited", included: true },
        { key: "feat.score_flags", included: true },
        { key: "feat.history_12", included: true },
        { key: "feat.ai_summary", included: true },
        { key: "feat.pdf", included: true },
        { key: "feat.csv", included: false },
        { key: "feat.seats_1", included: true },
        { key: "feat.support_email", included: true },
      ] as Feature[],
    },
    {
      name: t("plan.biz.name"),
      price: "$15",
      description: t("plan.biz.desc"),
      cta: t("plan.biz.cta"),
      ctaHref: WHOP_BUSINESS_URL,
      external: true,
      features: [
        { key: "feat.scans_unlimited", included: true },
        { key: "feat.score_flags", included: true },
        { key: "feat.history_24", included: true },
        { key: "feat.ai_summary", included: true },
        { key: "feat.pdf", included: true },
        { key: "feat.csv", included: true },
        { key: "feat.seats_3", included: true },
        { key: "feat.support_priority", included: true },
      ] as Feature[],
    },
  ];

  return (
    <div className="aw-price-grid">
      {PLANS.map((plan, i) => (
        <Reveal key={plan.name} delay={i * 100}>
          <div className={cn("aw-price-card", plan.popular && "popular")}>
            {plan.popular && (
              <div className="aw-price-badge">{t("common.most_popular")}</div>
            )}

            <div>
              <div className="aw-price-label">{plan.name}</div>
              <div className="aw-price-num mt-2">
                {plan.price}
                <small>{t("pricing.per_month")}</small>
              </div>
              <p className="text-[13px] text-[color:var(--fg-secondary)] leading-relaxed mt-3">
                {plan.description}
              </p>
            </div>

            <ul className="aw-price-feat">
              {plan.features.map((f) => (
                <li key={f.key} className={cn(!f.included && "disabled")}>
                  {f.included ? <Check /> : <Minus />}
                  <span>{t(f.key)}</span>
                </li>
              ))}
            </ul>

            <Button
              variant={plan.popular ? "primary" : "secondary"}
              size="lg"
              trailingIcon={ArrowRight}
              onClick={() => {
                if (plan.external) window.open(plan.ctaHref, "_blank");
                else navigate(plan.ctaHref);
              }}
            >
              {plan.cta}
            </Button>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
