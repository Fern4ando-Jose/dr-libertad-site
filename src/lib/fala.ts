// ─── O TEXTO COMO ELE É FALADO (≠ como ele é ESCRITO) ────────────────────────
// POR QUE EXISTE (2026-08-11): o dono ouviu o Reel e disse — *"a palavra (20 min) corta a
// palavra e fica estranho, não existe 20 min falado"*. Estava certo: a peça mandava ao
// motor de voz exatamente o texto que aparece na tela, e "scrolla 20 min" foi lido como
// está escrito. Na tela "20 min" é bom (curto, cabe, lê-se rápido); na boca, ninguém diz
// isso — diz "vinte minutos".
//
// Regra que fica: **tela e boca são dois textos diferentes.** A tela continua recebendo o
// texto original; só o que vai ao motor de voz passa por aqui.
//
// O que NÃO se mexe, de propósito:
//   · números de 4 dígitos (ano: "2026" seria lido "dois mil e vinte e seis" e a peça fala
//     de anos com frequência — o leitor de voz já lê ano corretamente);
//   · valores acima de 999 (a expansão viraria uma frase inteira dentro da frase);
//   · siglas e nomes próprios (Netflix, TikTok) — não são abreviação, são marca.
//
// ⚠️ Efeito colateral conhecido e ACEITO: ao expandir, a contagem de palavras do bloco
// falado deixa de bater com a do texto da tela naquela cena. O `reelPlanV2` já trata isso
// — quando as contagens divergem, aquela cena usa a revelação de ritmo fixo em vez do
// ritmo da voz. Degradação prevista, silenciosa e segura; o oposto (voz lendo "min") não é.

export type LangFala = "br" | "es";

const norm = (lang: string): LangFala => (lang === "es" ? "es" : "br");

// ── Números por extenso, 0–999, nas duas línguas ─────────────────────────────
const UNI = {
  br: ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"],
  es: ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"],
};
const DEZ_A_DEZENOVE = {
  br: ["dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"],
  es: ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"],
};
const DEZENAS = {
  br: ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"],
  es: ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"],
};
const CENTENAS = {
  br: ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"],
  es: ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"],
};

/** 0–999 por extenso. Fora da faixa devolve o próprio número (não se inventa leitura). */
export function porExtenso(n: number, lang: string): string {
  const L = norm(lang);
  if (!Number.isInteger(n) || n < 0 || n > 999) return String(n);
  if (n < 10) return UNI[L][n];
  if (n < 20) return DEZ_A_DEZENOVE[L][n - 10];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (!u) return DEZENAS[L][d];
    // ES: 21–29 são palavra única ("veintiuno"); do 31 em diante, "treinta y uno".
    if (L === "es" && d === 2) return `veinti${UNI.es[u]}`;
    return `${DEZENAS[L][d]} ${L === "es" ? "y" : "e"} ${UNI[L][u]}`;
  }
  if (n === 100) return L === "es" ? "cien" : "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const cent = CENTENAS[L][c];
  return r ? `${cent} ${L === "es" ? "" : "e "}${porExtenso(r, lang)}`.replace(/\s+/g, " ") : cent;
}

/**
 * Abreviações que a voz não deve soletrar. A chave casa como PALAVRA INTEIRA — "min" só
 * vira "minutos" quando está solto, nunca dentro de "mínimo" ou "administração".
 * O plural segue o número que vem antes (1 minuto × 2 minutos).
 */
const UNIDADES: Record<LangFala, Record<string, [string, string]>> = {
  br: {
    min: ["minuto", "minutos"],
    mins: ["minuto", "minutos"],
    h: ["hora", "horas"],
    hs: ["hora", "horas"],
    hrs: ["hora", "horas"],
    seg: ["segundo", "segundos"],
    segs: ["segundo", "segundos"],
    km: ["quilômetro", "quilômetros"],
    kg: ["quilo", "quilos"],
  },
  es: {
    min: ["minuto", "minutos"],
    mins: ["minuto", "minutos"],
    h: ["hora", "horas"],
    hs: ["hora", "horas"],
    hrs: ["hora", "horas"],
    seg: ["segundo", "segundos"],
    segs: ["segundo", "segundos"],
    km: ["kilómetro", "kilómetros"],
    kg: ["kilo", "kilos"],
  },
};

/**
 * O texto pronto para ser FALADO. Não toca no texto da tela — quem chama é só o motor de voz.
 */
export function paraFalar(texto: string, lang: string): string {
  const L = norm(lang);
  let t = String(texto ?? "");
  if (!t.trim()) return t;

  // 1) NÚMERO + UNIDADE ABREVIADA: "20 min" → "vinte minutos" (o plural segue o número).
  const chaves = Object.keys(UNIDADES[L]).sort((a, b) => b.length - a.length).join("|");
  t = t.replace(new RegExp(`\\b(\\d{1,3})\\s*(${chaves})\\b\\.?`, "gi"), (todo, num, uni) => {
    const n = Number(num);
    const par = UNIDADES[L][String(uni).toLowerCase()];
    if (!par) return todo;
    return `${porExtenso(n, L)} ${n === 1 ? par[0] : par[1]}`;
  });

  // 2) PERCENTUAL: "3%" → "três por cento" / "tres por ciento".
  t = t.replace(/\b(\d{1,3})\s*%/g, (_m, num) => `${porExtenso(Number(num), L)} ${L === "es" ? "por ciento" : "por cento"}`);

  // 3) NÚMERO SOLTO de até 3 dígitos: "20" → "vinte". Anos e valores maiores ficam como
  //    estão (o motor de voz já lê ano bem, e expandir milhares vira frase dentro da frase).
  t = t.replace(/\b(\d{1,3})\b/g, (_m, num) => porExtenso(Number(num), L));

  return t.replace(/\s{2,}/g, " ").trim();
}
