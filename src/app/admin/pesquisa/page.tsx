"use client";

// ─── Painel · Pesquisa "Redes Sociais e Relacionamentos" ─────────────────────
// A aba onde o dono ACOMPANHA a pesquisa: se o motor está coletando, quantas
// respostas por dia, de qual anúncio vieram, como cada item está se distribuindo,
// e as últimas respostas inteiras (é assim que se confere uma resposta-teste).
// Lê só de GET /api/survey/results (Bearer ADMIN_TOKEN, guardado no navegador).
// Nenhuma escrita — este painel não altera nada da pesquisa.

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminTabs from "../AdminTabs";
import { PNR } from "@/lib/survey-schema";
import { optionLabel, orderedValues, questionSpec, questionText, screenTitle } from "@/lib/survey-labels";
import { sourceKey } from "@/lib/survey-source";
import type { SurveyAggregate } from "@/lib/survey-aggregate";

type Latest = {
  id: number;
  lang: "br" | "es";
  created_at: string;
  source: Record<string, string> | null;
  email: string | null;
  answers: Record<string, string | number | string[]>;
};

type Results = SurveyAggregate & { ok: true; ready: boolean; latest: Latest[] };

const DAYS_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "all", label: "Tudo" },
] as const;

const LANG_OPTIONS = [
  { value: "", label: "BR + ES" },
  { value: "br", label: "BR" },
  { value: "es", label: "ES" },
] as const;

const card = "rounded-3xl border border-warm-gray/15 bg-white/[0.03] p-6 backdrop-blur";
const label = "text-xs tracking-[0.22em] text-warm-gray/80 uppercase";

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function agoLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

