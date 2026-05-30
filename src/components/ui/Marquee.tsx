"use client";

import { motion } from "framer-motion";

export default function Marquee({
  items,
  className = "",
}: {
  items: string[];
  className?: string;
}) {
  const row = [...items, ...items];
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

