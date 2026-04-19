// Lightweight client-side session — used to gate /portfolio and demonstrate
// plan-based feature access. Real production auth would replace this with
// the user-management feature (web-db-user upgrade).

import { useEffect, useState } from "react";

export type Plan = "free" | "pro" | "business";

export interface Session {
  email: string;
  plan: Plan;
}

const STORAGE_KEY = "aw.session.v1";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.email || !parsed.plan) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(s: Session): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("aw:session"));
}

export function clearSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("aw:session"));
}

export function useSession(): {
  session: Session | null;
  signIn: (s: Session) => void;
  signOut: () => void;
} {
  const [session, set] = useState<Session | null>(() => getSession());

  useEffect(() => {
    const handle = () => set(getSession());
    window.addEventListener("aw:session", handle);
    window.addEventListener("storage", handle);
    return () => {
      window.removeEventListener("aw:session", handle);
      window.removeEventListener("storage", handle);
    };
  }, []);

  return {
    session,
    signIn: (s) => setSession(s),
    signOut: () => clearSession(),
  };
}

export function isPaidPlan(plan: Plan | null | undefined): boolean {
  return plan === "pro" || plan === "business";
}
