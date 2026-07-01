// Invariante do detector de DADOS FABRICADOS (item 3, conteúdo 07-01). Posts citavam
// "89% según la Universidad de Boston", anos, "1 de cada 3" — estatística inventada
// numa marca de psicologia. O detector BLOQUEIA a ATRIBUIÇÃO DE AUTORIDADE, mas
// PRESERVA a voz: número de comportamento como gancho ("144 veces") é PERMITIDO.
import { describe, it, expect } from "vitest";
import { scanForFabricatedStats, scanContentForFabricatedStats } from "./stats-guard";

describe("scanForFabricatedStats — dispara em autoridade fabricada", () => {
  it("porcentagem dispara", () => {
    expect(scanForFabricatedStats("el 89% se siente solo").length).toBeGreaterThan(0);
  });

  it("ano/data concreta dispara", () => {
    expect(scanForFabricatedStats("en 2024 todo cambió").length).toBeGreaterThan(0);
  });

  it("'X de cada Y' dispara (ES e PT)", () => {
    expect(scanForFabricatedStats("1 de cada 3 personas").length).toBeGreaterThan(0);
    expect(scanForFabricatedStats("uno de cada cinco").length).toBe(0); // "cinco" não é dígito → não casa (aceitável)
    expect(scanForFabricatedStats("um a cada 4 jovens").length).toBeGreaterThan(0);
  });

  it("instituição nomeada dispara", () => {
    expect(scanForFabricatedStats("según la Universidad de Boston").length).toBeGreaterThan(0);
    expect(scanForFabricatedStats("un informe de Pew Research").length).toBeGreaterThan(0);
  });

  it("atribuição a estudo dispara", () => {
    expect(scanForFabricatedStats("los estudios dicen que sí").length).toBeGreaterThan(0);
    expect(scanForFabricatedStats("os estudos mostram isso").length).toBeGreaterThan(0);
  });
});

describe("scanForFabricatedStats — NÃO dispara na voz legítima (gancho de comportamento)", () => {
  it("número de comportamento como gancho é PERMITIDO", () => {
    expect(scanForFabricatedStats("revisas el móvil 144 veces al día")).toEqual([]);
    expect(scanForFabricatedStats("pasas 3 horas mirando la pantalla")).toEqual([]);
  });

  it("frase crua sem dado não dispara", () => {
    expect(scanForFabricatedStats("no necesitas ser amado: necesitas respeto")).toEqual([]);
  });

  it("a palavra 'estudo' SOLTA (sem atribuição) não dispara", () => {
    expect(scanForFabricatedStats("dedica tiempo al estudio de ti mismo")).toEqual([]);
  });
});

describe("scanContentForFabricatedStats — varre os campos do feed", () => {
  it("acha o dado no slide e reporta o campo", () => {
    const hits = scanContentForFabricatedStats({
      postTitle: "La soledad duele",
      slides: ["te sientes solo", "el 67% no lo admite"],
      cta: "¿te pasa?",
      instagramCaption: "leyenda limpia",
    });
    expect(hits.length).toBe(1);
    expect(hits[0].field).toBe("slide2");
  });

  it("conteúdo 100% limpo → sem hits", () => {
    const hits = scanContentForFabricatedStats({
      postTitle: "El amor que no resiste el aburrimiento",
      slides: ["buscas emoción, no vínculo", "el vínculo se construye"],
      cta: "¿a quién etiquetas?",
      instagramCaption: "sin datos inventados",
    });
    expect(hits).toEqual([]);
  });
});
