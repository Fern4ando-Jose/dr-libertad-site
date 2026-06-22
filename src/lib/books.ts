// Registro de livros da biblioteca Dr. Liberdade.
// Cada livro aponta para sua chave de textos no dicionário (PT/ES) + capa + link de checkout.
// Para adicionar um novo livro: crie a chave de textos no dicionário e some um item aqui.

export type BookDictKey = "livro";

export type BookMeta = {
  slug: string;
  dictKey: BookDictKey;
  cover: { pt: string; es: string };
  checkout: { pt: string; es: string };
};

export const BOOKS: BookMeta[] = [
  {
    slug: "100-plantas",
    dictKey: "livro",
    cover: { pt: "/images/livro-capa-pt.png", es: "/images/livro-capa-es.png" },
    // PT: produto Hotmart aprovado (ID 7978640) — checkout direto.
    // ES: ainda sem produto próprio na Hotmart (entregaria o PDF PT); fica como placeholder
    // até criarmos o produto em espanhol com o PDF ES.
    checkout: { pt: "https://pay.hotmart.com/J106432769P", es: "https://hotmart.com" },
  },
];

export const getBook = (slug: string): BookMeta | undefined =>
  BOOKS.find((b) => b.slug === slug);
