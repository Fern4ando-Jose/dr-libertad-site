import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// ─── Cores e constantes ───────────────────────────────────────────────────────
const WINE   = "#8B1A1A";
const OFFWHITE = "#F7F4EF";
const BLACK  = "#3a3a3a";
const GREY1  = "#666666";
const GREY2  = "#999999";
const GREY3  = "#bbbbbb";
const MARGIN = 100;
const BAR    = 16;

// ─── Meta por slot ────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function splitLines(text: string): { body: string; punch: string } {
  const words = text.split(" ");
  const total = words.length;
  const splitAt = total <= 3 ? total - 1 : total - 2;
  return {
    body:  words.slice(0, splitAt).join(" "),
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

function insightFontSize(text: string): number {
  const len = text.length;
  if (len <= 60)  return 68;
  if (len <= 100) return 58;
  if (len <= 140) return 50;
  return 44;
}

// ─── Componente: cabeçalho comum ─────────────────────────────────────────────
function Header({ inverted }: { inverted?: boolean }) {
  const textColor = inverted ? "rgba(247,244,239,0.7)" : GREY2;
  const siteColor = inverted ? "rgba(247,244,239,0.5)" : GREY3;
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: `40px ${MARGIN}px 0px ${MARGIN}px`,
    }}>
      <span style={{ fontSize: "21px", color: textColor, letterSpacing: "5px", textTransform: "uppercase", fontWeight: 400 }}>
        Dr. Libertad
      </span>
      <span style={{ fontSize: "17px", color: siteColor, letterSpacing: "1px" }}>
        drlibertad.com
      </span>
    </div>
  );
}

// ─── Componente: rodapé comum ─────────────────────────────────────────────────
function Footer({ footer, inverted, cta }: { footer: string; inverted?: boolean; cta?: boolean }) {
  const color = inverted ? "rgba(247,244,239,0.7)" : GREY2;
  return (
    <div style={{
      padding: `0px ${MARGIN}px 44px ${MARGIN}px`,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}>
      <span style={{ fontSize: "19px", color, letterSpacing: "4px", textTransform: "uppercase" }}>
        {footer}
      </span>
      {cta && (
        <span style={{ fontSize: "19px", color: inverted ? OFFWHITE : WINE, letterSpacing: "1px", fontWeight: 600 }}>
          Desliza →
        </span>
      )}
    </div>
  );
}

// ─── SLIDE 1: Capa ────────────────────────────────────────────────────────────
function CoverSlide({ slot, title }: { slot: string; title: string }) {
  const meta = SLOT_META[slot] ?? SLOT_META.tarde;
  const { body, punch } = splitLines(title);
  const bodySize  = bodyFontSize(body);
  const punchSize = Math.round(bodySize * 1.6);

  return (
    <div style={{ width: "1080px", height: "1350px", background: OFFWHITE, display: "flex", flexDirection: "column", fontFamily: "system-ui, -apple-system, sans-serif", position: "relative" }}>
      {/* Círculos geométricos */}
      <div style={{ position: "absolute", bottom: "60px",  right: "-120px", width: "520px", height: "520px", borderRadius: "50%", border: `1.5px solid rgba(139,26,26,0.07)` }} />
      <div style={{ position: "absolute", bottom: "130px", right: "-50px",  width: "360px", height: "360px", borderRadius: "50%", border: `1px solid rgba(139,26,26,0.05)` }} />
      <div style={{ position: "absolute", bottom: "200px", right: "20px",   width: "220px", height: "220px", borderRadius: "50%", border: `1px solid rgba(139,26,26,0.04)` }} />

      <div style={{ width: "1080px", height: `${BAR}px`, background: WINE, flexShrink: 0 }} />
      <Header />

      <div style={{ display: "flex", flexDirection: "column", padding: `90px ${MARGIN}px 0px ${MARGIN}px` }}>
        {/* Eyebrow */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "56px" }}>
          <div style={{ width: "32px", height: "2px", background: WINE, marginRight: "16px" }} />
          <span style={{ fontSize: "20px", color: WINE, letterSpacing: "5px", textTransform: "uppercase", fontWeight: 700 }}>
            {meta.eyebrow}
          </span>
        </div>

        {/* Corpo leve */}
        <span style={{ fontSize: `${bodySize}px`, fontWeight: 300, color: BLACK, lineHeight: 1.08, letterSpacing: "-1.5px", display: "block", marginBottom: "2px" }}>
          {body}
        </span>

        {/* Punch vermelho dominante */}
        <span style={{ fontSize: `${punchSize}px`, fontWeight: 900, color: WINE, lineHeight: 1.0, letterSpacing: "-2.5px", display: "block", textShadow: `0px 4px 24px rgba(139,26,26,0.18)` }}>
          {punch}
        </span>

        {/* Micro-frase */}
        <span style={{ fontSize: "29px", color: GREY1, fontWeight: 300, fontStyle: "italic", marginTop: "44px", display: "block" }}>
          {meta.micro}
        </span>
      </div>

      <div style={{ flex: 1 }} />
      <Footer footer={meta.footer} cta />
      <div style={{ width: "1080px", height: `${BAR}px`, background: WINE, flexShrink: 0 }} />
    </div>
  );
}

