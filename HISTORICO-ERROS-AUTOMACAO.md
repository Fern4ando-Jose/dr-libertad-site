# Histórico de erros da automação — Dr. Libertad

> **Para que serve:** acabar com o ciclo de "consertar, voltar, reconsertar". Toda falha da
> automação fica aqui por **data · erro · causa-raiz · solução**, com as **reincidências**
> marcadas — pra a gente ver o que é bug novo e o que é o MESMO bug voltando.
>
> **Como manter:** agente `historiador-erros` (`.claude/agents/historiador-erros.md`). Append-only.
> **Cobertura:** git desde **2026-05-27** (1º commit) — completo. Logs do GitHub Actions só
> retêm ~10 dias → falhas com log só de **~14/06 em diante**; antes disso, o histórico vem dos
> commits e docs. Última atualização: **2026-06-24**.

---

## 🔴 2 ERROS EM ABERTO (24/06/2026 — aguardando decisão do dono)

### ERRO A — Repetição VISUAL: capas quase idênticas (figura solitária na "porta")
- **Sintoma:** o feed (ES e PT) repete o mesmo quadro — homem só, de costas, retroiluminado num
  vão/porta. Visto no print do dono em 24/06 ("Nunca cambies", "Si no pones límites", "Nadie te
  debe nada", "No necesitas ser amado" — todas a mesma composição).
- **Causa-raiz:** **46 de 62 `subjects` (74%)** começam com *"a figure / a male figure / a man"* —
  figura humana solitária; **10** são literalmente porta/limiar/de-costas/caminhando-pra-luz. E o
  template fixo `buildPrompt` (`src/lib/illustration.ts`) amplifica: *"Cinematic… dramatic chiaroscuro…
  one bold central metaphor, generous negative space"* → o Flux converge na mesma silhueta centralizada.
- **O que fazer (synthesis):**
  - **A (estrutural):** rotação de **enquadramento** no `buildPrompt` por `motif`/índice (close-up,
    plano aberto, flat-lay de objetos visto de cima, ângulo baixo…) → posts vizinhos não saem iguais.
  - **B (subjects):** reescrever os ~10-15 piores `subjects` (porta/figura-de-costas) trocando a
    **figura humana por metáfora de OBJETO/símbolo**, mantendo o sentido (a marca já tem bons exemplos:
    *"uma única porta fechada, no people"*).
  - **C (opcional):** alternar **ilustração × motivo abstrato** por slot → mais variedade e menos custo.
  - Recomendação: **A + B** (C como bônus).
- **DECISÃO:** _(pendente — preencher quando o dono definir)_

### ERRO B — Tema duplicado no MESMO dia: o "post-fantasma" (vaga publicada sem id)
- **Sintoma:** "O amor que morre de tédio" saiu **2× no mesmo dia** na conta PT — mesma vaga
  (slot `tarde` = run 5), 11:16 e 19:16 BRT, **mesma edição (ED 112)**. Não é seleção nem numeração:
  a **mesma vaga publicou duas vezes**.
- **Causa-raiz:** o carrossel **publicou no IG, mas a API voltou sem o `instagram_post_id`** (falha
  parcial: post vivo, id perdido). No código (`route.ts:702`) `recordRun` é guardado por
  `if (instagramPostId)` → **não gravou no `published_runs`** → o watchdog (catchup) vê a vaga como
  "não publicada" e **redispara** → mesmo tema/edição de novo. TODAS as 4 camadas anti-dup filtram
  `instagram_post_id IS NOT NULL` → um post **vivo sem id** é **invisível** pra elas. (Mesma brecha
  possível no reel: `publish-reel` também guarda `recordRun` por id não-nulo.)
- **O que fazer (synthesis):**
  - Gravar a vaga como publicada **mesmo com id perdido**: assim que a publicação retorna OK, chamar
    `recordRun` com um **marcador "publicado-sem-id"** (sentinela não-nulo) — o watchdog para de redisparar.
  - **Endurecer a captura do id** em `publishCarousel` (reler/poll o media id antes de desistir).
  - Replicar no **reel** (`publish-reel`). Cobrir com **teste invariante** (vaga sem id ≠ vaga ausente).
- **DECISÃO:** _(pendente — preencher quando o dono definir)_

---

## ✅ Resolvidos nesta sessão

### ✅ FINALIZADO: custo do carrossel (auditoria 24/06)
- **Sintoma que aparecia:** workflow "publicar posts (PT-BR)" dava **402 em loop** (PT run 4):
  `{"blocked":true,"reason":"Orçamento diário ig-posts estourado (gasto US$0.351 + est US$0.150 > teto US$0.50)"}`.
- **Conclusão da auditoria (7 dias de `spend_log`):** o **gasto real diário NUNCA passou de US$0,469**
  (máx, com 6 carrosséis); o teto de **US$0,50 tem folga** — o dono estava certo. A ilustração (fal,
  best-of-3) **já é compartilhada ES/PT** (o 2º idioma reusa o cache). O 402 era **falso**: a
  **estimativa conservadora** (US$0,15/carrossel) somava ao gasto e tombava o gate (US$0,351 + 0,15 =
  US$0,501), mesmo o custo REAL do PT run 4 sendo ~US$0,014 (reusa a ilustração do ES). Tavily
  (US$0,066/dia) já fora desde 23/06 → ainda mais folga.
- **Finalização (PR desta sessão):** baixar `EST_RUN_COST.publish` **0,15 → 0,10** (`src/lib/spend.ts`)
  — reflete a ilustração compartilhada (real médio ~US$0,07/carrossel). **NÃO** mexe no teto (0,50) e
  **NÃO** corta a ilustração/QA best-of-3 (o gasto não era o problema; a estimativa era). Some o 402
  falso e, sem 402, some o loop vermelho do catchup.
- **Decisão da ilustração (firme):** o git confirma que ela foi **religada em 19/06** (`26bec4c5`,
  "desfaz #33") e hoje é gerada por padrão (`route.ts:667`). Fica **LIGADA**. Memória corrigida.

### ✅ Resolvido HOJE nesta sessão (não está mais aberto)
- **Reel CLÁSSICO (run 3, o 4º reel) não saía** — dependia 100% da ilustração da fal; quando ela
  falhava (402 de orçamento no storm da Tavily, fal fora, QA reprovando), o `curl -fsS` do preview
  derrubava o workflow inteiro **sem fallback**. Saía só **6× em ~7 dias** (devia ser ~14). **Fix:**
  cascata robusta nos `instagram-reels-classic*.yml` — tenta ilustração (não-fatal); se falhar, busca
  **footage (Pexels)** e o slot publica um Reel de footage; só pula se faltarem os dois. Com ilustração
  renderiza `ReelClassic`, sem ela `Reel`. O 4º reel **sempre sai algo**.
- **Reel renderizava o vídeo inteiro e PULAVA** (`{"ok":true,"skipped":true,"reason":"run 0 já publicado hoje"}`).
  Causa: o "dia" do livro-razão era **UTC**; o slot das 21h BRT (00h UTC) e os catchups da madrugada
  caíam no **dia UTC seguinte** e marcavam as vagas do dia seguinte como feitas. **Fix:** dia ancorado
  em **BRT (UTC-3)**, fonte única `src/lib/day.ts`. Commit **`a1c0beb8` / PR #76**, deploy verde,
  confirmado live (`/api/runs-status` responde em minuto BRT). Invariantes em `day.invariants.test.ts`.

---

## 🔁 Famílias reincidentes (o "loop" que o dono sente)

Estes não são bugs isolados — são o **mesmo problema central** atacado várias vezes. É aqui que mora
a sensação de "conserta e volta".

| Família | Nº de investidas | Linha do tempo (commits) | Por que voltava |
|---|---|---|---|
| **Anti-duplicata de tema** (a maior do projeto) | ~11 | af39e050(01/06) → 33f3b9ed(15/06) → 6c6f2a5d(22/06) → e409a539 → bf061468 → 0ddd5bd2 → 8b3d00c2 → 10bb10d7(24/06) → 2ad320c4 → 7cd4c3f8 → a1c0beb8(24/06) | Cada fix cobria um caminho (24h, run, reembaralho, cross-formato, idioma, intra-dia, seleção). Faltava a **trava no PUBLISH** (#75) e o **dia em BRT** (#76). |
| **Orçamento / 402** | ~7 (✅ finalizada 24/06) | de4c4a58(17/06 sobe ig-reels) → budget-db-override(17/06) → 7640bdf3(cache copy) → b3d4de61(ilustração 1×) → 75d075ba(aposenta Tavily) → **EST_RUN_COST 0,15→0,10 (24/06, auditoria: o teto sempre teve folga; era a estimativa)** | Teto baixo p/ a cadência real; override no DB; ralos pagos (Tavily, fal 2×). Auditoria fechou: gasto real ≤US$0,469/dia, teto US$0,50 OK; o que tombava era a estimativa conservadora. |
| **Satori/edge no `/api/og`** | ~10 | bloco de 01/06 (fonte, woff2, flex, Array.from, fundo preto, borda) | O renderizador de imagem do edge não aceita CSS/JS comuns; cada recurso quebrava um detalhe. Estabilizou. |
| **Token Meta / segredos** | ~6 | ccafd621 → ef18300e → 2f12b7e0 → b... → 401 do CRON_SECRET (21/06) → 8ba9cb7e(23/06) | Token expira a cada 60d; CRON_SECRET tem de bater em 4 lugares; segredo commitado reusado. |
| **Ilustração / anatomia da capa** | ~6 | 7fbc6b4d → 94e7bd5d → a9eab7ec(revert) → 52677cd9(motivo) → 26bec4c5(volta ilustração) → 69db6902(best-of-3) | Flux erra mãos → QA reprova → cai no motivo; idas e vindas sobre ligar/desligar a ilustração. |
| **Polling/timeout do Reel no IG** | ~4 | ff276f00 → ce1712ed → e14084bd → timeouts 14/06 | Janela de polling curta + consulta sob accountId errado. Estabilizou. |
| **Cron do GitHub atrasa/derruba** | recorrente | 33f3b9ed(run fixo) → 24678b2a(:00→:17) → catchup.yml → cron-job.org externo | Flakiness do scheduler do GitHub (não é bug de código); mitigado por catchup idempotente. |

---

## 📜 Catálogo cronológico (correções por commit)

| data | área | erro/sintoma | solução | reincidência |
|---|---|---|---|---|
| 2026-05-27 | deploy | build/PostCSS/Tailwind v4 quebrados (6 commits) | migra config p/ @tailwindcss/postcss + CSS v4 | — |
| 2026-05-29 | geração | nome do modelo Claude inválido → geração falhava (3 commits) | acerta p/ claude-haiku-4-5 | 3× até acertar |
| 2026-05-30 | carrossel | imagem IG quebrada / URL ruim / container publicado cedo / tags jsonb / fonte estourando (bloco grande) | fallbacks de imagem, delay 3s, cast ::jsonb, fonte adaptável, 1080x1350 4:5 | — |
| 2026-05-30 | token | token Meta expirava | auto-renovação + schema | família token |
| 2026-06-01 | carrossel | Satori/edge: fonte não embarcava, woff2, display:block, Array.from, fundo/borda preta (bloco) | Fraunces base64 OTF, flex, array literal, OFFWHITE | família Satori |
| 2026-06-01 | rotação | tópico repetia em 24h | dedup 24h | **família anti-dup (início)** |
| 2026-06-02 | deploy | excesso de crons estourava limite Hobby Vercel | revert p/ 3 crons; depois migra p/ GitHub Actions | — |
| 2026-06-12 | token | renovação usava fluxo errado | usa ig_refresh_token correto | família token |
| 2026-06-13 | carrossel | título cortado no OG | fitTitle + motivos por seed | — |
| 2026-06-13 | carrossel | overlay de texto duplicado na capa | capa sem overlay | — |
| 2026-06-13 | carrossel | FAL_KEY não lida em runtime | lê em runtime + envDiag | — |
| 2026-06-14 | reel | BLOB token com quebra de linha → "invalid header value" (3×) | trim no token / extrai só o token | reincidiu no mesmo dia |
| 2026-06-14 | reel | polling do reel curto → Timeout (2×) | janela 60→120→250s + consulta na raiz do graph | ff276f00→ce1712ed→e14084bd |
| 2026-06-15 | rotação | run derivado da HORA colidia com run vizinho (atraso de cron) → anti-dup → nada publicava | run vem de `github.event.schedule` (mapa fixo) | **família anti-dup** |
| 2026-06-15 | reel | Reels diziam @drlibertad (conta inexistente) | corrige p/ @dr.liberdad | — |
| 2026-06-15 | fal/budget | **saldo da fal zerou** → ilustração quebrou | recarregar; checar saldo via API billing | família budget |
| 2026-06-16 | reel | último clipe fora do tema / mesma abertura | round-robin nas queries + seed diversifica | — |
| 2026-06-16 | multi-idioma | espanholismo vazou no PT ("punzada") | brief manda revisão anti-espanholismo | — |
| 2026-06-16 | reel | caption do Reel longa demais (IG 36004) | (clamp de caption) | — |
| 2026-06-17 | budget | gate bloqueava Reels com 402 | sobe teto ig-reels 0,10→0,25 | **família budget** |
| 2026-06-17 | budget | 402 PERSISTIA após subir teto + deploy | **override no DB (`config`) vence o código** → corrige no Neon | família budget |
| 2026-06-17 | multi-idioma | ilustração ES≠PT (pagava 2×) | ilustração única compartilhada via seed + teste CI | família budget/anti-dup |
| 2026-06-17 | multi-idioma | PT usava bed.wav hardcoded | espelha pick-music do ES | **drift PT** |
| 2026-06-17 | rotação | crons :00 sofriam atraso enorme | move :00→:17 | família cron |
| 2026-06-18 | carrossel | erro 9004 IG (mídia não baixada): /api/og lento | timeout no fetch + re-host no Blob | família IG-media |
| 2026-06-18 | ilustração | Flux erra dedos → QA reprova → motivo | subjects anatomia-safe; best-of-3 + juiz | **família ilustração** |
| 2026-06-18 | carrossel | ilustração "tipo anime" na capa (ED 89) — dono rejeitou | capa volta ao MOTIVO (PR #33) | família ilustração |
| 2026-06-18 | env | PEXELS_API_KEY faltava na Vercel → footage não compartilhava (silencioso) | `vercel env add` + paridade | — |
| 2026-06-19 | carrossel | (decisão) capa voltou ao motivo "por engano" | **revert: volta à ilustração editorial** (`26bec4c5`, desfaz #33) | família ilustração |
| 2026-06-19 | budget | redisparo re-pagava Anthropic | cache da copy por (tópico,dia,idioma) | família budget |
| 2026-06-21 | security | **CRON_SECRET vivo exposto** nas docs (reusado de valor commitado) | rotação fresca + limpa docs (PR #47) | família token |
| 2026-06-21 | token | workflows em 401 (CRON_SECRET dessincronizado: Vercel≠GitHub≠cron-job≠.env) | re-sincroniza os 4 pontos | família token |
| 2026-06-21 | multi-idioma | ilustração ES/PT gerada 2× (paga fal 2×) | serializa: gera 1×, reusa | família budget |
| 2026-06-22 | rotação | reembaralho semanal repetia tema em 1-3d | ordem FIXA com gap ≥ ciclo | **família anti-dup** |
| 2026-06-22 | reel | "Nº 102" repetido em todo Reel (COUNT(posts) não andava) | `editionFor(dia,run)` — Nº por vaga | reels-not-in-posts |
| 2026-06-22 | reel | Reel preto publicado | cascata footage→ilustração→pular | — |
| 2026-06-22 | rotação | mesmo tema saía Reel e carrossel em dias seguidos ("padre ausente") | anti-dup cross-formato (Reel grava topic) | **família anti-dup** |
| 2026-06-22 | rotação | anti-dup frágil a timing/idioma | base unificada ES/PT + threading intra-dia | família anti-dup |
| 2026-06-22 | carrossel | carrossel publicou 2× (catchup + cron atrasado) | idempotência por (dia,run,conta) | família anti-dup |
| 2026-06-22 | rotação | anti-dup cega a reels antigos (topic NULL) | une reel_shared_cache.topic | família anti-dup |
| 2026-06-23 | security | /api/instagram vazava token e quota | tranca atrás do CRON_SECRET | família token |
| 2026-06-23 | budget | **parou de publicar**: Anthropic 500 em prod + Tavily paga estourava ig-reels | aposenta Tavily → DDG+Wikipedia grátis | **família budget** |
| 2026-06-23 | voz | temas-convicção viravam "libertad" (**bug ED 106**) | trava anti-amenização `literal:true` (PR #69) | — |
| 2026-06-24 | rotação | descasamento ES/PT (tema diferente por vaga) | exclui hoje do `recent` + lote §4 literais (PR #72) | **família anti-dup** |
| 2026-06-24 | rotação | excluir hoje (PR #72) causou repetição same-day "Si no pones límites" reel+carrossel | reverte: livro-razão (dia,run)→tema; `recent` inclui hoje (PR #74) | **regressão do PR #72** |
| 2026-06-24 | anti-dup | repetição chegava ao feed (toda trava na seleção) | **trava de PUBLICAÇÃO** independente + detecção (PR #75) | família anti-dup |
| 2026-06-24 | deploy | deploy do #75 preso em fila na Vercel | redeploy (`2b72566c`) | — |
| 2026-06-24 | reel/rotação | reel renderizava e PULAVA (dia em UTC roubava vagas do dia seguinte) | **dia ancorado em BRT** (PR #76) | **família anti-dup (raiz de fuso)** |
| 2026-06-24 | reel | **Reel clássico (run 3, 4º reel) não saía** — 402/erro na ilustração derrubava o workflow sem fallback (saía ~6× em 7d) | cascata ilustração→**footage**→pular nos `instagram-reels-classic*.yml` (PR #78) | família budget/ilustração |
| 2026-06-24 | budget | **402 FALSO no carrossel** — estimativa US$0,15 (assumia ilustração nova em todo carrossel) tombava o gate, mas o gasto real nunca passou de US$0,469/dia e o 2º idioma reusa a ilustração | auditoria + `EST_RUN_COST.publish` 0,15→0,10 (`spend.ts`); teto e QA inalterados | **família budget (finalizada)** |

---

## 🛠️ Erros operacionais recorrentes (runbook)

Não são bugs de código — voltam pela natureza das plataformas. Como agir:

| erro | quando | ação |
|---|---|---|
| `190 Cannot parse access token` / `Failed to decrypt` / token expirado | a cada ~60 dias | renovar token no Meta → editar env Vercel → redeploy → `/api/migrate`. Auto-renovação: cron `/api/refresh-token` (dia 1). |
| `9004/2207052 Media download failed` | quando a URL não é pública | usar `https://www.drlibertad.com` (não `*.vercel.app`). |
| `9007/2207027 Cannot Publish / Media ID not available` | permissão ou container não pronto | conferir `instagram_business_content_publish`; aguardar 3s antes de publicar. |
| Workflows em **401** | após rotação de segredo | `CRON_SECRET` tem de bater em **4 pontos**: Vercel, GitHub Secrets, cron-job.org, `.env.local`. |
| **402** no preview/publish | teto de orçamento batido | conferir `spend_log` do dia + `config` (override no DB vence o código). Subir teto OU cortar ralo (QA 3×, ilustração). |
| Cron "success" mas **não publicou** | GitHub atrasou o cron → caiu em anti-dup | normal; o catchup recupera. "Publicou de fato" = `instagram_post_id` não-nulo. |
| `git: index.lock File exists` / tudo "deleted" | VS Code/Cursor segura o lock (Windows) | `del .git\index.lock` + `git restore --staged .`. |

---

## ⚠️ Drift documental conhecido (não é incidente)
- Contagem de temas: CLAUDE.md diz **61 temas / 27 literais**; DECISOES-TRAVADAS.md e o índice de
  memórias ainda dizem **51**. Atualizar as fontes atrasadas.
