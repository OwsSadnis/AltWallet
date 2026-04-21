// Horizontal sticky navbar.
// - PNG logo (32px desktop / 28px mobile) via <Logo />
// - Live language switcher wired to i18n context (EN/ID/AR/ZH)
// - Smooth slide-in hamburger drawer on mobile with all links + Get Started CTA
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Globe, Menu, X, Check, ArrowRight } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useI18n, LANGS, LangCode } from "@/i18n";

export function Navbar() {
  const [location] = useLocation();
  const { lang, setLang, t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const LINKS = [
    { label: t("nav.checker"), href: "/checker" },
    { label: t("nav.portfolio"), href: "/portfolio" },
    { label: t("nav.pricing"), href: "/pricing" },
    { label: t("nav.redeem"), href: "/redeem" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setLangOpen(false);
  }, [location]);

  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const pickLang = (code: LangCode) => {
    setLang(code);
    setLangOpen(false);
  };

  return (
    <>
      <nav className={cn("aw-nav-root", scrolled && "scrolled")}>
        <div className="container">
          <div className="aw-nav-inner">
            <Link href="/" className="aw-nav-brand aw-nav-brand-link">
              <Logo />
            </Link>

            <div className="aw-nav-links hidden md:flex">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn("aw-nav-link", isActive(l.href) && "active")}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative hidden md:block">
                <button
                  className="aw-iconbtn"
                  aria-label={t("nav.language")}
                  onClick={() => setLangOpen((o) => !o)}
                >
                  <Globe />
                </button>
                {langOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setLangOpen(false)}
                    />
                    <div
                      className="absolute right-0 top-full mt-2 min-w-[220px] rounded-xl border p-1.5 aw-fade-in z-50"
                      style={{
                        background: "#111",
                        borderColor: "#1a1a1a",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                      }}
                    >
                      {LANGS.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => pickLang(l.code)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[13px] text-[color:var(--fg-secondary)] hover:bg-[#151515] hover:text-white transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-base leading-none">
                              {l.flag}
                            </span>
                            <span>{l.native}</span>
                          </span>
                          {lang === l.code && (
                            <Check className="w-3.5 h-3.5 text-[color:var(--accent)]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <Link href="/redeem" className="aw-btn aw-btn-ghost aw-btn-sm hidden md:inline-flex">
                {t("nav.signin")}
              </Link>
              <Link href="/checker" className="aw-btn aw-btn-primary aw-btn-sm hidden md:inline-flex">
                {t("nav.get_started")}
              </Link>

              <button
                className="aw-iconbtn md:hidden"
                onClick={() => setDrawerOpen(true)}
                aria-label={t("nav.open_menu")}
              >
                <Menu />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {drawerOpen && (
        <div
          className="aw-drawer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawerOpen(false);
          }}
        >
          <div className="aw-drawer-panel">
            <div className="aw-drawer-head">
              <Logo />
              <button
                className="aw-iconbtn"
                onClick={() => setDrawerOpen(false)}
                aria-label={t("nav.close_menu")}
              >
                <X />
              </button>
            </div>

            <nav className="flex flex-col">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "aw-drawer-link",
                    isActive(l.href) && "text-white"
                  )}
                  onClick={() => setDrawerOpen(false)}
                >
                  {l.label}
                  <ArrowRight className="w-4 h-4 opacity-50" />
                </Link>
              ))}
            </nav>

            <div className="mt-6">
              <div
                className="text-[10.5px] uppercase tracking-[0.16em] font-medium mb-3"
                style={{ color: "var(--fg-tertiary)" }}
              >
                {t("nav.language")}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => pickLang(l.code)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left text-[13px] transition-all",
                      lang === l.code
                        ? "border-[color:var(--accent)] bg-[rgba(29,158,117,0.08)] text-white"
                        : "border-[#1a1a1a] text-[color:var(--fg-secondary)] hover:text-white hover:border-[#2a2a2a]"
                    )}
                  >
                    <span className="mr-1.5">{l.flag}</span>
                    {l.native}
                  </button>
                ))}
              </div>
            </div>

            <div className="aw-drawer-footer">
              <Link
                href="/checker"
                onClick={() => setDrawerOpen(false)}
                className="aw-btn aw-btn-primary aw-btn-lg w-full"
              >
                {t("nav.get_started")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/redeem"
                onClick={() => setDrawerOpen(false)}
                className="aw-btn aw-btn-secondary aw-btn-lg w-full"
              >
                {t("nav.signin")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
