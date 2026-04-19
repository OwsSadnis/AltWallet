// App Shell: navbar on top + main content + footer.
import { PropsWithChildren, useEffect } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useLocation } from "wouter";

export function Shell({ children }: PropsWithChildren) {
  const [location] = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main
        className="flex-1 aw-fade-in"
        style={{ paddingTop: 64 }}
        key={location}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
