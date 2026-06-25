// ─── Newsletter semanal (e-mail) ─────────────────────────────────────────────
// Captação já existe (/api/subscribe → tabela `subscribers`). Este módulo é a
// CAMADA DE ENVIO: monta o e-mail semanal HÍBRIDO (curadoria da semana + 1 ensaio
// curto na voz da marca) e o template, como FUNÇÕES PURAS (testáveis). O I/O
// (Anthropic, Resend, banco) fica na rota /api/newsletter/send.
//
// Voz: reusa `buildVoiceDirective` (mesma alma do engajamento/criação) — a linha
// editorial mora OFFLINE, então a voz tem de estar versionada no repo.
//
// REGRA INVIOLÁVEL (legal + a própria Política de Privacidade promete): TODO e-mail
// carrega link de DESCADASTRO. `renderEmail` exige `unsubUrl` e o injeta sempre;
// `newsletter.invariants.test.ts` barra qualquer template sem ele.

import type { AccountCfg } from "./accounts";
import { buildVoiceDirective } from "./voice";

export type Lang = "pt" | "es";

// Rótulos do CHROME do e-mail (não é o conteúdo — é a moldura). Bilíngue, local
// (o e-mail roda fora do dicionário React do site).
const UI: Record<Lang, {
  curadoria: string;
  curadoriaLead: string;
  seeOnIg: string;
  whyReceiving: string;
  unsub: string;
  preferToStop: string;
}> = {
  pt: {
    curadoria: "Essa semana no Instagram",
    curadoriaLead: "O que saiu — pra você não perder o fio.",
    seeOnIg: "Ver no Instagram",
    whyReceiving: "Você recebe este e-mail porque se inscreveu na lista da Dr. Liberdade.",
    unsub: "Cancelar inscrição",
    preferToStop: "Prefere não receber mais?",
  },
  es: {
    curadoria: "Esta semana en Instagram",
    curadoriaLead: "Lo que salió — para que no pierdas el hilo.",
    seeOnIg: "Ver en Instagram",
    whyReceiving: "Recibes este correo porque te suscribiste a la lista de Dr. Libertad.",
    unsub: "Cancelar suscripción",
    preferToStop: "¿Prefieres no recibir más?",
  },
};

// Endereço remetente. Display por idioma; domínio próprio (precisa estar verificado
// no Resend — DNS). Override por env NEWSLETTER_FROM_ADDR.
export function newsletterFrom(acc: AccountCfg): string {
  const addr = process.env.NEWSLETTER_FROM_ADDR || "newsletter@drlibertad.com";
  return `${acc.brand} <${addr}>`;
}

// ─── Prompt do ensaio (gerado pela Anthropic na rota) ─────────────────────────
// Pede um mini-ensaio curto + assunto, em JSON estrito. A VOZ entra via diretiva
// reutilizável; os temas da semana servem de SEMENTE (não de tradução).
export function buildEssayPrompt(acc: AccountCfg, recentTopics: string[]): string {
  const seeds = recentTopics.length
    ? `\nTEMAS QUE A MARCA TOCOU ESSA SEMANA (use como inspiração, NÃO os repita literalmente):\n- ${recentTopics.slice(0, 8).join("\n- ")}\n`
    : "";

  return `${buildVoiceDirective(acc)}
${seeds}
TAREFA: escreve o ENSAIO da newsletter semanal — um texto curto, original e provocativo, na voz acima. NÃO é um resumo dos posts; é uma ideia inteira, com começo/meio/fim, que faz a pessoa parar e pensar. Fecha forte (sem moral de autoajuda).

FORMATO (responde SÓ com JSON válido, sem cercas de código):
{
  "subject": "assunto do e-mail — provocativo, concreto, SEM emoji, máx 60 caracteres",
  "paragraphs": ["parágrafo 1", "parágrafo 2", "parágrafo 3 opcional"]
}
REGRAS: 2 a 3 parágrafos curtos (máx ~85 palavras cada). Segunda pessoa. Idioma: ${acc.lang === "es" ? "espanhol" : "português do Brasil"}. Nada de saudação ("Olá")/assinatura/PS — só o ensaio.`;
}

