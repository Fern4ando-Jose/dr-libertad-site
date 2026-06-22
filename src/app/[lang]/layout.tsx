import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StudioNav from "@/components/StudioNav";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { LANGS, type Lang } from "@/lib/i18n/dictionaries";

const SITE_URL = "https://www.drlibertad.com";

// Textos de SEO por idioma — servidos no HTML conforme a rota (/pt ou /es),
// para que cada versão seja indexada no seu próprio idioma.
const SEO: Record<Lang, { title: string; description: string; ogLocale: string }> = {
  pt: {
    title: "Dr. Liberdade — Estúdio editorial de psicologia, atenção e liberdade mental",
    description:
      "Estúdio editorial sobre desintoxicação digital, ansiedade moderna e inteligência emocional. Filosofia aplicada à atenção e ao comportamento.",
    ogLocale: "pt_BR",
  },
  es: {
    title: "Dr. Libertad — Estudio editorial de psicología, atención y libertad mental",
    description:
      "Estudio editorial sobre psicología, atención y libertad mental: desintoxicación digital, ansiedad moderna e inteligencia emocional. Filosofía aplicada a la atención y al comportamiento.",
    ogLocale: "es_ES",
  },
};

const OG_IMAGE =
  "/api/og?slide=cover&slot=manha&title=Dr.%20Libertad&kw=LIBERTAD&ed=00&mood=red&tag=psicolog%C3%ADa";

// Pré-renderiza as duas rotas de idioma como estáticas.
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = lang === "es" ? "es" : "pt";
  const seo = SEO[l];
  // Nome da marca por idioma: PT-BR usa "Dr. Liberdade"; ES usa "Dr. Libertad".
  const brand = l === "es" ? "Dr. Libertad" : "Dr. Liberdade";

  return {
    title: {
      default: seo.title,
      template: `%s · ${brand}`,
    },
    description: seo.description,
    alternates: {
      canonical: `${SITE_URL}/${l}`,
      languages: {
        "pt-BR": `${SITE_URL}/pt`,
        "es-ES": `${SITE_URL}/es`,
        "x-default": `${SITE_URL}/pt`,
      },
    },
    openGraph: {
      type: "website",
      siteName: brand,
      title: seo.title,
      description: seo.description,
      url: `${SITE_URL}/${l}`,
      locale: seo.ogLocale,
      alternateLocale: l === "es" ? ["pt_BR"] : ["es_ES"],
      images: [{ url: OG_IMAGE, width: 1080, height: 1080, alt: "Dr. Libertad" }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [OG_IMAGE],
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  if (lang !== "pt" && lang !== "es") notFound();

  return (
    <LanguageProvider lang={lang}>
      <StudioNav />
      {children}
    </LanguageProvider>
  );
}
