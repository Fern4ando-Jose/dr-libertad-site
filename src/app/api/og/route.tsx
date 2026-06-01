import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// ─── Dimensões ────────────────────────────────────────────────────────────────
const W = 1080;
const H = 1350;

// ─── Paleta EXATA do site (EditorialGrid / PosterFace) ───────────────────────
const INK       = "#0B0B0C";
const OFFWHITE  = "#F4F0E8";
const RED       = "#A45A5A";
const INK_70    = "rgba(11,11,12,0.70)";
const INK_65    = "rgba(11,11,12,0.65)";
const INK_55    = "rgba(11,11,12,0.55)";
const INK_22    = "rgba(11,11,12,0.22)";
const INK_20    = "rgba(11,11,12,0.20)";
const INK_10    = "rgba(11,11,12,0.10)";
const RED_45    = "rgba(164,90,90,0.45)";

// ─── Proporções: site usa aspect-square para o PosterFace ────────────────────
// Card width = W - 2*CM. PosterFace é quadrado = CW × CW. Caption bar abaixo.
const CM = 44;          // margem frame → cartão
const CW = W - CM * 2; // 992px — largura do cartão
// O cartão tem: poster quadrado (992×992) + caption bar (88px) = 1080px total
// Mas nosso frame é 1350px, então temos 270px extras distribuídos acima/abaixo do card
const CAPTION_H = 88;
const CH = CW + CAPTION_H;  // 1080px total do cartão (poster 992² + caption 88)

// ─── Escala: site original ~394px → nosso ~992px → factor ≈ 2.52 ───────────
const F = CW / 394; // ≈ 2.52

// Padding interno: p-7 = 28px original → ~71px
const PAD = Math.round(28 * F);

