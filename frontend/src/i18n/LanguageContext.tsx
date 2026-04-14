"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translationId, translationEn, translationJa } from "./locales";

// Support dynamic typing depending on locale map size, but generic access
export type LangCode = "id" | "en" | "ja";

interface LanguageContextType {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  // Function to get deeply nested keys e.g. t("login.welcome")
  t: (keyPath: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("id");

  // Persist language preference
  useEffect(() => {
    const saved = localStorage.getItem("lpk_lang") as LangCode;
    if (saved && ["id", "en", "ja"].includes(saved)) {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: LangCode) => {
    setLangState(newLang);
    localStorage.setItem("lpk_lang", newLang);
  };

  const translations = {
    id: translationId,
    en: translationEn,
    ja: translationJa,
  };

  const t = (keyStr: string): string => {
    const keys = keyStr.split(".");
    let current: any = translations[lang];
    
    for (const key of keys) {
      if (current === undefined || current[key] === undefined) {
        // Fallback to Indonesian if key missing in EN/JA
        let fallback: any = translationId;
        for (const fbKey of keys) {
            if (fallback === undefined || fallback[fbKey] === undefined) {
                return keyStr; // Return raw key if completely missing
            }
            fallback = fallback[fbKey];
        }
        return fallback as string;
      }
      current = current[key];
    }
    return current as string;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
