"use client";

import { ReactNode, useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function HeroFloatingDeck({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const sx = useSpring(mx, { stiffness: 160, damping: 22, mass: 0.35 });
  const sy = useSpring(my, { stiffness: 160, damping: 22, mass: 0.35 });

  // Convert pointer position to subtle transforms (luxury “depth”).
  const tx = useTransform(sx, (v) => (v - 0.5) * 16);
  const ty = useTransform(sy, (v) => (v - 0.5) * 14);
  const rx = useTransform(sy, (v) => (0.5 - v) * 5);
  const ry = useTransform(sx, (v) => (v - 0.5) * 7);

  useEffect(() => {
    setReady(true);
    const onMove = (e: MouseEvent) => {
      const px = e.clientX / window.innerWidth;
      const py = e.clientY / window.innerHeight;
      mx.set(px);
      my.set(py);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  return (
    <div className="relative">
      {/* Back layers — quadrados decorativos que dão profundidade atrás do card.
          O transform de parallax fica na camada externa; a flutuação contínua
          numa camada interna, para os dois efeitos comporem sem conflito. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-8 top-4 hidden lg:block"
        style={{
          x: tx,
          y: ty,
          rotateX: rx,
          rotateY: ry,
          transformStyle: "preserve-3d",
        }}
        initial={{ opacity: 0, y: 14 }}
        animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <motion.div
          className="relative"
          animate={{ y: [0, -14, 0], rotate: [0, -1.5, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="h-[200px] w-[200px] rounded-3xl border border-warm-gray/10 bg-white/3 shadow-soft backdrop-blur [filter:blur(0px)]" />
          <div
            className="absolute -inset-2 rounded-3xl opacity-60"
            style={{
              background:
                "radial-gradient(220px circle at 30% 30%, rgba(164,90,90,0.22), transparent 60%)",
            }}
          />
        </motion.div>
      </motion.div>

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-5 -bottom-4 hidden lg:block"
        style={{
          x: tx,
          y: ty,
          rotateX: rx,
          rotateY: ry,
          transformStyle: "preserve-3d",
        }}
        initial={{ opacity: 0, y: 18 }}
        animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.08 }}
      >
        <motion.div
          className="relative"
          animate={{ y: [0, 12, 0], rotate: [0, 1.5, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        >
          <div className="h-[210px] w-[210px] rounded-3xl border border-warm-gray/10 bg-ink/20 shadow-soft backdrop-blur" />
          <div
            className="absolute inset-0 rounded-3xl opacity-70"
            style={{
              background:
                "radial-gradient(260px circle at 70% 40%, rgba(231,221,204,0.20), transparent 60%)",
            }}
          />
        </motion.div>
      </motion.div>

      {/* Main card (slot) */}
      <motion.div
        className="relative z-10"
        style={{
          x: tx,
          y: ty,
          rotateX: rx,
          rotateY: ry,
          transformStyle: "preserve-3d",
        }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

