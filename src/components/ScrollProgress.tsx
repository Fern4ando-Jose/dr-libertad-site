"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });

  return (
    <div
      aria-hidden="true"
      className="fixed left-0 top-0 z-[60] h-0 w-full"
    >
      <motion.div
        className="h-[1px] bg-muted-red"
        style={{ scaleX: progress, transformOrigin: "0% 50%" }}
      />
    </div>
  );
}