// ─── Template do e-mail (puro) ────────────────────────────────────────────────

export interface CuradoriaItem {
  title: string;
}

export interface RenderInput {
  lang: Lang;
  brand: string;
  handle: string;
  instagramUrl: string;
  subject: string;
  essayParas: string[];
  curadoria: CuradoriaItem[];
  unsubUrl: string;
  siteUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ESC[c]);
}

// E-mail seguro p/ clientes: tabelas + estilo inline + fontes web-safe (Georgia
// ecoa a Fraunces serif da marca). Paleta da marca (ink/offwhite/muted-red).
export function renderEmail(input: RenderInput): RenderedEmail {
  const ui = UI[input.lang];
  const subject = input.subject.trim();
  const paras = input.essayParas
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.75;color:#E7DDCC;">${esc(
          p
        )}</p>`
    )
    .join("");

  const curated = input.curadoria.length
    ? `
      <tr><td style="padding:8px 32px 4px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A45A5A;">${esc(
          ui.curadoria
        )}</div>
        <div style="font-family:Georgia,serif;font-size:14px;color:#B9B0A2;margin-top:6px;">${esc(
          ui.curadoriaLead
        )}</div>
      </td></tr>
      ${input.curadoria
        .map(
          (c) => `
      <tr><td style="padding:6px 32px;">
        <div style="border-left:2px solid #A45A5A;padding-left:14px;font-family:Georgia,serif;font-size:16px;line-height:1.4;color:#F4F0E8;">${esc(
          c.title
        )}</div>
      </td></tr>`
        )
        .join("")}
      <tr><td style="padding:14px 32px 4px;">
        <a href="${esc(input.instagramUrl)}" style="display:inline-block;background:#A45A5A;color:#0B0B0C;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:11px 20px;border-radius:999px;">${esc(
          ui.seeOnIg
        )} ${esc(input.handle)} →</a>
      </td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="${input.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(
    subject
  )}</title></head>
<body style="margin:0;padding:0;background:#0B0B0C;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(subject)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0C;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0B0B0C;">
        <tr><td style="padding:8px 32px 18px;border-bottom:1px solid rgba(185,176,162,0.16);">
          <div style="font-family:Georgia,serif;font-size:22px;font-weight:bold;letter-spacing:-0.5px;color:#F4F0E8;">${esc(
            input.brand
          )}</div>
          <div style="height:2px;width:34px;background:#A45A5A;margin-top:8px;"></div>
        </td></tr>

        <tr><td style="padding:30px 32px 6px;">
          <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:26px;line-height:1.18;letter-spacing:-0.5px;color:#F4F0E8;">${esc(
            subject
          )}</h1>
          ${paras}
        </td></tr>

        ${curated ? `<tr><td style="padding:18px 0 0;"><div style="height:1px;background:rgba(185,176,162,0.14);margin:0 32px;"></div></td></tr>${curated}` : ""}

        <tr><td style="padding:34px 32px 28px;">
          <div style="height:1px;background:rgba(185,176,162,0.14);margin-bottom:20px;"></div>
          <div style="font-family:Arial,sans-serif;font-size:12px;line-height:1.7;color:#8A8273;">
            ${esc(ui.whyReceiving)}<br>
            ${esc(ui.preferToStop)} <a href="${esc(
    input.unsubUrl
  )}" style="color:#A45A5A;text-decoration:underline;">${esc(ui.unsub)}</a>.
          </div>
          <div style="font-family:Georgia,serif;font-size:13px;color:#5F5A50;margin-top:14px;">${esc(
            input.brand
          )} · ${esc(input.handle)}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    input.brand,
    "",
    subject,
    "",
    ...input.essayParas,
    "",
    input.curadoria.length ? `— ${ui.curadoria} —` : "",
    ...input.curadoria.map((c) => `• ${c.title}`),
    input.curadoria.length ? `${ui.seeOnIg}: ${input.instagramUrl}` : "",
    "",
    "—",
    ui.whyReceiving,
    `${ui.unsub}: ${input.unsubUrl}`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  return { subject, html, text };
}
