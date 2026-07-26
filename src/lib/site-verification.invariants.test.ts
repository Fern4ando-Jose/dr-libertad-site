// Invariante — o signature file de verificação de domínio é servido BYTE A BYTE.
// O painel (TikTok e afins) compara o arquivo inteiro contra o código que emitiu:
// um espaço, um \n a mais ou um nome de arquivo torto reprovam a verificação — e
// sem verificação o app não salva, o OAuth não sai. As regras vivem em
// scripts/site-verification.cjs (a MESMA implementação que o next.config.js usa
// em tempo de build). Este teste barra o merge se elas afrouxarem.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { isValidFilename, verificationBody, verificationRewrites } = require(
  "../../scripts/site-verification.cjs"
) as {
  isValidFilename: (name: unknown) => boolean;
  verificationBody: (env: Env) => string | null;
  verificationRewrites: (env: Env) => { source: string; destination: string }[];
};

type Env = Record<string, string | undefined>;

const CODE = "tiktok-developers-site-verification=aBc123XyZ";
const FILE = "tiktokVfE9xQ2mNpLk4rTs.txt";

describe("verificationBody (o conteúdo servido)", () => {
  it("devolve o código EXATO, byte a byte", () => {
    expect(verificationBody({ SITE_VERIFICATION_CONTENT: CODE })).toBe(CODE);
  });

  it("apara o que o painel reprovaria: espaço em volta e linha em branco no fim", () => {
    expect(verificationBody({ SITE_VERIFICATION_CONTENT: `  ${CODE}  ` })).toBe(CODE);
    expect(verificationBody({ SITE_VERIFICATION_CONTENT: `${CODE}\n` })).toBe(CODE);
    expect(verificationBody({ SITE_VERIFICATION_CONTENT: `${CODE}\r\n` })).toBe(CODE);
  });

  it("não inventa conteúdo: sem env (ou env vazia) → null, e a rota dá 404", () => {
    expect(verificationBody({})).toBeNull();
    expect(verificationBody({ SITE_VERIFICATION_CONTENT: "" })).toBeNull();
    expect(verificationBody({ SITE_VERIFICATION_CONTENT: "   \n" })).toBeNull();
  });
});

describe("isValidFilename (o nome vira rota — não pode ser qualquer coisa)", () => {
  it("aceita o nome que o painel gera", () => {
    expect(isValidFilename(FILE)).toBe(true);
    expect(isValidFilename("tiktok123.txt")).toBe(true);
    expect(isValidFilename("google-site-verification.txt")).toBe(true);
  });

  it("recusa caminho, barra e travessia de diretório", () => {
    expect(isValidFilename("../../etc/passwd.txt")).toBe(false);
    expect(isValidFilename("pasta/arquivo.txt")).toBe(false);
    expect(isValidFilename("..")).toBe(false);
    expect(isValidFilename("/tiktok.txt")).toBe(false);
  });

  it("recusa o que não é um .txt", () => {
    expect(isValidFilename("tiktok.html")).toBe(false);
    expect(isValidFilename("tiktok")).toBe(false);
    expect(isValidFilename("")).toBe(false);
    expect(isValidFilename(undefined)).toBe(false);
    expect(isValidFilename(null)).toBe(false);
  });
});

describe("verificationRewrites (o caminho até a rota)", () => {
  it("com as duas envs → roteia o nome do painel para a rota que serve o código", () => {
    expect(
      verificationRewrites({
        SITE_VERIFICATION_FILENAME: FILE,
        SITE_VERIFICATION_CONTENT: CODE,
      })
    ).toEqual([{ source: `/${FILE}`, destination: "/api/site-verification" }]);
  });

  it("faltando qualquer uma das envs → nenhum rewrite (o site sobe igual)", () => {
    expect(verificationRewrites({})).toEqual([]);
    expect(verificationRewrites({ SITE_VERIFICATION_FILENAME: FILE })).toEqual([]);
    expect(verificationRewrites({ SITE_VERIFICATION_CONTENT: CODE })).toEqual([]);
  });

  it("nome inválido não vira rota, mesmo com conteúdo presente", () => {
    expect(
      verificationRewrites({
        SITE_VERIFICATION_FILENAME: "../../segredo.txt",
        SITE_VERIFICATION_CONTENT: CODE,
      })
    ).toEqual([]);
  });
});
