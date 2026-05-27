"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll() {
  useEffect(() => {
    // Na versão 1.3.23, removemos as propriedades 'smoothWheel' e 'smoothTrack'
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      // O Lenis 1.x lida com a suavização automaticamente.
    });

    // Expose for hash-anchor cinematic transitions.
    (window as any).__lenis = lenis;

    let rafId: number | undefined;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    rafId = requestAnimationFrame(raf);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      delete (window as any).__lenis;
      lenis.destroy();
    };
  }, []);

  return null;
}