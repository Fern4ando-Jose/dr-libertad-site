"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import StudioContainer from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import PreSalePopup from "@/components/ui/PreSalePopup";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { VISIBLE_BOOKS } from "@/lib/books";

const MotionLink = motion.create(Link);

export default function LivrosIndexView() {
  const { t, lang } = useLang();
  const idx = t.livrosIndex;

  return (
    <motion.main
      className="relative z-10"
      initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(900px circle at 20% 0%, rgba(45,90,61,0.16), transparent 55%), radial-gradient(700px circle at 85% 8%, rgba(164,90,90,0.16), transparent 52%)",
          }}
        />
        <StudioContainer>
          <div className="relative pt-32 pb-10 md:pt-36">
            <div className="text-xs tracking-[0.26em] text-warm-gray/80 uppercase">
              {idx.eyebrow}
            </div>
            <h1 className="mt-5 max-w-[18ch] font-serif text-[clamp(2.3rem,5vw,4.4rem)] leading-[0.98] tracking-[-0.04em] text-pretty">
              {idx.title}
            </h1>
            <p className="mt-6 max-w-2xl text-[1.02rem] leading-[1.8] text-warm-gray/90">
              {idx.lead}
            </p>
            <div className="mt-7 h-[1px] w-28 bg-gradient-to-r from-muted-red/70 via-warm-gray/25 to-transparent" />
          </div>
        </StudioContainer>
      </section>

      {/* POP-UP DE PRÉ-VENDA: SELO pequeno no canto do card, título "PRÉ-VENDA",
          animado (flutua + ponto pulsa). Correções do dono 15/08/2026: não é
          modal grande, não pode ficar parado e NÃO pode tapar a imagem da capa.
          Leva à página do livro (#pre-venda), onde está o card de entrar na
          lista. */}
      <section className="pb-24">
        <StudioContainer>
          {/* A grade acompanha quantos livros estão na vitrine: com 1 título, três
              colunas deixariam um card solto num vazio de 2/3 da tela. */}
          <div
            className={
              "grid gap-8 " +
              (VISIBLE_BOOKS.length === 1
                ? "max-w-sm"
                : VISIBLE_BOOKS.length === 2
                ? "max-w-3xl sm:grid-cols-2"
                : "sm:grid-cols-2 lg:grid-cols-3")
            }
          >
            {VISIBLE_BOOKS.map((book, i) => {
              const b = t[book.dictKey];
              // Capa da VITRINE: a "Capa-para-site" quando o livro declara uma
              // separada (pedido do dono 15/08/2026); senão, a da página do livro.
              const cover = book.coverList?.[lang] ?? book.coverList?.br ?? book.cover[lang] ?? book.cover.br;
              return (
                <Reveal key={book.slug} delay={i * 0.06} className="h-full">
                  {/* O wrapper relativo ancora o selo de pré-venda ao card do
                      livro. Ele é IRMÃO do link do card (nunca filha) e é ele
                      mesmo um link para a página do livro. */}
                  <div className="relative h-full">
                    <MotionLink
                      href={`/${lang}/livros/${book.slug}`}
                      whileHover={{ y: -6 }}
                      className="group flex h-full flex-col rounded-3xl border border-warm-gray/15 bg-white/3 p-4 backdrop-blur transition-colors hover:border-warm-gray/35"
                    >
                      {/* Capa da VITRINE: a imagem da arte, PLANTA — sem efeito de
                          "livro 3D" (ordem do dono 15/08/2026: subir a imagem sem
                          mexer nela). */}
                      <div className="relative px-5 pt-6 pb-3">
                        <div
                          aria-hidden="true"
                          className="absolute -inset-2 -z-10 rounded-[40px] bg-[radial-gradient(circle_at_50%_30%,rgba(45,90,61,0.3),transparent_70%)] blur-2xl"
                        />
                        {/* As artes têm proporções diferentes (dopamina 3:4, tolos
                            mais quadrada) → a moldura fixa em 3:4 iguala a ALTURA
                            dos cards e centra a arte INTEIRA, sem cortar nada
                            (ordem do dono 15/08: a imagem não se mexe). */}
                        <div className="flex aspect-[3/4] w-full items-center justify-center">
                          <Image
                            src={cover}
                            alt={b.coverAlt}
                            width={(book.coverListSize ?? book.coverSize).width}
                            height={(book.coverListSize ?? book.coverSize).height}
                            // Card da vitrine: coluna única no celular, 1/2 no
                            // tablet, 1/3 no desktop — nunca a largura toda.
                            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                            // TODAS as capas da vitrine carregam de imediato: com a
                            // moldura 3:4 a imagem usa w-auto e, enquanto não baixa,
                            // mede 0×0 — o carregamento preguiçoso nunca dispararia
                            // (deadlock visto ao vivo em 16/08: capa do Tolos sumida).
                            // São 2 imagens; o custo é mínimo.
                            priority
                            className="h-auto max-h-full w-auto max-w-full rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]"
                          />
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col px-2 pb-1 pt-5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span className="text-[10px] tracking-[0.24em] text-muted-red/90 uppercase">
                            {b.badge}
                          </span>
                          {/* Selo "Prévia grátis" no card (C8 da auditoria 16/08):
                              só quando o livro tem PDF de prévia para baixar. */}
                          {book.free && book.leadPdf && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-warm-gray/20 bg-white/5 px-2.5 py-0.5 text-[10px] tracking-[0.14em] uppercase text-warm-gray/85">
                              {idx.freeTag}
                            </span>
                          )}
                        </div>
                        <h2 className="mt-2 font-serif text-[1.35rem] leading-[1.1] text-offwhite">
                          {b.title} {b.titleAccent}
                        </h2>
                        <p className="mt-2 text-sm leading-[1.6] text-warm-gray/85">{b.subtitle}</p>
                        <div className="mt-auto flex items-center justify-between pt-5">
                          <span className="font-serif text-xl text-offwhite">{b.price}</span>
                          <span className="inline-flex items-center text-xs tracking-[0.18em] uppercase text-warm-gray/80 group-hover:text-offwhite transition">
                            {idx.viewLabel}
                            <span className="ml-2 text-muted-red transition group-hover:translate-x-0.5">
                              {String.fromCharCode(8594)}
                            </span>
                          </span>
                        </div>
                      </div>
                    </MotionLink>
                    {book.preSale && (
                      <PreSalePopup slug={book.slug} price={b.price} priceNote={"priceNote" in b ? b.priceNote : undefined} />
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </StudioContainer>
      </section>
    </motion.main>
  );
}
