import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const SLOT_META: Record<string, { label: string; eyebrow: string; footer: string }> = {
  manha: { label: "Mañana", eyebrow: "Reflexión", footer: "Psicología · Consciencia · Libertad" },
  tarde: { label: "Tarde", eyebrow: "Lo que cambia todo", footer: "Atención · Mente · Enfoque" },
  noite: { label: "Noche", eyebrow: "Piénsalo", footer: "Responde en los comentarios" },
};

// Fonte adaptável ao tamanho do título (90–120px conforme spec)
function getFontConfig(title: string): { fontSize: number; maxChars: number; maxLines: number } {
  const len = title.length;
  if (len <= 30) return { fontSize: 120, maxChars: 16, maxLines: 3 };
  if (len <= 50) return { fontSize: 100, maxChars: 20, maxLines: 4 };
  if (len <= 70) return { fontSize: 88,  maxChars: 24, maxLines: 5 };
  return          { fontSize: 76,  maxChars: 28, maxLines: 6 };
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? current + " " + word : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slot = searchParams.get("slot") ?? "tarde";
  const title = searchParams.get("title") ?? "La mente necesita silencio.";
  const sub = searchParams.get("sub") ?? "";
  const meta = SLOT_META[slot] ?? SLOT_META.tarde;

  const { fontSize, maxChars, maxLines } = getFontConfig(title);
  const titleLines = wrapText(title, maxChars, maxLines);

  // Formato feed Instagram: 1080 x 1350 (4:5) — área segura com 80px de margem
  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          background: "#F7F5F0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Linha vermelha topo */}
        <div style={{
          position: "absolute",
          top: 0, left: 0,
          width: "1080px", height: "8px",
          background: "#8B1A1A",
        }} />

        {/* Header — logo pequeno e discreto */}
        <div style={{ display: "flex", alignItems: "center", marginTop: "8px" }}>
          <span style={{
            fontSize: "26px",
            color: "#999999",
            letterSpacing: "8px",
            textTransform: "uppercase",
            fontWeight: 400,
          }}>
            Dr. Libertad
          </span>
        </div>

        {/* Conteúdo principal — centralizado verticalmente */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          paddingTop: "40px",
          paddingBottom: "40px",
        }}>
          {/* Eyebrow */}
          <span style={{
            fontSize: "22px",
            color: "#8B1A1A",
            letterSpacing: "6px",
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: "48px",
          }}>
            {meta.eyebrow}
          </span>

          {/* Título principal — 90–120px adaptável */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {titleLines.map((line, i) => (
              <span key={i} style={{
                fontSize: `${fontSize}px`,
                fontWeight: i === titleLines.length - 1 ? 700 : 300,
                color: i === titleLines.length - 1 ? "#8B1A1A" : "#0A0A0A",
                lineHeight: 1.15,
                letterSpacing: "-1px",
              }}>
                {line}
              </span>
            ))}
          </div>

          {/* Subtítulo — 45–60px */}
          {sub ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: "60px" }}>
              <div style={{ width: "80px", height: "2px", background: "#cccccc", marginBottom: "28px" }} />
              <span style={{
                fontSize: "50px",
                color: "#666666",
                lineHeight: 1.4,
              }}>
                {sub}
              </span>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontSize: "20px",
            color: "#bbbbbb",
            letterSpacing: "4px",
            textTransform: "uppercase",
          }}>
            {meta.footer}
          </span>
          <span style={{
            fontSize: "20px",
            color: "#cccccc",
            letterSpacing: "2px",
          }}>
            drlibertad.com
          </span>
        </div>
      </div>
    ),
    { width: 1080, height: 1350 }
  );
}
