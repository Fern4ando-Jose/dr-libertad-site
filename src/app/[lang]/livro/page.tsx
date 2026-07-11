import { redirect } from "next/navigation";

// Rota antiga /[lang]/livro → nova biblioteca /[lang]/livros/<slug>.
export default async function LivroRedirect({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/livros/100-plantas`);
}
