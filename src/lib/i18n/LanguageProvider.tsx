"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { dictionaries, pt, type Lang } from "./dictionaries";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: typeof pt;
};

const LanguageContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "dl-lang";

function detectInitial(): Lang {
  if (typeof window === "undefined") return "pt";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "pt" || saved === "es") return saved;
  const nav = (window.navigator.language || "").toLowerCase();
  return nav.startsWith("es") ? "es" : "pt";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Começa em "pt" no servidor; ajusta no cliente após montar (evita mismatch de hidratação).
  const [lang, setLangState] = useState<Lang>("pt");

  useEffect(() => {
    const initial = detectInitial();
    setLangState(initial);
    document.documentElement.lang = initial === "es" ? "es" : "pt-BR";
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = l === "es" ? "es" : "pt-BR";
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === "pt" ? "es" : "pt");
  }, [lang, setLang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t: dictionaries[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang deve ser usado dentro de LanguageProvider");
  return ctx;
}
