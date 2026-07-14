import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Guia7Funnel from "@/components/guia7/Guia7Funnel";
import { guia7Content, type Lang } from "@/components/guia7/guia7.content";

const SITE_URL = "https://www.drlibertad.com";

export function generateStaticParams() {
  return [{ lang: "pt" }, { lang: "es" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = lang === "es" ? "es" : "pt";
  const c = guia7Content[l];
  const brand = l === "es" ? "Dr. Libertad" : "Dr. Liberdade";

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/${l}/guia-7-dias`,
      languages: {
        "pt-BR": `${SITE_URL}/pt/guia-7-dias`,
        "es-ES": `${SITE_URL}/es/guia-7-dias`,
        "x-default": `${SITE_URL}/pt/guia-7-dias`,
      },
    },
    openGraph: {
      type: "website",
      siteName: brand,
      title: c.metaTitle,
      description: c.metaDescription,
      url: `${SITE_URL}/${l}/guia-7-dias`,
      locale: l === "es" ? "es_ES" : "pt_BR",
    },
    twitter: {
      card: "summary_large_image",
      title: c.metaTitle,
      description: c.metaDescription,
    },
  };
}

export default async function Guia7Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (lang !== "pt" && lang !== "es") notFound();
  return <Guia7Funnel lang={lang} />;
}
