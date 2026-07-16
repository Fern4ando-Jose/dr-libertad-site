// ─── Termos de Uso — TEXTOS PT/ES/EN ─────────────────────────────────────────
// Irmão da Política de Privacidade (dicionário `privacy` em src/lib/i18n/
// dictionaries.ts): mesma família "LEGAL", mesma forma (eyebrow/title/updated/
// intro/sections/contactNote) — por isso TermsView espelha PrivacyView.
//
// Mora AQUI, e não no dicionário, por um motivo: o dicionário é Record<Lang,…>
// com Lang = "pt" | "es", e os Termos precisam de uma 3ª língua (EN) para o
// revisor do painel de developers do TikTok, que lê em inglês. Mesmo recurso do
// /o-estudo (estudo.content.ts): conteúdo próprio + rota fixa fora do i18n.
//
// O texto descreve só o que o site REALMENTE faz (conteúdo educativo, livros,
// pesquisa, lista de e-mail, contato) e é coerente com a política de privacidade
// já publicada. Nada foi copiado de terceiros. NÃO há cláusula de foro/lei
// aplicável: seria invenção — é decisão do dono (P4).

export type TermsLang = "pt" | "es" | "en";

export type TermsCopy = {
  metaTitle: string;
  metaDescription: string;
  brand: string;
  ogLocale: string;
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: { h: string; p: string[] }[];
  contactNote: string;
};

const CONTACT = "contato@drlibertad.com";

const pt: TermsCopy = {
  metaTitle: "Termos de Uso",
  metaDescription:
    "Os termos que regem o uso do site da Dr. Liberdade: o que oferecemos, o que você pode fazer com o conteúdo e quais são os limites da nossa responsabilidade.",
  brand: "Dr. Liberdade",
  ogLocale: "pt_BR",
  eyebrow: "LEGAL",
  title: "Termos de Uso",
  updated: "Última atualização: julho de 2026",
  intro:
    "Estes termos explicam as regras para usar este site e os conteúdos da Dr. Liberdade. Ao navegar por aqui, assinar nossa lista, responder à pesquisa ou interagir com nossos perfis oficiais, você concorda com o que está escrito abaixo. Se não concordar, basta não usar o serviço.",
  sections: [
    {
      h: "1. Quem somos",
      p: [
        "Dr. Liberdade (“nós”) é um estúdio editorial independente que publica conteúdo sobre atenção, comportamento, dopamina e liberdade mental — neste site, em livros e nos nossos perfis oficiais em redes sociais.",
        `Para falar conosco sobre qualquer assunto destes termos, escreva para ${CONTACT}.`,
      ],
    },
    {
      h: "2. O que oferecemos",
      p: [
        "Conteúdo editorial e educativo: textos, imagens e vídeos publicados neste site e nas nossas contas oficiais, de leitura livre e gratuita.",
        "Livros: obras de nossa autoria, apresentadas aqui e vendidas em plataformas de terceiros (ver a seção 6).",
        "Pesquisa: um questionário de participação voluntária sobre redes sociais e relacionamentos, cujos resultados alimentam nosso trabalho editorial.",
        "Lista de e-mail: um envio periódico para quem se inscreve por vontade própria.",
      ],
    },
    {
      h: "3. Isto não é aconselhamento médico ou psicológico",
      p: [
        "Nosso conteúdo é educativo e de opinião. Ele não é diagnóstico, tratamento, terapia nem substituto de acompanhamento por profissional de saúde qualificado, e não estabelece qualquer relação clínica entre nós e você.",
        "Se você está em sofrimento, em crise ou precisa de cuidado de saúde mental, procure um profissional ou o serviço de emergência da sua região. Decisões que você tomar a partir do que lê aqui são suas.",
      ],
    },
    {
      h: "4. Uso do site",
      p: [
        "Você pode ler, compartilhar e citar nosso conteúdo livremente, desde que atribua a autoria e não o apresente como seu.",
        "O que não é permitido: reproduzir o conteúdo integralmente para fins comerciais sem nossa autorização por escrito; alterar a obra e atribuí-la a nós; tentar invadir, sobrecarregar ou extrair dados do site de forma automatizada; e usar nossos canais para assédio, spam ou qualquer atividade ilegal.",
        "Podemos remover interações e restringir o acesso de quem descumprir estas regras.",
      ],
    },
    {
      h: "5. Conteúdo e propriedade intelectual",
      p: [
        "Salvo indicação em contrário, o texto, a identidade visual, as ilustrações e os vídeos publicados por nós são de nossa autoria e estão protegidos por direito autoral. O uso descrito na seção 4 não transfere a você a titularidade de nada.",
        "Parte da mídia usada nos nossos vídeos vem de bancos de terceiros, sob as licenças desses bancos; e parte do conteúdo é produzida com apoio de ferramentas de inteligência artificial, sob nossa direção e revisão editorial.",
      ],
    },
    {
      h: "6. Livros e compras",
      p: [
        "Não vendemos nada diretamente neste site. Nossos livros são vendidos por plataformas de terceiros, e as páginas daqui apenas apresentam a obra e levam até elas.",
        "Toda a compra — pagamento, entrega, garantia, reembolso e suporte — é regida pelos termos da plataforma onde você comprar, e é com ela que a transação acontece. Verifique as condições dela antes de comprar.",
      ],
    },
    {
      h: "7. Lista de e-mail e pesquisa",
      p: [
        "A inscrição na lista é voluntária, e todo envio traz um link para cancelar. Você pode sair quando quiser, sem precisar justificar.",
        "A participação na pesquisa também é voluntária e você pode abandoná-la a qualquer momento. Ao responder, você concorda que suas respostas sejam usadas de forma agregada no nosso trabalho editorial.",
        "Como tratamos os dados dessas duas frentes está descrito na nossa Política de Privacidade, que faz parte destes termos.",
      ],
    },
    {
      h: "8. Links e serviços de terceiros",
      p: [
        "Nosso site e nossos conteúdos apontam para serviços que não controlamos — redes sociais, lojas, bancos de mídia e provedores de infraestrutura. Não respondemos pelo conteúdo, pela disponibilidade nem pelas práticas de privacidade deles.",
        "Quando você interage conosco dentro de uma rede social, valem também os termos e as regras daquela plataforma.",
      ],
    },
    {
      h: "9. Limites da nossa responsabilidade",
      p: [
        "Oferecemos o site e o conteúdo “como estão”. Trabalhamos para que sejam corretos e estejam no ar, mas não garantimos ausência de erros, disponibilidade ininterrupta nem que o conteúdo sirva a um objetivo específico seu.",
        "Na medida permitida pela lei aplicável, não respondemos por danos indiretos decorrentes do uso — ou da impossibilidade de uso — do site e do conteúdo. Nada aqui exclui responsabilidade que a lei não permita excluir.",
      ],
    },
    {
      h: "10. Alterações",
      p: [
        "Podemos atualizar estes termos. As mudanças relevantes ficam sinalizadas aqui, com nova data de atualização no topo. Continuar usando o site depois de uma mudança significa que você a aceitou.",
      ],
    },
  ],
  contactNote: `Dúvidas sobre estes termos? Escreva para ${CONTACT}.`,
};

