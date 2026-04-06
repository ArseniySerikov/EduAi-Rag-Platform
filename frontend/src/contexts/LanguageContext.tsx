import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { uk, en, type MessageKey } from "../locales/messages";

export type Lang = "uk" | "en";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey) => string;
  dateLocale: string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "eduai_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const s = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (s === "uk" || s === "en") return s;
    return "uk";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang === "uk" ? "uk" : "en";
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    (key: MessageKey) => (lang === "uk" ? uk[key] : en[key]),
    [lang]
  );

  const dateLocale = lang === "uk" ? "uk-UA" : "en-US";

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dateLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
