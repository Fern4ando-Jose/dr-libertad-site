"use client";

import { createContext, useContext, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { dictionaries, pt, type Lang } from "./dictionaries";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: typeof pt;
};

const LanguageContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "dl-lang";

/**
 * O idioma é definido pela ROTA (/pt ou /es) e chega como prop a partir do
 * layout do servidor — assim o HTML já é servido no idioma certo (bom para SEO
 * e sem mismatch de hidratação). Trocar de idioma navega para a outra rota,
 * preservando a posição de scroll.
 */
export function LanguageProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // O <html lang> do root é estático (pt-BR); aqui sincronizamos com a rota
  // atual para que /es exponha lang="es-ES" no cliente.
  useEffect(() => {
    document.documentElement.lang = lang === "es" ? "es-ES" : "pt-BR";
  }, [lang]);

  const persist = useCallback((l: Lang) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
      // Cookie lido pelo middleware para respeitar a preferência ao entrar em "/".
      document.cookie = `${STORAGE_KEY}=${l}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = useCallback(
    (l: Lang) => {
      if (l === lang) return;
      persist(l);
      // Substitui só o segmento de idioma, mantendo o restante do caminho
      // (ex.: /pt/livros → /es/livros em vez de voltar à raiz /es).
      const newPath = pathname.replace(new RegExp(`^/${lang}`), `/${l}`);
      router.push(newPath, { scroll: false });
    },
    [lang, persist, router, pathname]
  );

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
