import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const SLOT_META: Record<string, { label: string; eyebrow: string; footer: string }> = {
  manha: { label: "Mañana", eyebrow: "Reflexión", footer: "Psicología · Consciencia · Libertad" },
  tarde: { label: "Tarde", eyebrow: "Lo que cambia todo", footer: "Atención · Mente · Enfoque" },
  noite: { label: "Noche", eyebrow: "Piénsalo", footer: "Responde en los comentarios" },
};

// Adapta o tamanho da fonte e chars/linha ao comprimento do título
function getFontConfig(title: string): { fontSize: number; maxChars: number; maxLines: number } {
  const len = title.length;
  if (len <= 40)  return { fontSize: 80, maxChars: 18, maxLines: 3 };
  if (len <= 60)  return { fontSize: 68, maxChars: 22, maxLines: 4 };
  if (len <= 80)  return { fontSize: 58, maxChars: 26, maxLines: 5 };
  return           { fontSize: 48, maxChars: 30, maxLines: 6 };
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

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1080px",
          background: "#F7F5F0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px 90px",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Linha vermelha topo */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "1080px", height: "8px", background: "#8B1A1A" }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
          <span style={{ fontSize: "30px", color: "#8B1A1A", letterSpacing: "6px", textTransform: "uppercase", fontWeight: 600 }}>
            Dr. Libertad
          </span>
          <span style={{ fontSize: "24px", color: "#bbbbbb", letterSpacing: "4px", textTransform: "uppercase" }}>
            {meta.label}
          </span>
        </div>

        {/* Conteúdo central */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingTop: "16px", paddingBottom: "16px" }}>
          <span style={{
            fontSize: "22px",
            color: "#8B1A1A",
            letterSpacing: "5px",
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: "32px",
          }}>
            {meta.eyebrow}
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {titleLines.map((line, i) => (
              <span key={i} style={{
                fontSize: `${fontSize}px`,
                fontWeight: i === titleLines.length - 1 ? 700 : 300,
                color: i === titleLines.length - 1 ? "#8B1A1A" : "#0A0A0A",
                lineHeight: 1.2,
                letterSpacing: "-1px",
              }}>
                {line}
              </span>
            ))}
          </div>

          {sub ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: "40px" }}>
              <div style={{ width: "100px", height: "2px", background: "#cccccc", marginBottom: "20px" }} />
              <span style={{ fontSize: "28px", color: "#888888", lineHeight: 1.5 }}>{sub}</span>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "20px", color: "#bbbbbb", letterSpacing: "4px", textTransform: "uppercase" }}>
            {meta.footer}
          </span>
          <span style={{ fontSize: "20px", color: "#cccccc", letterSpacing: "2px" }}>
            drlibertad.com
          </span>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}
