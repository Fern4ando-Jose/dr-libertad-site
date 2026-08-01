import { ImageResponse } from "next/og";
import { LANGS } from "@/lib/i18n/dictionaries";
import { loadFraunces } from "@/lib/og-font";
import { brandFor, toLang } from "@/lib/seo";

// A imagem que aparece quando o link do site é colado no WhatsApp, no Direct ou
// no X. Antes o site reaproveitava /api/og — um slide de Instagram de 1080x1350
// (4:5) declarado no metadata como 1080x1080. Além de a medida estar errada, um
// retrato cortado no meio é o que o `summary_large_image` mostrava. Aqui vale a
// medida que as redes de fato esperam: 1200x630.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Dr. Libertad — estúdio editorial";

// Uma imagem por idioma, gerada no build (as duas rotas são estáticas).
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

const INK = "#0B0B0C";
const OFFWHITE = "#F4F0E8";
const RED = "#A45A5A";

const TAGLINE = {
  br: "Atenção, dopamina e desintoxicação digital",
  es: "Atención, dopamina y desintoxicación digital",
} as const;

const EYEBROW = {
  br: "ESTÚDIO EDITORIAL",
  es: "ESTUDIO EDITORIAL",
} as const;

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const l = toLang((await params).lang);

  // Mesma Fraunces dos slides do Instagram (satori não lê woff2; o arquivo
  // compartilhado em lib/og-font.ts já vem como TTF).
  const fraunces = loadFraunces();

  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: INK,
          color: OFFWHITE,
          padding: "0 88px",
          position: "relative",
        }}
      >
        {/* Mesmo brilho quente das seções do site. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size.width,
            height: size.height,
            display: "flex",
            background:
              "radial-gradient(760px circle at 18% 0%, rgba(45,90,61,0.22), transparent 58%), radial-gradient(620px circle at 88% 12%, rgba(164,90,90,0.24), transparent 55%)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={{ fontSize: 22, letterSpacing: 8, color: "rgba(244,240,232,0.7)" }}>
            {EYEBROW[l]}
          </div>
          <div
            style={{
              fontFamily: "Fraunces",
              fontSize: 92,
              lineHeight: 1.02,
              letterSpacing: -3,
              marginTop: 26,
            }}
          >
            {brandFor(l)}
          </div>
          <div style={{ display: "flex", width: 220, height: 3, background: RED, marginTop: 32 }} />
          <div
            style={{
              fontSize: 38,
              lineHeight: 1.3,
              color: "rgba(244,240,232,0.86)",
              marginTop: 32,
              maxWidth: 900,
            }}
          >
            {TAGLINE[l]}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Fraunces", data: fraunces, weight: 700, style: "normal" }],
    }
  );
}
