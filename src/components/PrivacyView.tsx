"use client";

import { motion } from "framer-motion";
import StudioContainer from "@/components/ui/Container";
import { useLang } from "@/lib/i18n/LanguageProvider";

export default function PrivacyView() {
  const { t } = useLang();
  const p = t.privacy;

  return (
    <motion.main
      className="relative z-10"
      initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      <section className="relative overflow-hidden border-b border-warm-gray/10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(900px circle at 20% 0%, rgba(164,90,90,0.14), transparent 55%)",
          }}
        />
        <StudioContainer>
          <div className="relative pt-32 pb-12 md:pt-36">
            <div className="text-xs tracking-[0.26em] text-warm-gray/80 uppercase">{p.eyebrow}</div>
            <h1 className="mt-5 max-w-[20ch] font-serif text-[clamp(2.1rem,4.4vw,3.6rem)] leading-[1.0] tracking-[-0.035em] text-pretty">
              {p.title}
            </h1>
            <div className="mt-4 text-sm text-warm-gray/70">{p.updated}</div>
            <div className="mt-7 h-[1px] w-28 bg-gradient-to-r from-muted-red/70 via-warm-gray/25 to-transparent" />
          </div>
        </StudioContainer>
      </section>

      <section className="py-14 md:py-20">
        <StudioContainer>
          <div className="max-w-3xl">
            <p className="prose-justify text-[1.05rem] leading-[1.85] text-warm-gray/90">{p.intro}</p>

            <div className="mt-12 space-y-10">
              {p.sections.map((s) => (
                <div key={s.h}>
                  <h2 className="font-serif text-[1.35rem] leading-[1.2] tracking-[-0.01em] text-offwhite">
                    {s.h}
                  </h2>
                  <div className="mt-4 space-y-3">
                    {s.p.map((para, i) => (
                      <p
                        key={i}
                        className="prose-justify text-[0.98rem] leading-[1.8] text-warm-gray/85"
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-14 rounded-2xl border border-warm-gray/15 bg-white/3 px-6 py-5 text-sm leading-[1.7] text-warm-gray/85 backdrop-blur">
              {p.contactNote}
            </div>
          </div>
        </StudioContainer>
      </section>
    </motion.main>
  );
}
