"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function Spotlight() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(true);

    const root = document.documentElement;
    // Initialize in center so the first paint looks intentional.
    root.style.setProperty("--mx", "50%");
    root.style.setProperty("--my", "20%");

    // Coalesce em 1 atualização por frame (rAF): mousemove dispara muitas vezes
    // por frame; sem isso, o gradiente de tela cheia repinta em excesso e trava.
    let raf = 0;
    let lastX = 0;
    let lastY = 0;
    const apply = () => {
      raf = 0;
      root.style.setProperty("--mx", `${lastX}px`);
      root.style.setProperty("--my", `${lastY}px`);
    };
    const onMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const opacity = enabled ? 1 : 0;

  // Cinematic ambient spotlight.
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        opacity,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(900px circle at var(--mx) var(--my), rgba(231,221,204,0.12), transparent 62%)",
          transform: "translate3d(0,0,0)",
        }}
      />

      {/* Vignette for a cinematic frame */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px circle at 50% 20%, rgba(11,11,12,0.0), rgba(11,11,12,0.78) 70%)",
        }}
      />

      {/* Subtle grain overlay for depth */}
      <div className="grain" />
    </motion.div>
  );
}

