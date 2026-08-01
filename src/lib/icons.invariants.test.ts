import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SEO_LANGS } from "@/lib/seo";

// O favicon do idioma padrão passou 3 dias apontando para um arquivo que não
// existia: o layout monta o caminho como `/icon-${lang}.svg`, o idioma "pt"
// virou "br" em 29/07/2026 e o arquivo `public/icon-pt.svg` não foi renomeado
// junto. Ninguém percebeu porque um 404 de favicon não quebra nada — só some.
//
// Este teste existe para que a próxima renomeação de idioma quebre o CI em vez
// de apagar o ícone do site em silêncio.

const PUBLIC = path.join(process.cwd(), "public");
const exists = (file: string) => existsSync(path.join(PUBLIC, file));

describe("arquivos de ícone", () => {
  it("cada idioma tem o seu SVG — é o que o layout pede em /icon-<lang>.svg", () => {
    for (const lang of SEO_LANGS) {
      expect(exists(`icon-${lang}.svg`), `falta public/icon-${lang}.svg`).toBe(true);
    }
  });

  it("os ícones declarados no metadata global existem", () => {
    for (const file of ["favicon.svg", "icon.svg", "icon-192.png", "icon-512.png", "apple-icon.png"]) {
      expect(exists(file), `falta public/${file}`).toBe(true);
    }
  });

  it("os ícones do manifest existem", () => {
    for (const file of ["icon-192.png", "icon-512.png", "icon.svg"]) {
      expect(exists(file), `falta public/${file}`).toBe(true);
    }
  });
});
