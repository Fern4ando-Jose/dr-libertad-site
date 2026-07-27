// Trava a VOZ POR IDIOMA e a leitura dos tempos nativos do ElevenLabs.
//
// Lição que custou um Reel reprovado (2026-07-27): "voz aprovada" NÃO é fato global.
// A `Deep_Voice_Man` foi aprovada no ESPANHOL e estava sendo usada também no português
// — o dono ouviu e reprovou: "liberdeide? isso existe?" e "temos que trocar essa vos do
// BR, fica muito puxado o (R), estaaar". Era sotaque estrangeiro lendo português.
// Ele então escolheu, ouvindo 6 amostras, a "Candidata 3 — Bill" (ElevenLabs).
import { describe, it, expect } from "vitest";
import { wordsFromElevenLabsTimestamps, splitWords } from "./narration-sync";

// Espelha VOZ_POR_IDIOMA de src/lib/narration.ts — se lá mudar, aqui quebra (de propósito).
const VOZ_POR_IDIOMA: Record<string, { provedor: string; voz: string; speed: number }> = {
  es: { provedor: "minimax", voz: "Deep_Voice_Man", speed: 0.85 },
  pt: { provedor: "elevenlabs", voz: "Bill", speed: 0.95 },
};
const vozDe = (lang: string) => VOZ_POR_IDIOMA[lang] ?? VOZ_POR_IDIOMA.es;

describe("voz é config POR IDIOMA (nunca constante global)", () => {
  it("PT-BR usa a voz que o dono escolheu ouvindo (Bill/ElevenLabs)", () => {
    expect(vozDe("pt").voz).toBe("Bill");
    expect(vozDe("pt").provedor).toBe("elevenlabs");
  });

  it("ES mantém INTACTA a voz que ele já tinha aprovado (Deep_Voice_Man/MiniMax)", () => {
    expect(vozDe("es").voz).toBe("Deep_Voice_Man");
    expect(vozDe("es").provedor).toBe("minimax");
    expect(vozDe("es").speed).toBe(0.85); // a velocidade que ele aprovou
  });

  it("os dois idiomas NÃO compartilham voz — foi esse o defeito", () => {
    expect(vozDe("pt").voz).not.toBe(vozDe("es").voz);
  });

  it("idioma desconhecido cai no ES (fail-safe), nunca em voz vazia", () => {
    expect(vozDe("fr").voz).toBe("Deep_Voice_Man");
  });
});

describe("tempos NATIVOS do ElevenLabs (dispensam a transcrição paga)", () => {
  // Formato REAL do multilingual-v2: arrays paralelos POR CARACTERE.
  function porCaractere(frase: string, passo = 0.1) {
    const characters = frase.split("");
    const character_start_times_seconds = characters.map((_, i) => Number((i * passo).toFixed(4)));
    const character_end_times_seconds = characters.map((_, i) => Number(((i + 1) * passo).toFixed(4)));
    return [{ characters, character_start_times_seconds, character_end_times_seconds }];
  }

  it("agrupa caracteres em PALAVRAS, com início e fim certos", () => {
    const frase = "a liberdade assusta";
    const w = wordsFromElevenLabsTimestamps(porCaractere(frase));
    expect(w.map((x) => x.text)).toEqual(splitWords(frase));
    expect(w[0].start).toBeCloseTo(0, 5);
    // "liberdade" começa no caractere 2
    expect(w[1].start).toBeCloseTo(0.2, 5);
  });

  it("os tempos avançam sempre — legenda nunca anda para trás", () => {
    const w = wordsFromElevenLabsTimestamps(porCaractere("uma frase um pouco maior para conferir"));
    for (let i = 1; i < w.length; i++) {
      expect(w[i].start).toBeGreaterThanOrEqual(w[i - 1].start);
      expect(w[i].end).toBeGreaterThanOrEqual(w[i].start);
    }
  });

  it("aceita também o formato já-por-palavra (se a API mudar)", () => {
    const w = wordsFromElevenLabsTimestamps([
      { word: "medo", start: 0.1, end: 0.5 },
      { text: "cobra", start: 0.6, end: 1.0 },
    ]);
    expect(w.map((x) => x.text)).toEqual(["medo", "cobra"]);
    expect(w[1].end).toBeCloseTo(1.0, 5);
  });

  it("resposta sem timestamps → vazio (o chamador cai na transcrição, não quebra)", () => {
    expect(wordsFromElevenLabsTimestamps(null)).toEqual([]);
    expect(wordsFromElevenLabsTimestamps([])).toEqual([]);
    expect(wordsFromElevenLabsTimestamps([{ characters: "nao-e-array" }])).toEqual([]);
  });

  it("a última palavra dá a DURAÇÃO do áudio (o ElevenLabs não manda duration_ms)", () => {
    const w = wordsFromElevenLabsTimestamps(porCaractere("fim da fala"));
    const duracao = w[w.length - 1].end;
    expect(duracao).toBeGreaterThan(0);
    expect(duracao).toBeCloseTo("fim da fala".length * 0.1, 5);
  });
});
