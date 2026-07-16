const { verificationRewrites } = require("./scripts/site-verification.cjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Verificação de propriedade do domínio (TikTok e afins): o painel exige um
  // .txt com código na raiz do site. Quando SITE_VERIFICATION_FILENAME/_CONTENT
  // existem, o nome pedido passa a ser servido por /api/site-verification; sem
  // elas, nenhuma rota nova aparece. Regra e formato: scripts/site-verification.cjs.
  async rewrites() {
    return verificationRewrites(process.env);
  },
  async redirects() {
    return [
      // URL sem idioma -> versão PT (padrão). Ex.: /livros/100-plantas -> /pt/livros/100-plantas
      { source: "/livros", destination: "/pt/livros", permanent: false },
      { source: "/livros/:slug", destination: "/pt/livros/:slug", permanent: false },
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
