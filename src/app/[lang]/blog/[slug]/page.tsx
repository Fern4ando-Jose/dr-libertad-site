import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import StudioContainer from "@/components/ui/Container";
import { findBySlug, listArticles, readingMinutes, toBlocks, type Article } from "@/lib/blog";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { abs, brandFor, ogLocaleFor, toLang, type SeoLang } from "@/lib/seo";

export const revalidate = 3600;

type Params = { lang: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const l = toLang(lang);
  const article = await findBySlug(l, slug);
  if (!article) return { title: "404", robots: { index: false, follow: false } };

  const url = abs(`/${l}/blog/${article.slug}`);

  return {
    title: article.title,
    description: article.excerpt,
    // Só o canonical, SEM hreflang: as versões PT e ES de um texto são linhas
    // separadas no banco, sem nada que as ligue. Declarar uma como tradução da
    // outra seria um chute — e hreflang errado é pior que hreflang nenhum.
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: brandFor(l),
      title: article.title,
      description: article.excerpt,
      url,
      locale: ogLocaleFor(l),
      publishedTime: article.publishedAt ?? undefined,
      authors: [abs(`/${l}/autor`)],
      tags: article.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
    },
  };
}

function formatDate(iso: string | null, l: SeoLang): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(l === "es" ? "es-ES" : "pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Os três artigos mais recentes que não são este — link interno de saída. */
function related(all: Article[], current: Article): Article[] {
  return all.filter((a) => a.slug !== current.slug).slice(0, 3);
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { lang, slug } = await params;
  const l = toLang(lang);
  const article = await findBySlug(l, slug);
  if (!article) notFound();

  const c = dictionaries[l].blog;
  const url = abs(`/${l}/blog/${article.slug}`);
  const blocks = toBlocks(article.body, article.title);
  const all = await listArticles(l);
  const outros = related(all, article);

  // Article: é o que faz o Google entender que a página é um texto assinado, com
  // data e autor — e não uma página institucional qualquer. `author` aponta para
  // a Person declarada no JSON-LD global (components/JsonLd.tsx).
  const articleLd = {
    "@type": "Article",
    "@id": `${url}#article`,
    headline: article.title.slice(0, 110), // o Google descarta headline > 110
    description: article.excerpt,
    articleBody: article.body,
    inLanguage: l === "es" ? "es-ES" : "pt-BR",
    ...(article.publishedAt
      ? { datePublished: article.publishedAt, dateModified: article.publishedAt }
      : {}),
    author: { "@id": abs("/#author") },
    publisher: { "@id": abs("/#organization") },
    isPartOf: { "@id": abs("/#website") },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(article.tags.length > 0 ? { keywords: article.tags.join(", ") } : {}),
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: l === "es" ? "Inicio" : "Início", item: abs(`/${l}`) },
      { "@type": "ListItem", position: 2, name: c.metaTitle, item: abs(`/${l}/blog`) },
      { "@type": "ListItem", position: 3, name: article.title, item: url },
    ],
  };

  return (
    <main className="relative z-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [articleLd, breadcrumb],
          }),
        }}
      />

      <article>
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(900px circle at 18% 0%, rgba(45,90,61,0.18), transparent 55%), radial-gradient(700px circle at 88% 10%, rgba(164,90,90,0.18), transparent 52%)",
            }}
          />
          <StudioContainer>
            <div className="relative pt-32 pb-8 md:pt-36">
              <Link
                href={`/${l}/blog`}
                className="text-xs tracking-[0.2em] text-warm-gray/70 uppercase transition-colors hover:text-offwhite"
              >
                ← {c.backToIndex}
              </Link>
              <h1 className="mt-6 max-w-[20ch] font-serif text-[clamp(2.1rem,4.6vw,3.9rem)] leading-[1.02] tracking-[-0.035em] text-pretty">
                {article.title}
              </h1>
              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] tracking-[0.16em] text-warm-gray/65 uppercase">
                {article.publishedAt && (
                  <>
                    <time dateTime={article.publishedAt}>
                      {c.publishedOn} {formatDate(article.publishedAt, l)}
                    </time>
                    <span className="text-warm-gray/30">·</span>
                  </>
                )}
                <span>
                  {readingMinutes(article.body)} {c.readingTime}
                </span>
                <span className="text-warm-gray/30">·</span>
                <Link href={`/${l}/autor`} className="transition-colors hover:text-offwhite">
                  {brandFor(l)}
                </Link>
              </div>
              <div className="mt-7 h-[1px] w-28 bg-gradient-to-r from-muted-red/70 via-warm-gray/25 to-transparent" />
            </div>
          </StudioContainer>
        </section>

        <section className="pb-20">
          <StudioContainer>
            <div className="max-w-[68ch]">
              {blocks.map((block, i) => {
                if (block.type === "h") {
                  return (
                    <h2
                      key={i}
                      className="mt-12 font-serif text-[clamp(1.35rem,2.4vw,1.85rem)] leading-[1.18] tracking-[-0.02em] text-offwhite"
                    >
                      {block.text}
                    </h2>
                  );
                }
                if (block.type === "li") {
                  return (
                    <p
                      key={i}
                      className="mt-3 flex gap-3 text-[1.05rem] leading-[1.85] text-warm-gray/90"
                    >
                      <span aria-hidden="true" className="mt-[0.7em] h-[3px] w-3 shrink-0 bg-muted-red/70" />
                      <span>{block.text}</span>
                    </p>
                  );
                }
                return (
                  <p key={i} className="mt-6 text-[1.05rem] leading-[1.85] text-warm-gray/90">
                    {block.text}
                  </p>
                );
              })}

              {article.tags.length > 0 && (
                <div className="mt-12 flex flex-wrap gap-2 border-t border-warm-gray/12 pt-8">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-warm-gray/15 px-3 py-1 text-[10px] tracking-[0.16em] text-warm-gray/70 uppercase"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </StudioContainer>
        </section>
      </article>

      {outros.length > 0 && (
        <section className="border-t border-warm-gray/12 py-16">
          <StudioContainer>
            <div className="text-xs tracking-[0.26em] text-warm-gray/80 uppercase">
              {c.relatedTitle}
            </div>
            <ul className="mt-8 grid gap-8 md:grid-cols-3">
              {outros.map((other) => (
                <li key={other.slug}>
                  <Link href={`/${l}/blog/${other.slug}`} className="group block">
                    <h3 className="font-serif text-[1.2rem] leading-[1.2] text-offwhite transition-colors group-hover:text-white">
                      {other.title}
                    </h3>
                    <p className="mt-2 text-sm leading-[1.6] text-warm-gray/75">{other.excerpt}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </StudioContainer>
        </section>
      )}
    </main>
  );
}
