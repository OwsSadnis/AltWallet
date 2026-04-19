// App Shell: navbar on top + main content + footer.
import { PropsWithChildren, useEffect } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useLocation } from "wouter";
import { useI18n } from "@/i18n";

export function Shell({ children }: PropsWithChildren) {
  const [location] = useLocation();
  const { lang } = useI18n();

  // Scroll to top on route change OR language change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location, lang]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main
        className="flex-1 aw-fade-in"
        style={{ paddingTop: 64 }}
        key={`${location}-${lang}`}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
