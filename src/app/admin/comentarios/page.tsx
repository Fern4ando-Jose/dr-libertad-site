"use client";

// ─── Painel admin: comentário assistido (outbound 1-clique) ───────────────────
// Fluxo: chega a notificação de post da conta-alvo → o dono abre este painel → cola
// o link + a legenda do post → o painel gera o comentário na VOZ da marca e deixa
// FIXADO num card → o dono clica "Copiar e abrir no Instagram" → cola e posta NO IG.
// A publicação acontece no Instagram (não dá pra postar em terceiros pela API; aqui
// é só o preparo — o 95%). Protegido por ADMIN_TOKEN (guardado no navegador).

import { useEffect, useState } from "react";

type Draft = { id: number; url: string; lang: "es" | "pt"; comment: string };

export default function ComentariosAdmin() {
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [lang, setLang] = useState<"es" | "pt">("es");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    const t = typeof window !== "undefined" ? window.localStorage.getItem("dl_admin_token") : null;
    if (t) setSavedToken(t);
  }, []);

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
  }

  async function generate() {
    setError(null);
    if (caption.trim().length < 3) {
      setError("Cole a legenda do post (o comentário reage a ela).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/comment-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${savedToken}` },
        body: JSON.stringify({ caption, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error === "budget" ? "Orçamento do dia estourado." : data?.error === "Não autorizado" ? "Token inválido." : "Falha ao gerar.");
        return;
      }
      setDrafts((d) => [{ id: Date.now(), url: url.trim(), lang, comment: data.comment }, ...d]);
      setCaption("");
      setUrl("");
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  async function copyAndOpen(d: Draft) {
    try {
      await navigator.clipboard.writeText(d.comment);
      setCopied(d.id);
      setTimeout(() => setCopied((c) => (c === d.id ? null : c)), 2500);
    } catch { /* clipboard pode falhar sem https/foco */ }
    if (d.url) window.open(d.url, "_blank", "noopener");
  }

  const card = "rounded-3xl border border-warm-gray/15 bg-white/[0.03] p-6 backdrop-blur";
  // (tokens da marca: bg-ink / text-offwhite / warm-gray / muted-red — globals.css)
  const label = "text-xs tracking-[0.22em] text-warm-gray/80 uppercase";

  if (!savedToken) {
    return (
      <main className="min-h-screen bg-ink text-offwhite px-6 py-20">
        <div className="mx-auto max-w-md">
          <div className={label}>Painel · Dr. Libertad</div>
          <h1 className="mt-3 font-serif text-3xl">Comentários</h1>
          <p className="mt-4 text-sm leading-relaxed text-warm-gray/90">
            Cole o <strong>ADMIN_TOKEN</strong> (setado na Vercel) para liberar o painel.
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

  return (
    <main className="min-h-screen bg-ink text-offwhite px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <div className={label}>● Comentário assistido</div>
            <h1 className="mt-2 font-serif text-3xl leading-tight">Comente nas contas grandes — na sua voz</h1>
          </div>
          <button onClick={forgetToken} className="text-xs text-warm-gray/60 underline hover:text-warm-gray">sair</button>
        </div>

        <p className="mt-4 text-sm leading-[1.7] text-warm-gray/80">
          Cole o <strong>link</strong> e a <strong>legenda</strong> do post da conta-alvo. Eu escrevo o comentário na sua
          voz; você clica, copia e posta no Instagram. (A publicação é no IG — aqui é o preparo.)
        </p>

        {/* Formulário */}
        <div className={`mt-8 ${card}`}>
          <div className="flex gap-3">
            {(["es", "pt"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-lg px-4 py-2 text-xs tracking-wide uppercase ${lang === l ? "bg-muted-red text-offwhite" : "border border-warm-gray/20 text-warm-gray/80"}`}
              >
                {l === "es" ? "ES · @dr.liberdad" : "PT · @dr.liberdade.br"}
              </button>
            ))}
          </div>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Link do post (https://www.instagram.com/p/…)"
            className="mt-4 w-full rounded-xl border border-warm-gray/20 bg-white/5 px-4 py-3 text-sm outline-none focus:border-muted-red"
          />
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Cole aqui a legenda / texto do post da conta-alvo"
            rows={4}
            className="mt-3 w-full rounded-xl border border-warm-gray/20 bg-white/5 px-4 py-3 text-sm outline-none focus:border-muted-red resize-y"
          />
          {error && <p className="mt-3 text-sm text-muted-red">{error}</p>}
          <button
            onClick={generate}
            disabled={loading}
            className="mt-4 rounded-xl bg-muted-red px-6 py-3 text-sm font-medium text-offwhite hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Gerando…" : "Gerar comentário"}
          </button>
        </div>

        {/* Cards prontos */}
        <div className="mt-10 space-y-5">
          {drafts.map((d) => (
            <div key={d.id} className={card}>
              <div className="flex items-center justify-between">
                <div className={label}>{d.lang === "es" ? "ES" : "PT"} · pronto pra postar</div>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noopener" className="text-xs text-warm-gray/60 underline hover:text-warm-gray">
                    ver post
                  </a>
                )}
              </div>
              <p className="mt-4 font-serif text-[1.4rem] leading-[1.45]">{d.comment}</p>
              <button
                onClick={() => copyAndOpen(d)}
                className="mt-5 rounded-xl bg-muted-red px-5 py-3 text-sm font-medium text-offwhite hover:opacity-90"
              >
                {copied === d.id ? "✓ Copiado — cole no Instagram" : "Copiar e abrir no Instagram"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
