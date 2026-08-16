import type { Metadata } from "next";
import LivrosIndexView from "./LivrosIndexView";
import { VISIBLE_BOOKS } from "@/lib/books";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { abs, alternatesPrefixed, brandFor, ogLocaleFor, toLang } from "@/lib/seo";

// Sem este generateMetadata a vitrine herdava o `alternates.canonical` do layout
// de idioma — ou seja, declarava ao Google "esta página é uma cópia de /br" e
// nunca podia rankear. Também herdava o título e a descrição da home.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const l = toLang((await params).lang);
  const idx = dictionaries[l].livrosIndex;
  const brand = brandFor(l);

  const title = idx.metaTitle ?? (l === "es" ? "Libros" : "Livros");
  const description = idx.metaDescription ?? idx.lead;

  return {
    title,
    description,
    alternates: alternatesPrefixed(l, "/livros"),
    openGraph: {
      type: "website",
      siteName: brand,
      title: `${title} · ${brand}`,
      description,
      url: abs(`/${l}/livros`),
      locale: ogLocaleFor(l),
    },
  };
}

export default async function LivrosPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const l = toLang((await params).lang);
  const t = dictionaries[l];

  // ItemList: diz ao Google que isto é uma coleção e QUAIS são os itens, com o
  // endereço de cada um. É o que permite a vitrine aparecer com os livros
  // listados em vez de como uma página solta.
  const itemList = {
    "@type": "ItemList",
    name: t.livrosIndex.title,
    itemListElement: VISIBLE_BOOKS.map((book, i) => {
      const b = t[book.dictKey];
      return {
        "@type": "ListItem",
        position: i + 1,
        url: abs(`/${l}/livros/${book.slug}`),
        name: `${b.title} ${b.titleAccent}`.trim(),
      };
    }),
  };

  // Trilha: troca a URL crua por "drlibertad.com › Livros" no resultado.
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: l === "es" ? "Inicio" : "Início",
        item: abs(`/${l}`),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: l === "es" ? "Libros" : "Livros",
        item: abs(`/${l}/livros`),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [itemList, breadcrumb],
          }),
        }}
      />
      <LivrosIndexView />
    </>
  );
}
