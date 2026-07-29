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
// setar BREVO_LIST_DOPAMINA_BR / BREVO_LIST_DOPAMINA_ES na Vercel. Sem elas, o contato
// é gravado só com os atributos (FONTE/FAIXA), sem entrar em lista — NUNCA inventamos ID.
// A chave nasce no painel do Brevo e mora no cofre; nunca em log/commit/PR (P3).

export type Faixa = "verde" | "amarelo" | "vermelho" | "critico";

const FAIXAS: Faixa[] = ["verde", "amarelo", "vermelho", "critico"];

/** Nome de env com o ID da lista Brevo "I Love Dopamina" por idioma. */
// Env nova (_BR) com reserva no nome LEGADO que ainda vive na Vercel (_PT) — o

// idioma se chama BR (dono, 29/07/2026); renomear a env lá é passo à parte.

function envLegado(nome: string): string | undefined {

  return process.env[nome] ?? process.env[nome.replace(/_BR$/, "_PT")];

}

const LIST_ENV: Record<"br" | "es", string> = {
  br: "BREVO_LIST_DOPAMINA_BR",
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
export function listIdForLang(lang: "br" | "es"): number | null {
  const raw = envLegado(LIST_ENV[lang]);
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface DopaminaLead {
  email: string;
  lang: "br" | "es";
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

// ── E0: entrega imediata da prévia (e-mail TRANSACIONAL) ──────────────────────
// A tela de sucesso do funil promete "a prévia está a caminho da sua caixa de
// entrada". Quem cumpre essa promessa é este envio: um e-mail transacional Brevo
// (POST /v3/smtp/email) com o LINK da prévia (PDF em public/lead) — o E0 do funil.
//
// O CONTEÚDO do e-mail vive num TEMPLATE do Brevo (editado/aprovado pelo dono no
// painel — P4/P7: o dono aprova a prova do e-mail LÁ, sem deploy), referenciado por
// env BREVO_TEMPLATE_DOPAMINA_PREVIA_BR / _ES (ou o global _..._PREVIA). O código só
// dispara com o parâmetro {{ params.PREVIA_URL }} para o botão "Baixar a prévia".
// NÃO embutimos o rascunho E0 no código (seria publicar texto não aprovado).
//
// GATED e HONESTO: sem BREVO_API_KEY → { gated, reason:"no_api_key" }; sem template →
// { gated, reason:"no_template" }. Nunca engole a falha: o chamador loga o motivo e
// persiste o lead para não se perder.

/** Nome de env com o ID do template Brevo do E0 (entrega da prévia) por idioma. */
const PREVIA_TEMPLATE_ENV: Record<"br" | "es", string> = {
  br: "BREVO_TEMPLATE_DOPAMINA_PREVIA_BR",
  es: "BREVO_TEMPLATE_DOPAMINA_PREVIA_ES",
};

/** ID numérico do template do E0 no idioma, ou null se não configurado. */
export function previaTemplateId(lang: "br" | "es"): number | null {
  const raw = envLegado(PREVIA_TEMPLATE_ENV[lang]) || process.env.BREVO_TEMPLATE_DOPAMINA_PREVIA;
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Remetente do e-mail (opcional: o template do Brevo já traz o seu). */
export function previaSender(): { email: string; name?: string } | undefined {
  const email = process.env.BREVO_SENDER_EMAIL;
  if (!email) return undefined;
  const name = process.env.BREVO_SENDER_NAME;
  return name ? { email, name } : { email };
}

export interface PreviaEmail {
  email: string;
  lang: "br" | "es";
  /** URL ABSOLUTA do PDF da prévia (ex.: https://.../lead/..._PT.pdf). */
  previaUrl: string;
  templateId: number;
  sender?: { email: string; name?: string };
}

/** Corpo do POST /v3/smtp/email — puro, testável, sem efeitos de rede. */
export function buildPreviaEmailPayload(input: PreviaEmail): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    to: [{ email: input.email }],
    templateId: input.templateId,
    // O template usa {{ params.PREVIA_URL }} no botão de download.
    params: { PREVIA_URL: input.previaUrl, LANG: input.lang },
    tags: ["dopamina", "previa-e0", input.lang],
  };
  if (input.sender?.email) {
    payload.sender = input.sender.name
      ? { email: input.sender.email, name: input.sender.name }
      : { email: input.sender.email };
  }
  return payload;
}

export type PreviaSendResult =
  | { ok: true; gated: true; reason: "no_api_key" | "no_template" }
  | { ok: true; gated: false; status: number; messageId?: string }
  | { ok: false; gated: false; status?: number; error: string };

/**
 * Envia o E0 (entrega da prévia) por e-mail transacional. No-op HONESTO quando gated:
 * devolve o MOTIVO (sem chave / sem template) para o chamador logar — nunca silencioso.
 */
export async function sendPreviaEmail(input: {
  email: string;
  lang: "br" | "es";
  previaUrl: string;
}): Promise<PreviaSendResult> {
  const key = process.env.BREVO_API_KEY;
  if (!key) return { ok: true, gated: true, reason: "no_api_key" };
  const templateId = previaTemplateId(input.lang);
  if (!templateId) return { ok: true, gated: true, reason: "no_template" };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": key,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(
        buildPreviaEmailPayload({ ...input, templateId, sender: previaSender() }),
      ),
    });
    // 201 = e-mail aceito para envio.
    if (res.status === 201) {
      const j = (await res.json().catch(() => ({}))) as { messageId?: string };
      return { ok: true, gated: false, status: 201, messageId: j?.messageId };
    }
    const body = await res.text().catch(() => "");
    return { ok: false, gated: false, status: res.status, error: body.slice(0, 300) };
  } catch (err) {
    return { ok: false, gated: false, error: String(err) };
  }
}
