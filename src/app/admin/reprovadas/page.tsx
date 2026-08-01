"use client";

// ─── Painel admin: capas REPROVADAS pelo juiz de visão ────────────────────────
// O dono abre esta galeria e vê CADA capa que o QA (Claude visão) reprovou, com o
// MOTIVO e o score. Objetivo: descobrir se o juiz está reprovando com razão ou se
// está exigente demais (pedido do dono 2026-07-06 — "vamos ver se faz sentido o que
// ele está reprovando"). Só leitura. Protegido por ADMIN_TOKEN (guardado no browser).

import { useEffect, useState } from "react";
import AdminTabs from "../AdminTabs";

type Rejected = {
  id: number;
  day: string;
  topic: string;
  subject: string;
  cat: string;
  lang: string;
  model: string;
  score: number;
  reason: string;
  url: string;
  created_at: string;
};

export default function ReprovadasAdmin() {
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Rejected[]>([]);

  useEffect(() => {
    const t = typeof window !== "undefined" ? window.localStorage.getItem("dl_admin_token") : null;
    if (t) setSavedToken(t);
  }, []);

  useEffect(() => {
    if (savedToken) load(savedToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedToken]);

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
    setItems([]);
  }

  async function load(tok: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/reprovadas", { headers: { Authorization: `Bearer ${tok}` } });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 401 ? "Token inválido." : data?.error ?? "Falha ao carregar.");
        return;
      }
      setItems(data.rejected ?? []);
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  const wrap: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui, sans-serif", color: "#0B0B0C" };

  if (!savedToken) {
    return (
      <main style={wrap}>
        <h1 style={{ fontSize: 22 }}>Capas reprovadas — acesso</h1>
        <p style={{ color: "#555", fontSize: 14 }}>Cole o ADMIN_TOKEN para ver a galeria de reprovações do juiz.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveToken()}
            placeholder="ADMIN_TOKEN"
            style={{ flex: 1, padding: "10px 12px", border: "1px solid #ccc", borderRadius: 8 }}
          />
          <button onClick={saveToken} style={{ padding: "10px 18px", background: "#8B1A1A", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer" }}>Entrar</button>
        </div>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <AdminTabs variant="light" />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Capas reprovadas pelo juiz</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => load(savedToken)} style={{ padding: "6px 14px", background: "#0B0B0C", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer" }}>Atualizar</button>
          <button onClick={forgetToken} style={{ padding: "6px 14px", background: "transparent", color: "#8B1A1A", border: "1px solid #8B1A1A", borderRadius: 8, cursor: "pointer" }}>Sair</button>
        </div>
      </div>
      <p style={{ color: "#555", fontSize: 13, marginTop: 6 }}>
        Cada imagem foi gerada, paga e REPROVADA pelo QA de visão. Veja o motivo — se as reprovações não fizerem sentido, o juiz está exigente demais.
      </p>

      {loading && <p>Carregando…</p>}
      {error && <p style={{ color: "#8B1A1A" }}>{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p style={{ color: "#555" }}>Nenhuma reprovação registrada ainda. (Se acabou de subir, rode <code>/api/migrate</code> e aguarde a próxima geração.)</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginTop: 16 }}>
        {items.map((it) => (
          <div key={it.id} style={{ border: "1px solid #e5e5e5", borderRadius: 12, overflow: "hidden", background: "#F4F0E8" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.url} alt={it.subject} style={{ width: "100%", aspectRatio: "4 / 5", objectFit: "cover", display: "block", background: "#ddd" }} />
            <div style={{ padding: "10px 12px", fontSize: 12.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#777", fontSize: 11, marginBottom: 4 }}>
                <span>{it.day} · {it.lang?.toUpperCase()} · {it.cat}</span>
                <span>score {it.score}</span>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{it.topic || it.subject}</div>
              <div style={{ color: "#333" }}>⚖️ {it.reason || "(sem motivo)"}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
