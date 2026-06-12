"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLang } from "@/lib/i18n/LanguageProvider";

type EditorialPost = {
  id: string;
  issue: string;
  kicker: string;
  title: string;
  subtitle: string;
  tags: string[];
  mood: "red" | "ink";
  image: string | null;
  permalink: string | null;
  body: string | null;
  publishedAt: string | null;
};

// Fallback estático — só aparece se a API e o banco estiverem indisponíveis.
const FALLBACK: EditorialPost[] = [
  {
    id: "f1", issue: "ED. 01", kicker: "DOPAMINA",
    title: "VOCÊ NÃO ESTÁ CANSADO.", subtitle: "Você está saturado de estímulo.",
    tags: ["dopamine detox", "attention"], mood: "red",
    image: null, permalink: null, body: null, publishedAt: null,
  },
  {
    id: "f2", issue: "ED. 02", kicker: "ANSIEDADE",
    title: "O MEDO NÃO SOME.", subtitle: "Ele muda de forma quando você aprende a observar.",
    tags: ["modern anxiety", "self-awareness"], mood: "ink",
    image: null, permalink: null, body: null, publishedAt: null,
  },
  {
    id: "f3", issue: "ED. 03", kicker: "HÁBITO",
    title: "IMPULSO NÃO É ORDEM.", subtitle: "É informação. Você escolhe a resposta.",
    tags: ["psychology", "habits"], mood: "red",
    image: null, permalink: null, body: null, publishedAt: null,
  },
];

type Block = { type: "p" | "h" | "li"; text: string };

