// Registro de livros da biblioteca Dr. Liberdade.
// Cada livro aponta para sua chave de textos no dicionário (PT/ES) + capa + link de checkout.
// Para adicionar um novo livro: crie a chave de textos no dicionário e some um item aqui.

export type BookDictKey = "livro" | "dopamina";

export type BookMeta = {
  slug: string;
  dictKey: BookDictKey;
  cover: { br: string; es: string };
  // Capa da VITRINE /livros — pode ser diferente da da página do livro (pedido do
  // dono 15/08/2026: a vitrine usa a imagem "Capa-para-site"; a página do livro usa
  // a "-01"). Ausente → a vitrine cai para `cover` (comportamento antigo).
  coverList?: { br: string; es: string };
  // Medida real do arquivo da capa. O next/image precisa dela para reservar o
  // espaço antes de a imagem chegar (sem isso a página "pula" — CLS) e o
  // og:image precisa dela para o scraper não ter de baixar tudo para descobrir.
  // As duas versões de idioma de um livro têm sempre a mesma medida.
  coverSize: { width: number; height: number };
  // Checkout pago (Hotmart etc.). Opcional: um livro em modo GRÁTIS (prévia) não tem.
  checkout?: { br: string; es: string };
  // Preço em número, para os dados estruturados (schema.org/Offer) — o Google
  // não sabe ler "R$ 37". O texto que o LEITOR vê continua no dicionário; estes
  // dois têm de contar a mesma história, e há um teste de invariante garantindo
  // isso (books.invariants.test.ts).
  price: { br: { amount: number; currency: string }; es: { amount: number; currency: string } };
  // Modo GRÁTIS: entrega um PDF (prévia/adelanto) por download direto, sem checkout.
  // É a página-destino do funil comment→DM (em vez de mandar o .pdf cru no Direct).
  free?: boolean;
  leadPdf?: { br: string; es: string };
  // PRÉ-VENDA (pré-lançamento): o livro ainda não está à venda. A oferta principal
  // da página vira a lista de espera (garantir o preço), o CTA rola até o formulário
  // e o preço vai ao schema.org como PreOrder. Convive com `free`: a prévia grátis
  // continua disponível como opção secundária (o funil comment→DM aponta para cá).
  preSale?: boolean;
  // Imagens de "por dentro" (spreads). Ausente → a seção mostra só o texto (sem fotos
  // de outro livro). O guia de plantas declara as suas; a prévia de dopamina não tem.
  insideImages?: string[];
  // Vídeo promo vertical (9:16) por idioma. Use null enquanto a versão do idioma
  // não existir — o player só aparece quando há vídeo para o idioma atual.
  promoVideo?: { br: string | null; es: string | null };
  promoPoster?: { br: string | null; es: string | null };
  // FORA DA VITRINE: o livro continua com página no ar (rota, OG, checkout) e é
  // acessado por LINK DIRETO, mas não aparece na lista /livros.
  hidden?: boolean;
};

export const BOOKS: BookMeta[] = [
  {
    slug: "100-plantas",
    dictKey: "livro",
    cover: { br: "/images/livro-capa-pt.png", es: "/images/livro-capa-es.png" },
    coverSize: { width: 1024, height: 1638 },
    // PT: produto Hotmart aprovado (ID 7978640) — checkout direto.
    // ES: produto Hotmart próprio (ID 7980706) com o PDF ES, US$ 7,90, afiliados 50%.
    checkout: { br: "https://pay.hotmart.com/J106432769P", es: "https://pay.hotmart.com/W106437072U" },
    price: { br: { amount: 37, currency: "BRL" }, es: { amount: 9, currency: "USD" } },
    insideImages: ["/images/livro-spread-1.jpg", "/images/livro-spread-2.jpg"],
    // ES ainda não produzido — fica null até a versão em espanhol ser renderizada.
    promoVideo: { br: "/videos/livro-promo-pt.mp4", es: null },
    promoPoster: { br: "/videos/livro-promo-pt-poster.jpg", es: null },
    // Decisão do dono (2026-07-29): sai da vitrine, segue vendendo por link direto.
    hidden: true,
  },
  {
    // Prévia GRÁTIS do livro "I Love Dopamina" — página-destino do funil comment→DM.
    // Download 1-clique do PDF (já em public/lead). Livro completo: lançamento (lista
    // de espera por enquanto). Capa por idioma: artes oficiais criadas em 15/08/2026 —
    // vitrine ("Capa-para-site") e página do livro ("-01") separadas por pedido do dono.
    slug: "i-love-dopamina",
    dictKey: "dopamina",
    // Página do livro (e OG): a arte final "-01" por idioma.
    cover: { br: "/images/i-love-dopamina-capa-br-01.png", es: "/images/i-love-dopamina-capa-es-01.png" },
    // Vitrine /livros: a arte "Capa-para-site" (pedido do dono, 15/08/2026).
    coverList: { br: "/images/i-love-dopamina-capa-pt.png", es: "/images/i-love-dopamina-capa-es.png" },
    // 1086×1448 é a medida real das quatro artes (capa do livro e da vitrine,
    // PT e ES) — todas iguais; o next/image reserva o espaço sem a página "pular".
    coverSize: { width: 1086, height: 1448 },
    free: true,
    preSale: true,
    // Pré-lançamento (pedido do dono, 15/08/2026): R$ 29,90 no BR. O ES sai em
    // US$ 5,90 (equivalente aproximado — o dono decide o valor exato ao publicar).
    price: { br: { amount: 29.9, currency: "BRL" }, es: { amount: 5.9, currency: "USD" } },
    leadPdf: { br: "/lead/I-Love-Dopamina_Previa_PT.pdf", es: "/lead/I-Love-Dopamina_Previa_ES.pdf" },
  },
];

export const getBook = (slug: string): BookMeta | undefined =>
  BOOKS.find((b) => b.slug === slug);

// O que a LISTA /livros mostra. `BOOKS` segue inteiro para rota, OG e página de
// venda — esconder da vitrine nunca tira a página do ar.
export const VISIBLE_BOOKS: BookMeta[] = BOOKS.filter((b) => !b.hidden);
