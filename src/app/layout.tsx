import type { Metadata } from "next";
import "./globals.css";
import { Inter, Fraunces } from "next/font/google";
import Spotlight from "@/components/Spotlight";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import StudioNav from "@/components/StudioNav";
import GsapOrchestrator from "@/components/GsapOrchestrator";

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

export const metadata: Metadata = {
  title: "DR. LIBERTAD",
  description: "Dopamine detox. Psychology. Self-awareness.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable} dark`} suppressHydrationWarning>
      <body className="bg-ink text-offwhite antialiased">
        <Spotlight />
        <SmoothScroll />
        <ScrollProgress />
        <StudioNav />
        <GsapOrchestrator />
        {children}
      </body>
    </html>
  );
}