function pct(n: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

export default function PesquisaAdmin() {
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [days, setDays] = useState<string>("30");
  const [lang, setLang] = useState<string>("");
  const [data, setData] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openItems, setOpenItems] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const t = typeof window !== "undefined" ? window.localStorage.getItem("dl_admin_token") : null;
    if (t) setSavedToken(t);
  }, []);

  const load = useCallback(async () => {
    if (!savedToken) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ days });
      if (lang) qs.set("lang", lang);
      const res = await fetch(`/api/survey/results?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${savedToken}` },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setError(res.status === 401 ? "Token inválido — confira o ADMIN_TOKEN da Vercel." : json?.error ?? "Falha ao ler.");
        setData(null);
        return;
      }
      setData(json as Results);
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }, [savedToken, days, lang]);

  useEffect(() => {
    void load();
  }, [load]);

  async function downloadCsv(withEmail: boolean) {
    if (!savedToken) return;
    const qs = new URLSearchParams({ days, format: "csv" });
    if (lang) qs.set("lang", lang);
    if (!withEmail) qs.set("email", "0");
    try {
      const res = await fetch(`/api/survey/results?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${savedToken}` },
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Falha ao baixar o CSV.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pesquisa-${lang || "todos"}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Erro de rede no download.");
    }
  }

  const maxDay = useMemo(
    () => (data ? Math.max(1, ...data.byDay.map((d) => d.total)) : 1),
    [data]
  );

  function saveToken() {
    const t = token.trim();
    if (!t) return;
    window.localStorage.setItem("dl_admin_token", t);
    setSavedToken(t);
    setToken("");
  }
  function forgetToken() {
    window.localStorage.removeItem("dl_admin_token");
    setSavedToken(null);
    setData(null);
  }

  if (!savedToken) {
    return (
      <main className="min-h-screen bg-ink text-offwhite px-6 py-20">
        <div className="mx-auto max-w-md">
          <div className={label}>Painel · Dr. Libertad</div>
          <h1 className="mt-3 font-serif text-3xl">Pesquisa</h1>
          <p className="mt-4 text-sm leading-relaxed text-warm-gray/90">
            Cole o <strong>ADMIN_TOKEN</strong> (setado na Vercel) para ver os resultados.
          </p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ADMIN_TOKEN"
            className="mt-5 w-full rounded-xl border border-warm-gray/20 bg-white/5 px-4 py-3 text-sm outline-none focus:border-muted-red"
          />
          <button onClick={saveToken} className="mt-4 rounded-xl bg-muted-red px-5 py-3 text-sm font-medium text-offwhite hover:opacity-90">
            Entrar
          </button>
        </div>
      </main>
    );
  }

  const t = data?.totals;
  const collecting = !!t && t.total > 0;

  return (
    <main className="min-h-screen bg-ink text-offwhite px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className={label}>● Pesquisa · Redes Sociais e Relacionamentos</div>
            <h1 className="mt-2 font-serif text-3xl leading-tight">Quem respondeu — e o que disseram</h1>
          </div>
          <button onClick={forgetToken} className="mt-1 text-xs text-warm-gray/60 underline hover:text-warm-gray">
            sair
          </button>
        </div>

        <div className="mt-6">
          <AdminTabs />
        </div>

        {/* Semáforo do motor: a primeira pergunta é sempre "está coletando?" */}
        <div
          className={`${card} flex flex-wrap items-center justify-between gap-4 ${
            collecting ? "border-emerald-400/25" : "border-warm-gray/15"
          }`}
        >
          <div>
            <div className={label}>{collecting ? "Coletando" : "Sem resposta na janela"}</div>
            <p className="mt-2 text-sm leading-relaxed text-warm-gray/90">
              {collecting && t?.last ? (
                <>
                  Última resposta <strong className="text-offwhite">{agoLabel(t.last)}</strong> ({fmtDateTime(t.last)}).
                  {t.first && <> Primeira: {fmtDateTime(t.first)}.</>}
                </>
              ) : data?.ready === false ? (
                <>A tabela <code>survey_responses</code> ainda não existe. Rode <code>/api/migrate</code> e responda uma vez para conferir.</>
              ) : (
                <>Nenhuma resposta nesta janela. Aumente o período ou confira o funil em <code>/pesquisa</code>.</>
              )}
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="rounded-xl border border-warm-gray/25 px-4 py-2 text-xs uppercase tracking-[0.14em] text-warm-gray/90 hover:border-warm-gray/50 hover:text-offwhite disabled:opacity-50"
          >
            {loading ? "Lendo…" : "Atualizar"}
          </button>
        </div>

        {/* Filtros */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {DAYS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setDays(o.value)}
              className={`rounded-lg px-3 py-2 text-xs uppercase tracking-[0.14em] ${
                days === o.value ? "bg-muted-red text-offwhite" : "border border-warm-gray/20 text-warm-gray/80"
              }`}
            >
              {o.label}
            </button>
          ))}
          <span className="mx-2 h-5 w-px bg-warm-gray/20" aria-hidden="true" />
          {LANG_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setLang(o.value)}
              className={`rounded-lg px-3 py-2 text-xs uppercase tracking-[0.14em] ${
                lang === o.value ? "bg-muted-red text-offwhite" : "border border-warm-gray/20 text-warm-gray/80"
              }`}
            >
              {o.label}
            </button>
          ))}
          <span className="mx-2 h-5 w-px bg-warm-gray/20" aria-hidden="true" />
          <button
            onClick={() => void downloadCsv(true)}
            className="rounded-lg border border-warm-gray/20 px-3 py-2 text-xs uppercase tracking-[0.14em] text-warm-gray/80 hover:text-offwhite"
          >
            Baixar CSV
          </button>
          <button
            onClick={() => void downloadCsv(false)}
            className="rounded-lg border border-warm-gray/20 px-3 py-2 text-xs uppercase tracking-[0.14em] text-warm-gray/80 hover:text-offwhite"
            title="Mesmo arquivo, sem a coluna de e-mail — para mandar a alguém sem entregar contato."
          >
            CSV sem e-mail
          </button>
        </div>

        {error && <p className="mt-5 text-sm text-muted-red">{error}</p>}

        {/* Números do topo */}
        {t && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              { k: "Respostas", v: t.total },
              { k: "BR", v: t.br },
              { k: "ES", v: t.es },
              { k: "E-mail p/ entrevista", v: t.withEmail },
              { k: "Escreveram história", v: t.withOpen },
            ].map((kpi) => (
              <div key={kpi.k} className="rounded-2xl border border-warm-gray/15 bg-white/[0.03] p-4">
                <div className="text-[0.62rem] uppercase tracking-[0.18em] text-warm-gray/70">{kpi.k}</div>
                <div className="mt-2 font-serif text-3xl">{kpi.v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Respostas por dia */}
        {data && data.byDay.length > 0 && (
          <section className={`mt-8 ${card}`}>
            <div className={label}>Respostas por dia</div>
            <div className="mt-5 flex items-end gap-1 overflow-x-auto pb-2">
              {data.byDay.map((d) => (
                <div key={d.day} className="flex min-w-[26px] flex-1 flex-col items-center gap-2" title={`${d.day} · ${d.total} (BR ${d.br} / ES ${d.es})`}>
                  <div className="text-[0.6rem] text-warm-gray/60">{d.total}</div>
                  <div className="flex h-28 w-full items-end justify-center">
                    <div
                      className="w-full max-w-[22px] rounded-t bg-muted-red/80"
                      style={{ height: `${Math.max(4, (d.total / maxDay) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[0.55rem] text-warm-gray/50">{d.day.slice(5)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* De onde vieram (utm) — é o que diz se o anúncio pago está pagando */}
        {data && data.bySource.length > 0 && (
          <section className={`mt-8 ${card}`}>
            <div className={label}>De onde vieram</div>
            <p className="mt-2 text-xs text-warm-gray/60">
              Etiqueta de campanha (<code>utm_source / utm_medium / utm_campaign / utm_content</code>) que veio no link.
              Anúncio sem <code>utm</code> cai em “direto”.
            </p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-[0.62rem] uppercase tracking-[0.18em] text-warm-gray/60">
                  <th className="pb-2">Origem</th>
                  <th className="pb-2 text-right">BR</th>
                  <th className="pb-2 text-right">ES</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {data.bySource.map((s) => (
                  <tr key={s.key} className="border-t border-warm-gray/10">
                    <td className="py-2 pr-4 font-mono text-xs">{s.key}</td>
                    <td className="py-2 text-right text-warm-gray/80">{s.br}</td>
                    <td className="py-2 text-right text-warm-gray/80">{s.es}</td>
                    <td className="py-2 text-right">{s.total}</td>
                    <td className="py-2 text-right text-warm-gray/60">{pct(s.total, data.totals.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Item a item */}
        {data && data.totals.total > 0 && (
          <section className="mt-8">
            <button
              onClick={() => setOpenItems((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl border border-warm-gray/15 bg-white/[0.03] px-6 py-4 text-left"
            >
              <span className={label}>Item a item ({data.questions.filter((q) => q.kind !== "open").length} perguntas)</span>
              <span className="text-warm-gray/60">{openItems ? "−" : "+"}</span>
            </button>

            {openItems && (
              <div className="mt-4 space-y-5">
                {data.questions
                  .filter((q) => q.kind !== "open")
                  .map((q) => {
                    const spec = questionSpec(q.id);
                    const values = orderedValues(q.id);
                    const base = q.answered - q.pnr; // PNR é MISSING: fora da conta de %
                    return (
                      <div key={q.id} className={card}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="text-[0.62rem] uppercase tracking-[0.18em] text-warm-gray/60">
                            {q.number}. {screenTitle(q.id)}
                          </div>
                          <div className="text-[0.62rem] text-warm-gray/50">
                            {q.answered} resposta{q.answered === 1 ? "" : "s"}
                            {q.pnr > 0 && <> · {q.pnr} preferiu não responder</>}
                          </div>
                        </div>
                        <p className="mt-2 font-serif text-lg leading-snug">{questionText(q.id)}</p>

                        {q.kind === "scale" && q.mean !== null && (
                          <p className="mt-2 text-xs text-warm-gray/70">
                            Média {q.mean.toFixed(2)} / 5
                            {q.reverse && q.meanReversed !== null && (
                              <> · <strong className="text-offwhite">item invertido</strong> — equivalente {q.meanReversed.toFixed(2)} na direção dos demais</>
                            )}
                          </p>
                        )}

                        <div className="mt-4 space-y-2">
                          {values.map((v) => {
                            const n = q.counts[v] ?? 0;
                            const denom = v === PNR ? q.answered : spec?.kind === "multi" ? q.answered : base;
                            const share = denom > 0 ? (n / denom) * 100 : 0;
                            return (
                              <div key={v} className="grid grid-cols-[minmax(0,11rem)_1fr_3.4rem] items-center gap-3">
                                <div className={`truncate text-xs ${v === PNR ? "text-warm-gray/50 italic" : "text-warm-gray/85"}`} title={optionLabel(q.id, v)}>
                                  {optionLabel(q.id, v)}
                                </div>
                                <div className="h-3 rounded bg-white/5">
                                  <div
                                    className={`h-3 rounded ${v === PNR ? "bg-warm-gray/40" : "bg-muted-red/85"}`}
                                    style={{ width: `${Math.min(100, share)}%` }}
                                  />
                                </div>
                                <div className="text-right text-xs tabular-nums text-warm-gray/70">
                                  {n} · {Math.round(share)}%
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {spec?.kind === "multi" && (
                          <p className="mt-3 text-[0.62rem] text-warm-gray/50">
                            Múltipla escolha — a soma passa de 100% (cada pessoa marca quantas quiser).
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        )}

        {/* Histórias (abertas) */}
        {data &&
          data.questions
            .filter((q) => q.kind === "open" && q.open.length > 0)
            .map((q) => (
              <section key={q.id} className={`mt-8 ${card}`}>
                <div className={label}>
                  {q.number}. Histórias — {q.open.length} resposta{q.open.length === 1 ? "" : "s"}
                </div>
                <p className="mt-2 font-serif text-lg leading-snug">{questionText(q.id)}</p>
                <div className="mt-5 space-y-4">
                  {q.open.slice(0, 40).map((o) => (
                    <blockquote key={`${q.id}-${o.id}`} className="border-l-2 border-muted-red/60 pl-4">
                      <p className="text-sm leading-[1.7] text-offwhite/90 whitespace-pre-wrap">{o.text}</p>
                      <footer className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-warm-gray/50">
                        #{o.id} · {o.lang.toUpperCase()} · {fmtDateTime(o.created_at)}
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </section>
            ))}

        {/* Últimas respostas inteiras — é aqui que se confere uma resposta-teste */}
        {data && data.latest.length > 0 && (
          <section className="mt-8">
            <div className={`${label} mb-4`}>Últimas respostas (inteiras)</div>
            <div className="space-y-3">
              {data.latest.map((r) => {
                const isOpen = expanded === r.id;
                return (
                  <div key={r.id} className="rounded-2xl border border-warm-gray/15 bg-white/[0.03]">
                    <button
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                      className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left"
                    >
                      <span className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="rounded bg-muted-red/20 px-2 py-1 text-[0.6rem] uppercase tracking-[0.16em] text-muted-red">
                          {r.lang.toUpperCase()}
                        </span>
                        <span className="text-warm-gray/85">#{r.id}</span>
                        <span className="text-warm-gray/60">{fmtDateTime(r.created_at)}</span>
                        <span className="font-mono text-[0.65rem] text-warm-gray/50">{sourceKey(r.source ?? {})}</span>
                        {r.email && <span className="text-[0.65rem] text-warm-gray/70">✉ {r.email}</span>}
                      </span>
                      <span className="text-warm-gray/50">{isOpen ? "−" : "+"}</span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-warm-gray/10 px-5 py-4">
                        <dl className="space-y-3">
                          {Object.entries(r.answers).map(([qid, value]) => {
                            const spec = questionSpec(qid);
                            const shown = Array.isArray(value)
                              ? value.map((v) => optionLabel(qid, String(v))).join(", ")
                              : spec?.kind === "open"
                                ? String(value)
                                : optionLabel(qid, String(value));
                            return (
                              <div key={qid} className="grid gap-1 sm:grid-cols-[1fr_1fr]">
                                <dt className="text-xs leading-snug text-warm-gray/70">{questionText(qid)}</dt>
                                <dd className={`text-sm ${spec?.kind === "open" ? "whitespace-pre-wrap text-offwhite/90" : "text-offwhite"}`}>
                                  {shown}
                                </dd>
                              </div>
                            );
                          })}
                        </dl>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <p className="mt-10 text-[0.68rem] leading-relaxed text-warm-gray/45">
          A pesquisa é anônima por construção: não há IP, nem user-agent, nem nome. O e-mail só existe quando a
          pessoa o deixou para a entrevista e mora em coluna separada das respostas. A etiqueta de campanha
          (<code>utm</code>) é rótulo de anúncio, não identificação.
        </p>
      </div>
    </main>
  );
}
