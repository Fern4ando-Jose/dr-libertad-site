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
  // Últimas 2 palavras = punch (destaque vermelho)
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
  // Destaque 55% maior que o corpo (era 35%) + peso 900
  const punchSize = Math.round(bodySize * 1.55);

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
        }}
      >
        {/* Barra vermelha topo — 16px, mais presente */}
        <div style={{ width: "1080px", height: "16px", background: "#8B1A1A", flexShrink: 0 }} />

        {/* Header — logo com tracking reduzido */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "36px 80px 0px 80px",
        }}>
          <span style={{
            fontSize: "22px",
            color: "#aaaaaa",
            letterSpacing: "5px", // reduzido de 9px → 5px
            textTransform: "uppercase",
            fontWeight: 400,
          }}>Dr. Libertad</span>
          <span style={{
            fontSize: "18px",
            color: "#bbbbbb",
            letterSpacing: "1px",
          }}>drlibertad.com</span>
        </div>

        {/* Bloco principal — posicionado NO TOPO, não centralizado */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "flex-start",
          padding: "100px 80px 0px 80px", // ≈ 7% da altura — bloco alto
        }}>

          {/* Eyebrow com traço */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: "52px" }}>
            <span style={{
              fontSize: "14px",
              color: "#8B1A1A",
              letterSpacing: "1px",
              fontWeight: 400,
              marginRight: "16px",
            }}>—</span>
            <span style={{
              fontSize: "22px",
              color: "#8B1A1A",
              letterSpacing: "5px",
              textTransform: "uppercase",
              fontWeight: 700,
            }}>
              {meta.eyebrow}
            </span>
          </div>

          {/* Corpo — cinza escuro, leve */}
          <span style={{
            fontSize: `${bodySize}px`,
            fontWeight: 300,
            color: "#222222",
            lineHeight: 1.15,
            letterSpacing: "-1px",
            display: "block",
            marginBottom: "4px", // espaço reduzido entre corpo e punch
          }}>
            {body}
          </span>

          {/* Punch — vermelho, dominante, peso máximo */}
          <span style={{
            fontSize: `${punchSize}px`,
            fontWeight: 900,
            color: "#8B1A1A",
            lineHeight: 1.05,
            letterSpacing: "-2px",
            display: "block",
          }}>
            {punch}
          </span>

          {/* Micro-frase — ponto focal secundário */}
          <div style={{ display: "flex", alignItems: "center", marginTop: "52px" }}>
            <div style={{ width: "36px", height: "2px", background: "#cccccc", marginRight: "20px" }} />
            <span style={{
              fontSize: "28px",
              color: "#777777",
              fontWeight: 300,
              letterSpacing: "0px",
              fontStyle: "italic",
            }}>
              {meta.micro}
            </span>
          </div>

        </div>

        {/* Footer — mais visível */}
        <div style={{
          padding: "0px 80px 44px 80px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{
            fontSize: "21px", // +15% de 18px
            color: "#888888", // era #bbbbbb — mais contraste
            letterSpacing: "4px",
            textTransform: "uppercase",
          }}>
            {meta.footer}
          </span>
        </div>

        {/* Barra vermelha base */}
        <div style={{ width: "1080px", height: "16px", background: "#8B1A1A", flexShrink: 0 }} />
      </div>
    ),
    { width: 1080, height: 1350 }
  );
}
