import { permanentRedirect } from "next/navigation";

// Rota antiga /[lang]/livro → nova biblioteca /[lang]/livros/<slug>.
//
// `permanentRedirect` (308) e não `redirect` (307): a mudança de endereço é
// definitiva, e só o permanente faz o Google transferir para a página nova a
// autoridade que a antiga tenha acumulado. Com 307 ele mantém a velha no índice
// esperando ela voltar.
export default async function LivroRedirect({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  permanentRedirect(`/${lang}/livros/100-plantas`);
}
