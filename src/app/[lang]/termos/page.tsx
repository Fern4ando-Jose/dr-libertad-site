import type { Metadata } from "next";
import TermsView from "@/components/terms/TermsView";
import { termsContent, TERMS_PATH } from "@/components/terms/terms.content";

const SITE_URL = "https://www.drlibertad.com";

const HREFLANG = {
  "pt-BR": `${SITE_URL}${TERMS_PATH.pt}`,
  "es-ES": `${SITE_URL}${TERMS_PATH.es}`,
  "en-US": `${SITE_URL}${TERMS_PATH.en}`,
  "x-default": `${SITE_URL}${TERMS_PATH.pt}`,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "es" ? "es" : "pt";
  const c = termsContent[l];
  const brand = l === "es" ? "Dr. Libertad" : "Dr. Liberdade";

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: {
      canonical: `${SITE_URL}${TERMS_PATH[l]}`,
      languages: HREFLANG,
    },
    openGraph: {
      type: "article",
      siteName: brand,
      title: c.metaTitle,
      description: c.metaDescription,
      url: `${SITE_URL}${TERMS_PATH[l]}`,
      locale: c.ogLocale,
    },
  };
}

export default async function TermosPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return <TermsView copy={termsContent[lang === "es" ? "es" : "pt"]} />;
}
