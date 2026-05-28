import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import en from "../locales/en";
import ar from "../locales/ar";
import { STORAGE_KEYS } from "../utils/constants";

const LOCALE_KEY = STORAGE_KEYS.LOCALE;
const translations = { en, ar };

function getInitialLocale() {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === "ar" || stored === "en") return stored;
  } catch {}
  return "en";
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(getInitialLocale);

  useEffect(() => {
    try { localStorage.setItem(LOCALE_KEY, locale); } catch {}
    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  }, [locale]);

  const setLocale = useCallback((l) => {
    if (l === "ar" || l === "en") setLocaleState(l);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState(prev => prev === "en" ? "ar" : "en");
  }, []);

  const t = useCallback((key, fallback) => {
    const dict = translations[locale] || en;
    return dict[key] ?? fallback ?? key;
  }, [locale]);

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ locale, setLocale, toggleLocale, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export default LanguageContext;

