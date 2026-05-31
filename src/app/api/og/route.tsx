import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// ─── Dimensões ────────────────────────────────────────────────────────────────
const W  = 1080;
const H  = 1350;
const CM = 52;    // margem do cartão ao edge da imagem
const CP = 68;    // padding horizontal interno do cartão
const CPV = 56;   // padding vertical interno do cartão

// ─── Cores ────────────────────────────────────────────────────────────────────
const CARD_BG   = "#EDEAE2";  // off-white quente
const TXT_DARK  = "#1C1A18";  // quase preto
const TXT_MID   = "#6E6A64";  // cinza médio
const TXT_LITE  = "#ABA79F";  // cinza claro
const CORAL     = "#C84A3C";  // vermelho/coral para badge e acentos
const WHITE     = "#FFFFFF";

// ─── Tamanhos de cartão ───────────────────────────────────────────────────────
const CW = W - CM * 2;   // 976
const CH = H - CM * 2;   // 1246

// ─── Mapa de metadados por slot ───────────────────────────────────────────────
const SLOT_META: Record<string, { defaultKw: string; category: string; cueLabel: string }> = {
  manha: { defaultKw: "PSICOLOGÍA",  category: "Claridad Mental",        cueLabel: "Empieza tu día" },
  tarde: { defaultKw: "ATENCIÓN",    category: "Enfoque · Mente",        cueLabel: "Lo que cambia todo" },
  noite: { defaultKw: "REFLEXIÓN",   category: "Consciencia · Libertad", cueLabel: "Piénsalo esta noche" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function titleSize(text: string): number {
  const len = text.length;
  if (len <= 14) return 110;
  if (len <= 22) return 96;
  if (len <= 32) return 82;
  if (len <= 44) return 70;
  return 60;
}

function insightSize(text: string): number {
  const len = text.length;
  if (len <= 50)  return 80;
  if (len <= 80)  return 68;
  if (len <= 110) return 58;
  if (len <= 140) return 50;
  return 44;
}

// ─── Fundo escuro com gradiente ───────────────────────────────────────────────
const BG_STYLE = {
  width:      `${W}px`,
  height:     `${H}px`,
  background: "radial-gradient(ellipse 90% 70% at 50% 38%, #3C3A36 0%, #1A1816 100%)",
  display:    "flex",
  alignItems: "center",
  justifyContent: "center",
};

// ─── Componente: Linha topo ───────────────────────────────────────────────────
function TopRow({ kw, edition }: { kw: string; edition: string }) {
  return (
    <div style={{
      display:        "flex",
      justifyContent: "space-between",
      alignItems:     "center",
      padding:        `${CPV}px ${CP}px 0`,
    }}>
      <span style={{
        fontSize:      "17px",
        color:         TXT_MID,
        letterSpacing: "4px",
        textTransform: "uppercase",
        fontWeight:    400,
      }}>
        {kw}
      </span>
      {/* Badge ED. XX */}
      <div style={{
        background:   CORAL,
        borderRadius: "18px",
        padding:      "5px 18px",
        display:      "flex",
        alignItems:   "center",
      }}>
        <span style={{
          fontSize:      "16px",
          color:         WHITE,
          fontWeight:    700,
          letterSpacing: "2px",
        }}>
          ED. {edition}
        </span>
      </div>
    </div>
  );
}

// ─── Componente: Rodapé ───────────────────────────────────────────────────────
function BottomRow({ category, edition }: { category: string; edition: string }) {
  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      padding:       `0 ${CP}px ${CPV}px`,
    }}>
      {/* Linha separadora */}
      <div style={{
        height:        "1px",
        background:    TXT_LITE,
        marginBottom:  "20px",
        opacity:       0.35,
      }} />

      {/* Categoria + indicador dot */}
      <div style={{
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
        marginBottom:   "16px",
      }}>
        <span style={{
          fontSize:      "14px",
          color:         TXT_MID,
          letterSpacing: "3px",
          textTransform: "uppercase",
        }}>
          {category}
        </span>
        {/* Progress dot */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: "36px", height: "1px", background: TXT_LITE }} />
          <div style={{
            width:        "8px",
            height:       "8px",
            borderRadius: "50%",
            background:   CORAL,
            margin:       "0 8px",
          }} />
          <div style={{ width: "36px", height: "1px", background: TXT_LITE }} />
        </div>
      </div>

      {/* Marca */}
      <div style={{
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
      }}>
        <span style={{
          fontSize:      "15px",
          color:         TXT_DARK,
          letterSpacing: "4px",
          textTransform: "uppercase",
          fontWeight:    700,
        }}>
          DR. LIBERTAD
        </span>
        <span style={{
          fontSize:      "14px",
          color:         TXT_LITE,
          letterSpacing: "2px",
        }}>
          ED. {edition}
        </span>
      </div>
    </div>
  );
}

