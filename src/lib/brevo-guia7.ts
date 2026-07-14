// Cliente Brevo do funil "Guia de 7 dias" (lead magnet do comment→DM, Reel C).
// ISOLADO das outras listas (100 dias / I Love Dopamina): a FONTE é marcada como
// "guia-7-dias" e a lista é a EXCLUSIVA do guia, por idioma — nenhuma automação cruza
// audiências.
//
// ESCOPO desta peça: só ADICIONA o contato à lista do guia (opt-in do reforço diário).
// NÃO dispara e-mail daqui. A trilha dos 7 e-mails é uma AUTOMAÇÃO do Brevo (montada no
// painel), ativada só com OK do dono — enviar e-mail é publicação (P4/P7). O código não
// publica texto não aprovado.
//
// GATED (P2 / padrão dos outros funis): sem BREVO_API_KEY, NENHUMA chamada externa
// acontece — retorna { ok:true, gated:true } e o lead segue sendo persistido no Neon.
// Sem BREVO_LIST_GUIA7_<LANG> a lista ainda não existe: grava só os atributos, sem
// listIds — NUNCA inventa ID. A chave nasce no painel Brevo e mora no cofre; nunca em
// log/commit/PR (P3).

/** Nome de env com o ID da lista Brevo "Guia de 7 dias" por idioma. */
const LIST_ENV: Record<"pt" | "es", string> = {
  pt: "BREVO_LIST_GUIA7_PT",
  es: "BREVO_LIST_GUIA7_ES",
};

/** true quando a chave existe — fora disso o cliente opera em modo gated (no-op). */
export function brevoConfigured(): boolean {
  return !!process.env.BREVO_API_KEY;
}

/** ID numérico da lista do guia no idioma, ou null se não configurado. */
export function listIdForLang(lang: "pt" | "es"): number | null {
  const raw = process.env[LIST_ENV[lang]];
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface Guia7Lead {
  email: string;
  lang: "pt" | "es";
  /** UTM opcionais para medir origem→lead. */
  utm?: Partial<Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term", string>>;
}

/** Corpo do POST /v3/contacts — puro, testável, sem efeitos de rede. */
export function buildContactPayload(lead: Guia7Lead): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    FONTE: "guia-7-dias",
    LANG: lead.lang,
    ORIGEM_FUNIL: "reel-c",
  };
  const utm = lead.utm ?? {};
  if (utm.utm_source) attributes.UTM_SOURCE = utm.utm_source;
  if (utm.utm_medium) attributes.UTM_MEDIUM = utm.utm_medium;
  if (utm.utm_campaign) attributes.UTM_CAMPAIGN = utm.utm_campaign;

  const payload: Record<string, unknown> = {
    email: lead.email,
    updateEnabled: true, // idempotente: contato repetido é atualizado, não erra 400
    attributes,
  };
  const listId = listIdForLang(lead.lang);
  if (listId) payload.listIds = [listId];
  return payload;
}

export type BrevoResult =
  | { ok: true; gated: true }
  | { ok: true; gated: false; status: number }
  | { ok: false; gated: false; status?: number; error: string };

/** Cria/atualiza o contato na lista do guia. No-op honesto quando gated. */
export async function upsertGuia7Contact(lead: Guia7Lead): Promise<BrevoResult> {
  const key = process.env.BREVO_API_KEY;
  if (!key) return { ok: true, gated: true };

  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": key,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(buildContactPayload(lead)),
    });
    // 201 = criado, 204 = atualizado (updateEnabled). Ambos são sucesso.
    if (res.status === 201 || res.status === 204) {
      return { ok: true, gated: false, status: res.status };
    }
    const body = await res.text().catch(() => "");
    return { ok: false, gated: false, status: res.status, error: body.slice(0, 300) };
  } catch (err) {
    return { ok: false, gated: false, error: String(err) };
  }
}
