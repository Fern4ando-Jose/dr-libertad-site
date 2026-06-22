import { notFound } from "next/navigation";
import { BOOKS, getBook } from "@/lib/books";
import BookSales from "./BookSales";

// Pré-renderiza uma página por livro (combina com /pt e /es do segmento pai).
export function generateStaticParams() {
  return BOOKS.map((b) => ({ slug: b.slug }));
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
