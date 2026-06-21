# Dr. Libertad — DECISÕES TRAVADAS (criação + automação)

> **Para que serve este arquivo:** travar, ponto a ponto, o que já foi decidido —
> pra parar de quebrar/reverter coisas que o dono já determinou. É a fonte da
> verdade das DECISÕES (o "porquê" das escolhas). Detalhe técnico fica no `CLAUDE.md`.

## Como funciona (META-REGRA — vale sempre)

- 🔒 **TRAVADO** = NÃO muda. Para mudar um item 🔒, o Claude precisa, **ANTES de tocar em qualquer coisa**:
  1. dizer claramente **o que** quer mudar e **por quê**;
  2. mostrar o **impacto** (o que muda na prática, em qual formato/conta) e o **custo**;
  3. **perguntar 2 a 3 vezes**, de formas diferentes, pra ter **CERTEZA de que o dono
     entendeu** a mudança — e só então, com **OK explícito**, executar.
  Sem isso, fica como está. **Nada de reverter/alterar por conta própria.**
- ⬜ **A DEFINIR** = aguardando o dono dizer o que quer. Enquanto não definir, não mexer.
- Mudança que gera **gasto** (fal/Anthropic): mostrar custo e ter OK antes (já é regra).
- Quando um item for definido, o Claude marca 🔒, escreve o valor e (se aplicável) cita o PR/commit.

---

## A. CRIAÇÃO — VISUAL

### A1. Capa do CARROSSEL — motivo geométrico OU ilustração figurativa?
- **Decisão:** 🔒 **ILUSTRAÇÃO figurativa editorial** (NÃO o motivo geométrico abstrato).
  Referência do dono: **ED 82 e ED 83** (silhueta/escultura cinematográfica). Quando o
  dono dizia "volte o motivo de ontem", referia-se a ESTAS ilustrações — não ao desenho
  geométrico. **REVERTIDO no PR #42** (2026-06-19, deploy verde): a capa volta a gerar a
  ilustração; o motivo geométrico fica só como rede de segurança (QA reprovou → fallback).
  Validado com 1 render de teste — estilo bate com ED 82/83. ✅ EM PRODUÇÃO.

