import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const SLOT_META: Record<string, { eyebrow: string; micro: string; footer: string }> = {
  manha: {
    eyebrow: "Reflexión del día",
    micro: "Empieza aquí tu claridad mental.",
    footer: "Psicología · Consciencia · Libertad",
  },
  tarde: {
    eyebrow: "Lo que cambia todo",
    micro: "El mundo compite por ella.",
    footer: "Atención · Mente · Enfoque",
  },
  noite: {
    eyebrow: "Piénsalo esta noche",
    micro: "¿Qué elegirás mañana?",
    footer: "Responde en los comentarios",
  },
};

function splitLines(text: string): { body: string; punch: string } {
  const words = text.split(" ");
  const total = words.length;
  const splitAt = total <= 3 ? total - 1 : total - 2;
  return {
    body: words.slice(0, splitAt).join(" "),
    punch: words.slice(splitAt).join(" "),
  };
}

function bodyFontSize(text: string): number {
  const len = text.length;
  if (len <= 18) return 96;
  if (len <= 28) return 84;
  if (len <= 38) return 74;
  if (len <= 50) return 64;
  return 54;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slot = searchParams.get("slot") ?? "tarde";
  const title = searchParams.get("title") ?? "La mente necesita silencio";
  const meta = SLOT_META[slot] ?? SLOT_META.tarde;

  const { body, punch } = splitLines(title);
  const bodySize = bodyFontSize(body);
  const punchSize = Math.round(bodySize * 1.6);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          background: "#F7F4EF",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* ── Elementos geométricos abstratos (fundo) ── */}
        {/* Círculo grande — canto inferior direito, parcialmente fora */}
        <div style={{
          position: "absolute",
          bottom: "60px",
          right: "-120px",
          width: "520px",
          height: "520px",
          borderRadius: "50%",
          border: "1.5px solid rgba(139,26,26,0.07)",
        }} />
        {/* Círculo médio concêntrico */}
        <div style={{
          position: "absolute",
          bottom: "130px",
          right: "-50px",
          width: "360px",
          height: "360px",
          borderRadius: "50%",
          border: "1px solid rgba(139,26,26,0.05)",
        }} />
        {/* Círculo pequeno interno */}
        <div style={{
          position: "absolute",
          bottom: "200px",
          right: "20px",
          width: "220px",
          height: "220px",
          borderRadius: "50%",
          border: "1px solid rgba(139,26,26,0.04)",
        }} />

        {/* ── Barra vermelha topo — 16px ── */}
        <div style={{ width: "1080px", height: "16px", background: "#8B1A1A", flexShrink: 0 }} />

        {/* ── Header ── */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "40px 100px 0px 100px",
        }}>
          <span style={{
            fontSize: "21px",
            color: "#aaaaaa",
            letterSpacing: "5px",
            textTransform: "uppercase",
            fontWeight: 400,
          }}>Dr. Libertad</span>
          <span style={{
            fontSize: "17px",
            color: "#bbbbbb",
            letterSpacing: "1px",
          }}>drlibertad.com</span>
        </div>

        {/* ── Bloco principal — posicionado alto ── */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          padding: "90px 100px 0px 100px",
        }}>
          {/* Eyebrow com traço */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: "56px" }}>
            <div style={{ width: "32px", height: "2px", background: "#8B1A1A", marginRight: "16px" }} />
            <span style={{
              fontSize: "20px",
              color: "#8B1A1A",
              letterSpacing: "5px",
              textTransform: "uppercase",
              fontWeight: 700,
            }}>
              {meta.eyebrow}
            </span>
          </div>

          {/* Corpo — cinza escuro, leve, leading apertado */}
          <span style={{
            fontSize: `${bodySize}px`,
            fontWeight: 300,
            color: "#3a3a3a",        // cinza escuro (não preto puro)
            lineHeight: 1.08,         // leading apertado
            letterSpacing: "-1.5px",
            display: "block",
            marginBottom: "2px",      // mínimo entre corpo e punch
          }}>
            {body}
          </span>

          {/* Punch — dominante, sombra sutil */}
          <span style={{
            fontSize: `${punchSize}px`,
            fontWeight: 900,
            color: "#8B1A1A",
            lineHeight: 1.0,
            letterSpacing: "-2.5px",
            display: "block",
            textShadow: "0px 4px 24px rgba(139,26,26,0.18)",
          }}>
            {punch}
          </span>

          {/* Micro-frase — maior, sem traço, próxima ao punch */}
          <span style={{
            fontSize: "30px",
            color: "#666666",
            fontWeight: 300,
            letterSpacing: "0px",
            fontStyle: "italic",
            marginTop: "44px",
            display: "block",
          }}>
            {meta.micro}
          </span>
        </div>

        {/* Espaço flexível */}
        <div style={{ flex: 1 }} />

        {/* ── Footer ── */}
        <div style={{
          padding: "0px 100px 20px 100px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{
            fontSize: "20px",
            color: "#888888",
            letterSpacing: "4px",
            textTransform: "uppercase",
          }}>
            {meta.footer}
          </span>
          {/* CTA Carrossel */}
          <span style={{
            fontSize: "20px",
            color: "#8B1A1A",
            letterSpacing: "1px",
            fontWeight: 500,
          }}>
            Desliza →
          </span>
        </div>

        {/* ── Barra vermelha base — 16px ── */}
        <div style={{ width: "1080px", height: "16px", background: "#8B1A1A", flexShrink: 0 }} />
      </div>
    ),
    { width: 1080, height: 1350 }
  );
}
