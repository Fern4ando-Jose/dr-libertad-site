import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BOOKS, getBook } from "@/lib/books";
import { dictionaries, type Lang } from "@/lib/i18n/dictionaries";
import BookSales from "./BookSales";

const SITE_URL = "https://www.drlibertad.com";

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

  const l: Lang = lang === "es" ? "es" : "pt";
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
        "pt-BR": `${SITE_URL}/pt/livros/${book.slug}`,
        "es-ES": `${SITE_URL}/es/livros/${book.slug}`,
        "x-default": `${SITE_URL}/pt/livros/${book.slug}`,
      },
    },
    openGraph: {
      type: "website",
      siteName: brand,
      title: ogTitle,
      description,
      url,
      locale: l === "es" ? "es_ES" : "pt_BR",
      images: [{ url: cover, width: 1024, height: 1536, alt: bookTitle }],
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
  const { slug } = await params;
  if (!getBook(slug)) notFound();
  return <BookSales slug={slug} />;
}