### A2. Estilo da ILUSTRAÇÃO
- **Decisão:** 🔒 **"Cinematic conceptual editorial illustration"** — fal **`flux/dev`**,
  a partir do `subject` (metáfora) de cada tema. Estilo fixo em `illustration.ts`
  (`buildPrompt`): chiaroscuro dramático, escultural, grão de filme; paleta papel
  (#F4F0E8) + tinta (#0B0B0C) + 1 acento da categoria; metáfora central, muito espaço
  negativo, "capa de revista literária". **Direção escolhida pelo dono em 2026-06-13.**
  - **NUNCA "anime".** O modelo `flux/dev` **não troca** sem teste visual aprovado antes.
  - Render fraco ≠ modelo errado: a variância por subject/seed é mitigada pelo **best-of-3
    + juiz** (ver A1b). Subject que renderiza mal de forma reincidente → reescrever o subject.

### A1b. Controle de qualidade da ilustração (best-of-3 + juiz)
- **Decisão:** 🔒 **EXECUTADO** ([PR #43](https://github.com/Fern4ando-Jose/dr-libertad-site/pull/43),
  2026-06-19, deploy verde). A capa gera **3 candidatos** e um **JUIZ de marca** (visão,
  sonnet) escolhe a de maior score, **rejeitando**: anatomia ruim, **qualquer texto/logo/
  marca-d'água**, composição amontoada/confusa e **tom íntimo/ambíguo**. Se todas reprovam →
  motivo (rede de segurança). ES/PT compartilham via cache. Custo ~3× geração (~US$0,10/tema,
  1×/dia, cacheado). **Continua 100% automático** (sem aprovação manual por post).

### A3. Capa do REEL de footage / gancho no início
- **Decisão:** 🔒 **Opção A — o GANCHO entra FORTE no início do vídeo (~0,2s), o frame 0
  (capa do grid) segue LIMPO (só footage).** Aprovado pelo dono em 2026-06-21 após ver o
  **render real no CI** (não publicado). O título da capa esmaecia por ~1s (no play o
  gancho só ficava forte perto de 1s, FORA da janela crítica dos 3s onde ~50% sai); agora
  entra cheio em ~0,2s com assentamento rápido. **Frame 0 mantém opacity 0 → grid limpo**
  (preferência do dono [[reel-cover-no-title]] preservada). Implementado em `video/Reel.tsx`
  (timing do `CoverText`). **Racional:** retenção de 3s > 60% = 5-10× alcance — maior
  alavanca p/ a meta de 100k. **Une A3 ao item #2 (gancho).** Frame de referência aprovado:
  "Tu cerebro vende tu libertad por un like" (run 2, 2026-06-21).
  - **NÃO mexer no fundo/footage nem na posição** (só o timing do gancho). A FRASE em si é
    linha editorial → tratada no B1, não aqui.

### A4. Posição do texto nos Reels (footage + clássico)
- **Decisão:** 🔒 **Texto SEMPRE na zona segura do recorte 4:5 do feed — nunca cortar.**
  O IG mostra o Reel 9:16 como recorte 4:5 centralizado no feed; texto fora dessa faixa
  é cortado. Implementado em `video/Reel.tsx`/`ReelClassic.tsx` (constantes `SAFE_TOP`/
  `SAFE_BOTTOM_*`, PRs #40/#41) e **validado no render real do A3** (2026-06-21): gancho
  e handle dentro da zona segura, sem corte. Aprovado pelo dono em 2026-06-21.
  - Tema/copy podem mudar; a **regra de zona segura é fixa** — todo texto novo respeita.

### A5. Reel CLÁSSICO (slide animado)
- **Estado atual:** formato mantido; **ilustração de fundo** na capa, com **3 tentativas**
  de QA pra não sair em branco (PR #38).
- **Decisão:** ⬜ A DEFINIR

### A6. MÚSICA
- **Estado atual:** **1 faixa por tema** (45 faixas), no footage e no clássico; ES/PT
  compartilham; reuso pra sempre (PR #34/#35).
- **Decisão:** ⬜ A DEFINIR

---

## B. CONTEÚDO / VOZ

### B1. Linha editorial / voz
- **Estado atual:** provocativa, 5 pilares, polêmica como ferramenta; **guarda única =
  não-ódio** (sobrevivência da conta). Já INVIOLÁVEL no `CLAUDE.md`.
- **Decisão:** ⬜ A DEFINIR (confirmar trava)

### B2. Temas
- **Estado atual:** **45 temas** em `THEMES` (fonte única).
- **Decisão:** ⬜ A DEFINIR

### B3. CTA da legenda
- **Estado atual:** objetivo = **seguidores**; legenda fecha com CTA de SEGUIR (PR #39).
- **Decisão:** ⬜ A DEFINIR

---

## C. IDIOMAS (ES + PT)

### C1. Conteúdo por mercado
- **Estado atual:** conteúdo **regerado** por mercado (NÃO traduzido); 1 conta por idioma
  (@dr.liberdad / @dr.liberdade.br).
- **Decisão:** ⬜ A DEFINIR

### C2. Selo/keyword (`kw`)
- **Estado atual:** o selo da capa puxa a palavra do **tópico em ES** → no PT vaza em
  espanhol (ex.: "DECIR" num post PT). **Bug cosmético em aberto.**
- **Decisão:** ⬜ A DEFINIR (localizar pro PT, ou deixar?)

---

## D. AUTOMAÇÃO / OPERAÇÃO

### D1. Cadência
- **Estado atual:** **6 posts/dia** — 09h/12h/14h/17h/19h/21h BRT (4 Reels + 2 carrosséis).
- **Decisão:** ⬜ A DEFINIR

### D2. Agendamento
- **Estado atual:** **GitHub Actions** + `catchup` (rede de segurança). ⚠️ o cron do
  GitHub **atrasa/derruba** com frequência → posts saem atrasados e às vezes precisam de
  redisparo manual.
- **Decisão:** ⬜ A DEFINIR (aceitar atraso? mover catchup p/ agendador externo?)

### D3. Monitor / resgate
- **Estado atual:** redisparo dos runs que o cron derruba (manual/monitor).
- **Decisão:** ⬜ A DEFINIR

---

## E. CUSTO

### E1. Tetos de orçamento
- **Estado atual:** tetos `ig-reels` = US$0,50 · `ig-posts` ≈ US$0,45 (config no DB).
- **GASTO REAL medido (spend_log, 2026-06-21)** — média dos últimos 4 dias cheios
  ≈ **US$0,61/dia no total**. Por automação: `ig-reels` ~$0,19–0,44/dia (abaixo do
  $0,50); `ig-posts` ~$0,10–0,43/dia — **encostando** no teto $0,45 nos dias com
  ilustração (18/jun $0,435; 20/jun $0,418). **NÃO está "bem abaixo"** (correção de uma
  afirmação errada minha anterior).
- **Drivers:** ilustração `flux/dev` best-of-3 (~$0,42/dia, maior ralo — decisão A1b),
  content/haiku (caiu p/ ~$0,17 com o cache PR #45), qa-judge sonnet (~$0,11), search
  Tavily (~$0,10). Footage e render = grátis.
- **Decisão:** ⬜ A DEFINIR pelo dono com os números na mão — manter $0,50/$0,45 (sabendo
  que `ig-posts` quase não tem folga) ou ajustar? Regra "aprovar gasto antes" mantida.

---

## Registro de mudanças travadas
<!-- Cada vez que um item virar 🔒 ou mudar, anotar aqui: data · item · decisão · PR -->
- **2026-06-19 · A1 + A2 TRAVADOS + EXECUTADOS** — capa do carrossel = ILUSTRAÇÃO editorial
  `flux/dev` ("Cinematic conceptual editorial illustration"), ref. ED 82/83. Reverteu o
  equívoco do PR #33 via **PR #42** (deploy verde). Validado com render de teste.
- **2026-06-19 · A1b TRAVADO + EXECUTADO** — best-of-3 + juiz de marca (**PR #43**, deploy
  verde). Escolhe a melhor de 3 e barra anatomia/texto/composição-confusa/tom-errado.
  Aprovado pelo dono ("finaliza com o (1)").
- **2026-06-21 · E1 reaberto com DADOS** — medi o `spend_log`: gasto real ≈ $0,61/dia
  (não "bem abaixo" como eu tinha afirmado errado). `ig-posts` encosta no teto $0,45 nos
  dias de ilustração. Tetos $0,50/$0,45 seguem no DB; falta o dono decidir se mantém ou
  ajusta com os números na mão. Maior ralo = best-of-3 da ilustração (A1b).
- **2026-06-21 · Agendador externo (opção B) no ar + 🔐 incidente CRON_SECRET** — cron-job.org
  → `/api/catchup` a cada 15min (PR #46, validado 200 OK). Na montagem, o `CRON_SECRET`
  exposto em docs do repo público foi reativado por engano → **rotação fresca** + limpeza
  das docs (**PR #47**). Resolve a parte operacional de D2 (falta só formalizar o item D2).
- **2026-06-21 · A3 TRAVADO + EXECUTADO** — Reel abre com o GANCHO forte em ~0,2s; frame 0
  (capa do grid) segue limpo. Aprovado pelo dono após **render real no CI** (não publicado).
  `video/Reel.tsx` (timing do `CoverText`). Une A3 ao #2 (gancho) — maior alavanca p/ 100k.
  O teste também destravou um bug: GitHub Secret `CRON_SECRET` dessincronizado pós-rotação
  (workflows de publicação caíam em 401) — re-sincronizado via `gh secret set`.
- **2026-06-21 · A4 TRAVADO** — texto dos Reels sempre na zona segura 4:5 do feed (nunca
  cortar). Já implementado (PRs #40/#41) e validado no render real do A3. Só formalizado 🔒.