// ─── SLIDE 1: Capa ────────────────────────────────────────────────────────────
function CoverSlide({
  slot, title, kw, edition,
}: { slot: string; title: string; kw: string; edition: string }) {
  const meta   = SLOT_META[slot] ?? SLOT_META.tarde;
  const kwDisp = kw || meta.defaultKw;
  const fSize  = titleSize(title);

  return (
    <div style={BG_STYLE}>
      {/* Cartão flutuante */}
      <div style={{
        width:         `${CW}px`,
        height:        `${CH}px`,
        background:    CARD_BG,
        borderRadius:  "40px",
        display:       "flex",
        flexDirection: "column",
        boxShadow:     "0 48px 120px rgba(0,0,0,0.65), 0 8px 32px rgba(0,0,0,0.35)",
        overflow:      "hidden",
      }}>
        <TopRow kw={kwDisp} edition={edition} />

        {/* Conteúdo principal */}
        <div style={{
          flex:          1,
          display:       "flex",
          flexDirection: "column",
          justifyContent:"center",
          padding:       `0 ${CP}px`,
        }}>
          {/* Acento vermelho */}
          <div style={{
            width:        "44px",
            height:       "4px",
            background:   CORAL,
            marginBottom: "44px",
            borderRadius: "2px",
          }} />

          {/* Título grande e impactante — uppercase */}
          <span style={{
            fontSize:      `${fSize}px`,
            fontWeight:    900,
            color:         TXT_DARK,
            lineHeight:    1.0,
            letterSpacing: "-1px",
            textTransform: "uppercase",
            display:       "block",
            marginBottom:  "36px",
          }}>
            {title}
          </span>

          {/* Cue label — slot */}
          <span style={{
            fontSize:      "22px",
            color:         TXT_MID,
            fontWeight:    300,
            letterSpacing: "1px",
            display:       "block",
          }}>
            {meta.cueLabel}
          </span>
        </div>

        <BottomRow category={meta.category} edition={edition} />
      </div>
    </div>
  );
}

