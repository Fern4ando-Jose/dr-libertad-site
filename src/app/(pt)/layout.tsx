import type { Metadata } from "next";
import RootShell from "@/components/RootShell";
import { baseMetadata } from "@/lib/metadata-base";
import { htmlLangFor } from "@/lib/seo";

// Root layout das rotas PT de caminho fixo (/pesquisa, /o-estudo) — as que
// vivem FORA do prefixo de idioma porque têm um idioma só. Ver src/proxy.ts.
export const metadata: Metadata = baseMetadata;

export default function PtRootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang={htmlLangFor("br")}>{children}</RootShell>;
}
