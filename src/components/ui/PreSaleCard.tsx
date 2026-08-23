"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { useLang } from "@/lib/i18n/LanguageProvider";
import styles from "./preSaleCard.module.css";

// Card animado de PRÉ-VENDA (lista de espera) — pedido do dono 15/08/2026:
// "card animado com a lista para pré-venda" na página do livro. Copy + direção
// visual e de animação vieram da peça ao marketing (copywriter), 15/08/2026.
// O card é a nova casa da âncora #pre-venda (o CTA do herói rola até aqui).
//
// Redesenho 23/08/2026 (dono: "está muito feio, quadrado desse jeito, veja o
// que tem de mais novo e moderno"): o retângulo escuro empilhado (rótulo sobre
// rótulo, input em cima do botão, lista de bullet) virou um painel de vidro —
// borda com gradiente de luz, reflexo especular no canto, glow ambiente que
// gira devagar atrás (a marca exige movimento sempre neste card), preço e
// selo de garantia lado a lado, garantias como chips horizontais, e o e-mail
// + botão fundidos numa única cápsula. Nenhuma copy nem lógica mudou.

const cardContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const cardItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 10h12M11 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PreSaleCard({
  slug,
  price,
  priceNote,
  guarantee1,
}: {
  slug: string;
  // Preço do LIVRO (books.ts, fonte única) — sem isto, o card caía no preço
  // GENÉRICO de `t.waitlist` (mesmo texto para todo livro em pré-venda) e
  // divergia do preço mostrado no herói da página quando um livro tinha
  // preço próprio (bug real visto no ar em 23/08: herói R$ 51,38 × card R$ 29,90).
  price?: string;
  priceNote?: string;
  guarantee1?: string;
}) {
  const { t, lang } = useLang();
  const w = t.waitlist;
  const displayPrice = price ?? w.price;
  const displayPriceNote = priceNote ?? w.priceNote;
  const displayGuarantee1 = guarantee1 ?? w.guarantee1;
  // `{price}` no texto de lead é preenchido com o preço DO LIVRO — mesma causa
  // do bug de 23/08 (número fixo no dicionário compartilhado por todo livro).
  const displayLead = w.lead.replace("{price}", displayPrice);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  const submit = async () => {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus("error");
      setMsg(w.errorInvalid);
      return;
    }
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, lang, slug }),
      });
      if (!res.ok) throw new Error();
      setStatus("ok");
    } catch {
      setStatus("error");
      setMsg(w.errorGeneric);
    }
  };

  return (
    <section className="relative py-16 md:py-20">
      {/* Glow radial suave atrás do card — mesmo idioma visual do herói. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(600px circle at 50% 0%, rgba(164,90,90,0.12), transparent 60%)",
        }}
      />
      <div id="pre-venda" className="relative mx-auto max-w-xl scroll-mt-28">
        {/* Aura — glow ambiente que gira devagar atrás do vidro (ordem do dono
            15/08: este card se move sempre). Fica FORA do painel de vidro
            para não ser cortada pelo backdrop-blur. */}
        <div
          aria-hidden="true"
          className={`${styles.aura} pointer-events-none absolute -inset-10 -z-10 rounded-[3rem]`}
        />
        {/* Borda com gradiente — a "beira" do vidro pegando luz de um lado. */}
        <div className={`${styles.glassBorder} rounded-[2rem] p-px`}>
          <motion.div
            variants={cardContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className={`${styles.glass} relative overflow-hidden rounded-[calc(2rem-1px)] p-7 text-left backdrop-blur-[28px] backdrop-saturate-[1.6] md:p-10`}
          >
            <motion.div variants={cardItem}>
              <span className="inline-flex items-center gap-2 rounded-full border border-muted-red/40 bg-muted-red/[0.06] px-3 py-1 text-[0.65rem] tracking-[0.22em] uppercase text-muted-red">
                <span className={`${styles.seloDot} h-1.5 w-1.5 rounded-full bg-muted-red`} aria-hidden="true" />
                {w.selo}
              </span>
            </motion.div>

            <motion.h3
              variants={cardItem}
              className="mt-4 font-serif text-[clamp(1.7rem,3.2vw,2.3rem)] leading-[1.05] text-offwhite text-balance"
            >
              {w.title}
            </motion.h3>

            <motion.p variants={cardItem} className="mt-3 text-sm leading-[1.7] text-warm-gray/85">
              {displayLead}
            </motion.p>

            <motion.div variants={cardItem} className="mt-7 flex flex-wrap items-end gap-3">
              <div className="font-serif text-[clamp(2.4rem,4.5vw,3.2rem)] leading-none text-offwhite">
                {displayPrice}
              </div>
              <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-muted-red/25 bg-muted-red/[0.08] px-3 py-1 text-[0.7rem] leading-none tracking-[0.02em] text-warm-gray/85">
                <CheckIcon className="h-3 w-3 shrink-0 text-muted-red" />
                {displayPriceNote}
              </span>
            </motion.div>

            <motion.div variants={cardItem} className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warm-gray/15 bg-white/[0.03] px-3 py-1.5 text-xs text-warm-gray/90">
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-muted-red" />
                {displayGuarantee1}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warm-gray/15 bg-white/[0.03] px-3 py-1.5 text-xs text-warm-gray/90">
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-muted-red" />
                {w.guarantee2}
              </span>
            </motion.div>

            {status === "ok" ? (
              <motion.div
                variants={cardItem}
                className="mt-7 flex items-start gap-3 rounded-[1.5rem] border border-warm-gray/15 bg-ink/40 p-5"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted-red/20 text-muted-red">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-serif text-lg leading-[1.2] text-offwhite">{w.successTitle}</div>
                  <div className="mt-1.5 text-sm leading-[1.6] text-warm-gray/85">{w.successMsg}</div>
                </div>
              </motion.div>
            ) : (
              <motion.div variants={cardItem} className="mt-7">
                <label htmlFor="pre-sale-email" className="sr-only">
                  {w.emailLabel}
                </label>
                {/* Cápsula única: e-mail e botão fundidos, sem empilhar bloco
                    sobre bloco — o padrão de inscrição mais atual (Linear,
                    Vercel, Framer). */}
                <div
                  className={`${styles.capsule} flex items-center gap-1.5 rounded-full border border-warm-gray/15 bg-ink/30 py-1.5 pl-5 pr-1.5 transition focus-within:border-muted-red/50 focus-within:ring-2 focus-within:ring-muted-red/20`}
                >
                  <input
                    id="pre-sale-email"
                    value={email}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status !== "idle") setStatus("idle");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder={w.placeholder}
                    disabled={status === "loading"}
                    aria-invalid={status === "error"}
                    aria-describedby="pre-sale-feedback"
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-[0.95rem] text-offwhite placeholder:text-warm-gray/50 outline-none disabled:opacity-60"
                  />
                  <motion.button
                    type="button"
                    onClick={submit}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    disabled={status === "loading"}
                    aria-busy={status === "loading"}
                    aria-label={status === "loading" ? w.submitting : w.submit}
                    title={status === "loading" ? w.submitting : w.submit}
                    className={`${styles.button} flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#cf6259] to-[#9e433d] text-white ring-1 ring-white/15 transition disabled:opacity-70`}
                  >
                    {status === "loading" ? (
                      <span className={`${styles.spinner} h-4 w-4 rounded-full border-2 border-white/35 border-t-white`} />
                    ) : (
                      <ArrowIcon className="h-5 w-5" />
                    )}
                  </motion.button>
                </div>
                <div className="mt-2.5 text-center text-[0.7rem] font-bold tracking-[0.14em] uppercase text-warm-gray/70">
                  {status === "loading" ? w.submitting : w.submit}
                </div>
              </motion.div>
            )}

            <div id="pre-sale-feedback" aria-live="polite" className="mt-3 text-xs leading-[1.6] text-warm-gray/70">
              {status === "error" ? <span className="text-muted-red">{msg}</span> : w.disclaimer}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
