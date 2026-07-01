// Invariante do CTA do Reel por idioma — codifica o bug C3 (auditoria 2026-06-30):
// as strings "Siga" / "→ Mais no link da bio" estavam HARDCODED em português nos
// três componentes de vídeo (Reel/ReelV2/ReelClassic) → a conta ESPANHOLA
// (@dr.liberdad) publicava Reel com o CTA em português. Agora o texto vem de
// accountFor(lang) (fonte única), então este teste trava a divergência de idioma.
import { describe, it, expect } from "vitest";
import { ACCOUNTS, accountFor } from "./accounts";

describe("accounts — CTA do Reel no idioma da conta (bug C3)", () => {
  it("ES usa espanhol no CTA", () => {
    expect(accountFor("es").ctaFollow).toBe("Sigue");
    expect(accountFor("es").ctaBio).toContain("link de la bio");
  });

  it("PT usa português no CTA", () => {
    expect(accountFor("pt").ctaFollow).toBe("Siga");
    expect(accountFor("pt").ctaBio).toContain("link da bio");
  });

  it("ES NUNCA carrega o texto do português (a mescla que o C3 causava)", () => {
    const es = accountFor("es");
    expect(es.ctaFollow).not.toBe("Siga");
    expect(es.ctaBio).not.toContain("Mais no link"); // string PT não pode vazar no ES
  });

  it("toda conta tem ctaFollow e ctaBio preenchidos (não vira default errado)", () => {
    for (const acc of Object.values(ACCOUNTS)) {
      expect(acc.ctaFollow.trim().length).toBeGreaterThan(0);
      expect(acc.ctaBio.trim().length).toBeGreaterThan(0);
    }
  });
});
