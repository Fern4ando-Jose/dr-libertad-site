import type { Metadata } from "next";
import "./globals.css";
import { Inter, Fraunces } from "next/font/google";
import Spotlight from "@/components/Spotlight";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import StudioNav from "@/components/StudioNav";
import GsapOrchestrator from "@/components/GsapOrchestrator";
import JsonLd from "@/components/JsonLd";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
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
  alternates: {
    canonical: SITE_URL,
    languages: {
      "pt-BR": SITE_URL,
      "es-ES": SITE_URL,
    },
  },
  openGraph: {
    type: "website",
    siteName: "Dr. Libertad",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "es_ES",
    alternateLocale: ["pt_BR"],
    images: [
      {
        url: "/api/og?slide=cover&slot=manha&title=Dr.%20Libertad&kw=LIBERTAD&ed=00&mood=red&tag=psicolog%C3%ADa",
        width: 1080,
        height: 1080,
        alt: "Dr. Libertad",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      "/api/og?slide=cover&slot=manha&title=Dr.%20Libertad&kw=LIBERTAD&ed=00&mood=red&tag=psicolog%C3%ADa",
    ],
  },
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
    <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable} dark`} suppressHydrationWarning>
      <body className="bg-ink text-offwhite antialiased">
        <JsonLd />
        <LanguageProvider>
          <Spotlight />
          <SmoothScroll />
          <ScrollProgress />
          <StudioNav />
          <GsapOrchestrator />
          {children}
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
