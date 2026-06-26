// ─── De-dup na ORIGEM: o 1º slide não pode REPETIR o título ───────────────────
// A geração (haiku) às vezes faz `slides[0] === postTitle` → no Reel a CAPA e o
// insight 1 mostram a MESMA frase (~8s repetidos = sangria de retenção); no CARROSSEL
// a capa e o slide 1 repetem. O ReelV2 já descarta no render, mas a CAUSA é a copy —
// consertar aqui conserta os DOIS formatos. Função PURA → testável por invariante.

export function normalizePhrase(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira acentos
    .replace(/[^a-z0-9 ]/g, " ") // só letras/dígitos
    .replace(/\s+/g, " ")
    .trim();
}

/** True se ALGUM slide repete o título (normalizado: ignora acento/pontuação/caixa). */
export function titleDupedInSlides(title: string, slides: string[] | undefined): boolean {
  const t = normalizePhrase(title);
  if (!t) return false;
  return (slides ?? []).some((s) => normalizePhrase(s) === t);
}
