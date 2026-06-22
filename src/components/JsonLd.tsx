const SITE_URL = "https://www.drlibertad.com";

// Perfis sociais oficiais — usados pelo Google para conectar o site à entidade.
// Preencha NEXT_PUBLIC_INSTAGRAM_URL no ambiente. Vazio é melhor que errado.
const SAME_AS: string[] = [process.env.NEXT_PUBLIC_INSTAGRAM_URL].filter(
  (u): u is string => Boolean(u)
);

// Estúdio editorial Dr. Libertad: entidade-organização do site.
const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Dr. Libertad",
  alternateName: "Dr. Liberdade",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  image: `${SITE_URL}/api/og?slide=cover&slot=manha&title=Dr.%20Libertad&kw=LIBERTAD&ed=00&mood=red&tag=psicolog%C3%ADa`,
  description:
    "Estúdio editorial sobre desintoxicação digital, ansiedade moderna e inteligência emocional. Filosofia aplicada à atenção e ao comportamento.",
  knowsAbout: [
    "Psicología",
    "Desintoxicación digital",
    "Ansiedad moderna",
    "Inteligencia emocional",
    "Atención",
    "Dopamina",
    "Libertad mental",
  ],
  ...(SAME_AS.length > 0 ? { sameAs: SAME_AS } : {}),
};

// O site em si: bilíngue PT/ES, publicado pela organização acima.
const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "Dr. Libertad",
  description: "Estudio editorial sobre psicología, atención y libertad mental.",
  inLanguage: ["pt-BR", "es-ES"],
  publisher: { "@id": `${SITE_URL}/#organization` },
};

/**
 * Dados estruturados (JSON-LD) para o Google entender a entidade por trás do
 * site. Renderizado no servidor, dentro do <body>, conforme recomendação do
 * Next.js para schema markup.
 */
export default function JsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        // Conteúdo estático e confiável (montado aqui), seguro para injetar.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}
