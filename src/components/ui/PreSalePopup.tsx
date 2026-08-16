"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LanguageProvider";
import styles from "./preSalePopup.module.css";

// Pop-up de PRÉ-VENDA — pedido do dono 15/08/2026: "pop-up animado, sobre o
// livro, com o título pre-venda, na página livros".
// Correções do mesmo dia (skills frontend-patterns + sites-premium aplicadas):
//  1. PEQUENO — virou um selo compacto no canto do card (~150px), não um modal.
//  2. SOBRE O LIVRO — ancorado no canto superior do card do livro, apontando pra capa.
//  3. NÃO TAPA A IMAGEM — "não esconda o produto": o selo cobre só um canto
//     da capa; a imagem do livro continua visível inteira.
//  4. ANIMADO O TEMPO TODO — ordem do dono no mesmo dia ("o card deve ser
//     animado, anime"): a animação roda SEMPRE, mesmo quando o sistema pede
//     menos movimento — ele quer VER o movimento. Entra em spring, flutua,
//     dá um "pop" suave e o ponto pulsa.
//  5. O selo é um link para a página do livro, onde está o card de entrar na
//     lista (PreSaleCard #pre-venda).

const KEY = "dl-pre-venda-popup-2026-08";

export default function PreSalePopup({ slug }: { slug: string }) {
  const { t, lang } = useLang();
  const w = t.waitlist;
  const [open, setOpen] = useState(false);

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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="group"
          aria-label={w.popupTitle}
          initial={{ opacity: 0, scale: 0.6, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: -8 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className={`${styles.tag} absolute -top-3 right-2 z-30`}
        >
            {/* Fechar — canto superior direito, fora do link. */}
            <button
              type="button"
              onClick={close}
              aria-label={w.popupClose}
              className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-warm-gray/25 bg-[#0d0c0a]/90 text-warm-gray/70 backdrop-blur transition hover:text-offwhite"
            >
              <span aria-hidden="true" className="text-xs leading-none">✕</span>
            </button>

            <Link
              href={`/${lang}/livros/${slug}#pre-venda`}
              className={`${styles.card} group block w-[152px] rounded-2xl border border-warm-gray/20 bg-[#171512]/95 p-2.5 text-left shadow-[0_14px_40px_rgba(0,0,0,0.5)] backdrop-blur transition-colors hover:border-warm-gray/40`}
            >
              <span className="flex items-center gap-1.5">
                <span className={`${styles.seloDot} h-1.5 w-1.5 shrink-0 rounded-full bg-muted-red`} aria-hidden="true" />
                <span className="font-serif text-[0.82rem] leading-[1.1] tracking-[0.14em] text-offwhite uppercase">
                  {w.popupTitle}
                </span>
              </span>
              <span className="mt-1.5 block text-[0.95rem] leading-none text-offwhite">{w.price}</span>
              <span className="mt-0.5 block text-[0.6rem] tracking-[0.04em] text-warm-gray/70">{w.priceNote}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-[0.7rem] font-bold tracking-[0.08em] text-muted-red uppercase transition group-hover:gap-1.5">
                {w.submit}
                <span aria-hidden="true">{String.fromCharCode(8594)}</span>
              </span>
            </Link>
          </motion.div>
        )}
    </AnimatePresence>
  );
}
