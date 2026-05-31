import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const SLOT_META: Record<string, { eyebrow: string; footer: string }> = {
  manha: { eyebrow: "Reflexión del día", footer: "Psicología · Consciencia · Libertad" },
  tarde: { eyebrow: "Lo que cambia todo", footer: "Atención · Mente · Enfoque" },
  noite: { eyebrow: "Piénsalo esta noche", footer: "Responde en los comentarios" },
};

function splitLines(text: string): { body: string; punch: string } {
  const words = text.split(" ");
  // Últimas 2-3 palavras viram a linha de destaque (punch)
  // O resto é o corpo
  const totalWords = words.length;
  let splitAt = totalWords <= 4 ? totalWords - 1 : totalWords - 2;
  if (splitAt < 2) splitAt = 2;

  const body = words.slice(0, splitAt).join(" ");
  const punch = words.slice(splitAt).join(" ");
  return { body, punch };
}

function bodyFontSize(text: string): number {
  const len = text.length;
  if (len <= 20) return 90;
  if (len <= 30) return 80;
  if (len <= 40) return 70;
  if (len <= 55) return 60;
  return 52;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slot = searchParams.get("slot") ?? "tarde";
  const title = searchParams.get("title") ?? "La mente necesita silencio";
  const meta = SLOT_META[slot] ?? SLOT_META.tarde;

  const { body, punch } = splitLines(title);
  const bodySize = bodyFontSize(body);
  const punchSize = Math.round(bodySize * 1.35);

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
        {/* Barra vermelha topo */}
        <div style={{ width: "1080px", height: "10px", background: "#8B1A1A", flexShrink: 0 }} />

        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "40px 80px 0px 80px",
        }}>
          <span style={{
            fontSize: "22px",
            color: "#999999",
            letterSpacing: "9px",
            textTransform: "uppercase",
            fontWeight: 400,
          }}>Dr. Libertad</span>
          <span style={{
            fontSize: "18px",
            color: "#cccccc",
            letterSpacing: "2px",
          }}>drlibertad.com</span>
        </div>

        {/* Área central */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          padding: "0px 80px",
        }}>

          {/* Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: "48px" }}>
            <div style={{ width: "40px", height: "3px", background: "#8B1A1A", marginRight: "20px" }} />
            <span style={{
              fontSize: "24px",
              color: "#8B1A1A",
              letterSpacing: "5px",
              textTransform: "uppercase",
              fontWeight: 700,
            }}>
              {meta.eyebrow}
            </span>
          </div>

          {/* Corpo do título — peso leve */}
          <span style={{
            fontSize: `${bodySize}px`,
            fontWeight: 300,
            color: "#111111",
            lineHeight: 1.2,
            letterSpacing: "-1px",
            marginBottom: "8px",
            display: "block",
          }}>
            {body}
          </span>

          {/* Linha de destaque — grande, bold, vermelha */}
          <span style={{
            fontSize: `${punchSize}px`,
            fontWeight: 800,
            color: "#8B1A1A",
            lineHeight: 1.1,
            letterSpacing: "-2px",
            display: "block",
          }}>
            {punch}
          </span>

          {/* Divisor decorativo */}
          <div style={{
            width: "80px",
            height: "3px",
            background: "#dddddd",
            marginTop: "60px",
          }} />
        </div>

        {/* Footer */}
        <div style={{
          padding: "0px 80px 50px 80px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{
            fontSize: "18px",
            color: "#bbbbbb",
            letterSpacing: "4px",
            textTransform: "uppercase",
          }}>
            {meta.footer}
          </span>
        </div>

        {/* Barra vermelha base */}
        <div style={{ width: "1080px", height: "10px", background: "#8B1A1A", flexShrink: 0 }} />
      </div>
    ),
    { width: 1080, height: 1350 }
  );
}
