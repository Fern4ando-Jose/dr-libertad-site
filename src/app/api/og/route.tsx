import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const SLOT_META: Record<string, { eyebrow: string; footer: string }> = {
  manha: { eyebrow: "Reflexión", footer: "Psicología · Consciencia · Libertad" },
  tarde: { eyebrow: "Lo que cambia todo", footer: "Atención · Mente · Enfoque" },
  noite: { eyebrow: "Piénsalo", footer: "Responde en los comentarios" },
};

/**
 * Quebra o texto em linhas equilibradas, evitando órfãs.
 * Tenta manter linhas de comprimento similar e nunca deixa
 * uma palavra sozinha (exceto se for a última linha de destaque).
 */
function balancedLines(text: string, maxChars: number, maxLines: number): string[] {
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

  const result = lines.slice(0, maxLines);

  // Evitar linha final com 1 palavra sozinha: move a última palavra
  // da penúltima linha para a última se a última tiver só 1 palavra
  if (result.length >= 2) {
    const last = result[result.length - 1];
    const secondLast = result[result.length - 2];
    if (last.split(" ").length === 1 && secondLast.split(" ").length > 1) {
      const secondLastWords = secondLast.split(" ");
      const movedWord = secondLastWords.pop()!;
      result[result.length - 2] = secondLastWords.join(" ");
      result[result.length - 1] = movedWord + " " + last;
    }
  }

  return result;
}

function getFontSize(title: string): { fontSize: number; maxChars: number; maxLines: number } {
  const len = title.length;
  if (len <= 25) return { fontSize: 110, maxChars: 14, maxLines: 3 };
  if (len <= 40) return { fontSize: 96,  maxChars: 17, maxLines: 3 };
  if (len <= 55) return { fontSize: 84,  maxChars: 20, maxLines: 4 };
  if (len <= 70) return { fontSize: 74,  maxChars: 23, maxLines: 4 };
  return               { fontSize: 64,  maxChars: 27, maxLines: 5 };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slot = searchParams.get("slot") ?? "tarde";
  const title = searchParams.get("title") ?? "La mente necesita silencio.";
  const sub = searchParams.get("sub") ?? "";
  const meta = SLOT_META[slot] ?? SLOT_META.tarde;

  const { fontSize, maxChars, maxLines } = getFontSize(title);
  const lines = balancedLines(title, maxChars, maxLines);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          background: "#F7F4EF",
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Linha vermelha topo */}
        <div style={{
          position: "absolute",
          top: 0, left: 0,
          width: "1080px", height: "6px",
          background: "#8B1A1A",
        }} />

        {/* Linha vermelha base */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0,
          width: "1080px", height: "6px",
          background: "#8B1A1A",
        }} />

        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "6px",
          marginBottom: "0px",
        }}>
          <span style={{
            fontSize: "24px",
            color: "#aaaaaa",
            letterSpacing: "7px",
            textTransform: "uppercase",
            fontWeight: 400,
          }}>
            Dr. Libertad
          </span>
        </div>

        {/* Área central — ocupa todo o espaço disponível */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
        }}>
          {/* Eyebrow */}
          <span style={{
            fontSize: "20px",
            color: "#8B1A1A",
            letterSpacing: "5px",
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: "52px",
          }}>
            {meta.eyebrow}
          </span>

          {/* Título — todas as linhas exceto a última em preto fino */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
            {lines.map((line, i) => {
              const isLast = i === lines.length - 1;
              return (
                <span key={i} style={{
                  fontSize: `${fontSize}px`,
                  fontWeight: isLast ? 700 : 300,
                  color: isLast ? "#8B1A1A" : "#111111",
                  lineHeight: 1.18,
                  letterSpacing: "-0.5px",
                  display: "block",
                }}>
                  {line}
                </span>
              );
            })}
          </div>

          {/* Subtítulo opcional */}
          {sub ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: "56px" }}>
              <div style={{ width: "60px", height: "2px", background: "#cccccc", marginBottom: "24px" }} />
              <span style={{ fontSize: "46px", color: "#666666", lineHeight: 1.4, fontWeight: 300 }}>
                {sub}
              </span>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{
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
          <span style={{
            fontSize: "18px",
            color: "#cccccc",
            letterSpacing: "1px",
          }}>
            drlibertad.com
          </span>
        </div>
      </div>
    ),
    { width: 1080, height: 1350 }
  );
}
