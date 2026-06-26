// Registro de livros da biblioteca Dr. Liberdade.
// Cada livro aponta para sua chave de textos no dicionário (PT/ES) + capa + link de checkout.
// Para adicionar um novo livro: crie a chave de textos no dicionário e some um item aqui.

export type BookDictKey = "livro" | "dopamina";

export type BookMeta = {
  slug: string;
  dictKey: BookDictKey;
  cover: { pt: string; es: string };
  // Checkout pago (Hotmart etc.). Opcional: um livro em modo GRÁTIS (prévia) não tem.
  checkout?: { pt: string; es: string };
  // Modo GRÁTIS: entrega um PDF (prévia/adelanto) por download direto, sem checkout.
  // É a página-destino do funil comment→DM (em vez de mandar o .pdf cru no Direct).
  free?: boolean;
  leadPdf?: { pt: string; es: string };
  // Imagens de "por dentro" (spreads). Ausente → a seção mostra só o texto (sem fotos
  // de outro livro). O guia de plantas declara as suas; a prévia de dopamina não tem.
  insideImages?: string[];
  // Vídeo promo vertical (9:16) por idioma. Use null enquanto a versão do idioma
  // não existir — o player só aparece quando há vídeo para o idioma atual.
  promoVideo?: { pt: string | null; es: string | null };
  promoPoster?: { pt: string | null; es: string | null };
};

export const BOOKS: BookMeta[] = [
  {
    slug: "100-plantas",
    dictKey: "livro",
    cover: { pt: "/images/livro-capa-pt.png", es: "/images/livro-capa-es.png" },
    // PT: produto Hotmart aprovado (ID 7978640) — checkout direto.
    // ES: produto Hotmart próprio (ID 7980706) com o PDF ES, US$ 7,90, afiliados 50%.
    checkout: { pt: "https://pay.hotmart.com/J106432769P", es: "https://pay.hotmart.com/W106437072U" },
    insideImages: ["/images/livro-spread-1.jpg", "/images/livro-spread-2.jpg"],
    // ES ainda não produzido — fica null até a versão em espanhol ser renderizada.
    promoVideo: { pt: "/videos/livro-promo-pt.mp4", es: null },
    promoPoster: { pt: "/videos/livro-promo-pt-poster.jpg", es: null },
  },
  {
    // Prévia GRÁTIS do livro "I Love Dopamina" — página-destino do funil comment→DM.
    // Download 1-clique do PDF (já em public/lead). Livro completo: lançamento (lista
    // de espera por enquanto). Capa ES usa a PT até a variante ES ser produzida.
    slug: "i-love-dopamina",
    dictKey: "dopamina",
    cover: { pt: "/images/i-love-dopamina-capa-pt.png", es: "/images/i-love-dopamina-capa-pt.png" },
    free: true,
    leadPdf: { pt: "/lead/I-Love-Dopamina_Previa_PT.pdf", es: "/lead/I-Love-Dopamina_Previa_ES.pdf" },
  },
];

export const getBook = (slug: string): BookMeta | undefined =>
  BOOKS.find((b) => b.slug === slug);
