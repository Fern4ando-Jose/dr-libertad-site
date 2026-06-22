import type { Metadata } from "next";
import AuthorView from "@/components/AuthorView";
import { dictionaries, type Lang } from "@/lib/i18n/dictionaries";

const SITE_URL = "https://www.drlibertad.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = lang === "es" ? "es" : "pt";
  const a = dictionaries[l].author;
  const brand = l === "es" ? "Dr. Libertad" : "Dr. Liberdade";

  return {
    title: "Autor",
    description: a.lead,
    alternates: {
      canonical: `${SITE_URL}/${l}/autor`,
      languages: {
        "pt-BR": `${SITE_URL}/pt/autor`,
        "es-ES": `${SITE_URL}/es/autor`,
        "x-default": `${SITE_URL}/pt/autor`,
      },
    },
    openGraph: {
      type: "profile",
      siteName: brand,
      title: a.title,
      description: a.lead,
      url: `${SITE_URL}/${l}/autor`,
      locale: l === "es" ? "es_ES" : "pt_BR",
    },
  };
}

export default function AutorPage() {
  return <AuthorView />;
}
