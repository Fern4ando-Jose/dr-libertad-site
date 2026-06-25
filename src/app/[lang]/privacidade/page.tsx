import type { Metadata } from "next";
import PrivacyView from "@/components/PrivacyView";
import { dictionaries, type Lang } from "@/lib/i18n/dictionaries";

const SITE_URL = "https://www.drlibertad.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = lang === "es" ? "es" : "pt";
  const p = dictionaries[l].privacy;
  const brand = l === "es" ? "Dr. Libertad" : "Dr. Liberdade";

  return {
    title: p.title,
    description: p.intro,
    alternates: {
      canonical: `${SITE_URL}/${l}/privacidade`,
      languages: {
        "pt-BR": `${SITE_URL}/pt/privacidade`,
        "es-ES": `${SITE_URL}/es/privacidade`,
        "x-default": `${SITE_URL}/pt/privacidade`,
      },
    },
    openGraph: {
      type: "article",
      siteName: brand,
      title: p.title,
      description: p.intro,
      url: `${SITE_URL}/${l}/privacidade`,
      locale: l === "es" ? "es_ES" : "pt_BR",
    },
  };
}

export default function PrivacidadePage() {
  return <PrivacyView />;
}
