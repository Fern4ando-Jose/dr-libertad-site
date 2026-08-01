import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BOOKS, getBook } from "@/lib/books";
import { dictionaries, type Lang } from "@/lib/i18n/dictionaries";
import { SITE_URL, abs, toLang } from "@/lib/seo";
import BookSales from "./BookSales";

// Pré-renderiza uma página por livro (combina com /pt e /es do segmento pai).
export function generateStaticParams() {
  return BOOKS.map((b) => ({ slug: b.slug }));
}

// OG por LIVRO: sem generateMetadata, a página herdava o og:image genérico do
// layout (o slide "Dr. Libertad") — então colar o link do livro numa DM mostrava
// a capa errada. Aqui cada livro serve a SUA capa como og:image/twitter:image, com
// título/descrição do próprio livro. Genérico: vale para qualquer item de BOOKS.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const book = getBook(slug);
  if (!book) return {};

  const l: Lang = lang === "es" ? "es" : "br";
  const brand = l === "es" ? "Dr. Libertad" : "Dr. Liberdade";
  const b = dictionaries[l][book.dictKey];

  const bookTitle = `${b.title} ${b.titleAccent}`.trim(); // ex.: "I Love Dopamina"
  const ogTitle = `${bookTitle} · ${brand}`;
  const description = b.subtitle;
  const cover = `${SITE_URL}${book.cover[l]}`; // absoluto (scraper de DM baixa direto)
  const url = `${SITE_URL}/${l}/livros/${book.slug}`;

  return {
    title: bookTitle, // o template do layout aplica "· <brand>"
    description,
    alternates: {
      canonical: url,
      languages: {
        "pt-BR": `${SITE_URL}/br/livros/${book.slug}`,
        "es-ES": `${SITE_URL}/es/livros/${book.slug}`,
        "x-default": `${SITE_URL}/br/livros/${book.slug}`,
      },
    },
    openGraph: {
      type: "website",
      siteName: brand,
      title: ogTitle,
      description,
      url,
      locale: l === "es" ? "es_ES" : "pt_BR",
      // Medida vinda do registro do livro: estava fixa em 1024x1536 e o guia de
      // plantas é 1024x1638 — o scraper reservava o espaço errado.
      images: [
        { url: cover, width: book.coverSize.width, height: book.coverSize.height, alt: bookTitle },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [cover],
    },
  };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const book = getBook(slug);
  if (!book) notFound();

  const l = toLang(lang);
  const b = dictionaries[l][book.dictKey];
  const bookTitle = `${b.title} ${b.titleAccent}`.trim();
  const url = abs(`/${l}/livros/${book.slug}`);
  const price = book.price[l];

  // Book + Offer: é o que permite o livro aparecer com preço e disponibilidade
  // no resultado de busca, em vez de como um link solto. `author` aponta para a
  // Person declarada no JSON-LD global (components/JsonLd.tsx).
  const bookLd = {
    "@type": "Book",
    "@id": `${url}#book`,
    name: bookTitle,
    description: b.subtitle,
    url,
    image: abs(book.cover[l]),
    bookFormat: "https://schema.org/EBook",
    inLanguage: l === "es" ? "es-ES" : "pt-BR",
    author: { "@id": abs("/#author") },
    publisher: { "@id": abs("/#organization") },
    offers: {
      "@type": "Offer",
      price: price.amount,
      priceCurrency: price.currency,
      availability: "https://schema.org/InStock",
      url: book.free ? url : (book.checkout?.[l] ?? url),
    },
  };

  // Trilha: diz ao Google onde a página mora. É o que troca a URL crua por
  // "drlibertad.com › livros › I Love Dopamina" no resultado.
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
      { "@type": "ListItem", position: 3, name: bookTitle, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [bookLd, breadcrumb],
          }),
        }}
      />
      <BookSales slug={slug} />
    </>
  );
}