// ─── SLIDE 2-N: Insight ───────────────────────────────────────────────────────
function InsightSlide({
  slot, text, num, total, kw, edition,
}: { slot: string; text: string; num: number; total: number; kw: string; edition: string }) {
  const meta   = SLOT_META[slot] ?? SLOT_META.tarde;
  const kwDisp = kw || meta.defaultKw;
  const fSize  = insightSize(text);

  // Pegar última parte como "punch" em negrito
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const punch   = sentences.pop() ?? "";
  const bodyTxt = sentences.join(". ") + (sentences.length ? "." : "");

  return (
    <div style={BG_STYLE}>
      <div style={{
        width:         `${CW}px`,
        height:        `${CH}px`,
        background:    CARD_BG,
        borderRadius:  "40px",
        display:       "flex",
        flexDirection: "column",
        boxShadow:     "0 48px 120px rgba(0,0,0,0.65), 0 8px 32px rgba(0,0,0,0.35)",
        overflow:      "hidden",
      }}>
        <TopRow kw={kwDisp} edition={edition} />

        {/* Número do slide — discreto */}
        <div style={{
          display:        "flex",
          justifyContent: "flex-end",
          padding:        `12px ${CP}px 0`,
        }}>
          <span style={{
            fontSize:      "13px",
            color:         TXT_LITE,
            letterSpacing: "2px",
          }}>
            {String(num).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>

        {/* Conteúdo central */}
        <div style={{
          flex:          1,
          display:       "flex",
          flexDirection: "column",
          justifyContent:"center",
          padding:       `0 ${CP}px`,
        }}>
          {/* Traço decorativo */}
          <div style={{
            width:        "36px",
            height:       "3px",
            background:   CORAL,
            marginBottom: "40px",
            borderRadius: "2px",
          }} />

          {/* Texto do insight — bold uppercase */}
          {bodyTxt ? (
            <>
              <span style={{
                fontSize:      `${fSize}px`,
                fontWeight:    900,
                color:         TXT_DARK,
                lineHeight:    1.1,
                textTransform: "uppercase",
                letterSpacing: "-0.5px",
                display:       "block",
                marginBottom:  "12px",
              }}>
                {bodyTxt}
              </span>
              <span style={{
                fontSize:      `${Math.round(fSize * 0.7)}px`,
                fontWeight:    400,
                color:         TXT_MID,
                lineHeight:    1.3,
                display:       "block",
              }}>
                {punch}
              </span>
            </>
          ) : (
            <span style={{
              fontSize:      `${fSize}px`,
              fontWeight:    900,
              color:         TXT_DARK,
              lineHeight:    1.1,
              textTransform: "uppercase",
              letterSpacing: "-0.5px",
              display:       "block",
            }}>
              {text}
            </span>
          )}
        </div>

        <BottomRow category={meta.category} edition={edition} />
      </div>
    </div>
  );
}

// ─── SLIDE FINAL: CTA ─────────────────────────────────────────────────────────
function CTASlide({
  slot, text, kw, edition,
}: { slot: string; text: string; kw: string; edition: string }) {
  const meta   = SLOT_META[slot] ?? SLOT_META.tarde;
  const kwDisp = kw || meta.defaultKw;
  const fSize  = insightSize(text);

  return (
    <div style={BG_STYLE}>
      {/* Cartão CTA: fundo escuro para contraste máximo */}
      <div style={{
        width:         `${CW}px`,
        height:        `${CH}px`,
        background:    "#1C1A18",
        borderRadius:  "40px",
        display:       "flex",
        flexDirection: "column",
        boxShadow:     "0 48px 120px rgba(0,0,0,0.8), 0 8px 32px rgba(0,0,0,0.5)",
        overflow:      "hidden",
      }}>
        {/* Top row — versão invertida */}
        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          padding:        `${CPV}px ${CP}px 0`,
        }}>
          <span style={{
            fontSize:      "17px",
            color:         "rgba(237,234,226,0.45)",
            letterSpacing: "4px",
            textTransform: "uppercase",
          }}>
            {kwDisp}
          </span>
          <div style={{
            background:   "rgba(200,74,60,0.85)",
            borderRadius: "18px",
            padding:      "5px 18px",
            display:      "flex",
            alignItems:   "center",
          }}>
            <span style={{ fontSize: "16px", color: WHITE, fontWeight: 700, letterSpacing: "2px" }}>
              ED. {edition}
            </span>
          </div>
        </div>

        {/* Conteúdo central */}
        <div style={{
          flex:          1,
          display:       "flex",
          flexDirection: "column",
          justifyContent:"center",
          padding:       `0 ${CP}px`,
        }}>
          {/* Label */}
          <span style={{
            fontSize:      "18px",
            color:         "rgba(237,234,226,0.45)",
            letterSpacing: "5px",
            textTransform: "uppercase",
            marginBottom:  "36px",
            display:       "block",
          }}>
            Ahora dime
          </span>

          {/* Pergunta CTA — grande, off-white */}
          <span style={{
            fontSize:      `${fSize}px`,
            fontWeight:    800,
            color:         CARD_BG,
            lineHeight:    1.1,
            letterSpacing: "-0.5px",
            display:       "block",
            marginBottom:  "48px",
          }}>
            {text}
          </span>

          {/* Instrução */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: "32px", height: "2px", background: "rgba(237,234,226,0.25)", marginRight: "16px" }} />
            <span style={{
              fontSize:  "22px",
              color:     "rgba(237,234,226,0.6)",
              fontWeight:300,
            }}>
              Comenta abajo 👇
            </span>
          </div>
        </div>

        {/* Rodapé — invertido */}
        <div style={{
          display:       "flex",
          flexDirection: "column",
          padding:       `0 ${CP}px ${CPV}px`,
        }}>
          <div style={{ height: "1px", background: "rgba(237,234,226,0.15)", marginBottom: "20px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "14px", color: "rgba(237,234,226,0.4)", letterSpacing: "3px", textTransform: "uppercase" }}>
              {meta.category}
            </span>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: "36px", height: "1px", background: "rgba(237,234,226,0.25)" }} />
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: CORAL, margin: "0 8px" }} />
              <div style={{ width: "36px", height: "1px", background: "rgba(237,234,226,0.25)" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "15px", color: CARD_BG, letterSpacing: "4px", textTransform: "uppercase", fontWeight: 700 }}>
              DR. LIBERTAD
            </span>
            <span style={{ fontSize: "14px", color: "rgba(237,234,226,0.4)", letterSpacing: "2px" }}>
              ED. {edition}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Handler principal ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slide   = searchParams.get("slide")   ?? "cover";
  const slot    = searchParams.get("slot")    ?? "tarde";
  const title   = searchParams.get("title")   ?? "La mente necesita silencio";
  const text    = searchParams.get("text")    ?? "";
  const kw      = searchParams.get("kw")      ?? "";
  const edition = searchParams.get("ed")      ?? "01";
  const num     = parseInt(searchParams.get("num")   ?? "2");
  const total   = parseInt(searchParams.get("total") ?? "4");

  let node;
  if (slide === "cta") {
    node = <CTASlide slot={slot} text={text || title} kw={kw} edition={edition} />;
  } else if (slide === "insight") {
    node = <InsightSlide slot={slot} text={text} num={num} total={total} kw={kw} edition={edition} />;
  } else {
    node = <CoverSlide slot={slot} title={title} kw={kw} edition={edition} />;
  }

  return new ImageResponse(node, { width: W, height: H });
}