// Converte o corpo (markdown/legenda) em blocos limpos para leitura:
// remove #/##/**, trata listas e descarta linhas que são só hashtags.
function renderArticleBlocks(raw: string, title: string): Block[] {
  const lines = raw.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];

  const strip = (s: string) => s.replace(/\*\*/g, "").replace(/`/g, "").trim();
  const flush = () => {
    if (para.length) {
      const text = strip(para.join(" "));
      if (text) blocks.push({ type: "p", text });
      para = [];
    }
  };

  for (const line of lines) {
    const tline = line.trim();
    if (!tline) {
      flush();
      continue;
    }
    // Linha composta apenas de hashtags (#tag #tag) — já viram chips de tag, ignora.
    if (/^(#[\wÁÉÍÓÚÜÑáéíóúüñ]+\s*)+$/.test(tline)) continue;
    // Subtítulo markdown (# / ## / ###)
    const h = tline.match(/^#{1,4}\s+(.*)/);
    if (h) {
      flush();
      const ht = strip(h[1]);
      if (ht && ht.toUpperCase() !== title.toUpperCase()) blocks.push({ type: "h", text: ht });
      continue;
    }
    // Item de lista
    const li = tline.match(/^[-*•]\s+(.*)/);
    if (li) {
      flush();
      const lt = strip(li[1]);
      if (lt) blocks.push({ type: "li", text: lt });
      continue;
    }
    para.push(tline);
  }
  flush();
  return blocks;
}

export default function EditorialGrid() {
  const { t } = useLang();
  const [posts, setPosts] = useState<EditorialPost[] | null>(null);
  const [active, setActive] = useState<EditorialPost | null>(null);
  const [mounted, setMounted] = useState(false);

  // Só renderiza o portal no cliente (document.body só existe no browser).
  useEffect(() => setMounted(true), []);

  // Bloqueia a rolagem do fundo enquanto o modal está aberto.
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  useEffect(() => {
    let alive = true;
    fetch("/api/posts")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!alive) return;
        const list: EditorialPost[] = data?.posts ?? [];
        setPosts(list.length > 0 ? list : FALLBACK);
      })
      .catch(() => alive && setPosts(FALLBACK));
    return () => {
      alive = false;
    };
  }, []);

  // Mostra apenas os 3 posts mais recentes — uma fileira limpa no desktop,
  // curta no mobile, sempre as últimas edições do Instagram.
  const cards = (posts ?? []).slice(0, 3);

  if (posts === null) {
    return <LoadingState label={t.gallery.loading} />;
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-3xl border border-warm-gray/15 bg-white/3 px-6 py-16 text-center text-sm text-warm-gray/80">
        {t.gallery.empty}
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-3 text-[11px] tracking-[0.22em] text-warm-gray/70 uppercase">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-muted-red opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-red" />
        </span>
        {t.gallery.live}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, idx) => (
          <CoverCard key={c.id} card={c} idx={idx} onOpen={() => setActive(c)} openLabel={t.gallery.openLabel} />
        ))}
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {active && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
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
              initial={{ opacity: 0, y: 24, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.99 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-warm-gray/20 bg-[#121214]/97 backdrop-blur"
            >
              <div className="relative shrink-0">
                <div className="aspect-[4/5] max-h-[42vh] w-full overflow-hidden bg-offwhite/95 sm:aspect-[16/9]">
                  {active.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={active.image}
                      alt={active.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <PosterFace card={active} variant="hero" />
                  )}
                </div>
              </div>

              {/* Cabeçalho fixo: título + ação do Instagram sempre visível, sem rolar */}
              <div className="shrink-0 border-b border-warm-gray/12 px-6 pt-5 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-[11px] tracking-[0.22em] text-warm-gray/70 uppercase">
                    {active.kicker} · {active.issue}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActive(null)}
                    aria-label={t.gallery.close}
                    className="rounded-full border border-warm-gray/20 bg-white/5 px-3 py-1.5 text-xs text-warm-gray/80 transition hover:bg-white/10 hover:text-offwhite"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-3 font-serif text-[1.55rem] leading-[1.08] tracking-[-0.03em] text-offwhite">
                  {active.title}
                </div>
                {active.permalink && (
                  <a
                    href={active.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted-red px-5 py-2.5 text-sm font-semibold text-offwhite transition hover:bg-muted-red/85"
                  >
                    {t.gallery.viewInstagram}
                    <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>

              {/* Corpo rolável: artigo completo, formatado de forma limpa */}
              <div className="overflow-y-auto px-6 py-5">
                {active.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {active.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-warm-gray/15 bg-white/5 px-3 py-1 text-[11px] tracking-[0.12em] text-warm-gray/80 uppercase"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {active.body ? (
                  <article className="space-y-3.5">
                    {renderArticleBlocks(active.body, active.title).map((block, i) =>
                      block.type === "h" ? (
                        <h4 key={i} className="pt-2 font-serif text-[1.1rem] leading-snug text-offwhite/95">
                          {block.text}
                        </h4>
                      ) : block.type === "li" ? (
                        <div key={i} className="flex gap-3 text-sm leading-[1.8] text-warm-gray/90">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-red/80" />
                          <span>{block.text}</span>
                        </div>
                      ) : (
                        <p key={i} className="text-sm leading-[1.85] text-warm-gray/90">
                          {block.text}
                        </p>
                      )
                    )}
                  </article>
                ) : (
                  <p className="text-sm text-warm-gray/70">{t.gallery.empty}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div>
      <div className="mb-6 h-3 w-40 animate-pulse rounded bg-warm-gray/15" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-3xl border border-warm-gray/15 bg-white/[0.03]"
          />
        ))}
      </div>
      <div className="mt-6 text-center text-xs tracking-[0.2em] text-warm-gray/60 uppercase">{label}</div>
    </div>
  );
}

function CoverCard({
  card,
  idx,
  onOpen,
  openLabel,
}: {
  card: EditorialPost;
  idx: number;
  onOpen: () => void;
  openLabel: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label={`${openLabel} ${card.title}`}
      onClick={onOpen}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.65, delay: (idx % 6) * 0.04, ease: "easeOut" }}
      whileHover={{ y: -9, scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
      className="group relative overflow-hidden rounded-3xl border border-warm-gray/20 bg-offwhite/95 text-left shadow-soft"
      data-gsap="hover"
    >
      <div className="relative aspect-square">
        {card.image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.image}
              alt={card.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10"
            />
            <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
              <span className="rounded-full bg-black/45 px-3 py-1 text-[10px] tracking-[0.26em] text-offwhite/90 uppercase backdrop-blur">
                {card.kicker}
              </span>
              <span
                className="rounded-full px-3 py-1 text-[10px] tracking-[0.24em] uppercase backdrop-blur"
                style={{
                  background: "rgba(0,0,0,0.45)",
                  color: card.mood === "red" ? "#E7A9A9" : "#F4F0E8",
                }}
              >
                {card.issue}
              </span>
            </div>
            <div className="absolute inset-x-5 bottom-5">
              <div className="font-serif text-[1.15rem] leading-[1.05] tracking-[-0.02em] text-offwhite drop-shadow">
                {card.title.slice(0, 60)}
              </div>
            </div>
          </>
        ) : (
          <PosterFace card={card} />
        )}
      </div>

      <div className="relative border-t border-black/10 bg-offwhite/95 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-[11px] tracking-[0.22em] text-black/65 uppercase">DR. LIBERTAD</div>
          <div className="text-[11px] tracking-[0.22em] text-black/55 uppercase">{card.issue}</div>
        </div>
      </div>
    </motion.button>
  );
}

function PosterFace({ card, variant = "tile" }: { card: EditorialPost; variant?: "tile" | "hero" }) {
  const red = "#A45A5A";
  const ink = "#0B0B0C";
  const pad = variant === "hero" ? "p-10" : "p-7";

  return (
    <div className={`relative h-full w-full ${pad}`}>
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-full"
        style={{
          background:
            "radial-gradient(900px circle at 22% 18%, rgba(231,221,204,0.55), transparent 60%)," +
            "radial-gradient(700px circle at 70% 72%, rgba(0,0,0,0.10), transparent 60%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.10) 1px, transparent 1px)",
          backgroundSize: "92px 92px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute left-7 right-7 top-7 h-[1px]"
        style={{ background: card.mood === "red" ? red : "rgba(11,11,12,0.25)" }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="text-[11px] tracking-[0.28em] uppercase text-black/70">{card.kicker}</div>
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
      <div className="absolute left-7 right-7 bottom-7 flex items-end justify-between gap-4">
        <div className="text-[10px] tracking-[0.26em] uppercase text-black/55">{card.tags[0]}</div>
        <div className="flex items-center gap-2">
          <div className="h-[1px] w-12 bg-black/20" />
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: card.mood === "red" ? red : ink, opacity: 0.8 }}
          />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10), inset 0 -120px 220px rgba(0,0,0,0.05)" }}
      />
    </div>
  );
}
