import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RootShell from "@/components/RootShell";
import StudioNav from "@/components/StudioNav";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { LANGS, type Lang } from "@/lib/i18n/dictionaries";
import { baseMetadata } from "@/lib/metadata-base";
import { abs, alternatesPrefixed, brandFor, htmlLangFor, ogLocaleFor, toLang } from "@/lib/seo";

// Textos de SEO por idioma — servidos no HTML conforme a rota (/br ou /es),
// para que cada versão seja indexada no seu próprio idioma.
//
// `title` é curto de propósito: o Google corta o resultado em torno de 60
// caracteres, e o título antigo (74) tinha a palavra-chave justamente na parte
// que sumia. O texto longo continua vivo em `ogTitle`, onde não há corte.
const SEO: Record<Lang, { title: string; ogTitle: string; description: string }> = {
  br: {
    title: "Dr. Liberdade — Atenção, dopamina e desintoxicação digital",
    ogTitle: "Dr. Liberdade — Estúdio editorial de psicologia, atenção e liberdade mental",
    description:
      "Estúdio editorial sobre desintoxicação digital, ansiedade moderna e inteligência emocional. Filosofia aplicada à atenção e ao comportamento.",
  },
  es: {
    title: "Dr. Libertad — Atención, dopamina y desintoxicación digital",
    ogTitle: "Dr. Libertad — Estudio editorial de psicología, atención y libertad mental",
    description:
      "Estudio editorial sobre desintoxicación digital, ansiedad moderna e inteligencia emocional. Filosofía aplicada a la atención y al comportamiento.",
  },
};

// Pré-renderiza as duas rotas de idioma como estáticas.
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const l = toLang((await params).lang);
  const seo = SEO[l];
  const brand = brandFor(l);

  return {
    ...baseMetadata,
    title: {
      default: seo.title,
      template: `%s · ${brand}`,
    },
    description: seo.description,
    alternates: alternatesPrefixed(l),
    openGraph: {
      type: "website",
      siteName: brand,
      title: seo.ogTitle,
      description: seo.description,
      url: abs(`/${l}`),
      locale: ogLocaleFor(l),
      alternateLocale: l === "es" ? ["pt_BR"] : ["es_ES"],
      // A imagem vem do arquivo opengraph-image.tsx deste segmento (1200x630).
    },
    twitter: {
      card: "summary_large_image",
      title: seo.ogTitle,
      description: seo.description,
    },
    // `icons` SUBSTITUI o do baseMetadata em vez de somar — por isso os PNG
    // vêm repetidos aqui. Sem eles, as rotas de idioma (que são o site inteiro)
    // ficariam só com o SVG, que parte dos agregadores não desenha.
    icons: {
      icon: [
        { url: `/icon-${l}.svg`, type: "image/svg+xml" },
        { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
        { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
    },
  };
}

// Este é um ROOT LAYOUT: renderiza <html>/<body> via RootShell, com o lang do
// idioma da rota. Ver components/RootShell.tsx para o porquê de haver mais de um.
export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  if (lang !== "br" && lang !== "es") notFound();

  return (
    <RootShell lang={htmlLangFor(lang)}>
      <LanguageProvider lang={lang}>
        <StudioNav />
        {children}
      </LanguageProvider>
    </RootShell>
  );
}
