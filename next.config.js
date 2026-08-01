/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // URL sem idioma -> versão PT (padrão). Ex.: /livros/100-plantas -> /pt/livros/100-plantas
      { source: "/livros", destination: "/br/livros", permanent: false },
      { source: "/livros/:slug", destination: "/br/livros/:slug", permanent: false },
      // O idioma se chama BR (dono, 29/07/2026): link antigo /pt/* segue vivo, redirecionado.
      { source: "/pt", destination: "/br", permanent: true },
      { source: "/pt/:path*", destination: "/br/:path*", permanent: true },

      // LINK DA BIO — curto de propósito (queixa do dono, 29/07: o link da bio
      // "é enorme"). Na bio fica `drlibertad.com/ig` (ES: `/ig-es`); a marcação
      // de origem, que é o que engordava o endereço, entra AQUI no caminho — o
      // visitante nunca a vê. Temporário (307) para o endereço curto continuar
      // sendo o que aparece; nada de 301, que o navegador guardaria para sempre.
      { source: "/ig", destination: "/br/dopamina?utm_source=ig&utm_medium=bio&utm_content=link_in_bio", permanent: false },
      { source: "/ig-es", destination: "/es/dopamina?utm_source=ig&utm_medium=bio&utm_content=link_in_bio", permanent: false },

      // QR CODE da pesquisa — mesma ideia do link da bio: o endereço impresso é
      // curto (`drlibertad.com/qr`), a marcação de campanha entra AQUI. QR curto
      // = menos módulos = leitura mais fácil de longe, com celular ruim e em
      // papel pequeno. Temporário (307) de propósito: se a pesquisa mudar de
      // endereço, o cartaz já impresso continua funcionando.
      { source: "/qr", destination: "/pesquisa?utm_source=qr&utm_medium=offline&utm_campaign=pesquisa-br&utm_content=cartao", permanent: false },
      { source: "/qr-es", destination: "/investigacion?utm_source=qr&utm_medium=offline&utm_campaign=investigacion-es&utm_content=cartao", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // CSP mínima (não restringe script/style p/ não quebrar framer-motion/analytics/next):
          // frame-ancestors contra clickjacking + trava base-uri e object-src.
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
