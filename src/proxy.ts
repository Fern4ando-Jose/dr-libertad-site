import { NextRequest, NextResponse } from "next/server";

const LOCALES = ["pt", "es"] as const;
const DEFAULT_LOCALE = "pt";
const COOKIE = "dl-lang";

// Escolhe o idioma: preferência salva (cookie) > Accept-Language > padrão.
function pickLocale(req: NextRequest): string {
  const cookie = req.cookies.get(COOKIE)?.value;
  if (cookie === "pt" || cookie === "es") return cookie;

  const accept = (req.headers.get("accept-language") ?? "").toLowerCase();
  if (accept.startsWith("es") || accept.includes(",es") || accept.includes(" es")) {
    return "es";
  }
  return DEFAULT_LOCALE;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Já tem prefixo de idioma? Segue sem mexer.
  const hasLocale = LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (hasLocale) return NextResponse.next();

  const locale = pickLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

// Exclui API, os painéis utilitários (/insights, /admin), assets do Next e qualquer
// arquivo com extensão (sitemap.xml, robots.txt, *.svg, og images etc. têm ponto → não
// redirecionam). /insights e /admin ficam fora do i18n (páginas únicas, gate por chave/
// token) — sem isso o /admin caía em /pt/admin (404).
// /pesquisa (PT) e /investigacion (ES) também ficam fora: são as rotas fixas da
// pesquisa "Redes Sociais e Relacionamentos" (1 idioma por rota, link da bio do IG).
// /o-estudo (PT) e /el-estudio (ES): as páginas institucionais que explicam o
// estudo e levam ao funil (mesma lógica de rota fixa por idioma).
// /terms (EN): os Termos de Uso em inglês, para leitores que não falam pt|es
// (o revisor do painel de developers do TikTok exige uma ToS URL e lê em
// inglês). Sem a exclusão cairia em /pt/terms → 404. Os espelhos PT/ES são
// /pt/termos e /es/termos e seguem o i18n normalmente.
export const config = {
  matcher: [
    "/((?!api|insights|admin|pesquisa|investigacion|o-estudo|el-estudio|terms|_next|.*\\..*).*)",
  ],
};
