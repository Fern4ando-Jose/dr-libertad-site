// ─── Registro de contas / idiomas ─────────────────────────────────────────────
// Uma conta de Instagram por idioma/mercado. A "máquina" (footage, render, design)
// é a mesma; só mudam: idioma da copy, @handle e as credenciais (token +
// account-id) da conta de destino.
//
// ES é a conta atual (@dr.liberdad) — usa as envs históricas, comportamento
// inalterado. BR (@dr.liberdade.br) usa envs próprias. lang default = "es" em
// todos os pontos → ES nunca muda.
//
// ⛔ HASHTAGS não vivem aqui (não são config fixa por conta) — o prompt de
// `generateContent` (api/publish/route.ts) exige 3-5 hashtags ESPECÍFICAS DO TEMA
// por peça, no máximo 1 de marca "e só se encaixar". Existiu um campo `baseHashtags`
// aqui até 2026-08-23 — nunca foi lido por nenhum código (dead code), mas era
// exatamente a forma do defeito medido pelo dono (mesmas hashtags sempre = lido como
// spam). Removido para não confundir quem procurar "onde estão as hashtags fixas".
//
// ⛔ O IDIOMA SE CHAMA "br" (ordem do dono, 29/07/2026 — "não existe o idioma PT").
// O código antigo "pt" sobrevive SÓ como LEGADO DE FRONTEIRA, isolado nas funções
// DESTE arquivo: entrada antiga (getLang), linha antiga de banco (langLegado),
// nome antigo de variável na Vercel (campos *Legado + envToken/envAccountId) e o
// código ISO que provedores externos exigem (isoDe/iso3De). Nenhum outro arquivo
// escreve "pt".

export type Lang = "es" | "br";

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
  /** Verbo "seguir" do CTA do Reel, no idioma da conta (ES "Sigue" / BR "Siga"). */
  ctaFollow: string;
  /** Linha "link da bio" do CTA do Reel, no idioma da conta. */
  ctaBio: string;
  /** Nome da env var com o access token da conta. */
  tokenEnv: string;
  /** Nome LEGADO da env na Vercel (era do rótulo antigo) — lido só como reserva. */
  tokenEnvLegado?: string;
  /** Nome da env var com o IG account-id da conta. */
  accountIdEnv: string;
  /** Nome LEGADO da env na Vercel — lido só como reserva. */
  accountIdEnvLegado?: string;
  /** Chave no config (DB) do token — contas com refresh automático. */
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
    tokenEnv: "META_ACCESS_TOKEN",
    accountIdEnv: "META_INSTAGRAM_ACCOUNT_ID",
    dbTokenKey: "meta_access_token",
  },
  br: {
    lang: "br",
    langName: "português do Brasil",
    brand: "Dr. Liberdade",
    freedom: "liberdade",
    handle: "@dr.liberdade.br",
    ctaFollow: "Siga",
    ctaBio: "→ Mais no link da bio",
    tokenEnv: "META_ACCESS_TOKEN_BR",
    tokenEnvLegado: "META_ACCESS_TOKEN_PT",
    accountIdEnv: "META_INSTAGRAM_ACCOUNT_ID_BR",
    accountIdEnvLegado: "META_INSTAGRAM_ACCOUNT_ID_PT",
    // Refresh automático: o DB é a fonte (chave nova; /api/migrate copia a linha
    // antiga meta_access_token_pt para cá uma única vez, sem apagar nada).
    dbTokenKey: "meta_access_token_br",
    marketBrief: `Você está criando conteúdo ORIGINAL para o público BRASILEIRO — NÃO está traduzindo nem adaptando material de outro idioma ou mercado. Pense, escreva e provoque como um editor brasileiro nativo de Instagram. O mesmo TEMA deve virar um post DIFERENTE do espanhol: outro gancho, outras referências, outro jeito de falar. Regenere, não traduza.
- VOZ: português do Brasil coloquial e direto, como se fala no Instagram BR — caloroso, pessoal, tratando por "você". Zero espanholismos, zero estrutura traduzida, zero tom acadêmico ou de Portugal. Se soar "importado", está errado: refaça.
- GANCHO no estilo BR: identificação imediata e cotidiana ("Você faz isso e nem percebe…"), provocação leve ou virada inesperada, número concreto do dia a dia brasileiro. Nada de frase genérica de autoajuda.
- REFERÊNCIAS: ancore no cotidiano brasileiro quando couber (celular, WhatsApp, rolar o feed, notificação, grupo da família) — nunca termos neutros ou de outro país (ex.: "celular", nunca "móvel/móvil"). As cenas e exemplos devem soar Brasil.
- Os exemplos em espanhol abaixo são só de FORMATO; não os copie nem traduza — crie equivalentes brasileiros.
- NUNCA DIRIA (filtro anti-IA-genérica): PROIBIDO o registro coach/espiritual/corporativês — "ressignificar", "empoderar", "saia da zona de conforto", "o universo conspira", "se permita", "mindset", "fluir", "abundância", "manifestar", "amor próprio", "propósito", "boa vibe/energia", "pensar fora da caixa". Não pedir licença pela ideia ("não quero ofender, mas…"), não soar guru/salvador nem recrutar seguidores (a meta é fazer PENSAR), e não carimbar obra/autor/citação em cada ideia. Palavra só entra com sentido CONCRETO; ritmo seco, termina no osso.
- REVISÃO FINAL OBRIGATÓRIA: antes de devolver o JSON, releia TODO o texto (título, slides, cta, legenda) e troque QUALQUER palavra ou construção em espanhol por português do Brasil — ex.: punzada→pontada/fisgada, móvil→celular, disfrutar→curtir, ahora→agora, pantalla→tela. Não pode sobrar NENHUMA palavra em espanhol.`,
  },
};

