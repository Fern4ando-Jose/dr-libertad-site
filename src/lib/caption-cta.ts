// ─── CTA da pesquisa no RODAPÉ da legenda dos posts automáticos ──────────────
// Aprovado pelo dono (2026-07-11, prova §5 do plano da pesquisa): todo post
// automático (carrossel E reel, ES e PT) ganha no FIM da legenda o convite para
// a pesquisa "Redes Sociais e Relacionamentos" (link na bio → /pesquisa | /investigacion).
//
// REGRAS DURAS (não relaxar):
// - APPEND-ONLY: age só na montagem FINAL da legenda, nos pontos de publicação
//   (publishCarousel em /api/publish e publishReel em /api/publish-reel). NÃO
//   toca em generateContent, temas, rotação nem no que vai pro banco.
// - FAIL-OPEN: legenda vazia → devolve como veio (não inventa legenda); legenda
//   que estouraria o limite do IG com o CTA → devolve SEM o CTA (post sai
//   intacto; o CTA é bônus, nunca causa de falha). Erro qualquer → legenda original.
// - IDEMPOTENTE: legenda que já contém o CTA não ganha outro (re-tentativas do
//   watchdog/catchup não duplicam).
// - IDIOMA DA CONTA: o texto é PT na conta PT e ES na ES — não introduz palavra
//   do outro idioma (compatível com o lang-guard, que roda ANTES, na geração).

/** Limite de legenda do IG (erro 36004 "Caption Too Long" acima disso). */
export const IG_CAPTION_MAX = 2200;

export const SURVEY_CTA: Record<"br" | "es", string> = {
  br: "— Participe da pesquisa: as redes estão destruindo os relacionamentos? 3 min, anônima. Link na bio.",
  es: "— Participa de la investigación: ¿las redes están destruyendo las relaciones? 3 min, anónima. Link en la bio.",
};

/**
 * Anexa o CTA da pesquisa ao fim da legenda, se couber no limite do IG.
 * Pura e defensiva — coberta por caption-cta.invariants.test.ts.
 */
export function appendSurveyCta(caption: string | null | undefined, lang: string): string {
  const base = (caption ?? "").trimEnd();
  if (!base) return caption ?? ""; // sem legenda → não inventa (fail-open)

  const cta = lang === "br" ? SURVEY_CTA.br : SURVEY_CTA.es;
  if (base.includes(cta)) return base; // idempotente (retry não duplica)

  const withCta = `${base}\n\n${cta}`;
  // Estouraria o limite do IG → publica SEM o CTA (o post nunca falha por causa dele).
  return withCta.length <= IG_CAPTION_MAX ? withCta : base;
}
