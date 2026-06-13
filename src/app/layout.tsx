import type { Metadata } from "next";
import "./globals.css";
import { Inter, Fraunces } from "next/font/google";
import Spotlight from "@/components/Spotlight";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import GsapOrchestrator from "@/components/GsapOrchestrator";
import JsonLd from "@/components/JsonLd";
import { Analytics } from "@vercel/analytics/react";

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

const SITE_URL = "https://www.drlibertad.com";
const TITLE = "Dr. Libertad — Estúdio editorial de psicologia, atenção e liberdade mental";
const DESCRIPTION =
  "Estúdio editorial sobre desintoxicação digital, ansiedade moderna e inteligência emocional. Filosofia aplicada à atenção e ao comportamento. / Estudio editorial sobre psicología, atención y libertad mental.";

// Metadados globais. Título/descrição/canonical são sobrescritos por idioma
// em app/[lang]/layout.tsx (generateMetadata).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Dr. Libertad",
  },
  description: DESCRIPTION,
  applicationName: "Dr. Libertad",
  keywords: [
    "Dr. Libertad",
    "desintoxicación digital",
    "desintoxicação digital",
    "psicología",
    "ansiedad moderna",
    "inteligencia emocional",
    "libertad mental",
    "dopamina",
    "atención",
  ],
  authors: [{ name: "Dr. Libertad" }],
  creator: "Dr. Libertad",
  publisher: "Dr. Libertad",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  // Verificação do Google Search Console: defina GOOGLE_SITE_VERIFICATION no
  // ambiente (Vercel) com o código que o Search Console fornecer.
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.svg" }],
  },
  category: "psychology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
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
