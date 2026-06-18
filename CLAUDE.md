# Dr. Libertad — instruções do projeto

Site Next.js que **gera e publica automaticamente** no Instagram (@drlibertad):
**Reels (vídeo)** e **carrosséis (imagem)**. Conteúdo (copy + direção) vem do
Claude; mídia é renderizada e publicada via GitHub Actions.

## Pendências — painel único, com ponte pra agentes da nuvem

A fonte de **visualização é ÚNICA** e fica na máquina do dono: `D:\Claude\.pendencias\dr-libertad.md` (fora do Git). **NUNCA pergunte onde colocar uma pendência — é sempre o painel central.** Como chegar lá depende de ONDE você roda:

- **Agente LOCAL** (tem `D:\Claude\`): edite direto `D:\Claude\.pendencias\dr-libertad.md` (`- [ ]` / `- [x]` sob 🔴/🟡/🟢/✅).
- **Agente da NUVEM / remoto** (só tem ESTE repo, **não alcança `D:\Claude`**): acrescente ao arquivo **`PENDENCIAS.inbox.md`** na raiz do repo (`- [ ] texto`) e commit. É uma fila — a máquina local drena pro painel e esvazia. **Não crie `TODO.md` nem `PENDENCIAS.md`; não pergunte.**

## Ritual de início (SEMPRE seguir ao abrir o projeto)

1. **Ler as memórias** do projeto antes de mexer — em especial `reel-i2v-engine`
   (motor de Reel), `automation-vs-creation`, `cost-governance`,
   `approve-spend-before-executing`, `insights-dashboard`, `scheduling-github-actions`.
2. **Carregar skills** quando a tarefa encostar: `frontend-design` (UI/design),
   `svg-art` (motifs dos slides), `instagram-carousel` (estrutura de carrossel),
   `social-media` (copy/estratégia).
3. **Sem QA visual automático:** `preview_screenshot` e render headless local estão
   quebrados aqui. Verificar `/api/og` por HTTP 200 + bytes; vídeo, pelo link do
   Blob. O usuário confirma o visual.

## Regras invioláveis

- **Aprovar gasto antes de executar.** Toda chamada a API **paga** (fal, Anthropic)
  exige mostrar o custo estimado e ter OK do usuário antes. Footage Pexels e render
  no CI são grátis. Ver `cost-governance` / `approve-spend-before-executing`.
- **`TOPIC_CAT` (`api/publish/route.ts`) DEVE espelhar `CATS`/motifs (`api/og/route.tsx`)** — mexeu num, mexe no outro.
- **Fonte: só Fraunces 700** embutida (não adicionar pesos — incha o bundle edge).
- **CSS satori-safe** em `/api/og` (flexbox em todo elemento multi-filho; CSS não suportado → 500).
- **`force=1`** em `/api/publish` só para republicar (burla a trava anti-dup de 24h).
- **Agendamento no GitHub Actions**, não no Vercel (limite de cron do Hobby). Não recriar crons no `vercel.json`.
- Antes de valer em produção: confirmar **deploy Vercel verde** no commit.
- **Não desestabilizar a automação** num experimento de criação; mudança de criação
  é discutida/aprovada antes de codar.

## Automações e cadência — 6 posts/dia (intercalados nos picos do IG)

Cada post tem um **tópico distinto**: o `run` (0..5) é derivado da **expressão cron**
que disparou (`github.event.schedule`), não da hora do relógio (atraso de cron não
colide com o run vizinho). 3 workflows:

| Workflow | Posts | Run | Horário (BRT / UTC) | Motor |
|---|---|---|---|---|
| `instagram-reels.yml` | 3 Reels vídeo | 0,1,2 | 12h/17h/21h · 15/20/00 UTC | `video/Reel.tsx` |
| `instagram-reels-classic.yml` | 1 Reel clássico | 3 | 19h · 22 UTC | `video/ReelClassic.tsx` |
| `instagram-posts.yml` | 2 carrosséis | 4,5 | 9h/14h · 12/17 UTC | `/api/og` |

> Mix definido por dados (`/insights`): Reel supera carrossel ~4-6x em alcance; o
> melhor post foi um Reel às 19h BRT — por isso o slot do clássico. Recalibrar pelos
> números reais, não por achismo. Teto saudável: ~6 posts/dia (acima disso canibaliza).

### Pipeline do Reel (vídeo) — `instagram-reels.yml`
`/api/publish?preview=1&run=N` (conteúdo + `videoQueries` do Claude, **sem** ilustração;
já devolve `clips` = footage escolhido) → `scripts/fetch-footage.mjs` (FALLBACK: só busca
na **Pexels** se a API não trouxe `clips`) → `scripts/render-reel.mjs` (Remotion) →
`scripts/upload-blob.mjs` (Vercel Blob) → `/api/publish-reel` (Graph API).
Fundo = footage real + **grade da marca** + **música** (`public/music/bed.*`, opcional).

> **Base do Reel COMPARTILHADA entre idiomas (= MESMO vídeo).** A parte
> **língua-independente** — pesquisa (Tavily), `videoQueries` e os **clipes do footage**
> (Pexels) — é resolvida **uma vez por `(tópico, dia)`** na API e cacheada em
> `reel_shared_cache` (`src/lib/reel-shared.ts`); o 2º idioma **reusa** tudo → footage
> idêntico ES/PT e **Tavily não é pago de novo**. Só a **copy** muda por idioma
> (regenerada pelo `marketBrief`, não traduzida). O seed do footage vem de `(tópico,dia)`,
> **nunca do `@handle`** — invariante coberto por `reel-shared.invariants.test.ts`. A
> ilustração já era compartilhada (`illustration_cache`). Tudo fail-open: falha de
> cache/Pexels → cada idioma resolve o seu, como antes.

### Pipeline do Reel CLÁSSICO — `instagram-reels-classic.yml`
Igual, mas: `preview=1&illus=1&run=3` (gera a **ilustração** da fal de fundo),
**sem** footage, e `render-reel.mjs --composition=ReelClassic` (slide animado).
Preservado como estava — é o formato do melhor Reel até agora.

## Multi-idioma (ES + PT-BR) — uma conta por idioma

Mesma máquina (footage, render, design); muda só a **copy**, o **@handle**, o
**nome** e as **hashtags** por idioma. Tudo girando em torno de `?lang=` (default
`es` → conta atual inalterada).

> **Conteúdo é REGENERADO por mercado, não traduzido.** Cada conta tem um
> `marketBrief` (`accounts.ts`) injetado no topo do prompt do `generateContent`. O
> PT-BR manda criar conteúdo BR-nativo (gancho, referências, jeito de falar) e
> proíbe tradução. ES não tem brief → prompt e saída inalterados. **Mercado novo =
> nova entrada em `ACCOUNTS` com seu próprio `marketBrief`** (nunca reaproveitar o
> roteiro de outro país).

- **Registro:** `src/lib/accounts.ts` — `ACCOUNTS[lang]` com handle, brand, freedom,
  hashtags, as **envs do token/account-id** e o **`marketBrief`** (voz nativa) por conta.
- **ES** (atual): `@dr.liberdad`, "Dr. Libertad", envs `META_ACCESS_TOKEN` /
  `META_INSTAGRAM_ACCOUNT_ID` (+ token no DB com refresh). **Nada mudou.**
- **PT-BR**: `@dr.liberdade.br`, "Dr. Liberdade", envs `META_ACCESS_TOKEN_PT` /
  `META_INSTAGRAM_ACCOUNT_ID_PT` (no ar). Token também com **refresh automático**:
  `/api/refresh-token` renova toda conta com `dbTokenKey` — a 1ª rodada semeia
  `meta_access_token_pt` no DB a partir da env; depois o DB é a fonte.
- **Como flui:** `/api/publish?...&lang=pt` → `generateContent` gera copy em PT;
  `preview` devolve `handle`/`brand` PT; o Reel renderiza com o @ certo; `publish`/
  `publish-reel?lang=pt` publicam na conta PT (token/account por idioma).
- **Workflows PT** (espelham os ES com `lang=pt`): `instagram-reels-pt.yml`,
  `instagram-reels-classic-pt.yml`, `instagram-posts-pt.yml`. **Só ativam quando
  mergeados + secrets PT setados** (ver pendências: `D:\Claude\.pendencias\dr-libertad.md`).
- **Handle no criativo:** `Reel.tsx`/`ReelClassic.tsx` recebem props `handle`/`brand`
  (default `@dr.liberdad`/"Dr. Libertad"). Nunca mais hardcode.

## Criação de vídeo — régua

**"Vídeo de verdade, não slide animado".** Movimento real no quadro = **footage de
banco (Pexels)** com texto/música como camada por cima. **i2v por IA foi abandonado**
(LTX-2 animava mal a ilustração plana — só partículas — por ~US$0,24/clipe). O motor
clássico (slide animado) é **mantido em paralelo** (não é o padrão de criação novo,
mas performa e o usuário quer manter).

## Custo

- **fal** (`FAL_KEY`): só para **ilustração** (carrossel + Reel clássico via `illus=1`)
  e geração da trilha. Maior ralo histórico (retry 3× no QA queima imagens). Footage
  e render são **grátis**. Saldo acabou uma vez (2026-06-15) → quebra ilustração.
- **Anthropic** (`ANTHROPIC_API_KEY`): geração de conteúdo (haiku). Baixo.
- **Pexels** (`PEXELS_API_KEY`): footage, grátis.
- Governança (orçamento/gate/log) tratada à parte — ver `cost-governance`.

## Limite do ambiente local

Esta máquina **não renderiza Remotion localmente** (`chrome-headless-shell` cai em
quarentena). Para ver vídeo: **Remotion Studio** (`npx remotion studio video/index.ts`)
ou **render no CI**. Validar pipeline via workflow_dispatch com `publish: no` (renderiza
e sobe pro Blob sem publicar).

## Stack

- Next.js 16 (Turbopack) · edge runtime · `next/og` (satori) para imagens.
- Remotion (CI/Chromium) para vídeo: composições `Reel` (footage) e `ReelClassic` (slide).
- Neon Postgres (`@vercel/postgres`): tabelas `posts` e `config`.
- Instagram Graph API v25 (`graph.instagram.com`). Post publicado NÃO pode ter mídia
  trocada e a API não deleta; correção de slide/clipe só vale para posts novos.
- Métricas: `/insights` + `/api/insights` (alcance/views/eng por formato).
