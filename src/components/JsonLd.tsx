import { instagramUrlDe } from "@/lib/accounts";
import { SITE_URL, abs } from "@/lib/seo";

// Perfis sociais oficiais — é por aqui que o Google liga o site às contas e
// entende que são a mesma entidade.
//
// Antes isto vinha de NEXT_PUBLIC_INSTAGRAM_URL, uma variável de ambiente que
// nunca chegou a ser preenchida: o `sameAs` saía vazio em produção e o site
// seguia, para o Google, sem nenhuma conta associada. E uma variável só
// comportava UM endereço, quando são duas contas.
//
// Agora vem do registro de contas (`ACCOUNTS`), a mesma fonte que a automação
// usa para publicar. Não há env a preencher e não há como divergir do @ real.
const SAME_AS: string[] = [instagramUrlDe("br"), instagramUrlDe("es")];

const KNOWS_ABOUT = [
  "Psicología",
  "Desintoxicación digital",
  "Ansiedad moderna",
  "Inteligencia emocional",
  "Atención",
  "Dopamina",
  "Libertad mental",
];

// Estúdio editorial Dr. Libertad: entidade-organização do site.
const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": abs("/#organization"),
  name: "Dr. Libertad",
  alternateName: "Dr. Liberdade",
  url: SITE_URL,
  logo: abs("/icon.svg"),
  image: abs("/br/opengraph-image"),
  description:
    "Estúdio editorial sobre desintoxicação digital, ansiedade moderna e inteligência emocional. Filosofia aplicada à atenção e ao comportamento.",
  knowsAbout: KNOWS_ABOUT,
  founder: { "@id": abs("/#author") },
  sameAs: SAME_AS,
};

// A voz que assina os textos. Existe como entidade separada porque em assunto de
// psicologia o Google pesa QUEM escreve (E-E-A-T) — sem um autor declarado, os
// artigos ficam órfãos. A descrição diz o que o próprio site diz na página do
// autor: é uma persona editorial, não um título clínico. Marcar de outro jeito
// seria alegar uma credencial que não existe.
const author = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": abs("/#author"),
  name: "Dr. Libertad",
  alternateName: "Dr. Liberdade",
  url: abs("/br/autor"),
  description:
    "Persona editorial sob a qual são publicados os textos do estúdio sobre atenção, dopamina e liberdade mental. O nome é o personagem; as ideias são do autor por trás dele.",
  knowsAbout: KNOWS_ABOUT,
  worksFor: { "@id": abs("/#organization") },
  sameAs: SAME_AS,
};

// O site em si: bilíngue PT/ES, publicado pela organização acima.
const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": abs("/#website"),
  url: SITE_URL,
  name: "Dr. Libertad",
  description: "Estudio editorial sobre psicología, atención y libertad mental.",
  inLanguage: ["pt-BR", "es-ES"],
  publisher: { "@id": abs("/#organization") },
};

/**
 * Dados estruturados (JSON-LD) para o Google entender a entidade por trás do
 * site. Renderizado no servidor, dentro do <body>, conforme recomendação do
 * Next.js para schema markup.
 *
 * Os três nós saem num @graph só: assim as referências entre eles (@id) são
 * resolvidas como um grafo, em vez de três ilhas que o Google tem de adivinhar
 * que se conectam.
 */
export default function JsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [organization, author, website].map(({ "@context": _ctx, ...node }) => node),
  };

  return (
    <script
      type="application/ld+json"
      // Conteúdo estático e confiável (montado aqui), seguro para injetar.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
