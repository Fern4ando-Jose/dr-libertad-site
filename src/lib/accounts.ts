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
  /** Hashtags base da marca (o Claude adiciona temáticas por cima). */
  baseHashtags: string[];
  /** Nome da env var com o access token da conta. */
  tokenEnv: string;
  /** Nome da env var com o IG account-id da conta. */
  accountIdEnv: string;
  /** Chave no config (DB) do token — só ES tem (refresh automático). */
  dbTokenKey?: string;
}

export const ACCOUNTS: Record<Lang, AccountCfg> = {
  es: {
    lang: "es",
    langName: "español",
    brand: "Dr. Libertad",
    freedom: "libertad",
    handle: "@dr.liberdad",
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
    baseHashtags: ["#DrLiberdade", "#LiberdadeMental"],
    tokenEnv: "META_ACCESS_TOKEN_PT",
    accountIdEnv: "META_INSTAGRAM_ACCOUNT_ID_PT",
    // Refresh automático: 1ª rodada do cron lê a env META_ACCESS_TOKEN_PT,
    // renova e semeia esta chave no DB; daí em diante o DB é a fonte.
    dbTokenKey: "meta_access_token_pt",
  },
};

/** Resolve o idioma a partir de ?lang= (default "es" — nunca quebra a conta ES). */
export function getLang(value: string | null | undefined): Lang {
  return value === "pt" ? "pt" : "es";
}

export function accountFor(lang: Lang): AccountCfg {
  return ACCOUNTS[lang] ?? ACCOUNTS.es;
}
