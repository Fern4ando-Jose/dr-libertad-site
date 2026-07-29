import type { Metadata } from "next";
import TermsView from "@/components/TermsView";
import { dictionaries, type Lang } from "@/lib/i18n/dictionaries";

const SITE_URL = "https://www.drlibertad.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = lang === "es" ? "es" : "br";
  const p = dictionaries[l].terms;
  const brand = l === "es" ? "Dr. Libertad" : "Dr. Liberdade";

  return {
    title: p.title,
    description: p.intro,
    alternates: {
      canonical: `${SITE_URL}/${l}/termos`,
      languages: {
        "pt-BR": `${SITE_URL}/br/termos`,
        "es-ES": `${SITE_URL}/es/termos`,
        "x-default": `${SITE_URL}/br/termos`,
      },
    },
    openGraph: {
      type: "article",
      siteName: brand,
      title: p.title,
      description: p.intro,
      url: `${SITE_URL}/${l}/termos`,
      locale: l === "es" ? "es_ES" : "pt_BR",
    },
  };
}

export default function TermosPage() {
  return <TermsView />;
}
