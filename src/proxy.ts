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
export const config = {
  matcher: ["/((?!api|insights|admin|_next|.*\\..*).*)"],
};
