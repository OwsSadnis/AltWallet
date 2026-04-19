// i18n system — context-driven, persisted in localStorage.
// RTL is applied automatically on <html> when Arabic is active.
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { en } from "./en";
import { id } from "./id";
import { ar } from "./ar";
import { zh } from "./zh";

export const LANG_CODES = ["EN", "ID", "AR", "ZH"] as const;
export type LangCode = (typeof LANG_CODES)[number];

export interface LangDef {
  code: LangCode;
  label: string;
  native: string;
  flag: string;
  dir: "ltr" | "rtl";
}

export const LANGS: LangDef[] = [
  { code: "EN", label: "English", native: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "ID", label: "Bahasa Indonesia", native: "Bahasa Indonesia", flag: "🇮🇩", dir: "ltr" },
  { code: "AR", label: "Arabic", native: "العربية", flag: "🇸🇦", dir: "rtl" },
  { code: "ZH", label: "Simplified Chinese", native: "简体中文", flag: "🇨🇳", dir: "ltr" },
];

const DICTS: Record<LangCode, Record<string, string>> = { EN: en, ID: id, AR: ar, ZH: zh };

interface I18nCtx {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
}

const Ctx = createContext<I18nCtx | null>(null);

const STORAGE_KEY = "altwallet.lang";

export function I18nProvider({ children }: PropsWithChildren) {
  const [lang, setLangState] = useState<LangCode>(() => {
    if (typeof window === "undefined") return "EN";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && (LANG_CODES as readonly string[]).includes(saved)) return saved as LangCode;
    // auto-detect from browser
    const nav = navigator.language?.toUpperCase() || "";
    if (nav.startsWith("ID")) return "ID";
    if (nav.startsWith("AR")) return "AR";
    if (nav.startsWith("ZH")) return "ZH";
    return "EN";
  });

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const def = LANGS.find((l) => l.code === lang) || LANGS[0];

  // Apply <html> lang + dir for RTL support
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("lang", lang.toLowerCase());
    html.setAttribute("dir", def.dir);
  }, [lang, def.dir]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const dict = DICTS[lang] || DICTS.EN;
      let raw = dict[key];
      if (!raw) raw = DICTS.EN[key] || key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          raw = raw.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }
      return raw;
    },
    [lang]
  );

  const value = useMemo<I18nCtx>(
    () => ({ lang, setLang, t, dir: def.dir }),
    [lang, setLang, t, def.dir]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
