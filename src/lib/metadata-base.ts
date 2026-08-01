import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Metadados que valem para o site inteiro, independentemente do idioma da rota.
 *
 * Vive fora de um layout porque o site tem mais de um root layout (ver
 * components/RootShell.tsx): cada um faz spread disto e acrescenta o que é seu
 * — título, descrição, canonical e hreflang do idioma daquele grupo de rotas.
 */
export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Dr. Libertad",
  authors: [{ name: "Dr. Libertad" }],
  creator: "Dr. Libertad",
  publisher: "Dr. Libertad",
  // Sem `keywords`: o Google ignora essa meta desde 2009 e o Bing a trata como
  // sinal de spam. O que define o assunto da página é o conteúdo e o JSON-LD.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Verificação do Google Search Console: defina GOOGLE_SITE_VERIFICATION no
  // ambiente (Vercel) com o código que o Search Console fornecer.
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      // PNG como alternativa: leitores de feed, agregadores e alguns
      // rastreadores não desenham favicon em SVG e ficariam sem ícone.
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  category: "psychology",
};
