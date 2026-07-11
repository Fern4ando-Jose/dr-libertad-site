// ─── Registro de contas / idiomas ─────────────────────────────────────────────
// Uma conta de Instagram por idioma/mercado. A "máquina" (footage, render, design)
// é a mesma; só mudam: idioma da copy, @handle, hashtags e as credenciais (token +
// account-id) da conta de destino.
//
// ES é a conta atual (@dr.liberdad) — usa as envs históricas, comportamento
// inalterado. PT-BR (@dr.liberdade.br) usa envs próprias `*_PT` (a preencher quando
// o token chegar). lang default = "es" em todos os pontos → ES nunca muda.

export type Lang = "es" | "pt";

export interface AccountCfg {
  lang: Lang;
  /** Nome do idioma para instruir o Claude (na própria língua do prompt). */
  langName: string;
  /** Nome de exibição da marca naquele idioma. */
  brand: string;
  /** Palavra-chave da marca (libertad/liberdade) usada no prompt. */
  freedom: string;
  /** @handle exibido no criativo (rodapé/CTA do Reel). */
  handle: string;
  /** Verbo "seguir" do CTA do Reel, no idioma da conta (ES "Sigue" / PT "Siga"). */
  ctaFollow: string;
  /** Linha "link da bio" do CTA do Reel, no idioma da conta. */
  ctaBio: string;
  /** Hashtags base da marca (o Claude adiciona temáticas por cima). */
  baseHashtags: string[];
  /** Nome da env var com o access token da conta. */
  tokenEnv: string;
  /** Nome da env var com o IG account-id da conta. */
  accountIdEnv: string;
  /** Chave no config (DB) do token — só ES tem (refresh automático). */
  dbTokenKey?: string;
  /**
   * Brief de MERCADO: instrução de criação NATIVA por país, injetada no topo do
   * prompt do `generateContent`. NÃO é tradução — manda o Claude regenerar o
   * roteiro pensando naquele público (gancho, referências, jeito de falar).
   * Vazio (ES) = prompt atual inalterado → conta no ar não muda.
   */
  marketBrief?: string;
}

export const ACCOUNTS: Record<Lang, AccountCfg> = {
  es: {
    lang: "es",
    langName: "español",
    brand: "Dr. Libertad",
    freedom: "libertad",
    handle: "@dr.liberdad",
    ctaFollow: "Sigue",
    ctaBio: "→ Más en el link de la bio",
    baseHashtags: ["#DrLibertad", "#LibertadMental"],
    tokenEnv: "META_ACCESS_TOKEN",
    accountIdEnv: "META_INSTAGRAM_ACCOUNT_ID",
    dbTokenKey: "meta_access_token",
  },
  pt: {
    lang: "pt",
    langName: "português do Brasil",
    brand: "Dr. Liberdade",
    freedom: "liberdade",
    handle: "@dr.liberdade.br",
    ctaFollow: "Siga",
    ctaBio: "→ Mais no link da bio",
    baseHashtags: ["#DrLiberdade", "#LiberdadeMental"],
    tokenEnv: "META_ACCESS_TOKEN_PT",
    accountIdEnv: "META_INSTAGRAM_ACCOUNT_ID_PT",
    // Refresh automático: 1ª rodada do cron lê a env META_ACCESS_TOKEN_PT,
    // renova e semeia esta chave no DB; daí em diante o DB é a fonte.
    dbTokenKey: "meta_access_token_pt",
    marketBrief: `Você está criando conteúdo ORIGINAL para o público BRASILEIRO — NÃO está traduzindo nem adaptando material de outro idioma ou mercado. Pense, escreva e provoque como um editor brasileiro nativo de Instagram. O mesmo TEMA deve virar um post DIFERENTE do espanhol: outro gancho, outras referências, outro jeito de falar. Regenere, não traduza.
- VOZ: português do Brasil coloquial e direto, como se fala no Instagram BR — caloroso, pessoal, tratando por "você". Zero espanholismos, zero estrutura traduzida, zero tom acadêmico ou de Portugal. Se soar "importado", está errado: refaça.
- GANCHO no estilo BR: identificação imediata e cotidiana ("Você faz isso e nem percebe…"), provocação leve ou virada inesperada, número concreto do dia a dia brasileiro. Nada de frase genérica de autoajuda.
- REFERÊNCIAS: ancore no cotidiano brasileiro quando couber (celular, WhatsApp, rolar o feed, notificação, grupo da família) — nunca termos neutros ou de outro país (ex.: "celular", nunca "móvel/móvil"). As cenas e exemplos devem soar Brasil.
- Os exemplos em espanhol abaixo são só de FORMATO; não os copie nem traduza — crie equivalentes brasileiros.
- NUNCA DIRIA (filtro anti-IA-genérica): PROIBIDO o registro coach/espiritual/corporativês — "ressignificar", "empoderar", "saia da zona de conforto", "o universo conspira", "se permita", "mindset", "fluir", "abundância", "manifestar", "amor próprio", "propósito", "boa vibe/energia", "pensar fora da caixa". Não pedir licença pela ideia ("não quero ofender, mas…"), não soar guru/salvador nem recrutar seguidores (a meta é fazer PENSAR), e não carimbar obra/autor/citação em cada ideia. Palavra só entra com sentido CONCRETO; ritmo seco, termina no osso.
- REVISÃO FINAL OBRIGATÓRIA: antes de devolver o JSON, releia TODO o texto (título, slides, cta, legenda) e troque QUALQUER palavra ou construção em espanhol por português do Brasil — ex.: punzada→pontada/fisgada, móvil→celular, disfrutar→curtir, ahora→agora, pantalla→tela. Não pode sobrar NENHUMA palavra em espanhol.`,
  },
};

/** Resolve o idioma a partir de ?lang= (default "es" — nunca quebra a conta ES). */
export function getLang(value: string | null | undefined): Lang {
  return value === "pt" ? "pt" : "es";
}

export function accountFor(lang: Lang): AccountCfg {
  return ACCOUNTS[lang] ?? ACCOUNTS.es;
}
