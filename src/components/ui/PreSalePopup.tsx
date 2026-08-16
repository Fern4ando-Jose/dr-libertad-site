"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useLang } from "@/lib/i18n/LanguageProvider";
import styles from "./preSalePopup.module.css";

// Pop-up de PRÉ-VENDA — pedido do dono 15/08/2026: "crie um pop-up animado,
// sobre o livro, com o titulo pre-venda, na pagina livros". Correção do mesmo
// dia: deve ser PEQUENO, flutuando SOBRE a capa do livro (não um modal grande
// no meio da tela) e ANIMADO o tempo todo (não algo parado). Por isso a bolha
// tem flutuação contínua em CSS + selo pulsante + glow que respira; a entrada
// é rápida (spring), e quem pede menos movimento recebe versão estática.

const KEY = "dl-pre-venda-popup-2026-08";

export default function PreSalePopup({ slug }: { slug: string }) {
  const { t, lang } = useLang();
  const w = t.waitlist;
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  // Aparece após um respiro (1,4 s) e só 1× por sessão; fechou, não volta.
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
            aria-label={w.popupTitle}
            initial={{ opacity: 0, scale: 0.7, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 6 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`${styles.bubble} absolute top-4 right-2 z-30 w-[min(268px,82vw)] rounded-2xl border border-warm-gray/20 bg-[#171512]/95 p-4 text-left shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur`}
          >
            {/* Rabo da bolha: aponta para baixo, na direção da capa do livro. */}
            <span aria-hidden="true" className={styles.tail} />

            {/* Fechar — canto superior direito. */}
            <button
              type="button"
              onClick={close}
              aria-label={w.popupClose}
              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-warm-gray/70 transition hover:text-offwhite"
            >
              <span aria-hidden="true" className="text-sm leading-none">✕</span>
            </button>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-muted-red/40 px-2.5 py-0.5 text-[0.6rem] tracking-[0.2em] uppercase text-muted-red">
              <span className={`${styles.seloDot} h-1.5 w-1.5 rounded-full bg-muted-red`} aria-hidden="true" />
              {w.selo}
            </span>

            <h3 className="mt-2 font-serif text-[1.35rem] leading-[1.05] text-offwhite">
              {w.popupTitle}
            </h3>
            <p className="mt-1 text-xs leading-[1.5] text-warm-gray/85">{w.popupLeadShort}</p>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-serif text-xl leading-none text-offwhite">{w.price}</span>
              <span className="text-[0.62rem] tracking-[0.04em] text-warm-gray/70">{w.priceNote}</span>
            </div>

            {status === "ok" ? (
              <div className="mt-3 rounded-xl border border-warm-gray/15 bg-ink/35 p-3">
                <div className="font-serif text-sm leading-[1.2] text-offwhite">{w.successTitle}</div>
                <div className="mt-1 text-xs leading-[1.5] text-warm-gray/85">{w.successMsg}</div>
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
                  className="mt-3 w-full rounded-xl border border-warm-gray/15 bg-ink/35 px-3 py-2 text-sm text-offwhite placeholder:text-warm-gray/50 outline-none transition focus:border-muted-red/60 focus:ring-2 focus:ring-muted-red/20 disabled:opacity-60"
                />
                <motion.button
                  type="button"
                  onClick={submit}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={status === "loading"}
                  aria-busy={status === "loading"}
                  className={`${styles.button} mt-2 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-b from-[#cf6259] to-[#9e433d] px-4 py-2.5 text-[0.85rem] font-bold text-white ring-1 ring-white/15 transition hover:shadow-[0_14px_40px_rgba(207,98,89,0.6)] disabled:opacity-70`}
                >
                  {status === "loading" ? w.submitting : w.submit}
                  <span className="ml-2">{String.fromCharCode(8594)}</span>
                </motion.button>
              </>
            )}

            <div
              id="pre-sale-popup-feedback"
              aria-live="polite"
              className="mt-2 text-[0.62rem] leading-[1.5] text-warm-gray/65"
            >
              {status === "error" ? <span className="text-muted-red">{msg}</span> : w.disclaimer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
