"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";

type EditorialCard = {
  id: string;
  issue: string;
  kicker: string;
  title: string;
  subtitle: string;
  tags: string[];
  mood: "red" | "ink";
};

export default function EditorialGrid() {
  const [active, setActive] = useState<EditorialCard | null>(null);

  const cards = useMemo<EditorialCard[]>(
    () => [
      {
        id: "e1",
        issue: "ED. 01",
        kicker: "DOPAMINA",
        title: "VOCÊ NÃO ESTÁ CANSADO.",
        subtitle: "Você está saturado de estímulo.",
        tags: ["dopamine detox", "attention"],
        mood: "red",
      },
      {
        id: "e2",
        issue: "ED. 02",
        kicker: "ANSIEDADE",
        title: "O MEDO NÃO SOME.",
        subtitle: "Ele muda de forma quando você aprende a observar.",
        tags: ["modern anxiety", "self-awareness"],
        mood: "ink",
      },
      {
        id: "e3",
        issue: "ED. 03",
        kicker: "HÁBITO",
        title: "IMPULSO NÃO É ORDEM.",
        subtitle: "É informação. Você escolhe a resposta.",
        tags: ["psychology", "habits"],
        mood: "red",
      },
      {
        id: "e4",
        issue: "ED. 04",
        kicker: "REDES",
        title: "O FEED TE TREINA.",
        subtitle: "E você chama isso de personalidade.",
        tags: ["social media addiction", "human behavior"],
        mood: "ink",
      },
      {
        id: "e5",
        issue: "ED. 05",
        kicker: "MASCULINIDADE",
        title: "FORÇA SEM DUREZA.",
        subtitle: "Presença sem performance.",
        tags: ["masculinity", "emotional intelligence"],
        mood: "red",
      },
      {
        id: "e6",
        issue: "ED. 06",
        kicker: "LIBERDADE",
        title: "VOCÊ NÃO É SEUS GATILHOS.",
        subtitle: "Você é quem aprende a ficar inteiro diante deles.",
        tags: ["freedom", "self-awareness"],
        mood: "ink",
      },
      {
        id: "e7",
        issue: "ED. 07",
        kicker: "PSIQUE",
        title: "SEU CORPO SABE ANTES.",
        subtitle: "A mente só chega depois para justificar.",
        tags: ["psychology", "modern anxiety"],
        mood: "red",
      },
      {
        id: "e8",
        issue: "ED. 08",
        kicker: "ATENÇÃO",
        title: "FOCO É UM ATO MORAL.",
        subtitle: "Você vira o que você repete olhando.",
        tags: ["attention", "dopamine detox"],
        mood: "ink",
      },
      {
        id: "e9",
        issue: "ED. 09",
        kicker: "SILÊNCIO",
        title: "PAZ NÃO É AUSÊNCIA.",
        subtitle: "É capacidade de ficar com o que existe.",
        tags: ["self-awareness", "freedom"],
        mood: "red",
      },
    ],
    []
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, idx) => (
          <CoverCard key={c.id} card={c} idx={idx} onOpen={() => setActive(c)} />
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/75"
              onClick={() => setActive(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.985, rotateX: 6 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: 14, scale: 0.99 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-warm-gray/20 bg-[#121214]/95 backdrop-blur"
            >
              <div className="relative">
                <div className="aspect-[16/9] bg-offwhite/95">
                  <PosterFace card={active} variant="hero" />
                </div>
              </div>
              <div className="p-6">
                <div className="text-xs tracking-[0.22em] text-warm-gray/80 uppercase">
                  {active.tags.join(" · ")}
                </div>
                <div className="mt-4 flex items-start justify-between gap-6">
                  <div>
                    <div className="font-serif text-[1.9rem] leading-[1.05] tracking-[-0.03em] text-offwhite">
                      {active.title}
                    </div>
                    <div className="mt-3 text-sm leading-[1.8] text-warm-gray/90">
                      {active.subtitle}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-2xl border border-warm-gray/15 bg-white/5 px-4 py-3 text-right">
                    <div className="text-xs tracking-[0.22em] text-warm-gray/80 uppercase">issue</div>
                    <div className="mt-1 text-sm text-offwhite/95">{active.issue}</div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setActive(null)}
                    className="rounded-full border border-warm-gray/20 bg-white/5 px-5 py-3 text-sm text-offwhite/95 transition hover:bg-white/10"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CoverCard({
  card,
  idx,
  onOpen,
}: {
  card: EditorialCard;
  idx: number;
  onOpen: () => void;
}) {
  return (
    <motion.button
      type="button"
      aria-label={`Abrir ${card.title}`}
      onClick={onOpen}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.65, delay: idx * 0.03, ease: "easeOut" }}
      whileHover={{ y: -9, scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
      className="group relative overflow-hidden rounded-3xl border border-warm-gray/20 bg-offwhite/95 text-left shadow-soft"
      data-gsap="hover"
    >
      {/* Paper grain + print vibe */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.22] mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(900px circle at 10% 15%, rgba(164,90,90,0.14), transparent 55%), radial-gradient(700px circle at 75% 30%, rgba(0,0,0,0.12), transparent 55%)",
        }}
      />

      {/* Poster face */}
      <div className="relative aspect-square">
        <PosterFace card={card} />
      </div>

      {/* Bottom “caption bar” */}
      <div className="relative border-t border-black/10 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-[11px] tracking-[0.22em] text-black/65 uppercase">
            DR. LIBERTAD
          </div>
          <div className="text-[11px] tracking-[0.22em] text-black/55 uppercase">
            {card.issue}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function PosterFace({ card, variant = "tile" }: { card: EditorialCard; variant?: "tile" | "hero" }) {
  const red = "#A45A5A";
  const ink = "#0B0B0C";
  const pad = variant === "hero" ? "p-10" : "p-7";

  return (
    <div className={`relative h-full w-full ${pad}`}>
      {/* Layered composition */}
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-full"
        style={{
          background:
            "radial-gradient(900px circle at 22% 18%, rgba(231,221,204,0.55), transparent 60%)," +
            "radial-gradient(700px circle at 70% 72%, rgba(0,0,0,0.10), transparent 60%)",
        }}
      />

      {/* Minimal editorial grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.10) 1px, transparent 1px)",
          backgroundSize: "92px 92px",
        }}
      />

      {/* Red rule */}
      <div
        aria-hidden="true"
        className="absolute left-7 right-7 top-7 h-[1px]"
        style={{ background: card.mood === "red" ? red : "rgba(11,11,12,0.25)" }}
      />

      {/* Kicker / stamp */}
      <div className="relative flex items-start justify-between gap-4">
        <div className="text-[11px] tracking-[0.28em] uppercase text-black/70">
          {card.kicker}
        </div>
        <div
          className="rounded-full border px-3 py-1 text-[10px] tracking-[0.26em] uppercase"
          style={{
            borderColor: card.mood === "red" ? "rgba(164,90,90,0.45)" : "rgba(11,11,12,0.22)",
            color: card.mood === "red" ? red : "rgba(11,11,12,0.65)",
            background: "rgba(255,255,255,0.45)",
          }}
        >
          {card.issue}
        </div>
      </div>

      {/* Big title */}
      <div className="relative mt-10">
        <div
          className="font-serif text-[clamp(1.55rem,3.0vw,2.2rem)] leading-[0.92] tracking-[-0.04em]"
          style={{ color: ink }}
        >
          {card.title}
        </div>
        <div className="mt-4 max-w-[26ch] text-[0.95rem] leading-[1.55] text-black/70">
          {card.subtitle}
        </div>
      </div>

      {/* Bottom labels */}
      <div className="absolute left-7 right-7 bottom-7 flex items-end justify-between gap-4">
        <div className="text-[10px] tracking-[0.26em] uppercase text-black/55">
          {card.tags[0]}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-[1px] w-12 bg-black/20" />
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: card.mood === "red" ? red : ink, opacity: 0.8 }}
          />
        </div>
      </div>

      {/* Subtle overlay for contrast */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10), inset 0 -120px 220px rgba(0,0,0,0.05)",
        }}
      />
    </div>
  );
}

