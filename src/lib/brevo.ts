// Cliente mínimo do Brevo (ex-Sendinblue) para a captura do quiz do funil
// "100 dias para a Liberdade". A "faixa" (verde/amarelo/vermelho/critico) vira o
// segmento do lead: gravamos o atributo FAIXA no contato e, se houver ID de lista
// por faixa (env BREVO_LIST_*), adicionamos o contato à lista — é o gancho que uma
// automação do Brevo usa para disparar a trilha de e-mail daquela faixa.
//
// GATED (§1.4 / padrão da newsletter): sem BREVO_API_KEY no ambiente, nenhuma chamada
// externa acontece — retorna { ok:true, gated:true } para a UX seguir e o servidor
// apenas registra a intenção. A chave nasce no painel do Brevo e mora no cofre; nunca
// é exposta em log/commit/PR (§1.3).

export type Faixa = "verde" | "amarelo" | "vermelho" | "critico";

export const FAIXAS: Faixa[] = ["verde", "amarelo", "vermelho", "critico"];

/** Nome de env com o ID da lista Brevo de cada faixa. */
// Env nova (_BR) com reserva no nome LEGADO que ainda vive na Vercel (_PT) — o

// idioma se chama BR (dono, 29/07/2026); renomear a env lá é passo à parte.

function envLegado(nome: string): string | undefined {

  return process.env[nome] ?? process.env[nome.replace(/_BR$/, "_PT")];

}

const LIST_ENV: Record<Faixa, string> = {
  verde: "BREVO_LIST_VERDE",
  amarelo: "BREVO_LIST_AMARELO",
  vermelho: "BREVO_LIST_VERMELHO",
  critico: "BREVO_LIST_CRITICO",
};

export function isFaixa(v: unknown): v is Faixa {
  return typeof v === "string" && (FAIXAS as string[]).includes(v);
}

/** true quando a chave existe — fora disso o cliente opera em modo gated (no-op). */
export function brevoConfigured(): boolean {
  return !!process.env.BREVO_API_KEY;
}

/** ID numérico da lista da faixa, ou null se não configurado (usa só o atributo FAIXA). */
export function listIdForFaixa(faixa: Faixa): number | null {
  const raw = envLegado(LIST_ENV[faixa]);
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface BrevoLead {
  email: string;
  faixa: Faixa;
  score: number;
  lang: "br" | "es";
}

/** Corpo do POST /v3/contacts — puro, testável, sem efeitos de rede. */
export function buildContactPayload(lead: BrevoLead): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    email: lead.email,
    updateEnabled: true, // idempotente: contato repetido é atualizado, não erra 400
    attributes: {
      FAIXA: lead.faixa,
      QUIZ_SCORE: lead.score,
      LANG: lead.lang,
      FONTE: "quiz-100-dias",
    },
  };
  const listId = listIdForFaixa(lead.faixa);
  if (listId) payload.listIds = [listId];
  return payload;
}

export type BrevoResult =
  | { ok: true; gated: true }
  | { ok: true; gated: false; status: number }
  | { ok: false; gated: false; status?: number; error: string };

/** Cria/atualiza o contato no Brevo com a faixa. No-op honesto quando gated. */
export async function upsertBrevoContact(lead: BrevoLead): Promise<BrevoResult> {
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
