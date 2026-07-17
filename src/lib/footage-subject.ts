// ─── Sujeito da imagem × sujeito da frase ────────────────────────────────────
// Regra de curadoria (aprovada 2026-07-17): **o sujeito da imagem tem que ser o
// sujeito da frase**. Defeito que originou (ed. 164, @dr.liberdade.br): o tema
// "La conversación entre hombres que está en extinción" (pilar `self`) saiu com um
// Reel cujo fundo mostrava uma MULHER sozinha à janela — a copy fala só de homens.
// Raiz: `selectFootage` recebia SÓ a categoria do pilar e sorteava da whitelist
// inteira; o pilar `self` tem 3 clipes de mulher em 12 → ~84% de chance de aparecer
// mulher em QUALQUER tema de `self`, inclusive os masculinos. O campo `subject` dos
// THEMES é metáfora simbólica p/ a ilustração da fal e nunca chegava aqui.
//
// Este módulo é PURO (sem I/O, testável): só diz se um clipe PODE aparecer num tema.
//
// FAIL-OPEN em todas as bordas — tema sem `who`, clipe sem `who` ou valor
// desconhecido = comportamento IDÊNTICO ao de antes do filtro (aceita tudo). Assim
// os ~110 temas não classificados e qualquer clipe novo sem `who` seguem publicando
// como sempre; o filtro só APERTA onde alguém afirmou o sujeito de propósito.
import type { FootageClip } from "@/lib/footage-library";

// Sujeito declarado pelo TEMA (THEMES em src/app/api/publish/route.ts).
// "any" = explícito "tanto faz"; ausente = não classificado (mesmo efeito).
export type ThemeWho = "man" | "woman" | "both" | "any";

type ClipWho = NonNullable<FootageClip["who"]>;

// Quem cada tema aceita. "none" (silhueta/objeto/pessoa não identificável) e "group"
// (multidão anônima) servem a QUALQUER sujeito — são o colchão que impede o filtro de
// secar a whitelist. O que se rejeita é só o gênero ERRADO no quadro:
//  · tema de homem  → nada de mulher sozinha nem de casal (cena de casal ≠ conversa entre homens)
//  · tema de mulher → nada de homem sozinho nem de casal
//  · tema dos dois  → nada de homem sozinho nem de mulher sozinha (a cena é o casal)
const ACCEPTED: Record<Exclude<ThemeWho, "any">, ReadonlySet<ClipWho>> = {
  man: new Set<ClipWho>(["man", "none", "group"]),
  woman: new Set<ClipWho>(["woman", "none", "group"]),
  both: new Set<ClipWho>(["couple", "none", "group"]),
};

export function clipMatchesTheme(clipWho: FootageClip["who"], themeWho?: ThemeWho): boolean {
  if (!themeWho || themeWho === "any") return true; // tema não classificado → como hoje
  if (!clipWho) return true;                        // clipe não classificado → como hoje
  const accepted = ACCEPTED[themeWho];
  if (!accepted) return true;                       // valor de tema desconhecido → fail-open
  return accepted.has(clipWho);
}

// ─── O MESMO casamento, para material de BUSCA AO VIVO ───────────────────────
// 2026-07-17: a busca ao vivo entrou no caminho NORMAL (FOOTAGE_LIVE_SLOTS, ver
// selectFootage) e trouxe uma diferença que NÃO pode ser varrida pra baixo do tapete:
//
//   whitelist  → clipe sem `who` = **curado por gente** e ainda não classificado
//                → fail-OPEN (aceita) está certo: alguém já olhou aquele clipe.
//   ao vivo    → clipe sem `who` = **ninguém sabe o que tem no quadro**
//                → fail-OPEN seria reabrir o defeito da ed. 164 pela porta dos fundos
//                  (tema `man` recebendo mulher da busca).
//
// Por isso o material ao vivo é fail-CLOSED no sujeito: sujeito desconhecido em tema COM
// sujeito declarado → o clipe NÃO entra. Isso nunca deixa o Reel sem fundo — quem chama
// completa as cenas com a whitelist (fail-open no RESULTADO, fail-closed no sujeito).
// Tema sem `who` (a maioria) não tem o que casar → aceita tudo, como sempre.
export function liveClipMatchesTheme(clipWho: FootageClip["who"] | undefined, themeWho?: ThemeWho): boolean {
  if (!themeWho || themeWho === "any") return true; // tema sem sujeito declarado → sem restrição
  if (!ACCEPTED[themeWho]) return true;             // valor de tema desconhecido → fail-open (como clipMatchesTheme)
  if (!clipWho) return false;                       // ← a diferença: desconhecido ao vivo NÃO passa
  return clipMatchesTheme(clipWho, themeWho);
}

// Filtra a whitelist do pilar pelo sujeito do tema. NÃO completa a lista com clipe
// incompatível quando sobra pouco: melhor repetir um clipe neutro (ou cair no
// fallback de busca ao vivo do selectFootage) que mostrar o gênero errado — foi
// exatamente o gênero errado que gerou o defeito.
export function filterClipsByTheme<T extends { who?: FootageClip["who"] }>(
  clips: readonly T[] | undefined | null,
  themeWho?: ThemeWho,
): T[] {
  if (!Array.isArray(clips)) return [];
  if (!themeWho || themeWho === "any") return clips.slice();
  return clips.filter((c) => clipMatchesTheme(c?.who, themeWho));
}
