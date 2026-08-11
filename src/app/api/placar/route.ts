import { NextRequest, NextResponse } from "next/server";
import { getInsights } from "@/lib/insights";
import {
  MINIMO_PARA_JULGAR,
  cruzarComMetricas,
  medianaEnvios,
  montarPlacar,
  veredito,
  type MetricaPeca,
  type RunPublicada,
} from "@/lib/placar-formatos";

// ─── O PLACAR POR FORMATO — o julgamento que faltava ──────────────────────────
// POR QUE ESTA ROTA EXISTE (2026-08-11): `src/lib/placar-formatos.ts` estava escrito,
// testado e DESLIGADO desde 09/08 — nenhum arquivo o chamava. Sem ele, a regra dura da
// biblioteca de formatos ("formato que não performa é DESCARTADO, não melhorado") não
// tinha como ser cumprida: 4 peças por dia, sete esqueletos, e nenhuma forma de saber
// qual deles está funcionando.
//
// As duas metades vivem em lugares diferentes e é isto que a rota junta:
//   · o FORMATO de cada peça está no livro-razão do site (`published_runs.formato`);
//   · o DESEMPENHO está no Instagram (alcance, ENVIOS, curtidas), por id de publicação.
//
// ⚠️ AS DUAS TRAVAS DO MÓDULO CONTINUAM DE PÉ, e não se afrouxam por conveniência:
//   1. formato com menos de 6 peças NÃO é reprovado (`MINIMO_PARA_JULGAR`) — reprovar
//      com 2 peças é ler ruído como sinal;
//   2. peça sem medição entra como `semDados`, NUNCA como zero. Ausência não é medição,
//      e um zero inventado reprovaria formato bom.
//
// A régua não é curtida: é ENVIO no direct (vale 3 a 5 vezes a curtida na régua de 2026),
// com alcance como desempate. Curtida entra só como contexto.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Peças publicadas com formato carimbado, das duas contas. */
async function runsCarimbadas(dias: number): Promise<{ runs: RunPublicada[]; erro: string | null }> {
  try {
    const { sql } = await import("@vercel/postgres");
    // A coluna `formato` é recente: onde ela ainda não existir, a consulta falha e a
    // resposta diz isso em vez de fingir um placar vazio.
    const r = await sql`
      SELECT instagram_post_id, formato
      FROM published_runs
      WHERE formato IS NOT NULL
        AND ts > NOW() - (${dias} || ' days')::interval
    `;
    return {
      runs: r.rows.map((x) => ({
        instagramPostId: (x.instagram_post_id as string) ?? null,
        formato: (x.formato as string) ?? null,
      })),
      erro: null,
    };
  } catch (e) {
    return { runs: [], erro: String(e) };
  }
}

export async function GET(req: NextRequest) {
  // Mesma porta do /api/insights: o placar consome quota da Graph API e mostra
  // desempenho do perfil.
  const secret = process.env.INSIGHTS_TOKEN || process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  const autorizado = Boolean(secret) && (auth === `Bearer ${secret}` || key === secret);
  if (!autorizado) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dias = Math.min(Math.max(Number(req.nextUrl.searchParams.get("dias") ?? 90), 7), 365);

  const { runs, erro } = await runsCarimbadas(dias);

  // Métricas das DUAS contas: a mesma vaga sai em ES e BR, e cada uma tem o seu id.
  const metricas: MetricaPeca[] = [];
  const contasComErro: string[] = [];
  for (const lang of ["es", "br"] as const) {
    try {
      const ins = await getInsights(lang);
      for (const it of ins.items) {
        metricas.push({ id: it.id, reach: it.reach ?? null, shares: it.shares ?? null, likes: it.likes ?? null });
      }
    } catch {
      contasComErro.push(lang);
    }
  }

  const pecas = cruzarComMetricas(runs, metricas);
  const linhas = montarPlacar(pecas);
  const mediana = medianaEnvios(linhas);

  return NextResponse.json(
    {
      ok: !erro,
      geradoEm: new Date().toISOString(),
      janelaDias: dias,
      minimoParaJulgar: MINIMO_PARA_JULGAR,
      medianaEnviosPorPeca: mediana,
      // Sem peça carimbada o placar diz isso na cara — não devolve lista vazia como se
      // fosse resultado. Foi o defeito que fez a casa achar que "o placar não funciona".
      diagnostico: erro
        ? `banco indisponível ou coluna formato ausente: ${erro}`
        : runs.length === 0
          ? "nenhuma peça com formato carimbado na janela — o placar não tem o que contar"
          : contasComErro.length
            ? `métricas indisponíveis para: ${contasComErro.join(", ")}`
            : null,
      pecasCarimbadas: runs.length,
      linhas: linhas.map((l) => ({ ...l, veredito: veredito(l, mediana) })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
