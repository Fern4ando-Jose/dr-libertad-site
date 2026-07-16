"use client";

import { useEffect } from "react";

// O <html lang> do root é estático (pt-BR) e esta rota é a única em inglês do
// site — sem isto um leitor de tela pronunciaria a página inglesa com fonética
// portuguesa. Mesmo recurso que o LanguageProvider usa para /es.
export default function HtmlLangEn() {
  useEffect(() => {
    document.documentElement.lang = "en";
  }, []);
  return null;
}
