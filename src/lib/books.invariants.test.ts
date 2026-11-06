import { describe, expect, it } from "vitest";
import { BOOKS, emPreVenda, getBook } from "@/lib/books";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { SEO_LANGS } from "@/lib/seo";

// O preço aparece em dois lugares: como TEXTO no dicionário (o que o leitor lê,
// "R$ 37") e como NÚMERO em books.ts (o que vai no schema.org/Offer, para o
// Google mostrar preço no resultado). Se um mudar sem o outro, o site anuncia um
// preço e diz outro ao buscador — o tipo de divergência que ninguém percebe até
// aparecer errado na busca. Este teste tranca os dois juntos.

/** "R$ 37" -> 37 · "US$ 9" -> 9 · "Grátis"/"Gratis" -> 0 */
function parsePriceText(text: string): number | null {
  if (/^gr[áa]tis$/i.test(text.trim())) return 0;
  const m = text.replace(/\./g, "").match(/(\d+(?:,\d+)?)/);
  return m ? Number(m[1].replace(",", ".")) : null;
}

describe("registro de livros", () => {
  it("todo livro declara preço nos dois idiomas", () => {
    for (const book of BOOKS) {
      for (const l of SEO_LANGS) {
        expect(book.price[l], `${book.slug}/${l}`).toBeDefined();
        expect(book.price[l].currency, `${book.slug}/${l}`).toMatch(/^[A-Z]{3}$/);
      }
    }
  });

  it("o preço numérico bate com o texto que o leitor vê", () => {
    for (const book of BOOKS) {
      for (const l of SEO_LANGS) {
        const text = dictionaries[l][book.dictKey].price;
        const parsed = parsePriceText(text);
        expect(parsed, `${book.slug}/${l}: preço "${text}" ilegível`).not.toBeNull();
        expect(book.price[l].amount, `${book.slug}/${l}: texto "${text}"`).toBe(parsed);
      }
    }
  });

  it("os 3 modos de venda têm regras próprias: grátis, pré-venda e à venda", () => {
    for (const book of BOOKS) {
      for (const l of SEO_LANGS) {
        if (book.preSale) {
          // PRÉ-VENDA: tem preço (para garantir na lista de espera) mas AINDA não
          // tem checkout — o livro não está à venda.
          expect(book.price[l].amount, `${book.slug}/${l}`).toBeGreaterThan(0);
          expect(book.checkout?.[l], `${book.slug}/${l}`).toBeUndefined();
        } else if (book.free) {
          // GRÁTIS: entrega a prévia por download, sem cobrar nada.
          expect(book.price[l].amount, `${book.slug}/${l}`).toBe(0);
          expect(book.leadPdf?.[l], `${book.slug}/${l}`).toBeTruthy();
        } else {
          // À VENDA: preço e checkout pago.
          expect(book.price[l].amount, `${book.slug}/${l}`).toBeGreaterThan(0);
          expect(book.checkout?.[l], `${book.slug}/${l}`).toBeTruthy();
        }
      }
    }
  });

  it("I Love Dopamina: BR compra na Amazon, ES segue na pré-venda", () => {
    const book = getBook("i-love-dopamina")!;
    expect(book.store?.br).toBe("https://www.amazon.com.br/dp/B0HQG3559L");
    expect(emPreVenda(book, "br")).toBe(false);
    // A edição em castelhano ainda não existe à venda: nada de loja nela.
    expect(book.store?.es).toBeUndefined();
    expect(emPreVenda(book, "es")).toBe(true);
  });

  it("KDP Select: a edição BR à venda não anuncia Google nem pré-venda", () => {
    const L = dictionaries.br.dopamina;
    const vitrine = [L.badge, L.priceNote, L.ctaBuy, L.ctaBuyNote, L.epubNote, L.finalLead, L.metaDescription, ...L.chips].join(" ");
    expect(vitrine).not.toMatch(/google|hotmart|pdf|lista de espera|pré-venda|pré-lançamento/i);
  });

  it("a medida da capa é declarada e plausível", () => {
    for (const book of BOOKS) {
      expect(book.coverSize.width, book.slug).toBeGreaterThan(0);
      expect(book.coverSize.height, book.slug).toBeGreaterThan(book.coverSize.width);
    }
  });
});
