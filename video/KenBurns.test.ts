// Invariantes da escolha de modo Ken Burns (2ª fonte de footage — foto animada).
// pickKenBurnsMode é DETERMINÍSTICO por seed (a própria URL hasheada, ver
// src/lib/footage-media.hashStr) — o mesmo clipe sempre se move do mesmo jeito,
// sem estado extra, e a distribuição cobre os 4 modos (não trava sempre no mesmo).
import { describe, it, expect } from "vitest";
import { pickKenBurnsMode, type KenBurnsMode } from "./KenBurns";
import { hashStr } from "../src/lib/footage-media";

describe("pickKenBurnsMode — determinístico, cobre os 4 modos", () => {
  it("o mesmo seed sempre devolve o mesmo modo", () => {
    expect(pickKenBurnsMode(42)).toBe(pickKenBurnsMode(42));
  });

  it("aceita seed 0 e negativo sem lançar (fail-safe de índice)", () => {
    expect(() => pickKenBurnsMode(0)).not.toThrow();
    expect(() => pickKenBurnsMode(-7)).not.toThrow();
  });

  it("os 4 modos aparecem ao varrer seeds sequenciais (sem viés pra 1 só)", () => {
    const modes = new Set<KenBurnsMode>();
    for (let i = 0; i < 40; i++) modes.add(pickKenBurnsMode(i));
    expect(modes.size).toBe(4);
  });

  it("um leque de URLs de clipe cobre mais de 1 modo via hashStr (mistura visual, não trava numa foto fixa)", () => {
    const urls = Array.from({ length: 16 }, (_, i) => `https://images.pexels.com/photos/${i}/a-${i}.jpeg`);
    const modes = new Set(urls.map((u) => pickKenBurnsMode(hashStr(u))));
    expect(modes.size).toBeGreaterThan(1); // não caem todas no mesmo modo
  });
});
