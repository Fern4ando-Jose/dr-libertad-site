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