// ─── Carregar fonte Fraunces ──────────────────────────────────────────────────
async function loadFraunces(weight: 700): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,${weight}&display=swap`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot)" } }
    ).then(r => r.text());
    const match = css.match(/src: url\(([^)]+\.woff2)\)/);
    if (!match) return null;
    return fetch(match[1]).then(r => r.arrayBuffer());
  } catch {
    return null;
  }
}

// ─── Tamanho da fonte do título ───────────────────────────────────────────────
function titleSize(text: string): number {
  const l = text.length;
  if (l <= 16) return 120;
  if (l <= 24) return 104;
  if (l <= 34) return 88;
  if (l <= 46) return 74;
  if (l <= 60) return 62;
  return 52;
}

// ─── PosterFace: replica o componente do site ─────────────────────────────────
// mood: "red" | "ink" (alterna entre edições, igual ao EditorialGrid)
function PosterFace({
  kw, issue, mood, title, subtitle, tag, showSlideNum, slideNum, total,
}: {
  kw:           string;
  issue:        string;
  mood:         "red" | "ink";
  title:        string;         // já em UPPERCASE
  subtitle:     string;
  tag:          string;
  showSlideNum: boolean;
  slideNum:     number;
  total:        number;
}) {
  const accentColor = mood === "red" ? RED   : INK_22;
  const badgeColor  = mood === "red" ? RED   : INK_65;
  const badgeBorder = mood === "red" ? RED_45 : INK_22;
  const dotColor    = mood === "red" ? RED   : INK;
  const fSize       = titleSize(title);

  // PosterFace é QUADRADO = CW × CW (aspect-square como no site)
  const PH = CW;

  return (
    <div style={{
      width:    `${CW}px`,
      height:   `${PH}px`,
      position: "relative",
      padding:  `${PAD}px`,
      display:  "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* ── Gradiente warm paper (idêntico ao PosterFace do site) ── */}
      <div style={{
        position: "absolute",
        top:      0,
        right:    0,
        bottom:   0,
        left:     0,
        background:
          "radial-gradient(900px circle at 22% 18%, rgba(231,221,204,0.55), transparent 60%)," +
          "radial-gradient(700px circle at 70% 72%, rgba(0,0,0,0.10), transparent 60%)",
        display:  "flex",
      }} />

      {/* ── Linha vermelha horizontal (absolute, igual ao site: top-7 left-7 right-7) ── */}
      <div style={{
        position:   "absolute",
        top:        `${PAD}px`,
        left:       `${PAD}px`,
        right:      `${PAD}px`,
        height:     "1px",
        background: accentColor,
      }} />

      {/* ── Conteúdo relativo ── */}
      <div style={{
        position:      "relative",
        display:       "flex",
        flexDirection: "column",
        height:        "100%",
      }}>

        {/* Kicker + Badge (igual ao site) */}
        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "flex-start",
          gap:            "16px",
        }}>
          <span style={{
            fontSize:      `${Math.round(11 * F)}px`,   // ~30px
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color:         INK_70,
            fontWeight:    400,
          }}>
            {kw}
          </span>

          {/* Badge pill — exato como no PosterFace */}
          <div style={{
            borderRadius: "9999px",
            border:       `1px solid ${badgeBorder}`,
            background:   "rgba(255,255,255,0.45)",
            padding:      `${Math.round(4 * F)}px ${Math.round(12 * F)}px`,
            display:      "flex",
            alignItems:   "center",
            flexShrink:   0,
          }}>
            <span style={{
              fontSize:      `${Math.round(10 * F)}px`,   // ~28px
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color:         badgeColor,
              fontWeight:    400,
            }}>
              {issue}
            </span>
          </div>
        </div>

        {/* Número do slide (nos insights) */}
        {showSlideNum && (
          <div style={{
            display:        "flex",
            justifyContent: "flex-end",
            marginTop:      "8px",
          }}>
            <span style={{
              fontSize:      `${Math.round(9 * F)}px`,
              color:         INK_20,
              letterSpacing: "0.15em",
            }}>
              {String(slideNum).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
          </div>
        )}

        {/* Título grande — font-serif leading-[0.92] tracking-[-0.04em] */}
        <div style={{
          marginTop: `${Math.round(40 * F * 0.55)}px`,    // ~61px
          flex:      1,
          display:   "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}>
          <div style={{
            fontFamily:    '"Fraunces", ui-serif, Georgia, serif',
            fontSize:      `${fSize}px`,
            fontWeight:    700,
            color:         INK,
            lineHeight:    0.92,
            letterSpacing: "-0.04em",
            display:       "block",
            marginBottom:  `${Math.round(16 * F * 0.5)}px`,
          }}>
            {title}
          </div>

          {/* Subtítulo: max-w-[26ch] text-[0.95rem] text-black/70 */}
          <div style={{
            fontSize:   `${Math.round(15.2 * F * 0.65)}px`,   // ~27px
            lineHeight: 1.55,
            color:      INK_70,
            fontWeight: 400,
            maxWidth:   `${26 * Math.round(15.2 * F * 0.65) * 0.6}px`,
          }}>
            {subtitle}
          </div>
        </div>

        {/* ── Labels de rodapé: absolute bottom-7 left-0 right-0 (dentro do padding) ── */}
        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "flex-end",
          gap:            "16px",
        }}>
          {/* Tag */}
          <span style={{
            fontSize:      `${Math.round(10 * F * 0.7)}px`,   // ~19px
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color:         INK_55,
          }}>
            {tag}
          </span>

          {/* Progress: linha + dot */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width:      `${Math.round(48 * F * 0.5)}px`,   // ~66px
              height:     "1px",
              background: INK_20,
            }} />
            <div style={{
              width:        `${Math.round(10 * F * 0.5)}px`,
              height:       `${Math.round(10 * F * 0.5)}px`,
              borderRadius: "50%",
              background:   dotColor,
              opacity:      0.8,
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Caption bar (fora do PosterFace, igual ao CoverCard do site) ─────────────
function CaptionBar({ issue }: { issue: string }) {
  return (
    <div style={{
      height:         `${CAPTION_H}px`,
      borderTop:      `1px solid ${INK_10}`,
      padding:        `0 ${PAD}px`,
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      gap:            "16px",
      flexShrink:     0,
    }}>
      <span style={{
        fontSize:      `${Math.round(11 * F * 0.6)}px`,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color:         "rgba(0,0,0,0.65)",
      }}>
        DR. LIBERTAD
      </span>
      <span style={{
        fontSize:      `${Math.round(11 * F * 0.6)}px`,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color:         "rgba(0,0,0,0.55)",
      }}>
        {issue}
      </span>
    </div>
  );
}

// ─── Frame completo: ink background + card flutuante ─────────────────────────
function Frame({
  children, mood,
}: { children: React.ReactNode; mood: "red" | "ink" }) {
  return (
    <div style={{
      width:          `${W}px`,
      height:         `${H}px`,
      background:     INK,
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
    }}>
      {/* Card: rounded-3xl border border-warm-gray/20 bg-offwhite/95 shadow
          Proporção: poster quadrado (992×992) + caption bar (88) = 1080 total */}
      <div style={{
        width:         `${CW}px`,
        height:        `${CH}px`,
        background:    `rgba(244,240,232,0.95)`,
        borderRadius:  "32px",
        border:        `1px solid rgba(185,176,162,0.20)`,
        boxShadow:     "0 20px 80px rgba(0,0,0,0.45)",
        display:       "flex",
        flexDirection: "column",
        overflow:      "hidden",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── SLIDE 1: Capa ────────────────────────────────────────────────────────────
function CoverSlide({
  slot, title, kw, issue, mood, tag,
}: { slot: string; title: string; kw: string; issue: string; mood: "red" | "ink"; tag: string }) {
  const SLOT_SUBTITLE: Record<string, string> = {
    manha: "Empieza aquí tu claridad mental.",
    tarde: "El mundo compite por ella.",
    noite: "¿Qué elegirás mañana?",
  };
  const subtitle = SLOT_SUBTITLE[slot] ?? "Empieza aquí tu claridad mental.";

  return (
    <Frame mood={mood}>
      <PosterFace
        kw={kw || "EDITORIAL"}
        issue={issue}
        mood={mood}
        title={title.toUpperCase()}
        subtitle={subtitle}
        tag={tag}
        showSlideNum={false}
        slideNum={1}
        total={5}
      />
      <CaptionBar issue={issue} />
    </Frame>
  );
}

// ─── SLIDE 2-N: Insight ───────────────────────────────────────────────────────
function InsightSlide({
  slot, text, num, total, kw, issue, mood, tag,
}: { slot: string; text: string; num: number; total: number; kw: string; issue: string; mood: "red" | "ink"; tag: string }) {
  // Dividir: última frase vira subtítulo
  const sentences = text.split(/[.!?]\s+/).map(s => s.trim()).filter(Boolean);
  let mainText: string;
  let subText: string;

  if (sentences.length >= 2) {
    subText  = sentences.pop()!;
    mainText = sentences.join(" ");
  } else {
    const words = text.split(" ");
    const half  = Math.ceil(words.length * 0.6);
    mainText = words.slice(0, half).join(" ");
    subText  = words.slice(half).join(" ");
  }

  return (
    <Frame mood={mood}>
      <PosterFace
        kw={kw || "EDITORIAL"}
        issue={issue}
        mood={mood}
        title={mainText.toUpperCase()}
        subtitle={subText}
        tag={tag}
        showSlideNum={true}
        slideNum={num}
        total={total}
      />
      <CaptionBar issue={issue} />
    </Frame>
  );
}

// ─── SLIDE FINAL: CTA ─────────────────────────────────────────────────────────
function CTASlide({
  slot, text, kw, issue, mood, tag,
}: { slot: string; text: string; kw: string; issue: string; mood: "red" | "ink"; tag: string }) {
  const SLOT_CTA_TAG: Record<string, string> = {
    manha: "Responde en los comentarios",
    tarde: "Responde en los comentarios",
    noite: "Responde en los comentarios",
  };

  return (
    <Frame mood={mood}>
      <PosterFace
        kw={kw || "EDITORIAL"}
        issue={issue}
        mood={mood}
        title={text.toUpperCase()}
        subtitle="Comenta abajo 👇"
        tag={SLOT_CTA_TAG[slot] ?? tag}
        showSlideNum={false}
        slideNum={1}
        total={1}
      />
      <CaptionBar issue={issue} />
    </Frame>
  );
}

// ─── Handler principal ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const slide = searchParams.get("slide") ?? "cover";
    const slot  = searchParams.get("slot")  ?? "tarde";
    const title = searchParams.get("title") ?? "La mente necesita silencio";
    const text  = searchParams.get("text")  ?? "";
    const kw    = searchParams.get("kw")    ?? "";
    const tag   = searchParams.get("tag")   ?? "";
    const issue = `ED. ${searchParams.get("ed") ?? "01"}`;
    const mood  = (searchParams.get("mood") ?? "red") as "red" | "ink";
    const num   = parseInt(searchParams.get("num")   ?? "2");
    const total = parseInt(searchParams.get("total") ?? "4");

    const fontBold = await loadFraunces(700);

    let node;
    if (slide === "cta") {
      node = <CTASlide slot={slot} text={text || title} kw={kw} issue={issue} mood={mood} tag={tag} />;
    } else if (slide === "insight") {
      node = <InsightSlide slot={slot} text={text} num={num} total={total} kw={kw} issue={issue} mood={mood} tag={tag} />;
    } else {
      node = <CoverSlide slot={slot} title={title} kw={kw} issue={issue} mood={mood} tag={tag} />;
    }

    const fonts = fontBold
      ? [{ name: "Fraunces", data: fontBold, weight: 700 as const, style: "normal" as const }]
      : [];

    return new ImageResponse(node, { width: W, height: H, fonts });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`OG Error: ${msg}`, { status: 500 });
  }
}
