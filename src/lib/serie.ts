// ─── A SÉRIE BATIZADA E A ASSINATURA FIXA ─────────────────────────────────────
// POR QUE EXISTE (2026-08-11): dos 8 perfis medidos ao vivo, TODOS têm duas coisas que
// aqui faltavam — um NOME de série (não só um número) e um SINAL fixo que se repete
// peça após peça.
//
// A prova de cada uma:
//   · SÉRIE — @gatosronay batizou a dela de "GAMBIGATO": o EP 01 fez 1,9 milhão, e os
//     seguintes 833 mil · 263 mil · 208 mil · 170 mil. Nós tínhamos "Nº 244": número sem
//     nome não vira coleção, porque não há o que lembrar.
//   · ASSINATURA — @gutogalamba abre TODA legenda com 🔴 (2,9 mi de views, 13 mil
//     comentários); @arthurpaek põe 🎶 no título (13,2 mi). É a prova de que dá para ser
//     reconhecível SEM APARECER — que é a trava do dono.
//
// ⚠️ NADA AQUI FOI INVENTADO NESTA SESSÃO. O nome da série é a bandeira que o dono já
// escolheu em 2026-07-14 entre três finalistas, e o emoji é o que já está na bio das duas
// contas desde a mesma data. Fonte-dona: `.claude/marca/dr-libertad/CONCEITO-BANDEIRA.md`
// — que aliás manda exatamente isto: *"CAPA numerada: a bandeira como símbolo + o Nº XXX
// como âncora de coleção"*, um item que estava ⏳ pendente lá desde julho.

export type LangSerie = "br" | "es";

const norm = (lang: string): LangSerie => (lang === "es" ? "es" : "br");

/** O nome da série, em caixa alta, para o cabeçalho da peça. */
export const NOME_SERIE: Record<LangSerie, string> = {
  br: "GAIOLA SEM GRADE",
  es: "JAULA SIN REJAS",
};

/**
 * A assinatura fixa: o cadeado que já abre a 3ª linha da bio das duas contas
 * (`🔒 O que os outros calam` / `🔒 Lo que otros callan`). Mesmo sinal na bio e na
 * legenda = a conta é reconhecida antes de ser lida.
 */
export const ASSINATURA = "🔒";

/** O cabeçalho de coleção da peça: «GAIOLA SEM GRADE · Nº 244». Sem número → só o nome. */
export function selo(lang: string, ed?: string | number | null): string {
  const nome = NOME_SERIE[norm(lang)];
  const n = ed == null ? "" : String(ed).trim();
  return n && n !== "0" ? `${nome} · Nº ${n}` : nome;
}

/**
 * Põe a assinatura na ABERTURA da legenda.
 *
 * As mesmas três regras do CTA de rodapé (`caption-cta.ts`), pelo mesmo motivo — nenhuma
 * peça pode deixar de sair por causa de um enfeite:
 *   · IDEMPOTENTE — legenda que já começa com o sinal não ganha outro (re-tentativa do
 *     watchdog não duplica);
 *   · FAIL-OPEN — legenda vazia volta como veio (não se inventa legenda);
 *   · LIMITE DO IG — se o sinal estourasse o teto de 2.200 caracteres, a legenda sai sem ele.
 */
export function assinarLegenda(caption: string | null | undefined, max = 2200): string {
  const base = (caption ?? "").trimStart();
  if (!base.trim()) return caption ?? "";
  if (base.startsWith(ASSINATURA)) return base;
  const assinada = `${ASSINATURA} ${base}`;
  return assinada.length <= max ? assinada : base;
}