// ─── SLIDE 2-N: Insight ───────────────────────────────────────────────────────
function InsightSlide({ slot, text, num, total }: { slot: string; text: string; num: number; total: number }) {
  const meta  = SLOT_META[slot] ?? SLOT_META.tarde;
  const fSize = insightFontSize(text);

  return (
    <div style={{ width: "1080px", height: "1350px", background: OFFWHITE, display: "flex", flexDirection: "column", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "1080px", height: `${BAR}px`, background: WINE, flexShrink: 0 }} />
      <Header />

      {/* Número do slide — sutil, canto superior direito da área de conteúdo */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: `24px ${MARGIN}px 0px ${MARGIN}px` }}>
        <span style={{ fontSize: "16px", color: GREY3, letterSpacing: "3px" }}>
          {String(num).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>

      {/* Texto do insight — centralizado verticalmente */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `0px ${MARGIN}px` }}>
        {/* Traço decorativo */}
        <div style={{ width: "40px", height: "3px", background: WINE, marginBottom: "48px" }} />

        <span style={{
          fontSize: `${fSize}px`,
          fontWeight: 300,
          color: BLACK,
          lineHeight: 1.25,
          letterSpacing: "-0.5px",
          display: "block",
        }}>
          {text}
        </span>
      </div>

      <Footer footer={meta.footer} cta />
      <div style={{ width: "1080px", height: `${BAR}px`, background: WINE, flexShrink: 0 }} />
    </div>
  );
}

// ─── SLIDE FINAL: CTA invertido ───────────────────────────────────────────────
function CTASlide({ slot, text }: { slot: string; text: string }) {
  const meta  = SLOT_META[slot] ?? SLOT_META.tarde;
  const fSize = insightFontSize(text);

  return (
    <div style={{ width: "1080px", height: "1350px", background: WINE, display: "flex", flexDirection: "column", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Barra off-white topo */}
      <div style={{ width: "1080px", height: `${BAR}px`, background: OFFWHITE, flexShrink: 0 }} />
      <Header inverted />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `0px ${MARGIN}px` }}>
        {/* Label */}
        <span style={{ fontSize: "20px", color: "rgba(247,244,239,0.6)", letterSpacing: "6px", textTransform: "uppercase", marginBottom: "48px", display: "block" }}>
          Ahora dime
        </span>

        {/* Pergunta CTA — grande, off-white */}
        <span style={{
          fontSize: `${fSize}px`,
          fontWeight: 700,
          color: OFFWHITE,
          lineHeight: 1.15,
          letterSpacing: "-1px",
          display: "block",
        }}>
          {text}
        </span>

        {/* Instrução */}
        <div style={{ display: "flex", alignItems: "center", marginTop: "60px" }}>
          <div style={{ width: "36px", height: "2px", background: "rgba(247,244,239,0.4)", marginRight: "20px" }} />
          <span style={{ fontSize: "26px", color: "rgba(247,244,239,0.7)", fontWeight: 300, letterSpacing: "1px" }}>
            Comenta abajo 👇
          </span>
        </div>
      </div>

      <Footer footer={meta.footer} inverted />
      {/* Barra off-white base */}
      <div style={{ width: "1080px", height: `${BAR}px`, background: OFFWHITE, flexShrink: 0 }} />
    </div>
  );
}

// ─── Handler principal ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slide = searchParams.get("slide") ?? "cover";
  const slot  = searchParams.get("slot")  ?? "tarde";
  const title = searchParams.get("title") ?? "La mente necesita silencio";
  const text  = searchParams.get("text")  ?? "";
  const num   = parseInt(searchParams.get("num")   ?? "2");
  const total = parseInt(searchParams.get("total") ?? "4");

  let node;
  if (slide === "cta") {
    node = <CTASlide slot={slot} text={text || title} />;
  } else if (slide === "insight") {
    node = <InsightSlide slot={slot} text={text} num={num} total={total} />;
  } else {
    node = <CoverSlide slot={slot} title={title} />;
  }

  return new ImageResponse(node, { width: 1080, height: 1350 });
}
