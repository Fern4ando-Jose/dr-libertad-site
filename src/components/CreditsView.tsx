"use client";

// Página de CRÉDITOS DA TRILHA dos Reels. Existe por obrigação de licença: as faixas
// numeradas do pool são do catálogo de Kevin MacLeod (incompetech.com), em Creative
// Commons Atribuição 4.0 — uso comercial livre, crédito obrigatório. A licença aceita o
// crédito num lugar onde "quem quiser saber de onde veio a música ache sem dificuldade":
// esta página, linkada no rodapé, é esse lugar (sem poluir a legenda de cada Reel).
//
// A lista NÃO é escrita à mão — vem de src/content/music-credits.json, gerado das tags
// ID3 dos próprios mp3 por scripts/build-music-credits.mjs. Faixa nova no pool aparece
// aqui sozinha na próxima geração.
//
// A copy mora aqui (e não no dictionaries.ts) de propósito: é texto legal/técnico, não
// voz de marca, e o dicionário é arquivo disputado por várias frentes.

import { motion } from "framer-motion";
import StudioContainer from "@/components/ui/Container";
import { useLang } from "@/lib/i18n/LanguageProvider";
import credits from "@/content/music-credits.json";

const COPY = {
  br: {
    eyebrow: "Créditos",
    title: "A música dos vídeos",
    intro:
      "Os vídeos publicados nas nossas contas usam trilhas instrumentais de terceiros, licenciadas para uso comercial. Esta página existe para dar o crédito que essas licenças pedem — e para que qualquer pessoa que ouça uma faixa e queira saber de onde ela veio consiga descobrir aqui.",
    worksTitle: "Faixas utilizadas",
    aiNote: (n: number) =>
      `Além das faixas creditadas acima, ${n} trilha${n === 1 ? "" : "s"} usada${n === 1 ? "" : "s"} nos vídeos ${n === 1 ? "foi gerada" : "foram geradas"} por inteligência artificial sob encomenda nossa — não têm autor de terceiros e não exigem atribuição.`,
    colTrack: "Faixa",
    colArtist: "Autor",
    licenseLabel: "Licença",
    sourceLabel: "Origem",
  },
  es: {
    eyebrow: "Créditos",
    title: "La música de los vídeos",
    intro:
      "Los vídeos publicados en nuestras cuentas usan pistas instrumentales de terceros, licenciadas para uso comercial. Esta página existe para dar el crédito que esas licencias piden — y para que cualquiera que escuche una pista y quiera saber de dónde viene pueda averiguarlo aquí.",
    worksTitle: "Pistas utilizadas",
    aiNote: (n: number) =>
      `Además de las pistas acreditadas arriba, ${n} pista${n === 1 ? "" : "s"} usada${n === 1 ? "" : "s"} en los vídeos ${n === 1 ? "fue generada" : "fueron generadas"} por inteligencia artificial por encargo nuestro — no tienen autor de terceros y no exigen atribución.`,
    colTrack: "Pista",
    colArtist: "Autor",
    licenseLabel: "Licencia",
    sourceLabel: "Origen",
  },
} as const;

export default function CreditsView() {
  const { lang } = useLang();
  const c = COPY[lang === "es" ? "es" : "br"];

  return (
    <motion.main
      className="relative z-10"
      initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      <section className="relative overflow-hidden border-b border-warm-gray/10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(900px circle at 20% 0%, rgba(164,90,90,0.14), transparent 55%)",
          }}
        />
        <StudioContainer>
          <div className="relative pt-32 pb-12 md:pt-36">
            <div className="text-xs tracking-[0.26em] text-warm-gray/80 uppercase">{c.eyebrow}</div>
            <h1 className="mt-5 max-w-[20ch] font-serif text-[clamp(2.1rem,4.4vw,3.6rem)] leading-[1.0] tracking-[-0.035em] text-pretty">
              {c.title}
            </h1>
            <div className="mt-7 h-[1px] w-28 bg-gradient-to-r from-muted-red/70 via-warm-gray/25 to-transparent" />
          </div>
        </StudioContainer>
      </section>

      <section className="py-14 md:py-20">
        <StudioContainer>
          <div className="max-w-3xl">
            <p className="prose-justify text-[1.05rem] leading-[1.85] text-warm-gray/90">{c.intro}</p>

            {/* atribuição por autor — a linha canônica que cada licença exige */}
            <div className="mt-12 space-y-5">
              {credits.credits.map((a) => (
                <div
                  key={a.artist}
                  className="rounded-2xl border border-warm-gray/15 bg-white/3 px-6 py-5 backdrop-blur"
                >
                  <div className="font-serif text-[1.2rem] leading-[1.25] text-offwhite">
                    {a.artist}
                  </div>
                  <div className="mt-3 text-[0.95rem] leading-[1.75] text-warm-gray/85">
                    {a.line}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-warm-gray/70">
                    <span>
                      {c.sourceLabel}:{" "}
                      {a.sourceUrl ? (
                        <a
                          className="underline hover:text-offwhite transition"
                          href={a.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {a.source}
                        </a>
                      ) : (
                        a.source
                      )}
                    </span>
                    <span>
                      {c.licenseLabel}:{" "}
                      {a.licenseUrl ? (
                        <a
                          className="underline hover:text-offwhite transition"
                          href={a.licenseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {a.license}
                        </a>
                      ) : (
                        a.license
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="mt-14 font-serif text-[1.35rem] leading-[1.2] tracking-[-0.01em] text-offwhite">
              {c.worksTitle}
            </h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse text-left text-[0.95rem]">
                <thead>
                  <tr className="border-b border-warm-gray/15 text-xs tracking-[0.14em] text-warm-gray/70 uppercase">
                    <th className="py-3 pr-4 font-normal">{c.colTrack}</th>
                    <th className="py-3 font-normal">{c.colArtist}</th>
                  </tr>
                </thead>
                <tbody>
                  {credits.works.map((w) => (
                    <tr key={w.files[0]} className="border-b border-warm-gray/8">
                      <td className="py-2.5 pr-4 text-warm-gray/90">{w.title || "—"}</td>
                      <td className="py-2.5 text-warm-gray/70">{w.artist}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {credits.aiCount > 0 && (
              <p className="mt-10 text-sm leading-[1.75] text-warm-gray/70">
                {c.aiNote(credits.aiCount)}
              </p>
            )}
          </div>
        </StudioContainer>
      </section>
    </motion.main>
  );
}
