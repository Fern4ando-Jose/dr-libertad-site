"use client";

import { motion } from "framer-motion";

export default function Marquee({
  items,
  className = "",
}: {
  items: string[];
  className?: string;
}) {
  // [Bônus a11y, 23/08] O set duplicado (só existe pra fechar o loop visual, sem
  // corte) não tinha aria-hidden — um leitor de tela lia as mesmas 9 palavras
  // duas vezes seguidas. Só o 1º set (real) fica exposto; o 2º ganha
  // aria-hidden.
  const row = [...items, ...items];
  const half = items.length;
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <motion.div
        className="flex w-max items-center gap-10 py-4"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
      >
        {row.map((t, i) => (
          <div
            key={`${t}-${i}`}
            aria-hidden={i >= half ? "true" : undefined}
            className="text-xs tracking-[0.26em] uppercase text-warm-gray/80"
          >
            {t}
          </div>
        ))}
      </motion.div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-[linear-gradient(to_right,rgba(11,11,12,1),rgba(11,11,12,0))]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-[linear-gradient(to_left,rgba(11,11,12,1),rgba(11,11,12,0))]" />
    </div>
  );
}

