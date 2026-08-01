import type { Metadata } from "next";
import RootShell from "@/components/RootShell";
import { baseMetadata } from "@/lib/metadata-base";
import { htmlLangFor } from "@/lib/seo";

// Root layout das rotas ES de caminho fixo (/investigacion, /el-estudio).
// Serve <html lang="es-ES"> — antes estas páginas saíam declaradas como pt-BR.
export const metadata: Metadata = baseMetadata;

export default function EsRootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang={htmlLangFor("es")}>{children}</RootShell>;
}
