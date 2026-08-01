// Invariante do @ do Instagram — codifica o bug encontrado em 01/08/2026.
//
// O handle da conta espanhola estava escrito de DUAS formas no repositório:
// `@dr.liberdad` (com D, a conta real, que publica todo dia) e `@dr.libertad`
// (com T, contaminado pelo domínio drliber**t**ad.com). A grafia com T era
// justamente a que virava LINK CLICÁVEL em `/el-estudio` e em
// `/investigacion/gracias` — as duas telas onde o leitor é convidado a seguir.
//
// Verificado no navegador em 01/08/2026, nas duas contas:
//   instagram.com/dr.liberdad → 323 posts, 460 seguidores, é a nossa
//   instagram.com/dr.libertad → 0 posts, 0 seguidores, é de outra pessoa
//
// Ou seja: quem respondia a pesquisa em espanhol e clicava em "Seguir a
// @dr.libertad" caía numa conta vazia de terceiro — perdendo o seguidor no
// ponto do funil onde ele custa mais caro.
//
// A correção não foi trocar a string: foi tirar a possibilidade de haver duas.
// O @ é escrito UMA vez, em ACCOUNTS[lang].handle, e todo endereço é derivado
// dele por `instagramUrlDe`. Este teste trava as duas pontas — a grafia e a
// derivação — para que o erro não possa voltar por outro caminho.
import { describe, it, expect } from "vitest";
import { ACCOUNTS, instagramUrlDe, type Lang } from "./accounts";
import { estudoContent } from "@/components/estudo/estudo.content";
import { surveyContent } from "@/components/survey/survey.content";

const LANGS: Lang[] = ["br", "es"];

describe("@ do Instagram — uma grafia só (bug do handle, 01/08/2026)", () => {
  it("a conta ES é @dr.liberdad — com D, não com T", () => {
    expect(ACCOUNTS.es.handle).toBe("@dr.liberdad");
  });

  it("a conta BR é @dr.liberdade.br", () => {
    expect(ACCOUNTS.br.handle).toBe("@dr.liberdade.br");
  });

  it("NENHUMA conta usa a grafia do domínio (libertad com T)", () => {
    // O domínio é drlibertad.com e a conta é dr.liberdad. Parecem iguais e não
    // são: foi exatamente essa semelhança que produziu o erro.
    for (const acc of Object.values(ACCOUNTS)) {
      expect(acc.handle).not.toContain("libertad");
    }
  });

  it("a URL do perfil é DERIVADA do handle — não pode divergir", () => {
    for (const lang of LANGS) {
      const semArroba = ACCOUNTS[lang].handle.replace(/^@/, "");
      expect(instagramUrlDe(lang)).toBe(`https://www.instagram.com/${semArroba}`);
    }
  });

  it("o link de /o-estudo e /el-estudio aponta para a conta daquele idioma", () => {
    for (const lang of LANGS) {
      const copy = estudoContent[lang];
      expect(copy.instagramHandle).toBe(ACCOUNTS[lang].handle);
      expect(copy.instagramUrl).toBe(instagramUrlDe(lang));
      // O botão precisa NOMEAR a conta para onde leva: rótulo e destino iguais.
      expect(copy.autor.follow).toContain(ACCOUNTS[lang].handle);
    }
  });

  it("o link da tela de agradecimento da pesquisa aponta para a mesma conta", () => {
    for (const lang of LANGS) {
      const copy = surveyContent[lang];
      expect(copy.handle).toBe(ACCOUNTS[lang].handle);
      expect(copy.instagramUrl).toBe(instagramUrlDe(lang));
      expect(copy.thanks.cta).toContain(ACCOUNTS[lang].handle);
      expect(copy.thanks.body).toContain(ACCOUNTS[lang].handle);
    }
  });

  it("ES e BR não apontam para a mesma conta", () => {
    expect(instagramUrlDe("es")).not.toBe(instagramUrlDe("br"));
  });
});
