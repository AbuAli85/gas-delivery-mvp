import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { LangCode, translations, isRTL } from "@/lib/i18n";

interface LanguageContextValue {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: string, fallback?: string) => string;
  dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => {
    try {
      const saved = localStorage.getItem("owaseel_lang") as LangCode | null;
      if (saved && (saved === "ar" || saved === "en")) return saved;
    } catch {}
    return "ar";
  });

  const setLang = useCallback((newLang: LangCode) => {
    setLangState(newLang);
    try {
      localStorage.setItem("owaseel_lang", newLang);
    } catch {}
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      return translations[lang]?.[key] ?? translations.ar[key] ?? fallback ?? key;
    },
    [lang]
  );

  const dir = isRTL(lang) ? "rtl" : "ltr";

  // Update document direction
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
