"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { useLang } from "@/lib/i18n/LanguageProvider";
import styles from "./preSaleCard.module.css";

// Card animado de PRÉ-VENDA (lista de espera) — pedido do dono 15/08/2026:
// "card animado com a lista para pré-venda" na página do livro. Copy + direção
// visual e de animação vieram da peça ao marketing (copywriter), 15/08/2026.
// O card é a nova casa da âncora #pre-venda (o CTA do herói rola até aqui).

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
        <motion.div
          id="pre-venda"
          variants={cardContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className={`${styles.card} mx-auto max-w-xl scroll-mt-28 rounded-3xl border border-warm-gray/15 bg-white/3 p-8 text-left backdrop-blur md:p-10`}
        >
          <motion.div variants={cardItem}>
            <span className="inline-flex items-center gap-2 rounded-full border border-muted-red/40 px-3 py-1 text-[0.65rem] tracking-[0.22em] uppercase text-muted-red">
              <span className={`${styles.seloDot} h-1.5 w-1.5 rounded-full bg-muted-red`} aria-hidden="true" />
              {w.selo}
            </span>
          </motion.div>

          <motion.div
            variants={cardItem}
            className="mt-4 text-xs tracking-[0.26em] uppercase text-warm-gray/80"
          >
            {w.eyebrow}
          </motion.div>

          <motion.h3
            variants={cardItem}
            className="mt-3 font-serif text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.05] text-offwhite text-balance"
          >
            {w.title}
          </motion.h3>

          <motion.p variants={cardItem} className="mt-3 text-sm leading-[1.7] text-warm-gray/85">
            {displayLead}
          </motion.p>

          <motion.div variants={cardItem} className="mt-6 h-[1px] w-16 bg-muted-red/70" />

          <motion.div variants={cardItem} className="mt-5">
            <div className="font-serif text-[clamp(2.4rem,4.5vw,3.2rem)] leading-none text-offwhite">
              {displayPrice}
            </div>
            <div className="mt-1 text-xs tracking-[0.06em] text-warm-gray/75">{displayPriceNote}</div>
          </motion.div>

          <motion.ul variants={cardItem} className="mt-5 space-y-2 text-sm text-warm-gray/90">
            <li>
              <span className="mr-2 text-muted-red">✦</span>
              {displayGuarantee1}
            </li>
            <li>
              <span className="mr-2 text-muted-red">✦</span>
              {w.guarantee2}
            </li>
          </motion.ul>

          {status === "ok" ? (
            <motion.div variants={cardItem} className="mt-6 rounded-2xl border border-warm-gray/15 bg-ink/35 p-5">
              <div className="font-serif text-lg leading-[1.2] text-offwhite">{w.successTitle}</div>
              <div className="mt-2 text-sm leading-[1.6] text-warm-gray/85">{w.successMsg}</div>
            </motion.div>
          ) : (
            <motion.div variants={cardItem} className="mt-6">
              <label htmlFor="pre-sale-email" className="sr-only">
                {w.emailLabel}
              </label>
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
                className="w-full rounded-2xl border border-warm-gray/15 bg-ink/35 px-4 py-3 text-offwhite placeholder:text-warm-gray/50 outline-none transition focus:border-muted-red/60 focus:ring-2 focus:ring-muted-red/20 disabled:opacity-60"
              />
              <motion.button
                type="button"
                onClick={submit}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
                disabled={status === "loading"}
                aria-busy={status === "loading"}
                className={`${styles.button} mt-3 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-b from-[#cf6259] to-[#9e433d] px-6 py-4 text-[0.95rem] font-bold tracking-[0.01em] text-white ring-1 ring-white/15 transition hover:shadow-[0_20px_56px_rgba(207,98,89,0.72)] disabled:opacity-70`}
              >
                {status === "loading" ? w.submitting : w.submit}
                <span className="ml-3">{String.fromCharCode(8594)}</span>
              </motion.button>
            </motion.div>
          )}

          <div id="pre-sale-feedback" aria-live="polite" className="mt-3 text-xs leading-[1.6] text-warm-gray/70">
            {status === "error" ? <span className="text-muted-red">{msg}</span> : w.disclaimer}
          </div>
        </motion.div>
    </section>
  );
}
