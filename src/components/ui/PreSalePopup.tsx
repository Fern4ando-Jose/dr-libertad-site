"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LanguageProvider";
import styles from "./preSalePopup.module.css";

// Pop-up animado de PRÉ-VENDA — pedido do dono 15/08/2026: "crie um pop-up
// animado, sobre o livro, com o titulo pre-venda, na pagina livros". Aparece
// na vitrine `/livros`, uma vez por sessão (sessionStorage), e captura o
// e-mail pela MESMA rota do card (`/api/waitlist`) — o funil de captura da
// pré-venda fica em dois pontos: o card na página do livro e este popup na
// vitrine. Copy na voz da marca, mesma família do PreSaleCard.

const KEY = "dl-pre-venda-popup-2026-08";

export default function PreSalePopup({ slug }: { slug: string }) {
  const { t, lang } = useLang();
  const w = t.waitlist;
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  // Abre após um respiro (1,4 s) — não assusta quem acabou de chegar — e só
  // uma vez por sessão; fechou, não volta a abrir nesta navegação.
  useEffect(() => {
    if (sessionStorage.getItem(KEY)) return;
    const id = setTimeout(() => setOpen(true), 1400);
    return () => clearTimeout(id);
  }, []);

  const close = () => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* storage indisponível: fecha do mesmo jeito */
    }
    setOpen(false);
  };

  // ESC fecha o popup, como em qualquer diálogo de verdade.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={w.popupTitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop: clicar fora fecha o popup. */}
            <motion.button
              type="button"
              aria-label={w.popupClose}
              onClick={close}
              className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: 26, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-warm-gray/15 bg-[#121110]/95 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.65)] backdrop-blur md:p-10"
            >
              {/* Glow suave no topo do cartão — o mesmo idioma visual do herói. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-40"
                style={{
                  background:
                    "radial-gradient(400px circle at 50% 0%, rgba(164,90,90,0.18), transparent 65%)",
                }}
              />

              {/* Botão de fechar — canto superior direito. */}
              <button
                type="button"
                onClick={close}
                aria-label={w.popupClose}
                className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-warm-gray/20 text-warm-gray/80 transition hover:border-muted-red/60 hover:text-offwhite"
              >
                <span aria-hidden="true" className="text-lg leading-none">✕</span>
              </button>

              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-muted-red/40 px-3 py-1 text-[0.65rem] tracking-[0.22em] uppercase text-muted-red">
                  <span
                    className={`${styles.seloDot} h-1.5 w-1.5 rounded-full bg-muted-red`}
                    aria-hidden="true"
                  />
                  {w.selo}
                </span>

                {/* TÍTULO DO POPUP: o dono pediu "com o titulo pre-venda". */}
                <h2 className="mt-4 font-serif text-[clamp(1.9rem,3.6vw,2.6rem)] leading-[1.02] tracking-[-0.02em] text-offwhite text-balance">
                  {w.popupTitle}
                </h2>

                <p className="mt-3 text-sm leading-[1.7] text-warm-gray/85">{w.popupLead}</p>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-serif text-[clamp(1.7rem,3vw,2.2rem)] leading-none text-offwhite">
                    {w.price}
                  </span>
                  <span className="text-xs tracking-[0.06em] text-warm-gray/75">{w.priceNote}</span>
                </div>

                {status === "ok" ? (
                  <div className="mt-6 rounded-2xl border border-warm-gray/15 bg-ink/35 p-5">
                    <div className="font-serif text-lg leading-[1.2] text-offwhite">
                      {w.successTitle}
                    </div>
                    <div className="mt-2 text-sm leading-[1.6] text-warm-gray/85">{w.successMsg}</div>
                  </div>
                ) : (
                  <>
                    <label htmlFor="pre-sale-popup-email" className="sr-only">
                      {w.emailLabel}
                    </label>
                    <input
                      id="pre-sale-popup-email"
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
                      aria-describedby="pre-sale-popup-feedback"
                      className="mt-6 w-full rounded-2xl border border-warm-gray/15 bg-ink/35 px-4 py-3 text-offwhite placeholder:text-warm-gray/50 outline-none transition focus:border-muted-red/60 focus:ring-2 focus:ring-muted-red/20 disabled:opacity-60"
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
                  </>
                )}

                <div
                  id="pre-sale-popup-feedback"
                  aria-live="polite"
                  className="mt-3 text-xs leading-[1.6] text-warm-gray/70"
                >
                  {status === "error" ? <span className="text-muted-red">{msg}</span> : w.disclaimer}
                </div>

                <div className="mt-5 border-t border-warm-gray/12 pt-4">
                  <Link
                    href={`/${lang}/livros/${slug}#pre-venda`}
                    onClick={close}
                    className="inline-flex items-center gap-1 text-xs tracking-[0.08em] text-warm-gray/80 uppercase transition hover:text-offwhite"
                  >
                    {w.popupCta}
                    <span aria-hidden="true" className="text-muted-red">
                      {String.fromCharCode(8594)}
                    </span>
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
