"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n/LanguageProvider";

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 88;
  const lenis = (window as any).__lenis;
  if (lenis?.scrollTo) lenis.scrollTo(y);
  else window.scrollTo({ top: y, behavior: "smooth" });
}

export default function StudioNav() {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const bg = useTransform(scrollYProgress, [0, 0.12], ["rgba(11,11,12,0)", "rgba(11,11,12,0.72)"]);
  const border = useTransform(scrollYProgress, [0, 0.12], ["rgba(185,176,162,0)", "rgba(185,176,162,0.14)"]);

  const home = `/${lang}`;
  const isHome = pathname === home || pathname === `${home}/`;

  // Landing do funil (/dopamina): header MÍNIMO — só a marca + idioma. A nav completa
  // é um vazamento de conversão numa página de captura (8 saídas antes do CTA).
  const isFunnel = pathname?.includes("/dopamina") ?? false;

  // A Pesquisa ("Estudo") é rota FIXA por idioma (não /[lang]/...): PT → /o-estudo,
  // ES → /el-estudio (página institucional que leva à pesquisa viva). Rótulo de uma
  // palavra + nowrap para caber limpo na nav (o item "Newsletter" saiu daqui por ser
  // redundante com o CTA principal — hoje o guia de 7 dias, único pedido de e-mail
  // em destaque no site, delta 2026-08-23: "unificar no guia", ordem do dono).
  const studyHref = lang === "es" ? "/el-estudio" : "/o-estudo";

  // Link de seção: rola suave quando já está na home; fora dela, navega para a
  // home + âncora (antes não fazia nada fora da home — ex.: dentro de /livros).
  const sectionProps = (id: string) => ({
    href: `${home}#${id}`,
    onClick: (e: React.MouseEvent) => {
      setOpen(false);
      if (isHome) {
        e.preventDefault();
        scrollToSection(id);
      }
    },
  });

  const linkCls =
    "relative cursor-pointer text-xs tracking-[0.22em] uppercase text-warm-gray/80 transition-colors hover:text-offwhite " +
    "after:pointer-events-none after:absolute after:-bottom-1.5 after:left-0 after:h-[1.5px] after:w-0 after:bg-muted-red after:transition-all after:duration-300 hover:after:w-full";

  const mobileItemCls =
    "border-b border-warm-gray/10 py-3 text-sm tracking-[0.18em] uppercase text-warm-gray/85 hover:text-offwhite transition";

  if (isFunnel) {
    return (
      <motion.header
        className="fixed left-0 top-0 z-[55] w-full backdrop-blur"
        style={{ backgroundColor: bg, borderBottomColor: border, borderBottomWidth: 1 }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
          <a
            href={home}
            aria-label={t.brand}
            className="group inline-flex flex-col items-start gap-1.5 font-serif text-[1.1rem] font-semibold leading-none tracking-[-0.01em] text-offwhite/95 hover:text-offwhite transition"
          >
            <span>{t.brand}</span>
            <span
              aria-hidden="true"
              className="h-[2px] w-7 bg-muted-red transition-all duration-300 group-hover:w-11"
            />
          </a>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
      </motion.header>
    );
  }

  return (
    <motion.header
      className="fixed left-0 top-0 z-[55] w-full backdrop-blur"
      style={{ backgroundColor: bg, borderBottomColor: border, borderBottomWidth: 1 }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
        <a
          href={home}
          onClick={(e) => {
            setOpen(false);
            if (isHome) {
              e.preventDefault();
              scrollToSection("top");
            }
          }}
          aria-label={t.brand}
          className="group inline-flex shrink-0 flex-col items-start gap-1.5 font-serif text-[1.1rem] font-semibold leading-none tracking-[-0.01em] text-offwhite/95 hover:text-offwhite transition"
        >
          <span>{t.brand}</span>
          <span
            aria-hidden="true"
            className="h-[2px] w-7 bg-muted-red transition-all duration-300 group-hover:w-11"
          />
        </a>

        {/* [P0 nav 768–1024, 23/08] O nav completo (8 links) só entrava num único
            breakpoint (md=768) junto com o CTA — nessa faixa o total nunca coube e o
            CTA saía fisicamente da viewport. Agora o nav completo só liga em `lg`
            (1024) — igual à faixa em que já cabia — e, para não repetir a mesma
            lotação bem em cima do pivô (1024px), Artigos/Autor (secundários) só
            aparecem a partir de `xl` (1280). De 0 a 1023 quem resolve é o hambúrguer
            (também movido de `md` para `lg`), sempre ao lado do CTA — nunca escondido
            junto com ele.
            GARANTIA (não só estimativa): `min-w-0 overflow-hidden` aqui + `shrink-0`
            na logo e no cluster da direita (abaixo) fazem esta nav ser a ÚNICA coisa
            que cede espaço se algum dia não couber — nunca o CTA. Testado com a régua
            do próprio Tailwind (flex-shrink), não só medido a olho num viewport. */}
        <nav className="hidden min-w-0 items-center gap-5 overflow-hidden lg:flex xl:gap-6">
          {t.nav.items.map((it) => (
            <a key={it.id} {...sectionProps(it.id)} className={linkCls}>
              {it.label}
            </a>
          ))}
          <a
            href={studyHref}
            className={
              "relative cursor-pointer whitespace-nowrap text-xs font-semibold tracking-[0.22em] uppercase text-muted-red transition-colors hover:text-offwhite " +
              "after:pointer-events-none after:absolute after:-bottom-1.5 after:left-0 after:h-[1.5px] after:w-full after:bg-muted-red/60 after:transition-all after:duration-300 hover:after:bg-muted-red"
            }
          >
            {t.nav.study}
          </a>
          {/* O Teste (/[lang]/quiz) saiu da nav por decisão do dono (2026-07-29):
              a página continua no ar e é acessada por LINK DIRETO (campanha/DM),
              só não aparece mais no menu. */}
          {/* O arquivo de artigos. Além de ser a porta de entrada do leitor, é
              por este link que o rastreador chega aos textos: a grade da home
              carrega os posts no navegador, então nada dela existe no HTML.
              Escondido entre lg e xl (1024–1279) — ver nota acima do <nav>. */}
          <a href={`${home}/blog`} className={`hidden xl:inline ${linkCls}`}>
            {t.blog.navLabel}
          </a>
          <a href={`${home}/livros`} className={linkCls}>
            {t.nav.books}
          </a>
          <a href={`${home}/autor`} className={`hidden xl:inline ${linkCls}`}>
            {t.nav.author}
          </a>
        </nav>

        {/* shrink-0: este cluster (idioma + CTA + hambúrguer) NUNCA cede espaço —
            é a nav ao lado (min-w-0/overflow-hidden acima) que cede primeiro. */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <LangToggle lang={lang} setLang={setLang} />
          {/* [Endurecer visual, 23/08] O CTA principal do nav era uma pílula
              cinza-fantasma (border-warm-gray, sem acento) — o item mais
              importante do header não se destacava de nada ao redor. Vira
              acento sólido: --color-muted-red-strong (5.32:1 medido contra o
              texto offwhite, ver globals.css).
              [Sempre visível, 23/08 delta 2] Era `hidden md:inline-flex` — sumia
              abaixo de 768px, sobrando só dentro do menu hambúrguer. Hoje é o
              ÚNICO CTA de e-mail do site inteiro (unificação do mesmo dia) — não
              pode depender de largura de tela nem de abrir o menu pra existir.
              Abaixo de `sm` (640px) o rótulo curto (`ctaShort`) + padding menor
              evitam o hambúrguer (44×44, alvo de toque — não pode encolher)
              ser empurrado pra fora da tela; medido contra 320/345/375/414/640px.
              Abaixo de 340px SÓ o CTA some (LangToggle + hambúrguer nunca somem,
              são os alvos de toque protegidos) — nessa faixa raríssima o guia
              continua a 1 toque dentro do menu hambúrguer, como sempre foi. */}
          {/* [Sem duplicata na home, 23/08 delta 3 — achado do dono: "ainda segue em 2
              lugar o guia na pagina inicial"] Nav é fixo: na home o herói já mostra
              este MESMO cta logo abaixo, e os dois ficavam visíveis ao mesmo tempo
              desde o primeiro scroll. Nas outras páginas (livros, blog, o guia em
              si) o nav continua sendo o único acesso — só some aqui, na home. */}
          {!isHome && (
            <a
              href={`${home}/guia-7-dias`}
              onClick={() => setOpen(false)}
              className="hidden shrink-0 items-center rounded-xl bg-muted-red-strong px-2.5 py-2 text-[10px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase text-offwhite transition hover:bg-muted-red-strong/90 min-[340px]:inline-flex sm:px-4 sm:text-xs sm:tracking-[0.22em]"
            >
              <span className="sm:hidden">{t.nav.ctaShort}</span>
              <span className="hidden sm:inline">{t.nav.cta}</span>
            </a>
          )}

          {/* Botão do menu mobile — ligado até `lg` (ver nota acima do <nav>). Alvo
              de toque 44×44 (era 36×36, abaixo do mínimo de acessibilidade). */}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-warm-gray/20 bg-white/5 text-offwhite/90 transition hover:bg-white/10 lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Painel mobile — dá acesso a tudo (seções, Livros, Autor, CTA); cobre a
          mesma faixa (0–1023) do hambúrguer que o abre. */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden border-t border-warm-gray/10 bg-ink/95 backdrop-blur lg:hidden"
          >
            <div className="flex flex-col px-6 py-2">
              {t.nav.items.map((it) => (
                <a key={it.id} {...sectionProps(it.id)} className={mobileItemCls}>
                  {it.label}
                </a>
              ))}
              <a
                href={studyHref}
                onClick={() => setOpen(false)}
                className="border-b border-warm-gray/10 py-3 text-sm font-semibold tracking-[0.18em] uppercase text-muted-red hover:text-offwhite transition"
              >
                {t.nav.study}
              </a>
              {/* Teste fora do menu também no celular — ver comentário na nav desktop. */}
              <a href={`${home}/blog`} onClick={() => setOpen(false)} className={mobileItemCls}>
                {t.blog.navLabel}
              </a>
              <a href={`${home}/livros`} onClick={() => setOpen(false)} className={mobileItemCls}>
                {t.nav.books}
              </a>
              <a href={`${home}/autor`} onClick={() => setOpen(false)} className={mobileItemCls}>
                {t.nav.author}
              </a>
              {!isHome && (
                <a
                  href={`${home}/guia-7-dias`}
                  onClick={() => setOpen(false)}
                  className="my-4 rounded-xl bg-muted-red-strong px-5 py-3 text-center text-xs tracking-[0.22em] uppercase text-offwhite transition hover:bg-muted-red-strong/90"
                >
                  {t.nav.cta}
                </a>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function LangToggle({ lang, setLang }: { lang: "br" | "es"; setLang: (l: "br" | "es") => void }) {
  return (
    <div
      role="group"
      aria-label="Idioma / Idioma"
      className="relative flex items-center rounded-full border border-warm-gray/20 bg-white/5 p-0.5 text-[11px] tracking-[0.18em] uppercase"
    >
      {(["br", "es"] as const).map((code) => {
        const activeOn = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={activeOn}
            // Alvo de toque ≥44×44 (bônus a11y, 23/08) — o rótulo continua
            // pequeno (2 letras); min-h/min-w abrem a área clicável sem inchar
            // visualmente o texto.
            className={`relative z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full px-2.5 transition-colors ${
              activeOn ? "text-offwhite" : "text-warm-gray/70 hover:text-offwhite"
            }`}
          >
            {activeOn && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 -z-10 rounded-full bg-muted-red/80"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            {code}
          </button>
        );
      })}
    </div>
  );
}
