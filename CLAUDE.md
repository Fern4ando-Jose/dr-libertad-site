# Dr. Libertad — instruções do projeto

Site Next.js que **gera e publica automaticamente** no Instagram (@drlibertad):
**Reels (vídeo)** e **carrosséis (imagem)**. Conteúdo (copy + direção) vem do
Claude; mídia é renderizada e publicada via GitHub Actions.

## Linha editorial (princípios do dono — INVIOLÁVEL)

> **Fonte única da VOZ:** `LINHA-EDITORIAL.md` — fundamentos (o
> cânone: Coração Valente, Servidão Voluntária, Fernão Capelo Gaivota, O Pequeno
> Príncipe, Na Natureza Selvagem), convicções, críticas centrais (filtros/padrão de
> beleza inexistente, excesso de escolha) e as verdades incômodas literais. Vale para o
> IG **e** para os projetos novos (curtas). Esta seção é o resumo operacional.
> **⚠️ Mora OFFLINE** em `D:\Claude\.claude\marca\dr-libertad\LINHA-EDITORIAL.md` (fora do Git —
> é estratégia/voz de marca e o repo é PÚBLICO; `.gitignore` barra o retorno, PR #52).
> Não recriar no repo. Restaurável do Git: `git show dfd6a99a:LINHA-EDITORIAL.md`.

A marca **acredita na liberdade de expressão e NÃO teme a polêmica — ao contrário,
a polêmica é uma ferramenta** (é o que gera alcance/debate). A voz é direta, corajosa,
diz verdades incômodas e desafia o politicamente correto. Os **61 temas** (fonte única
`THEMES` em `api/publish/route.ts`) giram em **5 pilares**:

1. **Dopamina e seus seguimentos** (recompensa imediata, vício, hiperestimulação, porn/cérebro, detox).
2. **Redes sociais e o fim dos relacionamentos** (comparação, intimidade x tela, descarte, ghosting).
3. **A guerra invisível do Homem** — temas incômodos (solidão masculina, o homem que não pode chorar, o "descartável", reconstruir o homem sem destruí-lo).
4. **Verdades incômodas que precisam ser ditas** (ex.: *"o homem não precisa ser amado: precisa de carinho, respeito e admiração"*; "ninguém te deve nada"; "se você não põe limites, vira uma opção").
5. **Liberdade (e o direito de falar)** — *"você tem o direito de fazer o que quer e eu de dizer o que penso"*; contra a autocensura e a cultura da ofensa.

> **Guarda única (sobrevivência da conta, não censura):** a provocação vem da **IDEIA**,
> nunca do ódio. **Nunca** insultar/desumanizar pessoas ou grupos (sexo, raça, orientação…)
> nem incitar violência — isso derruba a conta no IG e mata o alcance. Incomodar com
> **argumento**, não com desprezo. Essa régua está embutida na VOZ EDITORIAL do prompt
> de `generateContent`. **As ideias do dono são mantidas íntegras; só esse limite protege o canal.**

> **Trava anti-amenização (temas-convicção):** os temas que SÃO uma frase-verdade do dono
> (flag `literal: true` no `THEMES`, hoje **27**) NUNCA podem ser suavizados nem ter a frase
> trocada por "libertad"/palavra de marca — o **título preserva a frase** e a libertad vai num
> insight. Foi o bug do **ED 106** ("No necesitas ser amado: necesitas LIBERTAD" no lugar de
> "...necesita cariño, respeto y admiración"). Mecanismo: `buildLiteralDirective`
> (`src/lib/literal-lock.ts` — função pura + teste invariante) injeta a trava no prompt e
> **ANULA**, nesses temas, a exigência de libertad no título.
>
> **⚠️ "Link" da linha editorial:** a automação só obedece o que está **NO REPO** —
> a **VOZ do prompt** (`generateContent`), os **`THEMES`** e `accounts.ts` (`brand`/`freedom`/`marketBrief`).
> O `LINHA-EDITORIAL.md` mora **OFFLINE** (o Vercel não o lê). Então **reestruturar a linha
> editorial = propagar pra esses 3 lugares** (marcar/desmarcar `literal` nos temas + ajustar a VOZ).

## Pendências — painel único, com ponte pra agentes da nuvem

A fonte de **visualização é ÚNICA** e fica na máquina do dono: `D:\Claude\.claude\pendencias\dr-libertad.md` (fora do Git). **NUNCA pergunte onde colocar uma pendência — é sempre o painel central.** Como chegar lá depende de ONDE você roda:

- **Agente LOCAL** (tem `D:\Claude\`): edite direto `D:\Claude\.claude\pendencias\dr-libertad.md` (`- [ ]` / `- [x]` sob 🔴/🟡/🟢/✅).
- **Agente da NUVEM / remoto** (só tem ESTE repo, **não alcança `D:\Claude`**): acrescente ao arquivo **`PENDENCIAS.inbox.md`** na raiz do repo (`- [ ] texto`) e commit. É uma fila — a máquina local drena pro painel e esvazia. **Não crie `TODO.md` nem `PENDENCIAS.md`; não pergunte.**

> ⛔ **NUNCA cole valor de segredo no `PENDENCIAS.inbox.md`** (nem em qualquer doc/exemplo) —
> token, chave, secret, verify token. O repo é PÚBLICO e o arquivo vive no HEAD **e** no
> histórico git (clonável p/ sempre). Use placeholder: `<REDACTED — ver cofre>` / `$NOME_DA_VAR`.
> Houve vazamento de `META_WEBHOOK_VERIFY_TOKEN` por aqui (2026-06-28) → scrub do HEAD + nota.

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
- **Temas em FONTE ÚNICA `THEMES` (`api/publish/route.ts`)**: cada entrada tem `topic`+`cat`+`motif`+`subject`; `TOPICS`/`TOPIC_CAT`/`TOPIC_MOTIF`/`TOPIC_SUBJECT` são DERIVADOS (impossível dessincronizar). `cat`/`motif` **DEVEM** existir em `CATS`/`MOTIF_IDS` de `api/og/route.tsx` — tema novo = usar cat/motif válidos (ou adicionar lá primeiro). Hoje são **61 temas** (5 pilares + cânone das obras + §4 verdades incômodas); **27** são temas-convicção (`literal: true`) — título/slide preservam a frase, NUNCA viram "libertad" (trava `src/lib/literal-lock.ts`).
- **Fonte: só Fraunces 700** embutida (não adicionar pesos — incha o bundle edge).
- **CSS satori-safe** em `/api/og` (flexbox em todo elemento multi-filho; CSS não suportado → 500).
- **Trava anti-dup CROSS-FORMATO, na SELEÇÃO do tema — SHUFFLE BAG (saco de cartas).** Histórico do bug: a trava antiga só olhava `posts` (carrossel) e o Reel não gravava tópico → o mesmo tema saía Reel num dia e carrossel no outro ("El padre ausente", 21→22/06). Depois veio a rotação presa ao calendário (`dia*6+run`), que **pulava pra sempre** o tema de toda vaga que falhava → **só 31/61 temas no ar, P1-Dopamina em 22%** (sub-uso que o dono pegou, 28/06). Hoje (PR #122): (1) **todo formato grava o `topic`** — carrossel em `posts` E `published_runs.topic`, reel em `published_runs.topic`; (2) a seleção (`getFreshTopicForRun` em `api/publish` → `selectThemeIndex` PURO em `src/lib/rotation.ts`) é um **saco de cartas**: baralho **balanceado por categoria**, re-embaralhado por **ciclo** (semente=ciclo → aleatoriedade), com **janela de recência (LRU)** que pula os `N-RANDOM_POOL` temas mais recentes → um tema só **repete depois de ≥55 dos 61** (~9 dias, gap garantido, sem borda de ciclo); (3) o "usado" vem do que **REALMENTE publicou** (`published_runs` via `recentPublishedSlots`, UNIFICADO ES/PT/formato) → **tema que falhou CONTINUA no baralho** (conserta o sub-uso: todos os 61 trabalham antes de qualquer repetir) e tema nunca usado entra ASAP; as duas contas pegam o **MESMO tema por vaga** (determinístico + **livro-razão `(dia,run)→tema`** `getOrSetRunTopic`: 1º idioma grava, 2º lê → mesmo vídeo ES/PT); (4) **threading intra-dia** (inclui os picks dos runs anteriores do dia) → 6 temas DISTINTOS/dia, robusto ao re-disparo do catchup. Tudo **fail-open** (erro de banco → rotação-base legada `buildRotation`/`topicIndexForRun`). **Botão `RANDOM_POOL`** (=6) regula aleatoriedade × gap (POOL=0 = ordem fixa, gap=61, zero shuffle; 6 distintos/dia + gap=61 é matematicamente incompatível com aleatoriedade). Simulação real: **61/61** cobertura, gap≥56 mesmo com 1-em-3 vagas falhando. **`force=1`** em `/api/publish` burla o backstop de carrossel (republicar/backfill). Invariantes em `rotation.invariants.test.ts`. **(5) TRAVA DE PUBLICAÇÃO (rede INDEPENDENTE da seleção — o que faltava):** antes de publicar (carrossel `/api/publish` **E** reel `/api/publish-reel`), se o tema já saiu em **OUTRA vaga `(dia,run)`** em 7d — qualquer formato/idioma, via `published_runs` (que unifica reel+carrossel+langs) — **NÃO publica** (`topicUsedInOtherVaga`/`hasOtherVaga`; exclui a PRÓPRIA vaga → par ES/PT passa; `force=1` burla). Mesmo que a seleção erre por qualquer motivo, a repetição **não chega ao feed** (correto por construção). **Detecção:** `/api/runs-status` devolve `duplicates` (temas em 2+ vagas em 7d) = alarme antes do dono ver. Teste puro em `run-ledger.invariants.test.ts`.
- **Agendamento no GitHub Actions**, não no Vercel (limite de cron do Hobby). Não recriar crons no `vercel.json`. O scheduler do GitHub atrasa/derruba crons → **`catchup.yml`** (de hora em hora) consulta `/api/runs-status` e **redispara só os runs faltantes do dia**. Idempotente: carrossel trava por (tópico,conta,7d); reel por (dia,run,conta) no livro-razão `published_runs` (`src/lib/run-ledger.ts`). Reel publicado registra `run` (workflows passam `run` ao `/api/publish-reel`).
- **DISJUNTOR do watchdog — TODA saída "não publicou" tem de FREAR, não só a falha de publicar.** O catchup redispara de 15/15min; sem freio, uma vaga que falha repete pra sempre → tempestade (gasto sobe regerando ilustração, conta corre risco de bloqueio no IG, e o carrossel chega a DUPLICAR no feed). Regra (`published_runs.attempts` + `bumpAttempt`/`attemptsToday`/`shouldStopRetrying`, `MAX=3`): falha transitória conta **+1**; motivo que **NÃO muda hoje desiste do dia na hora** (`hard` → teto): **(a)** bloqueio/limite DURO do IG (`isHardPublishBlock`) e **(b)** **402 de orçamento** (balde é DIÁRIO, não reabre). ⚠️ Foi a RAIZ real das duplicatas do carrossel PT (24/06): o 402 dava `continue` **sem contar tentativa** → o freio não pegava e a tempestade rodava (o 2º idioma da vaga pega o balde já gasto pelo 1º). **Teto US$0,50 inalterado** (regime normal ~US$0,30). Não reintroduzir saída que pula sem `bumpAttempt`. ⚠️ **(25/06) Faltava o freio no `catch` EXTERNO da slot:** uma falha FORA do `publishCarousel` (ilustração fal, montagem do slide, `savePost`) caía no catch genérico que **não chamava `bumpAttempt`** → o catchup redisparava pra sempre, **regerando ilustração a cada vez** → 12 ilustrações, balde estourado, 0 carrossel ES+PT no dia (att=3 veio só do `hard` do 402, tarde demais). Hoje o catch externo **conta a tentativa** (`bumpAttempt` com `hard=isHardPublishBlock`) e grava o **erro REAL** na resposta (era a string genérica "erro ao publicar slot" → diagnóstico cego). Invariantes em `run-ledger.invariants.test.ts`.
- **Atomicidade ES+PT por vaga — "publicou numa, tem de sair na outra; tem de ser ÚNICA".** A vaga `(dia,run)` é UMA unidade: sai nas DUAS contas ou em nenhuma. Causa nº1 de ÓRFÃO (ES-only): o balde `ig-posts` é COMPARTILHADO → o 1º idioma gasta e o 2º bate no teto → 402 → órfão. Fix: no gate de orçamento, se a **língua-IRMÃ da MESMA vaga já publicou** (`siblingPublished`), **NÃO bloqueia** — completa o par (bounded: +1 publish/vaga; ilustração do 2º vem do cache). **Detecção:** `/api/runs-status` devolve `orphans` (`orphanedPairs`: vaga em que uma língua saiu e a irmã DESISTIU) = alarme da assimetria. Resíduo (lang-guard barra PT contaminado → órfão por QUALIDADE, correto não publicar) fica só no alarme. **`force=1` NÃO pareia** — disparo manual de 1 idioma cria órfão (foi o erro do teste de 25/06; rodar = ES+PT sempre). Invariantes em `run-ledger.invariants.test.ts`.
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
na **Pexels** se a API não trouxe `clips`) → **passo "Garantir fundo"** (cascata anti-preto,
ver abaixo) → `scripts/render-reel.mjs --composition=ReelV2` (Remotion) →
`scripts/upload-blob.mjs` (Vercel Blob) → `/api/publish-reel` (Graph API).
Fundo = footage real + **grade da marca** + **música** (opcional). **Composição de produção =
`ReelV2`** (RETENÇÃO, promovido 26/06, PR #102): **capa curta 3s** + **gancho/insights cinéticos**
(palavra a palavra = movimento, ataca o watch de 4,3s que sangrava na capa de 5s) + **capa com cor
de marca** (kicker/acento/glow) + **de-dup capa×insight 1** (`dedupeSlides`). **Duração ~18,8–24s**
por vídeo (nº de insights distintos; ~28s da música acomoda). Fontes `reelDurationsV2`/`dedupeSlides`
em `video/ReelV2.tsx`, `Root.tsx` ajusta sozinho. O `Reel` clássico (`video/Reel.tsx`, capa 5s estática)
fica de RESERVA — o de-dup da repetição capa×insight 1 também age na ORIGEM (`generateContent`,
`titleDupedInSlides`) → conserta o carrossel. **Grade = duotone QUENTE/VINTAGE** que NORMALIZA qualquer footage
do Pexels na mesma faixa tonal da marca (cor parcial+sépia; `screen`(piso marrom) mata o preto
puro, `multiply`(âmbar) mata o estouro, wash quente + acento por categoria) — sem isso as capas
saíam divergentes (umas claras, outras pretas). **Nunca publicar Reel preto:** o passo "Garantir
fundo" checa `scripts/reel-media.cjs` `hasVisualMedia` (≥1 clipe **ou** ilustração); se faltar,
tenta ilustração da fal (`illus=1`, raro) e, se ainda faltar, **pula** render/upload/publish
(`has_media=0`, `::warning::`) — invariante `reel-media.invariants.test.ts`. **Uma faixa por
TEMA**: `scripts/generate-music.mjs` gera (author-time, fal, ~US$0,05/tema) `public/music/bed-<NN>-<slug>.mp3`
+ `manifest.json` (`topic`→arquivo) lendo os 61 temas de `THEMES`; `pick-music.cjs`
escolhe pelo `topic` do post (não pelo slot). Reuso pra sempre (tema repetido = mesmo
arquivo; CI não gera). Fail-open: sem faixa do tema → rotação legado `bed-N` → mudo.
ES/PT compartilham os arquivos. **Nunca** commitar áudio de serviço pago (repo público).

> **Base do Reel COMPARTILHADA entre idiomas (= MESMO vídeo).** A parte
> **língua-independente** — pesquisa (DuckDuckGo + Wikipedia de reserva, grátis), `videoQueries` e os **clipes do footage**
> (Pexels) — é resolvida **uma vez por `(tópico, dia)`** na API e cacheada em
> `reel_shared_cache` (`src/lib/reel-shared.ts`); o 2º idioma **reusa** tudo → footage
> idêntico ES/PT. Só a **copy** muda por idioma
> (regenerada pelo `marketBrief`, não traduzida). O seed do footage vem de `(tópico,dia)`,
> **nunca do `@handle`** — invariante coberto por `reel-shared.invariants.test.ts`. A
> ilustração já era compartilhada (`illustration_cache`). Tudo fail-open: falha de
> cache/Pexels → cada idioma resolve o seu, como antes.
>
> **Writeback do fallback (ES↔PT idênticos mesmo sem cache da API):** se a API devolveu 0
> clipes, cada conta cai no fallback do CI e buscava sozinha (videoQueries por idioma) → ES
> com footage, PT preto. Agora a 1ª conta que acha footage no CI faz POST em
> **`/api/reel-share`** (`writeReelSharedClips`, autenticado por `CRON_SECRET`), gravando os
> clipes na base compartilhada; a 2ª conta (PT, +5min) lê e **reusa o MESMO vídeo**. Preserva a
> pesquisa cacheada. Contrato em `normalizeShareInput` (teste invariante).

> **Nº de edição (capa) por VAGA, não por `COUNT(posts)`.** O "Nº" vinha de `COUNT(posts)+1`,
> mas só o **carrossel** grava em `posts` (Reel só registra no livro-razão) → o contador não
> andava e **"Nº 102" repetia em todo Reel**. Agora `editionFor(dia,run)` (`src/lib/edition.ts`,
> tabela `editions` PK `dia,run`) atribui o número por **VAGA**, o **MESMO p/ ES e PT** (mesma
> edição em 2 idiomas), monotônico, único, idempotente (rerun/2º idioma lêem o mesmo) e
> **contínuo** (segue de ~102; piso = `COUNT(posts)`; nunca regride). Preview do Reel **e**
> carrossel usam. Fail-open → esquema antigo. Regra pura `pickNextEdition` com teste invariante.

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

> **Trava de PUREZA DE IDIOMA — "BR é BR; ES é ES" (`src/lib/lang-guard.ts`).** O `marketBrief`
> sozinho não basta: o haiku **reaproveitava a frase do TEMA (canônica em ESPANHOL nos `THEMES`)
> como 1º slide/título** e deixava espanholismos nas hashtags → mescla PT+ES no Reel/feed (Reel BR
> 25/06: *"Voar más alto no es traición…"*, `#MenteLibre`). É defeito de QUALIDADE — publica "com
> sucesso", não quebra CI, revisão de código não pega (texto vive em runtime, não no repo). A trava
> é o detector determinístico que faltava: depois do parse em `generateContent`,
> `scanContentForeign(content, lang)` varre os campos que vão pro feed/Reel (título, slides, cta,
> legenda, **hashtags** — camelCase separado; `postBody`/`videoQueries` fora) procurando palavra
> **inequívoca** do outro idioma (alta precisão: falso positivo = vaga perdida). Achou → **regenera**
> com a lista (até 3×); não limpou → **BLOQUEIA** a publicação (post com mescla NÃO chega ao feed; o
> catchup tenta depois). Prompt reforçado proíbe copiar o tema ES literal e estende a revisão final
> às hashtags. `content_cache` em `v2` (descarta copy contaminada). Invariantes em
> `lang-guard.invariants.test.ts`.

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
  mergeados + secrets PT setados** (ver pendências: `D:\Claude\.claude\pendencias\dr-libertad.md`).
- **Handle no criativo:** `Reel.tsx`/`ReelClassic.tsx` recebem props `handle`/`brand`
  (default `@dr.liberdad`/"Dr. Libertad"). Nunca mais hardcode.

## Criação de vídeo — régua

**"Vídeo de verdade, não slide animado".** Movimento real no quadro = **footage de
banco (Pexels)** com texto/música como camada por cima. **i2v por IA foi abandonado**
(LTX-2 animava mal a ilustração plana — só partículas — por ~US$0,24/clipe). O motor
clássico (slide animado) é **mantido em paralelo** (não é o padrão de criação novo,
mas performa e o usuário quer manter).

## Engajamento automático — interação de verdade (inbound, API oficial)

Postar não basta pra crescer: o algoritmo premia **conversa**. A automação responde os
comentários nos NOSSOS posts e roda um **funil comment→DM** (alguém comenta uma
palavra-chave → 1 DM com o lead magnet), **tudo na voz da marca** e **só via API
oficial**. Runbook completo: `docs/ENGAJAMENTO.md`.

- **Só INBOUND. Outbound é PROIBIDO automatizar.** A Graph API **não permite** curtir/
  comentar em posts de TERCEIROS — a única via é bot de navegador, que **viola o ToS e
  derruba a conta** (pior numa conta nova: ação alta + pouca idade = assinatura de spam).
  Inbound (responder quem já interage) é o que mais pesa no algoritmo e é 100% sancionado.
  Se for fazer outbound, é **fila + 1 clique** (humano no loop), nunca bot.
- **Peças:** `src/lib/voice.ts` (voz reutilizável — espelha a VOZ EDITORIAL do
  `generateContent`; mora no repo porque o `LINHA-EDITORIAL.md` é OFFLINE), `src/lib/
  engagement.ts` (decisões PURAS + prompt builders + geração haiku), `/api/webhooks/instagram`
  (receiver Node: valida `X-Hub-Signature-256`, roteia ES/PT por `entry.id`, idempotente).
- **Travas (invariantes em `engagement.invariants.test.ts`):** anti-loop (nunca responde
  a própria conta nem uma resposta nossa — gravadas em `engagement_events`), **não engaja
  veneno** (comentário tóxico/spam → SKIP, não revida), guarda anti-ódio SEMPRE na voz.
- **3 frentes inbound:** (1) auto-resposta a **comentários** nos nossos posts; (2) **funil
  comment→DM** (palavra-chave → private reply com lead magnet); (3) auto-resposta a **DMs do
  Direct** (campo `messages`, anti-eco). Tudo na voz, balde `ig-engagement`.
- **Flags (nascem DESLIGADAS — ligar só após App Review + secrets):** `ENGAGEMENT_ENABLED`
  (mestra/comentários), `ENGAGEMENT_FUNNEL_ENABLED` (funil DM), `ENGAGEMENT_DM_ENABLED`
  (resposta a DM inbound), `ENGAGEMENT_FUNNEL_KEYWORD`, `ENGAGEMENT_LEAD_NAME`/`_URL`
  (por idioma `_ES`/`_PT`). Com a mestra OFF o webhook valida e dá 200 sem agir.
- **Gargalo = App Review da Meta** (`instagram_business_manage_comments` + `instagram_business_manage_messages`
  em Advanced Access): até aprovar, só atinge contas tester. Texto da submissão no runbook.
- **⚠️ Setup/config do webhook na Meta = por API/`curl`, NUNCA scriptar o painel pelo navegador.**
  Não automatizar `developers.facebook.com` com `browser:execute_javascript` (conector "Claude in
  Chrome"): essa tool tem **portão de permissão não-burlável** — `allow` não casa, "Sempre permitir"
  não persiste, bypass não suprime → dispara prompt a CADA chamada (provado 2026-06-25). Inscrição do
  webhook (callback URL `https://www.drlibertad.com/api/webhooks/instagram` + verify token + subscribe
  nos campos `comments`/`messages`) é `POST /{app-id}/subscriptions` / `/me/subscribed_apps` via `curl`,
  lendo `META_APP_ID`/`META_APP_SECRET`/`META_WEBHOOK_VERIFY_TOKEN` do cofre. **Regra geral de internet
  sem prompt: AGENTS.md §5 → "Roteamento de INTERNET"** (WebFetch/WebSearch/`curl`; nunca `execute_javascript`).
- **Custo:** haiku curto (~US$0,005–0,01/interação), balde `ig-engagement` (teto US$0,25/dia,
  ES+PT dividem). Estoura → webhook pula a geração, não bloqueia o 200.

## Custo

- **fal** (`FAL_KEY`): só para **ilustração** (carrossel + Reel clássico via `illus=1`)
  e geração da trilha. Maior ralo histórico (retry 3× no QA queima imagens). Footage
  e render são **grátis**. Saldo acabou uma vez (2026-06-15) → quebra ilustração.
- **Anthropic** (`ANTHROPIC_API_KEY`): geração de conteúdo (haiku). É a **API paga
  ESSENCIAL** — escreve toda a copy (título/slides/CTA/caption/videoQueries). ⚠️ NÃO é a
  assinatura de US$100/mês do Claude (essa não roda em automação); é a API à parte, paga
  por uso. ~US$0,01/post. Cair aqui = nada publica (incidente 23/06).
- **Pexels** (`PEXELS_API_KEY`): footage, grátis.
- **Pesquisa de contexto (grátis, sem chave/cartão)**: **DuckDuckGo** (web inteira,
  `src/lib/ddg.ts`) como PRIMÁRIA + **Wikipedia** (enciclopédica) como RESERVA quando o DDG
  vier vazio/bloqueado (estrangula IP de datacenter → o log diz a fonte). Substituíram a
  **Tavily** (paga, aposentada 23/06). Brave virou pago e Google fechou a API JSON p/ clientes
  novos → DDG é a única busca grátis de web inteira. Tudo fail-open.
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
