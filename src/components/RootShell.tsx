import { Inter, Fraunces } from "next/font/google";
import Spotlight from "@/components/Spotlight";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import GsapOrchestrator from "@/components/GsapOrchestrator";
import JsonLd from "@/components/JsonLd";
import { Analytics } from "@vercel/analytics/react";
import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

/**
 * O <html>/<body> do site, com a moldura visual comum (spotlight, rolagem
 * suave, barra de progresso, JSON-LD, analytics).
 *
 * Existe porque o site tem MAIS DE UM root layout: no App Router só o layout
 * raiz pode renderizar <html>, e o atributo lang precisa acompanhar o idioma da
 * rota. Com um root layout único, as páginas em espanhol saíam declaradas como
 * `lang="pt-BR"` — errado para leitor de tela, para o Bing e para o aviso de
 * tradução do navegador. Cada grupo de rotas tem o seu root layout e passa o
 * `lang` certo aqui.
 */
export default function RootShell({
  lang,
  children,
}: Readonly<{ lang: string; children: React.ReactNode }>) {
  return (
    <html
      lang={lang}
      className={`${inter.variable} ${fraunces.variable} dark`}
      suppressHydrationWarning
    >
      <body className="bg-ink text-offwhite antialiased">
        <JsonLd />
        <Spotlight />
        <SmoothScroll />
        <ScrollProgress />
        <GsapOrchestrator />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
