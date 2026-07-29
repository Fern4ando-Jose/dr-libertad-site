import type { Metadata } from "next";
import CreditsView from "@/components/CreditsView";
import { type Lang } from "@/lib/i18n/dictionaries";

const SITE_URL = "https://www.drlibertad.com";

const COPY = {
  br: {
    title: "Créditos da música",
    intro:
      "Crédito das trilhas instrumentais usadas nos vídeos publicados nas nossas contas, conforme exigem as licenças das faixas.",
  },
  es: {
    title: "Créditos de la música",
    intro:
      "Crédito de las pistas instrumentales usadas en los vídeos publicados en nuestras cuentas, conforme exigen las licencias de las pistas.",
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = lang === "es" ? "es" : "br";
  const c = COPY[l];
  const brand = l === "es" ? "Dr. Libertad" : "Dr. Liberdade";

  return {
    title: c.title,
    description: c.intro,
    alternates: {
      canonical: `${SITE_URL}/${l}/creditos`,
      languages: {
        "pt-BR": `${SITE_URL}/br/creditos`,
        "es-ES": `${SITE_URL}/es/creditos`,
        "x-default": `${SITE_URL}/br/creditos`,
      },
    },
    openGraph: {
      type: "article",
      siteName: brand,
      title: c.title,
      description: c.intro,
      url: `${SITE_URL}/${l}/creditos`,
      locale: l === "es" ? "es_ES" : "pt_BR",
    },
  };
}

export default function CreditosPage() {
  return <CreditsView />;
}
