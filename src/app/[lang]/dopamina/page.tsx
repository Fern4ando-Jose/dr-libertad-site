import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DopaminaFunnel from "@/components/dopamina/DopaminaFunnel";
import { dopaminaContent } from "@/components/dopamina/dopamina.content";
import type { Lang } from "@/lib/i18n/dictionaries";

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
  const c = dopaminaContent[l];
  const brand = l === "es" ? "Dr. Libertad" : "Dr. Liberdade";

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/${l}/dopamina`,
      languages: {
        "pt-BR": `${SITE_URL}/pt/dopamina`,
        "es-ES": `${SITE_URL}/es/dopamina`,
        "x-default": `${SITE_URL}/pt/dopamina`,
      },
    },
    openGraph: {
      type: "website",
      siteName: brand,
      title: c.metaTitle,
      description: c.metaDescription,
      url: `${SITE_URL}/${l}/dopamina`,
      locale: l === "es" ? "es_ES" : "pt_BR",
    },
    twitter: {
      card: "summary_large_image",
      title: c.metaTitle,
      description: c.metaDescription,
    },
  };
}

export default async function DopaminaPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (lang !== "pt" && lang !== "es") notFound();
  return <DopaminaFunnel lang={lang} />;
}
