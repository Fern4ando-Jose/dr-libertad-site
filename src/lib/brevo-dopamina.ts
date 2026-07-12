// Cliente Brevo do funil PRÓPRIO do livro "I Love Dopamina" — ISOLADO do funil
// "100 dias para a Liberdade" (src/lib/brevo.ts). O lead NUNCA cai nas listas/faixas
// do 100 dias: aqui a lista é a EXCLUSIVA "I Love Dopamina", por idioma, e a fonte
// (FONTE) é marcada como "i-love-dopamina" para que nenhuma automação cruze audiências.
//
// A "faixa" (verde/amarelo/vermelho/critico) do quiz vira o atributo FAIXA para a
// segmentação da trilha DENTRO da lista do livro (verde→Cap3, amarelo→Cap5+6,
// vermelho→Cap8+10, critico→Cap11+8). Quem só pede a prévia (sem quiz) entra sem faixa.
//
// GATED (P2 / padrão da newsletter): sem BREVO_API_KEY no ambiente, NENHUMA chamada
// externa acontece — retorna { ok:true, gated:true } para a UX seguir. A lista ainda
// NÃO existe: quando o dono/marketing criar a lista "I Love Dopamina" no Brevo, basta
// setar BREVO_LIST_DOPAMINA_PT / BREVO_LIST_DOPAMINA_ES na Vercel. Sem elas, o contato
// é gravado só com os atributos (FONTE/FAIXA), sem entrar em lista — NUNCA inventamos ID.
// A chave nasce no painel do Brevo e mora no cofre; nunca em log/commit/PR (P3).

export type Faixa = "verde" | "amarelo" | "vermelho" | "critico";

const FAIXAS: Faixa[] = ["verde", "amarelo", "vermelho", "critico"];

/** Nome de env com o ID da lista Brevo "I Love Dopamina" por idioma. */
const LIST_ENV: Record<"pt" | "es", string> = {
  pt: "BREVO_LIST_DOPAMINA_PT",
  es: "BREVO_LIST_DOPAMINA_ES",
};

export function isFaixa(v: unknown): v is Faixa {
  return typeof v === "string" && (FAIXAS as string[]).includes(v);
}

/** true quando a chave existe — fora disso o cliente opera em modo gated (no-op). */
export function brevoConfigured(): boolean {
  return !!process.env.BREVO_API_KEY;
}

/** ID numérico da lista "I Love Dopamina" do idioma, ou null se não configurado. */
export function listIdForLang(lang: "pt" | "es"): number | null {
  const raw = process.env[LIST_ENV[lang]];
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface DopaminaLead {
  email: string;
  lang: "pt" | "es";
  /** "quiz" = veio do teste (tem faixa+score); "previa" = só pediu a prévia. */
  source: "quiz" | "previa";
  faixa?: Faixa;
  score?: number;
  /** UTM opcionais para medir origem→lead. */
  utm?: Partial<Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term", string>>;
}

/** Corpo do POST /v3/contacts — puro, testável, sem efeitos de rede. */
export function buildContactPayload(lead: DopaminaLead): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    FONTE: "i-love-dopamina",
    LANG: lead.lang,
    ORIGEM_FUNIL: lead.source,
  };
  if (lead.faixa) attributes.FAIXA = lead.faixa;
  if (typeof lead.score === "number") attributes.QUIZ_SCORE = lead.score;
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

/** Cria/atualiza o contato na lista "I Love Dopamina". No-op honesto quando gated. */
export async function upsertDopaminaContact(lead: DopaminaLead): Promise<BrevoResult> {
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
