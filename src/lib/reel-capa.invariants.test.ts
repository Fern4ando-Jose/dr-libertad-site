import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ─── A CAPA DO REEL NO PERFIL ────────────────────────────────────────────────
//
// Por que este teste existe (04/08/2026). O Instagram usa o PRIMEIRO QUADRO do
// vídeo como capa do grid quando ninguém diz o contrário — e o primeiro quadro
// era footage cru. O perfil virou uma parede de fotos de banco sem marca, contra
// a direção que o dono travou em DIRECAO-CAPAS.md. O conserto foi mandar
// `thumb_offset` apontando para o fim da capa, onde o título já está inteiro.
//
// O risco que este teste cobre: o offset é um número em `publish-reel/route.ts` e
// a duração da capa é outro número em `video/ReelV2.tsx`. São arquivos diferentes,
// mexidos por motivos diferentes. Encurtar a capa sem lembrar do offset faria a
// capa do perfil cair no PRIMEIRO INSIGHT — e ninguém veria, porque nada quebra:
// o Reel publica normalmente, só com a capa errada. É o mesmo tipo de defeito
// silencioso que a mistura de idioma era.
//
// Lê os dois arquivos como TEXTO de propósito: importar o ReelV2 puxaria o
// Remotion inteiro para dentro do teste.

const raiz = join(__dirname, "..", "..");
const reelV2 = readFileSync(join(raiz, "video", "ReelV2.tsx"), "utf8");
const publishReel = readFileSync(join(raiz, "src", "app", "api", "publish-reel", "route.ts"), "utf8");

function coverSegundos(): number {
  // const COVER = Math.round(FPS * 3.0);
  const m = reelV2.match(/const\s+COVER\s*=\s*Math\.round\(FPS\s*\*\s*([\d.]+)\)/);
  if (!m) throw new Error("não achei a duração da capa (COVER) em video/ReelV2.tsx");
  return Number(m[1]);
}

function offsetMs(): number {
  const m = publishReel.match(/const\s+THUMB_OFFSET_MS\s*=\s*(\d+)/);
  if (!m) throw new Error("não achei THUMB_OFFSET_MS em api/publish-reel/route.ts");
  return Number(m[1]);
}

describe("capa do Reel no grid do Instagram", () => {
  it("o quadro escolhido cai DENTRO da capa, nunca no primeiro insight", () => {
    const capaMs = coverSegundos() * 1000;
    expect(offsetMs()).toBeLessThan(capaMs);
  });

  it("com folga de pelo menos meio segundo antes do corte da capa", () => {
    const capaMs = coverSegundos() * 1000;
    expect(capaMs - offsetMs()).toBeGreaterThanOrEqual(500);
  });

  it("depois do gancho terminar de entrar (o título tem de estar inteiro)", () => {
    // Desde 11/08 o título já nasce inteiro no quadro 0 (`inteiroDeInicio`), então
    // qualquer offset serviria para o grid. A folga continua travada porque ela também
    // protege contra o caso inverso: se um dia a revelação voltar, o quadro do perfil
    // não pode cair no meio de uma frase pela metade.
    expect(offsetMs()).toBeGreaterThanOrEqual(1500);
  });

  it("a manchete da CAPA está legível no primeiro quadro — nada de tela muda", () => {
    // O defeito medido em 09/08: 87,6% deslizavam antes de a frase fechar, porque ela
    // entrava palavra a palavra e só ficava inteira no 3º segundo. O que este teste
    // trava é a capa; os INSIGHTS continuam cinéticos de propósito.
    expect(reelV2).toMatch(/<KineticText[^/]*inteiroDeInicio/);
    expect(reelV2).toMatch(/inteiroDeInicio\s*\?\s*1\s*\n?\s*:/);
  });

  it("a publicação REALMENTE manda o thumb_offset (não basta declarar a constante)", () => {
    expect(publishReel).toMatch(/thumb_offset:\s*THUMB_OFFSET_MS/);
  });

  it("a capa leva a identidade da marca com o número da edição", () => {
    // DIRECAO-CAPAS.md: "DR. LIBERDADE · Nº XXX" no topo é a âncora de coleção.
    // Desde 11/08 o "Nº" não é mais montado à mão dentro do ReelV2: ele vem de
    // `selo()` (src/lib/serie.ts), que passou a juntar o NOME da série ao número —
    // "GAIOLA SEM GRADE · Nº 244". O teste segue o fato para a fonte única em vez de
    // exigir a string no arquivo onde ela deixou de morar.
    expect(reelV2).toMatch(/\bselo\(/);
    expect(reelV2).toMatch(/<CoverTextV2[^>]*\bed=\{ed\}/);
    expect(readFileSync(join(raiz, "src", "lib", "serie.ts"), "utf8")).toMatch(/Nº \$\{n\}/);
  });

  it("a série tem NOME, não só número — é o item dos 8 perfis medidos", () => {
    const serie = readFileSync(join(raiz, "src", "lib", "serie.ts"), "utf8");
    expect(serie).toMatch(/GAIOLA SEM GRADE/);
    expect(serie).toMatch(/JAULA SIN REJAS/);
  });

  it("o Reel de produção usa os 6 acentos da marca, não o mapa da fase reprovada", () => {
    // O mapa vem de ./Reel (fonte única). Se alguém recriar um CAT_ACCENT local
    // aqui, volta a divergência que deixou 20 dias de Reels na cor errada.
    expect(reelV2).toMatch(/import\s*\{[^}]*CAT_ACCENT[^}]*\}\s*from\s*"\.\/Reel"/);
    expect(reelV2).not.toMatch(/const\s+CAT_ACCENT\s*:/);
  });
});
