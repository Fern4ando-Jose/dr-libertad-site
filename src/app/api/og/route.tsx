import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const SLOT_META: Record<string, { label: string; eyebrow: string; footer: string }> = {
  manha: { label: "Mañana", eyebrow: "Reflexión", footer: "Psicología · Consciencia · Libertad" },
  tarde: { label: "Tarde", eyebrow: "Lo que cambia todo", footer: "Atención · Mente · Enfoque" },
  noite: { label: "Noche", eyebrow: "Piénsalo", footer: "Responde en los comentarios" },
};

function wrapText(text: string, max = 26): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? current + " " + word : word;
    if (candidate.length <= max) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slot = searchParams.get("slot") ?? "tarde";
  const title = searchParams.get("title") ?? "A mente precisa de silencio.";
  const sub = searchParams.get("sub") ?? "";
  const meta = SLOT_META[slot] ?? SLOT_META.tarde;
  const titleLines = wrapText(title);

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
        <div style={{ position: "absolute", top: 0, left: 0, width: "1080px", height: "10px", background: "#8B1A1A" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "10px" }}>
          <span style={{ fontSize: "28px", color: "#999999", letterSpacing: "6px", textTransform: "uppercase" }}>Dr. Libertad</span>
          <span style={{ fontSize: "26px", color: "#bbbbbb", letterSpacing: "4px", textTransform: "uppercase" }}>{meta.label}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingTop: "20px", paddingBottom: "20px" }}>
          <span style={{ fontSize: "26px", color: "#8B1A1A", letterSpacing: "5px", textTransform: "uppercase", fontWeight: 500, marginBottom: "36px" }}>
            {meta.eyebrow}
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {titleLines.map((line, i) => (
              <span key={i} style={{
                fontSize: "72px",
                fontWeight: i === titleLines.length - 1 ? 600 : 300,
                color: i === titleLines.length - 1 ? "#8B1A1A" : "#0A0A0A",
                lineHeight: 1.15,
                letterSpacing: "-2px",
              }}>
                {line}
              </span>
            ))}
          </div>

          {sub ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: "48px" }}>
              <div style={{ width: "120px", height: "2px", background: "#cccccc", marginBottom: "24px" }} />
              <span style={{ fontSize: "30px", color: "#888888", lineHeight: 1.5, maxWidth: "800px" }}>{sub}</span>
            </div>
          ) : null}
        </div>

        <span style={{ fontSize: "24px", color: "#bbbbbb", letterSpacing: "5px", textTransform: "uppercase" }}>{meta.footer}</span>
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}