const es: TermsCopy = {
  metaTitle: "Términos de Uso",
  metaDescription:
    "Los términos que rigen el uso del sitio de Dr. Libertad: qué ofrecemos, qué puedes hacer con el contenido y cuáles son los límites de nuestra responsabilidad.",
  brand: "Dr. Libertad",
  ogLocale: "es_ES",
  eyebrow: "LEGAL",
  title: "Términos de Uso",
  updated: "Última actualización: julio de 2026",
  intro:
    "Estos términos explican las reglas para usar este sitio y los contenidos de Dr. Libertad. Al navegar por aquí, suscribirte a nuestra lista, responder la investigación o interactuar con nuestros perfiles oficiales, aceptas lo que está escrito abajo. Si no estás de acuerdo, basta con no usar el servicio.",
  sections: [
    {
      h: "1. Quiénes somos",
      p: [
        "Dr. Libertad (“nosotros”) es un estudio editorial independiente que publica contenido sobre atención, comportamiento, dopamina y libertad mental — en este sitio, en libros y en nuestros perfiles oficiales en redes sociales.",
        `Para hablar con nosotros sobre cualquier asunto de estos términos, escribe a ${CONTACT}.`,
      ],
    },
    {
      h: "2. Qué ofrecemos",
      p: [
        "Contenido editorial y educativo: textos, imágenes y videos publicados en este sitio y en nuestras cuentas oficiales, de lectura libre y gratuita.",
        "Libros: obras de nuestra autoría, presentadas aquí y vendidas en plataformas de terceros (ver la sección 6).",
        "Investigación: un cuestionario de participación voluntaria sobre redes sociales y relaciones, cuyos resultados alimentan nuestro trabajo editorial.",
        "Lista de correo: un envío periódico para quien se suscribe por voluntad propia.",
      ],
    },
    {
      h: "3. Esto no es asesoramiento médico ni psicológico",
      p: [
        "Nuestro contenido es educativo y de opinión. No es diagnóstico, tratamiento, terapia ni sustituto del acompañamiento de un profesional de salud cualificado, y no establece ninguna relación clínica entre nosotros y tú.",
        "Si estás sufriendo, en crisis o necesitas atención de salud mental, busca a un profesional o el servicio de emergencia de tu región. Las decisiones que tomes a partir de lo que lees aquí son tuyas.",
      ],
    },
    {
      h: "4. Uso del sitio",
      p: [
        "Puedes leer, compartir y citar nuestro contenido libremente, siempre que atribuyas la autoría y no lo presentes como tuyo.",
        "Lo que no está permitido: reproducir el contenido íntegramente con fines comerciales sin nuestra autorización por escrito; alterar la obra y atribuírnosla; intentar invadir, sobrecargar o extraer datos del sitio de forma automatizada; y usar nuestros canales para acoso, spam o cualquier actividad ilegal.",
        "Podemos eliminar interacciones y restringir el acceso de quien incumpla estas reglas.",
      ],
    },
    {
      h: "5. Contenido y propiedad intelectual",
      p: [
        "Salvo indicación en contrario, el texto, la identidad visual, las ilustraciones y los videos publicados por nosotros son de nuestra autoría y están protegidos por derechos de autor. El uso descrito en la sección 4 no te transfiere la titularidad de nada.",
        "Parte del material usado en nuestros videos proviene de bancos de terceros, bajo las licencias de esos bancos; y parte del contenido se produce con apoyo de herramientas de inteligencia artificial, bajo nuestra dirección y revisión editorial.",
      ],
    },
    {
      h: "6. Libros y compras",
      p: [
        "No vendemos nada directamente en este sitio. Nuestros libros se venden en plataformas de terceros, y las páginas de aquí solo presentan la obra y llevan hasta ellas.",
        "Toda la compra — pago, entrega, garantía, reembolso y soporte — se rige por los términos de la plataforma donde compres, y es con ella que ocurre la transacción. Revisa sus condiciones antes de comprar.",
      ],
    },
    {
      h: "7. Lista de correo e investigación",
      p: [
        "La suscripción a la lista es voluntaria, y cada envío trae un enlace para darse de baja. Puedes salir cuando quieras, sin necesidad de justificarte.",
        "La participación en la investigación también es voluntaria y puedes abandonarla en cualquier momento. Al responder, aceptas que tus respuestas se usen de forma agregada en nuestro trabajo editorial.",
        "Cómo tratamos los datos de estas dos frentes está descrito en nuestra Política de Privacidad, que forma parte de estos términos.",
      ],
    },
    {
      h: "8. Enlaces y servicios de terceros",
      p: [
        "Nuestro sitio y nuestros contenidos apuntan a servicios que no controlamos — redes sociales, tiendas, bancos de medios y proveedores de infraestructura. No respondemos por su contenido, su disponibilidad ni sus prácticas de privacidad.",
        "Cuando interactúas con nosotros dentro de una red social, valen también los términos y las reglas de esa plataforma.",
      ],
    },
    {
      h: "9. Límites de nuestra responsabilidad",
      p: [
        "Ofrecemos el sitio y el contenido “tal como están”. Trabajamos para que sean correctos y estén disponibles, pero no garantizamos ausencia de errores, disponibilidad ininterrumpida ni que el contenido sirva a un objetivo específico tuyo.",
        "En la medida permitida por la ley aplicable, no respondemos por daños indirectos derivados del uso — o de la imposibilidad de uso — del sitio y del contenido. Nada aquí excluye responsabilidad que la ley no permita excluir.",
      ],
    },
    {
      h: "10. Cambios",
      p: [
        "Podemos actualizar estos términos. Los cambios relevantes se señalarán aquí, con nueva fecha de actualización en la parte superior. Seguir usando el sitio después de un cambio significa que lo aceptaste.",
      ],
    },
  ],
  contactNote: `¿Dudas sobre estos términos? Escribe a ${CONTACT}.`,
};

