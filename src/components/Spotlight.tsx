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

    const onMove = (e: MouseEvent) => {
      root.style.setProperty("--mx", `${e.clientX}px`);
      root.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
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
          filter: "blur(18px)",
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

