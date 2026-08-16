"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import StudioContainer from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import PreSaleCard from "@/components/ui/PreSaleCard";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { getBook } from "@/lib/books";

// Medida das fotos de "por dentro" (public/images/livro-spread-*.jpg). Todas
// saem do mesmo gabarito, então uma constante basta — e o next/image precisa
// dela para reservar o espaço e não empurrar o texto quando a foto carrega.
const SPREAD = { width: 1400, height: 990 };

// Prova social do herói (C2 da auditoria de marketing 16/08): quantas pessoas
// já garantiram o preço na lista de espera. Número REAL da tabela `waitlist`,
// lido por /api/waitlist?slug= — escondido abaixo do limiar (n<30) e com falha
// silenciosa: aprimoramento nunca derruba a página nem inventa número.
function SocialProof({ slug, label }: { slug: string; label: string }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/waitlist?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.ok && typeof d.count === "number") setN(d.count);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);
  if (n === null || n < 30) return null;
  return (
    <div className="mt-4 inline-flex items-center gap-2.5 rounded-full border border-warm-gray/20 bg-white/5 px-4 py-2 text-xs tracking-[0.04em] text-warm-gray/85">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-muted-red/50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-red" />
      </span>
      {label.replace("{n}", String(n))}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs tracking-[0.26em] text-warm-gray/80 uppercase">{children}</div>
  );
}

function Heading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 font-serif tracking-[-0.02em] text-[clamp(1.75rem,3.4vw,2.7rem)] leading-[1.03] text-balance">
        {title}
      </h2>
      <div className="mt-5 h-[1px] w-28 bg-gradient-to-r from-muted-red/70 via-warm-gray/25 to-transparent" />
    </div>
  );
}

// A lista de espera (pré-venda) agora é o card animado `PreSaleCard` — pedido do
// dono 15/08/2026. Ele é a nova casa da âncora #pre-venda e entra em seção própria,
// logo abaixo do herói.

