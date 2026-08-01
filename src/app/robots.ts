import type { MetadataRoute } from "next";
import { SITE_URL, abs } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Painéis internos e API não têm por que ser rastreados. /admin e
      // /insights são páginas únicas com gate por chave/token: indexadas, só
      // serviriam para expor o endereço e sujar os resultados da marca.
      //
      // As páginas de agradecimento NÃO entram aqui de propósito: elas levam
      // `noindex` na própria página. Bloquear no robots.txt impediria o Google
      // de LER o noindex — o jeito de tirar uma página do índice é deixar
      // rastrear e dizer "não indexe", não trancar a porta.
      disallow: ["/api/", "/admin", "/insights"],
    },
    sitemap: abs("/sitemap.xml"),
    host: SITE_URL,
  };
}