const en: TermsCopy = {
  metaTitle: "Terms of Service",
  metaDescription:
    "The terms governing the use of the Dr. Libertad website: what we offer, what you may do with the content, and the limits of our liability.",
  brand: "Dr. Libertad",
  ogLocale: "en_US",
  eyebrow: "LEGAL",
  title: "Terms of Service",
  updated: "Last updated: July 2026",
  intro:
    "These terms explain the rules for using this website and Dr. Libertad's content. By browsing here, subscribing to our list, answering our survey, or interacting with our official profiles, you agree to what is written below. If you do not agree, simply do not use the service.",
  sections: [
    {
      h: "1. Who we are",
      p: [
        "Dr. Libertad (“we”) is an independent editorial studio publishing content about attention, behaviour, dopamine, and mental freedom — on this website, in books, and on our official social media profiles.",
        `To reach us about anything in these terms, write to ${CONTACT}.`,
      ],
    },
    {
      h: "2. What we offer",
      p: [
        "Editorial and educational content: texts, images, and videos published on this website and on our official accounts, free to read.",
        "Books: works we author, presented here and sold through third-party platforms (see section 6).",
        "Survey: a voluntary questionnaire about social media and relationships, whose results feed our editorial work.",
        "Email list: a periodic newsletter for people who subscribe of their own accord.",
      ],
    },
    {
      h: "3. This is not medical or psychological advice",
      p: [
        "Our content is educational and opinion-based. It is not diagnosis, treatment, therapy, or a substitute for care from a qualified health professional, and it creates no clinical relationship between us and you.",
        "If you are suffering, in crisis, or need mental health care, seek a professional or your local emergency service. Decisions you make based on what you read here are your own.",
      ],
    },
    {
      h: "4. Using the site",
      p: [
        "You may read, share, and quote our content freely, as long as you credit the authorship and do not present it as your own.",
        "What is not allowed: reproducing the content in full for commercial purposes without our written permission; altering the work and attributing it to us; attempting to breach, overload, or automatically scrape the site; and using our channels for harassment, spam, or any unlawful activity.",
        "We may remove interactions and restrict access for anyone who breaks these rules.",
      ],
    },
    {
      h: "5. Content and intellectual property",
      p: [
        "Unless stated otherwise, the text, visual identity, illustrations, and videos we publish are authored by us and protected by copyright. The use described in section 4 transfers no ownership to you.",
        "Some of the footage in our videos comes from third-party stock libraries, under those libraries' licences; and some content is produced with the support of artificial intelligence tools, under our editorial direction and review.",
      ],
    },
    {
      h: "6. Books and purchases",
      p: [
        "We do not sell anything directly on this website. Our books are sold by third-party platforms, and the pages here only present the work and link to them.",
        "The entire purchase — payment, delivery, warranty, refund, and support — is governed by the terms of the platform where you buy, and the transaction happens with that platform. Check its conditions before buying.",
      ],
    },
    {
      h: "7. Email list and survey",
      p: [
        "Subscribing to the list is voluntary, and every message carries an unsubscribe link. You may leave whenever you want, with no need to explain.",
        "Taking part in the survey is also voluntary, and you may abandon it at any time. By answering, you agree that your answers may be used in aggregate form in our editorial work.",
        "How we handle the data from both is described in our Privacy Policy, which forms part of these terms.",
      ],
    },
    {
      h: "8. Third-party links and services",
      p: [
        "Our site and our content point to services we do not control — social networks, stores, media libraries, and infrastructure providers. We are not responsible for their content, their availability, or their privacy practices.",
        "When you interact with us inside a social network, that platform's terms and rules also apply.",
      ],
    },
    {
      h: "9. Limits of our liability",
      p: [
        "We provide the site and the content “as is”. We work to keep them accurate and online, but we do not guarantee freedom from errors, uninterrupted availability, or that the content fits any specific purpose of yours.",
        "To the extent permitted by applicable law, we are not liable for indirect damages arising from the use — or the inability to use — the site and the content. Nothing here excludes liability that the law does not allow to be excluded.",
      ],
    },
    {
      h: "10. Changes",
      p: [
        "We may update these terms. Relevant changes will be flagged here, with a new update date at the top. Continuing to use the site after a change means you accept it.",
      ],
    },
  ],
  contactNote: `Questions about these terms? Write to ${CONTACT}.`,
};

export const termsContent: Record<TermsLang, TermsCopy> = { pt, es, en };

// Caminho canônico da página em cada idioma (fonte única para metadata,
// sitemap e links internos).
export const TERMS_PATH: Record<TermsLang, string> = {
  pt: "/pt/termos",
  es: "/es/termos",
  en: "/terms",
};