export default function BookSales({ slug }: { slug: string }) {
  const { t, lang } = useLang();
  const book = getBook(slug);
  if (!book) return null;
  const L = t[book.dictKey];
  // Modo GRÁTIS (prévia): entrega um PDF por download, sem checkout pago.
  const free = !!book.free && !!book.leadPdf;
  const leadPdf = book.leadPdf?.[lang] ?? book.leadPdf?.br ?? "#";
  // Livros em pré-venda SEM prévia (ex.: Tolos, só a capa existe) não ganham o link
  // morto "Ler a prévia grátis" → `hasLead` corta o render sem tocar nos que têm PDF.
  const hasLead = !!book.leadPdf?.[lang] || !!book.leadPdf?.br;
  const checkout = book.checkout?.[lang] ?? book.checkout?.br ?? "#";
  // PRÉ-VENDA (pré-lançamento): a oferta principal vira a lista de espera (garantir
  // o preço). O CTA rola até o formulário (#pre-venda) e a prévia grátis fica como
  // opção secundária — o funil comment→DM continua apontando para esta página.
  const preSale = !!book.preSale;
  const heroHref = preSale ? "#pre-venda" : free ? leadPdf : checkout;
  const cover = book.cover[lang] ?? book.cover.br;
  const spreads = book.insideImages ?? [];
  // Versão do arquivo e onde comprar (ex.: "Versão e-pub · Amazon e Google Play").
  // Só aparece quando o livro declara a nota — os demais não são vendidos lá.
  const epubNote = "epubNote" in L ? L.epubNote : undefined;
  const promoVideo = book.promoVideo?.[lang] ?? null;
  const promoPoster = book.promoPoster?.[lang] ?? null;

  return (
    <motion.main
      className="relative z-10"
      initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      {/* HERO */}
      <section id="top" className="relative overflow-hidden border-b border-warm-gray/10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(900px circle at 18% 0%, rgba(45,90,61,0.20), transparent 55%), radial-gradient(800px circle at 88% 12%, rgba(164,90,90,0.18), transparent 52%)",
          }}
        />
        <StudioContainer>
          <div className="relative grid gap-12 pt-28 pb-16 md:pt-32 md:pb-24 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <a
                href={`/${lang}/livros`}
                className="text-xs tracking-[0.2em] uppercase text-warm-gray/70 hover:text-offwhite transition"
              >
                {String.fromCharCode(8592)} {t.livrosIndex.eyebrow}
              </a>

              <div className="mt-5">
                <span className="dl-chip">{L.badge}</span>
              </div>

              <h1 className="mt-6 max-w-[16ch] font-serif text-[clamp(2.5rem,5.4vw,5rem)] leading-[0.95] tracking-[-0.045em] text-pretty">
                {L.title} <em className="italic text-muted-red">{L.titleAccent}</em>
              </h1>

              <p className="prose-justify mt-6 max-w-xl text-[1.08rem] leading-[1.7] text-offwhite/90">
                {L.subtitle}
              </p>
              <p className="prose-justify mt-4 max-w-xl text-[0.98rem] leading-[1.8] text-warm-gray/85">
                {L.lead}
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {L.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-warm-gray/20 bg-white/5 px-3.5 py-1.5 text-xs tracking-[0.08em] text-warm-gray/85"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <a
                  href={heroHref}
                  {...(preSale ? {} : free ? { download: true } : { target: "_blank", rel: "noopener noreferrer" })}
                  className="group inline-flex items-center rounded-full bg-gradient-to-b from-[#cf6259] to-[#9e433d] px-8 py-4 text-[0.95rem] font-bold tracking-[0.01em] text-white shadow-[0_16px_44px_rgba(207,98,89,0.55)] ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:shadow-[0_20px_56px_rgba(207,98,89,0.72)]"
                >
                  {preSale ? L.ctaDownload : L.ctaBuy}
                  <span className="ml-3 transition group-hover:translate-x-1">
                    {String.fromCharCode(8594)}
                  </span>
                </a>
                <div className="flex items-baseline gap-2">
                  <div className="font-serif text-3xl text-offwhite">{L.price}</div>
                  <div className="text-xs tracking-[0.04em] text-warm-gray/75">{L.priceNote}</div>
                </div>
              </div>
              {preSale && "countLabel" in L && (
                <SocialProof slug={slug} label={L.countLabel} />
              )}
              {/* Versão do arquivo e onde comprar — ordem do dono 15/08/2026:
                  informar que o livro é a versão e-pub, na Amazon e no Google Play. */}
              {epubNote && (
                <div className="mt-3 text-xs tracking-[0.04em] text-warm-gray/70">
                  {epubNote}
                </div>
              )}
              {preSale && hasLead && (
                <div className="mt-4">
                  <a
                    href={leadPdf}
                    download
                    className="inline-flex items-center gap-2 rounded-full border border-warm-gray/25 bg-white/[0.03] px-5 py-2.5 text-[0.82rem] font-semibold tracking-[0.01em] text-offwhite/90 ring-1 ring-white/10 transition hover:border-warm-gray/45 hover:bg-white/[0.06] hover:text-offwhite"
                  >
                    <svg
                      className="h-3.5 w-3.5 text-warm-gray/80"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {lang === "es" ? "Leer el adelanto gratis" : "Ler a prévia grátis"} · PDF
                  </a>
                </div>
              )}
              <div className="mt-3 text-xs tracking-[0.04em] text-warm-gray/65">{free ? L.downloadNote : L.ctaBuyNote}</div>
            </div>

            <div className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
                whileHover={{ y: -6, rotate: -0.4 }}
                className="relative mx-auto max-w-sm"
              >
                <div
                  aria-hidden="true"
                  className="absolute -inset-6 -z-10 rounded-[40px] bg-[radial-gradient(circle_at_50%_30%,rgba(45,90,61,0.35),transparent_70%)] blur-2xl"
                />
                {/* Capa da PÁGINA DO LIVRO: a imagem da arte, PLANTA — sem efeito
                    de "livro 3D" (ordem do dono 15/08/2026: subir a imagem sem
                    mexer nela). */}
                <Image
                  src={cover}
                  alt={L.coverAlt}
                  width={book.coverSize.width}
                  height={book.coverSize.height}
                  // Coluna da capa: largura quase toda no celular, ~5/12 no desktop.
                  sizes="(max-width: 1024px) 80vw, 40vw"
                  // É o maior elemento acima da dobra — ou seja, o LCP da página.
                  priority
                  className="w-full h-auto rounded-xl shadow-[0_24px_70px_-18px_rgba(0,0,0,0.7)]"
                />
              </motion.div>
            </div>
          </div>
        </StudioContainer>
      </section>

      {/* CARD DE PRÉ-VENDA: a lista de espera virou um card animado (ordem do
          dono 15/08/2026), logo abaixo do herói — é a nova casa de #pre-venda. */}
      {preSale && <PreSaleCard slug={slug} />}

      {/* COMO FUNCIONA (pré-venda em 3 passos) — C9 da auditoria de marketing
          16/08: só para livros em pré-venda que declaram o bloco `how`. */}
      {preSale && "how" in L && (
        <section className="border-b border-warm-gray/10 py-16 md:py-24">
          <StudioContainer>
            <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
              <div className="lg:col-span-5">
                <Reveal>
                  <Heading eyebrow={L.how.eyebrow} title={L.how.title} />
                </Reveal>
              </div>
              <div className="lg:col-span-7">
                <div className="grid gap-4 sm:grid-cols-3">
                  {L.how.steps.map((s, i) => (
                    <motion.div
                      key={s.t}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5, delay: i * 0.06 }}
                      className="rounded-2xl border border-warm-gray/12 bg-ink/25 px-5 py-5"
                    >
                      <div className="text-xs tracking-[0.22em] text-muted-red/90 uppercase">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <h3 className="mt-3 font-serif text-lg leading-[1.2] text-offwhite">{s.t}</h3>
                      <p className="mt-2 text-sm leading-[1.6] text-warm-gray/90">{s.d}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </StudioContainer>
        </section>
      )}

      {/* VIDEO PROMO (vertical 9:16) — só renderiza quando há vídeo no idioma atual */}
      {promoVideo && (
        <section className="relative overflow-hidden border-b border-warm-gray/10 py-16 md:py-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(700px circle at 50% 12%, rgba(45,90,61,0.16), transparent 60%)",
            }}
          />
          <StudioContainer>
            <div className="mx-auto max-w-md text-center">
              <Eyebrow>{lang === "es" ? "Vea el libro" : "Veja o livro"}</Eyebrow>
              <h2 className="mt-4 font-serif tracking-[-0.02em] text-[clamp(1.6rem,3vw,2.3rem)] leading-[1.05] text-balance">
                {lang === "es"
                  ? "30 segundos por dentro del guía"
                  : "30 segundos por dentro do guia"}
              </h2>
            </div>
            <Reveal>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="mx-auto mt-10 w-full max-w-[340px]"
              >
                <div className="relative overflow-hidden rounded-[28px] border border-warm-gray/20 bg-black/40 p-2 shadow-[0_40px_110px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
                  <video
                    className="aspect-[9/16] w-full rounded-[20px] bg-black"
                    src={promoVideo}
                    poster={promoPoster ?? undefined}
                    controls
                    playsInline
                    preload="metadata"
                  />
                </div>
              </motion.div>
            </Reveal>
          </StudioContainer>
        </section>
      )}

      {/* BENEFITS */}
      <section className="border-b border-warm-gray/10 py-16 md:py-24">
        <StudioContainer>
          <Reveal>
            <Heading eyebrow={L.whatEyebrow} title={L.whatTitle} />
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {L.benefits.map((b, i) => (
              <motion.div
                key={b.t}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.55, delay: i * 0.05 }}
                whileHover={{ y: -4, borderColor: "rgba(185,176,162,0.5)" }}
                className="group rounded-3xl border border-warm-gray/15 bg-white/3 p-6 backdrop-blur transition-colors"
              >
                <div className="text-xs tracking-[0.22em] text-muted-red/90 uppercase">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-3 text-[1.2rem] leading-[1.15] text-offwhite">{b.t}</h3>
                <p className="mt-3 text-sm leading-[1.7] text-warm-gray/90">{b.d}</p>
              </motion.div>
            ))}
          </div>
        </StudioContainer>
      </section>

      {/* INSIDE */}
      <section id="inside" className="border-b border-warm-gray/10 py-16 md:py-24">
        <StudioContainer>
          <Reveal>
            <Heading eyebrow={L.insideEyebrow} title={L.insideTitle} />
          </Reveal>
          <p className="prose-justify mt-6 max-w-3xl text-[0.98rem] leading-[1.8] text-warm-gray/90">
            {L.insideLead}
          </p>
          <div className="mt-10 space-y-6">
            {spreads.slice(0, 2).map((src, i) => ({ src, cap: i === 0 ? L.insideCaption1 : L.insideCaption2 })).map((s, i) => (
              <motion.figure
                key={s.src}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className="overflow-hidden rounded-3xl border border-warm-gray/15 bg-white/3 p-3 backdrop-blur"
              >
                <Image
                  src={s.src}
                  alt={s.cap}
                  width={SPREAD.width}
                  height={SPREAD.height}
                  sizes="(max-width: 768px) 92vw, 720px"
                  className="h-auto w-full rounded-2xl"
                />
                <figcaption className="px-3 py-3 text-xs tracking-[0.06em] text-warm-gray/75">
                  {s.cap}
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </StudioContainer>
      </section>

      {/* FOR WHO */}
      <section className="border-b border-warm-gray/10 py-16 md:py-24">
        <StudioContainer>
          <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-5">
              <Reveal>
                <Heading eyebrow={L.forWhoEyebrow} title={L.forWhoTitle} />
              </Reveal>
            </div>
            <div className="lg:col-span-7">
              <div className="space-y-3">
                {L.forWho.map((row, i) => (
                  <motion.div
                    key={row}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="flex items-center gap-4 rounded-2xl border border-warm-gray/12 bg-ink/25 px-5 py-4"
                  >
                    <span className="text-muted-red">{String.fromCharCode(10022)}</span>
                    <span className="text-sm leading-[1.5] text-offwhite/90">{row}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </StudioContainer>
      </section>

      {/* AUTHOR */}
      <section className="border-b border-warm-gray/10 py-16 md:py-24">
        <StudioContainer>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>{L.authorEyebrow}</Eyebrow>
            <div className="mt-6 mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-muted-red/50 bg-white/[0.03]">
              <span className="font-serif text-xl text-offwhite">DL</span>
            </div>
            <h3 className="mt-5 font-serif text-2xl text-offwhite">{L.authorTitle}</h3>
            <p className="mt-4 text-[0.98rem] leading-[1.8] text-warm-gray/90">{L.authorLead}</p>
          </div>
        </StudioContainer>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 md:py-28">
        <StudioContainer>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[32px] border border-warm-gray/15 bg-white/3 p-10 text-center backdrop-blur md:p-14"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(700px circle at 50% 0%, rgba(45,90,61,0.22), transparent 60%)",
              }}
            />
            <h2 className="font-serif text-[clamp(1.8rem,3.4vw,2.7rem)] leading-[1.05] text-offwhite text-balance">
              {L.finalTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-[1.8] text-warm-gray/90">
              {L.finalLead}
            </p>
            <div className="mt-9 flex flex-col items-center gap-3">
              <a
                href={heroHref}
                {...(preSale ? {} : free ? { download: true } : { target: "_blank", rel: "noopener noreferrer" })}
                className="group inline-flex items-center rounded-full bg-gradient-to-b from-[#cf6259] to-[#9e433d] px-8 py-4 text-base font-bold text-white shadow-[0_18px_50px_rgba(207,98,89,0.6)] ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:shadow-[0_24px_64px_rgba(207,98,89,0.78)] md:px-10 md:py-5 md:text-[1.05rem]"
              >
                {(preSale ? L.ctaDownload : L.ctaBuy)} · {L.price}
                <span className="ml-3 transition group-hover:translate-x-1">
                  {String.fromCharCode(8594)}
                </span>
              </a>
              <div className="text-xs tracking-[0.04em] text-warm-gray/65">{free ? L.downloadNote : L.ctaBuyNote}</div>
            </div>
            <p className="mx-auto mt-8 max-w-2xl text-[0.72rem] leading-[1.6] text-warm-gray/55">
              {L.disclaimer}
            </p>
          </motion.div>
        </StudioContainer>
      </section>
    </motion.main>
  );
}