/**
 * Resolve o idioma a partir de ?lang= (default "es" — nunca quebra a conta ES).
 * Aceita o código LEGADO "pt"/"pt-BR" (cron antigo, URL antiga, linha antiga de
 * banco) e o converte para "br" — chamada antiga nunca quebra.
 */
export function getLang(value: string | null | undefined): Lang {
  const v = String(value ?? "").toLowerCase();
  return v === "br" || v === "pt" || v === "pt-br" ? "br" : "es";
}

export function accountFor(lang: Lang): AccountCfg {
  return ACCOUNTS[lang] ?? ACCOUNTS.es;
}

/**
 * Endereço do perfil no Instagram, DERIVADO do handle acima.
 *
 * Existe para que URL e @ não possam divergir. Até 01/08/2026 divergiam: as
 * páginas em espanhol (`/el-estudio`, `/investigacion/gracias`) mandavam o
 * leitor para `instagram.com/dr.libertad` — com T, contaminado pelo domínio
 * drliber**t**ad.com — enquanto a conta real, a que publica todo dia, é
 * `@dr.libe`**`rd`**`ad`. O perfil com T existe, é de outra pessoa e estava
 * vazio: quem respondia a pesquisa em espanhol e clicava em "Seguir" caía numa
 * conta que não é a nossa, no ponto do funil onde o seguidor custa mais caro.
 *
 * Escrever o endereço à mão foi o que permitiu o erro. Agora só há um lugar
 * onde o @ é escrito (`ACCOUNTS[lang].handle`) e tudo mais é calculado a partir
 * dele — divergir deixou de ser possível, não apenas de ser proibido.
 */
export function instagramUrlDe(lang: Lang): string {
  return `https://www.instagram.com/${accountFor(lang).handle.replace(/^@/, "")}`;
}

/** Valor que linhas ANTIGAS do banco usam para este idioma (gravadas antes de 29/07/2026). */
export function langLegado(lang: string): string {
  return lang === "br" ? "pt" : lang;
}

/** Código ISO 639-1 exigido por provedores externos (TTS): a língua do Brasil é "pt" no padrão ISO. */
export function isoDe(lang: string): "pt" | "es" {
  return getLang(lang) === "br" ? "pt" : "es";
}

/** Código ISO 639-3 (Scribe). */
export function iso3De(lang: string): "por" | "spa" {
  return getLang(lang) === "br" ? "por" : "spa";
}

/** Token da conta via env — tenta o nome novo e cai no nome legado da Vercel. */
export function envToken(acc: AccountCfg): string {
  return process.env[acc.tokenEnv] ?? (acc.tokenEnvLegado ? process.env[acc.tokenEnvLegado] : undefined) ?? "";
}

/** IG account-id via env — nome novo com reserva no legado. */
export function envAccountId(acc: AccountCfg): string {
  return process.env[acc.accountIdEnv] ?? (acc.accountIdEnvLegado ? process.env[acc.accountIdEnvLegado] : undefined) ?? "";
}
