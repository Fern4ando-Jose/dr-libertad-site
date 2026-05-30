"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type GsapElement = HTMLElement & {
  dataset: {
    gsap?: string;
    gsapStagger?: string;
    gsapParallax?: string;
    gsapFloat?: string;
    gsapHover?: string;
  };
};

export default function GsapOrchestrator() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // 1) Cinematic entrance (on first load)
      const hero = document.querySelector<HTMLElement>("[data-gsap='hero']");
      if (hero) {
        gsap.fromTo(
          hero,
          { opacity: 0, y: 22, filter: "blur(14px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.05, ease: "power3.out" }
        );
      }

      // 2) Reveal on scroll (cards/blocks)
      const reveals = Array.from(document.querySelectorAll<HTMLElement>("[data-gsap='reveal']"));
      reveals.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 22, filter: "blur(10px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.95,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      // 3) Stagger typography
      const staggers = Array.from(document.querySelectorAll<HTMLElement>("[data-gsap='stagger']"));
      staggers.forEach((wrap) => {
        const kids = Array.from(wrap.querySelectorAll<HTMLElement>("[data-gsap-child='line']"));
        if (kids.length === 0) return;

        gsap.fromTo(
          kids,
          { opacity: 0, y: 18, filter: "blur(10px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.9,
            ease: "power3.out",
            stagger: { each: Number(wrap.dataset.gsapStagger ?? 0.06), from: "start" },
            scrollTrigger: {
              trigger: wrap,
              start: "top 82%",
            },
          }
        );
      });

      // 4) Smooth parallax (image/gradient layers)
      const parallaxes = Array.from(document.querySelectorAll<HTMLElement>("[data-gsap='parallax']"));
      parallaxes.forEach((el) => {
        const amount = Number(el.dataset.gsapParallax ?? 40);
        gsap.fromTo(
          el,
          { y: -amount },
          {
            y: amount,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              scrub: true,
              start: "top bottom",
              end: "bottom top",
            },
          }
        );
      });

      // 5) Floating layers (ambient)
      const floats = Array.from(document.querySelectorAll<HTMLElement>("[data-gsap='float']"));
      floats.forEach((el) => {
        const base = Number(el.dataset.gsapFloat ?? 10);
        gsap.to(el, {
          y: `+=${base}`,
          duration: 3.6,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });

      // 6) Elegant hover interactions (lift + depth)
      const hovers = Array.from(document.querySelectorAll<GsapElement>("[data-gsap='hover']"));
      hovers.forEach((el) => {
        const enter = () => {
          gsap.to(el, { y: -8, scale: 1.015, duration: 0.35, ease: "power3.out" });
        };
        const leave = () => {
          gsap.to(el, { y: 0, scale: 1, duration: 0.45, ease: "power3.out" });
        };
        el.addEventListener("mouseenter", enter);
        el.addEventListener("mouseleave", leave);

        // Cleanup handlers through ScrollTrigger's kill is not enough; rely on ctx revert.
      });

      ScrollTrigger.refresh();
    });

    return () => ctx.revert();
  }, []);

  return null;
}

