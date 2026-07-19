# BACKUP-ANTES-REDESIGN — "A Travessia da Gaiola"

> Registro de proteção criado em **2026-07-18**, antes de qualquer alteração do redesign
> cinematográfico da homepage. Nenhum arquivo de produção foi modificado até este commit.

## Pontos de restauração

| Proteção | Valor |
|---|---|
| Tag git do estado pré-redesign | `pre-redesign-travessia-2026-07-18` (aponta para `f1e493a4`, topo da `origin/main` em 18/07/2026) |
| Branch de trabalho do redesign | `redesign/travessia-da-gaiola` (todo o trabalho acontece aqui; `main` intocada) |
| Cópia remota | GitHub `Fern4ando-Jose/dr-libertad-site` (repo público; todo o histórico clonável) |
| Produção no ar | https://www.drlibertad.com — deploy da `main` na Vercel (projeto `dr-libertad-site`). Continua servindo a versão atual até o merge aprovado. |

**Restaurar tudo** = a `main` nunca sai do lugar durante o redesign; em caso extremo,
`git checkout pre-redesign-travessia-2026-07-18` reproduz o estado exato pré-obra.

## Estado atual do projeto (resumo verificado em 18/07/2026)

- **Stack:** Next.js 16.2.6 (App Router) · React 19.2.6 · TypeScript 6 · Tailwind v4 (tokens em `src/app/globals.css`) · framer-motion 12.40 · GSAP 3.15 + ScrollTrigger · Lenis 1.3.23 · Neon Postgres (`@vercel/postgres`) · Remotion 4 (pipeline de vídeo do IG, não afeta a home).
- **Homepage:** `src/app/[lang]/page.tsx` (client component; seções na ordem: HERO → MARQUEE → MANIFESTO `#manifesto` → TOPICS `#topics` → GALLERY `#gallery` (EditorialGrid ← `/api/posts?lang=`) → QUOTES `#quotes` → NEWSLETTER `#newsletter` (form → POST `/api/subscribe`) → FOOTER).
- **i18n:** segmento `[lang]` (pt|es) + `src/proxy.ts` (cookie `dl-lang` > Accept-Language > default `pt`); textos 100% em `src/lib/i18n/dictionaries.ts` (`Dict = typeof pt` força paridade PT/ES).
- **Identidade:** paleta `--color-ink #0B0B0C` · `--color-offwhite #F4F0E8` · `--color-warm-gray #B9B0A2` · `--color-muted-red #A45A5A`; fontes Inter (corpo) + Fraunces 700 (títulos).
- **No mesmo app:** 26 rotas `/api` da automação de Instagram em produção (6 posts/dia) — fora do escopo do redesign e intocáveis.

## Rotas existentes (todas preservadas)

**Páginas i18n (`/pt/*` e `/es/*`):** `/` (home) · `/autor` · `/dopamina` · `/guia-7-dias` · `/livro` · `/livros` · `/livros/[slug]` · `/privacidade` · `/quiz`.
**Rotas fixas por idioma (fora do prefixo — links de bio do IG, JAMAIS renomear):** `/o-estudo` · `/el-estudio` · `/pesquisa` (+ `/obrigado`, `/termo`) · `/investigacion` (+ `/gracias`, `/termino`).
**Internas:** `/insights` · `/admin/comentarios` · `/admin/reprovadas`.
**API (26):** attention-metrics, catchup, comment-draft, comment-queue, dopamina-lead, guardian, guia7-lead, insights, instagram, migrate, newsletter/send, og, posts, publish, publish-reel, quiz-lead, reel-share, refresh-token, reprovadas, runs-status, spend, subscribe, survey, unsubscribe, waitlist, webhooks/instagram (+ `/oauth/threads/*` de outra frente).
**Âncoras contratuais da home:** `#top` `#manifesto` `#topics` `#gallery` `#quotes` `#newsletter` (usadas por StudioNav, rodapé e CTAs; offset −88 px via `window.__lenis`).

## Dependências (package.json em 18/07/2026)

Runtime: `next 16.2.6`, `react`/`react-dom 19.2.6`, `@remotion/* 4.0.290`, `remotion 4.0.290`, `@tailwindcss/postcss ^4.3.0`, `tailwindcss ^4.3.0`, `@upstash/ratelimit ^2.0.8`, `@upstash/redis ^1.38.0`, `@vercel/analytics ^2.0.1`, `@vercel/blob ^0.27.0`, `@vercel/postgres ^0.10.0`, `framer-motion 12.40.0`, `gsap 3.15.0`, `lenis 1.3.23`, `lucide-react 1.16.0`.
Dev: `typescript 6.0.3`, `vitest ^3.2.4`, `eslint 9.39.4` (+ types/autoprefixer/postcss).

## Comandos de execução

```
npm run dev     # desenvolvimento local (Turbopack)
npm run build   # build de produção (obrigatório verde antes de qualquer merge)
npm run test    # vitest — 39 arquivos de invariantes (automação IG)
npm run lint    # eslint
```

CI (`.github/workflows/ci.yml`, roda em PR): `tsc --noEmit` + `vitest run` + `next build` (todos bloqueiam).
QA visual obrigatório antes de merge: preview Vercel + screenshots desktop 1440 e mobile 390, em PT **e** ES.

## Arquivos que o redesign VAI alterar (escopo autorizado)

- `src/app/[lang]/page.tsx` — a homepage (sequência cinematográfica + seções editoriais).
- `src/lib/i18n/dictionaries.ts` — chaves novas de texto da narrativa (PT e ES); correção do preço ES (`livro.price`: "US$ 9" → "US$ 7,90", divergência confirmada contra o checkout).
- `src/components/` — componentes novos da experiência (canvas de quadros, cenas) + ajustes em `EditorialGrid.tsx` (título truncado) e `StudioNav.tsx` (só o necessário, coordenado com as frentes em voo).
- `src/app/globals.css` — tokens/utilitários novos (âmbar da narrativa) sem remover os existentes.
- `src/app/api/posts/route.ts` — conserto pontual: fallback de banco passa a filtrar por idioma (`WHERE lang`).
- `public/generated/**` — NOVOS ativos gerados (imagem-mestra, storyboard, sequências de quadros, transições). Nada existente em `public/` é removido ou renomeado.
- `VISUAL_DIRECTION.md`, `VISUAL_GENERATION_LOG.md`, `BACKUP-ANTES-REDESIGN.md` (este) — documentação da obra.

## O que NÃO será alterado (garantias)

- Rotas e páginas internas (livros, autor, estudo, pesquisa, quiz, privacidade) — a home só aponta para elas.
- As 26 rotas `/api` da automação de Instagram, `src/proxy.ts` (matcher), `/api/og` (gera os slides publicados no IG), `THEMES`, fontes embutidas, `public/music/`, `video/`, `scripts/`, workflows do GitHub Actions.
- Os 6 formulários e seus contratos (`/api/subscribe`, `/api/waitlist`, `/api/quiz-lead`, `/api/dopamina-lead`, `/api/guia7-lead`, `/api/survey`).
- Metadados de SEO (`generateMetadata`, hreflang, sitemap, robots, JSON-LD) — preservados; qualquer chave nova acompanha os dois idiomas.
- Arquivos de outras frentes: `src/app/oauth/` (não rastreado) e a branch `fix/dopamina-funil-mobile-email`.
- `.env.local` e qualquer segredo: permanecem fora do git (repo público) e fora desta obra.
