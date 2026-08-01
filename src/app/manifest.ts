import type { MetadataRoute } from "next";

// Web App Manifest. Serve para o site poder ser fixado na tela inicial do
// celular com o nome e o ícone certos — e é um dos itens que o Lighthouse
// (o mesmo relatório que mede Core Web Vitals) confere.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dr. Libertad — estúdio editorial",
    short_name: "Dr. Libertad",
    description:
      "Estúdio editorial sobre desintoxicação digital, ansiedade moderna e inteligência emocional.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0B0C",
    theme_color: "#0B0B0C",
    // PNG além do SVG: vários agregadores e o próprio Android ignoram ícone SVG.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
