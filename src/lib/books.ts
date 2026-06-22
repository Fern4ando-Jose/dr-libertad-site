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
    // ES: produto Hotmart próprio (ID 7980706) com o PDF ES, US$ 7,90, afiliados 50%.
    checkout: { pt: "https://pay.hotmart.com/J106432769P", es: "https://pay.hotmart.com/W106437072U" },
  },
];

export const getBook = (slug: string): BookMeta | undefined =>
  BOOKS.find((b) => b.slug === slug);
