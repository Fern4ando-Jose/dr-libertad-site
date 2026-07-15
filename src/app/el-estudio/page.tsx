// /el-estudio — página institucional de la investigación "Redes Sociales y Relaciones" (ES).
// Ruta fija fuera del prefijo de idioma (como /investigacion) — explica el proyecto
// y lleva al embudo /investigacion. Espejo PT: /o-estudo.

import type { Metadata } from "next";
import EstudoPage from "@/components/estudo/EstudoPage";
import { estudoContent } from "@/components/estudo/estudo.content";

const SITE_URL = "https://www.drlibertad.com";
const c = estudoContent.es;

export const metadata: Metadata = {
  title: c.metaTitle,
  description: c.metaDescription,
  alternates: {
    canonical: `${SITE_URL}/el-estudio`,
    languages: {
      "pt-BR": `${SITE_URL}/o-estudo`,
      "es-ES": `${SITE_URL}/el-estudio`,
      "x-default": `${SITE_URL}/o-estudo`,
    },
  },
  openGraph: {
    type: "website",
    siteName: c.brand,
    title: c.metaTitle,
    description: c.metaDescription,
    url: `${SITE_URL}/el-estudio`,
    locale: "es_ES",
  },
  twitter: { card: "summary_large_image", title: c.metaTitle, description: c.metaDescription },
};

export default function Page() {
  return <EstudoPage lang="es" />;
}
