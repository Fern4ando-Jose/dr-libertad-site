// ─── Geração de ilustração por IA (fal.ai / Flux) ────────────────────────────
// Gera UMA ilustração figurativa por post (usada na capa). Estilo editorial de
// marca + subject por tema (ver TOPIC_SUBJECT em /api/publish). Em qualquer
// falha retorna null → o /api/og cai no motivo abstrato (nunca quebra o post).
// Direção de arte: memória `art-direction-ia`.

const FAL_KEY = process.env.FAL_KEY;
// Flux dev = boa qualidade/custo; trocável por env (ex.: fal-ai/flux/schnell p/ mais barato)
const FAL_MODEL = process.env.FAL_MODEL || "fal-ai/flux/dev";

// Acento por categoria — espelha CATS de /api/og (cor) + nome p/ o prompt.
const ACCENTS: Record<string, { word: string; hex: string }> = {
  freedom:  { word: "oxblood wine red",  hex: "#A45A5A" },
  dopamine: { word: "burnt amber ochre", hex: "#BE7A2A" },
  anxiety:  { word: "deep teal",         hex: "#3D6360" },
  network:  { word: "slate blue",        hex: "#3F5E78" },
  self:     { word: "dusty mauve",       hex: "#835A6E" },
  mind:     { word: "olive green",       hex: "#5B6B3C" },
};

// Bloco de estilo de marca (fixo) + slot de subject por tema.
// Direção: cinematográfico/escultural editorial (escolha do usuário, 2026-06-13).
function buildPrompt(subject: string, accentWord: string, accentHex: string): string {
  return [
    `Cinematic conceptual editorial illustration: ${subject}.`,
    `Dramatic chiaroscuro lighting, sculptural and atmospheric, fine film grain and subtle texture.`,
    `Restricted, desaturated palette: warm off-white paper tone (#F4F0E8) and deep ink black (#0B0B0C), with a single muted accent of ${accentWord} (${accentHex}).`,
    `One bold central metaphor, generous negative space, sober and refined like a literary-magazine cover.`,
    `No text, no letters, no words, no logo, no watermark. No neon, no purple gradient, no corporate clip-art, no busy clutter.`,
  ].join(" ");
}

// Retorna a URL pública da ilustração (validada) ou null em qualquer falha.
export async function generateIllustration(subject: string, cat: string): Promise<string | null> {
  if (!FAL_KEY || !subject) return null;
  const accent = ACCENTS[cat] ?? ACCENTS.freedom;
  const prompt = buildPrompt(subject, accent.word, accent.hex);
  try {
    const res = await fetch(`https://fal.run/${FAL_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        image_size: { width: 1024, height: 1280 }, // 4:5 — og faz cover-fit p/ 1080×1350
        num_images: 1,
        enable_safety_checker: true,
      }),
    });
    if (!res.ok) {
      console.error("[fal] HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    const url: string | undefined = data?.images?.[0]?.url;
    if (!url) {
      console.error("[fal] resposta sem images[0].url");
      return null;
    }
    // Valida alcançabilidade antes de usar — evita 500 do /api/og por imagem morta.
    const check = await fetch(url, { method: "GET" }).catch(() => null);
    if (!check || !check.ok) {
      console.error("[fal] url gerada não responde:", url);
      return null;
    }
    return url;
  } catch (e) {
    console.error("[fal] erro na geração:", e);
    return null;
  }
}
