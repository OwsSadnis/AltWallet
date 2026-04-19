import { useState } from "react";
import { Button, Eyebrow, Chip } from "@/components/aw/Primitives";
import { Reveal } from "@/components/aw/motion";
import { LogoImage } from "@/components/aw/Logo";
import { Link } from "wouter";
import { ArrowRight, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { useT } from "@/i18n";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; plan: string }
  | { kind: "error"; message: string };

export default function Redeem() {
  const t = useT();
  const [token, setToken] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const submit = () => {
    if (!token.trim()) return;
    setState({ kind: "loading" });
    setTimeout(() => {
      const upper = token.toUpperCase();
      if (upper.includes("USED")) {
        setState({ kind: "error", message: t("redeem.err_used") });
        return;
      }
      const plan = upper.includes("BIZ") || upper.includes("BUSINESS")
        ? "Business"
        : "Pro";
      setState({ kind: "success", plan });
    }, 900);
  };

  return (
    <div className="container" style={{ paddingTop: 72, paddingBottom: 120 }}>
      <div className="mx-auto max-w-[520px] flex flex-col items-center gap-8">
        <Reveal>
          <LogoImage height={44} />
        </Reveal>

        <Reveal delay={80} className="w-full">
          <div
            className="rounded-3xl border p-8 w-full"
            style={{ background: "#111", borderColor: "#1a1a1a" }}
          >
            {state.kind !== "success" ? (
              <>
                <div className="flex flex-col items-center gap-3 text-center mb-7">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "var(--accent-muted)",
                      color: "var(--accent)",
                    }}
                  >
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <Eyebrow>{t("redeem.eyebrow")}</Eyebrow>
                  <h1 className="text-white text-[28px] font-bold tracking-tight leading-tight">
                    {t("redeem.title")}
                  </h1>
                  <p className="text-[13px] text-[color:var(--fg-secondary)] max-w-sm leading-relaxed">
                    {t("redeem.sub")}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="aw-input">
                    <KeyRound className="aw-input-icon" />
                    <input
                      className="mono"
                      placeholder={t("redeem.placeholder")}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submit()}
                      disabled={state.kind === "loading"}
                    />
                  </div>

                  <div className="text-[11px] text-[color:var(--fg-tertiary)]">
                    {t("redeem.hint")}
                  </div>

                  {state.kind === "error" && (
                    <div
                      className="flex items-center gap-2 text-[13px] mt-1"
                      style={{ color: "var(--risk-high)" }}
                    >
                      <AlertCircle className="w-4 h-4" />
                      {state.message}
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={submit}
                    disabled={state.kind === "loading" || !token.trim()}
                    trailingIcon={ArrowRight}
                    className="mt-2"
                  >
                    {state.kind === "loading" ? t("common.activating") : t("common.activate")}
                  </Button>

                  <div className="text-center mt-2 text-[12px] text-[color:var(--fg-tertiary)]">
                    {t("redeem.no_key")}{" "}
                    <Link
                      href="/pricing"
                      className="text-[color:var(--fg-secondary)] hover:text-white"
                    >
                      {t("common.see_pricing")}
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-5 text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "rgba(29, 158, 117, 0.15)",
                    color: "var(--accent)",
                  }}
                >
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <Chip tone="safe" dot>
                  {t("redeem.activated")}
                </Chip>
                <h2 className="text-white text-[28px] font-bold tracking-tight">
                  {t("redeem.welcome", { plan: state.plan })}
                </h2>
                <p className="text-[14px] text-[color:var(--fg-secondary)] max-w-sm leading-relaxed">
                  {state.plan === "Business" ? t("redeem.welcome_d_biz") : t("redeem.welcome_d_pro")}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Link href="/checker">
                    <Button variant="primary" size="md" trailingIcon={ArrowRight}>
                      {t("redeem.run_first")}
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </Reveal>

        <div className="text-[11px] text-[color:var(--fg-tertiary)] text-center max-w-xs">
          {t("redeem.one_key")}
        </div>
      </div>
    </div>
  );
}
