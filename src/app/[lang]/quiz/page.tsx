import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QuizExperience from "@/components/quiz/QuizExperience";
import { quizContent } from "@/components/quiz/quiz.content";
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
  const c = quizContent[l];
  const brand = l === "es" ? "Dr. Libertad" : "Dr. Liberdade";

  return {
    title: c.metaTitle,
    description: c.subtitle,
    alternates: {
      canonical: `${SITE_URL}/${l}/quiz`,
      languages: {
        "pt-BR": `${SITE_URL}/pt/quiz`,
        "es-ES": `${SITE_URL}/es/quiz`,
        "x-default": `${SITE_URL}/pt/quiz`,
      },
    },
    openGraph: {
      type: "website",
      siteName: brand,
      title: c.metaTitle,
      description: c.subtitle,
      url: `${SITE_URL}/${l}/quiz`,
      locale: l === "es" ? "es_ES" : "pt_BR",
    },
    twitter: {
      card: "summary_large_image",
      title: c.metaTitle,
      description: c.subtitle,
    },
  };
}

export default async function QuizPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (lang !== "pt" && lang !== "es") notFound();
  return <QuizExperience lang={lang} />;
}
