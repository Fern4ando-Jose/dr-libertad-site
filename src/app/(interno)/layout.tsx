import type { Metadata } from "next";
import RootShell from "@/components/RootShell";
import { htmlLangFor } from "@/lib/seo";

// Root layout dos painéis internos (/admin, /insights). Tudo aqui é noindex:
// são páginas de trabalho do dono, com gate por chave/token, e não têm por que
// disputar espaço nos resultados da marca.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function InternoRootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang={htmlLangFor("br")}>{children}</RootShell>;
}
