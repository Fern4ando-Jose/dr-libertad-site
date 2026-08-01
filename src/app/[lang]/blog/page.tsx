import type { Metadata } from "next";
import Link from "next/link";
import StudioContainer from "@/components/ui/Container";
import { listArticles, readingMinutes } from "@/lib/blog";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { abs, alternatesPrefixed, brandFor, ogLocaleFor, toLang, type SeoLang } from "@/lib/seo";

// Revalida de hora em hora: a automação publica ao longo do dia e o índice se
// atualiza sozinho, sem precisar de deploy.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const l = toLang((await params).lang);
  const c = dictionaries[l].blog;

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: alternatesPrefixed(l, "/blog"),
    openGraph: {
      type: "website",
      siteName: brandFor(l),
      title: c.metaTitle,
      description: c.metaDescription,
      url: abs(`/${l}/blog`),
      locale: ogLocaleFor(l),
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

/**
 * O arquivo de artigos.
 *
 * Esta página é a porta de entrada do rastreador: é daqui que o Google chega a
 * cada texto. Por isso ela é renderizada NO SERVIDOR — a grade da home, que
 * mostra o mesmo material, busca os posts no navegador depois que a página
 * abre, e nada do que ela mostra existe no HTML que o rastreador lê.
 */
export default async function BlogIndex({ params }: { params: Promise<{ lang: string }> }) {
  const l = toLang((await params).lang);
  const c = dictionaries[l].blog;
  const articles = await listArticles(l);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: l === "es" ? "Inicio" : "Início", item: abs(`/${l}`) },
      { "@type": "ListItem", position: 2, name: c.metaTitle, item: abs(`/${l}/blog`) },
    ],
  };

  return (
    <main className="relative z-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(900px circle at 20% 0%, rgba(45,90,61,0.16), transparent 55%), radial-gradient(700px circle at 85% 8%, rgba(164,90,90,0.16), transparent 52%)",
          }}
        />
        <StudioContainer>
          <div className="relative pt-32 pb-10 md:pt-36">
            <div className="text-xs tracking-[0.26em] text-warm-gray/80 uppercase">{c.eyebrow}</div>
            <h1 className="mt-5 max-w-[18ch] font-serif text-[clamp(2.3rem,5vw,4.4rem)] leading-[0.98] tracking-[-0.04em] text-pretty">
              {c.title}
            </h1>
            <p className="mt-6 max-w-2xl text-[1.02rem] leading-[1.8] text-warm-gray/90">{c.lead}</p>
            <div className="mt-7 h-[1px] w-28 bg-gradient-to-r from-muted-red/70 via-warm-gray/25 to-transparent" />
          </div>
        </StudioContainer>
      </section>

      <section className="pb-24">
        <StudioContainer>
          {articles.length === 0 ? (
            <p className="max-w-xl text-[1.02rem] leading-[1.8] text-warm-gray/75">{c.empty}</p>
          ) : (
            <ul className="divide-y divide-warm-gray/12 border-t border-warm-gray/12">
              {articles.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/${l}/blog/${article.slug}`}
                    className="group grid gap-3 py-8 transition-colors md:grid-cols-12 md:items-baseline md:gap-8"
                  >
                    <div className="text-[11px] tracking-[0.2em] text-warm-gray/60 uppercase md:col-span-3">
                      <time dateTime={article.publishedAt ?? undefined}>
                        {formatDate(article.publishedAt, l)}
                      </time>
                      <span className="mx-2 text-warm-gray/30">·</span>
                      {readingMinutes(article.body)} {c.readingTime}
                    </div>
                    <div className="md:col-span-9">
                      <h2 className="font-serif text-[clamp(1.4rem,2.6vw,2rem)] leading-[1.12] tracking-[-0.02em] text-offwhite transition-colors group-hover:text-white">
                        {article.title}
                      </h2>
                      <p className="mt-3 max-w-2xl text-[0.98rem] leading-[1.7] text-warm-gray/85">
                        {article.excerpt}
                      </p>
                      {article.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {article.tags.slice(0, 4).map((tag) => (
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
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </StudioContainer>
      </section>
    </main>
  );
}
