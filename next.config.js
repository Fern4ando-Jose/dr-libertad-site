/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // URL sem idioma -> versão PT (padrão). Ex.: /livros/100-plantas -> /pt/livros/100-plantas
      { source: "/livros", destination: "/pt/livros", permanent: false },
      { source: "/livros/:slug", destination: "/pt/livros/:slug", permanent: false },
    ];
  },
};

module.exports = nextConfig;
