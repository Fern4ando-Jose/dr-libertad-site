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

## 🔴 ERRO ATUAL EM ABERTO (24/06/2026)

### Carrossel em looping de 402 (orçamento `ig-posts`)
- **Sintoma:** o workflow "Instagram — publicar posts (PT-BR)" falha **a cada 15 min** (vermelho),
  desde 15:40 UTC de 24/06. O agendador externo (cron-job.org → `/api/catchup`) rebate o slot
  faltante (PT run 4), toma 402 e o workflow sai com `exit 1` → alarme em loop.
- **Erro literal:** `HTTP 402 {"blocked":true,"reason":"Orçamento diário ig-posts estourado (gasto US$0.351 + est US$0.150 > teto US$0.50)"}`
- **Causa-raiz (medida no `spend_log` de hoje):** o teto de **$0,50** é consumido em **72% por
  ilustração da fal** — **9 chamadas de ilustração + 9 de QA (sonnet)** para apenas **3 carrosséis**,
  porque o QA roda **3 tentativas por carrossel**. Conta: fal $0,252 + qa-judge $0,066 + conteúdo
  (haiku) $0,033 = $0,351. A 4 carrosséis/dia (2 ES + 2 PT) **não cabe em $0,50** → o 4º toma 402.
  O looping em si é um segundo defeito: **402 de orçamento é estado NORMAL** ("acabou a verba do
  dia"), mas o workflow o trata como crash e o catchup redispara sem fim.
- **Como corrigir (respeitando o teto de $0,50, sem subir gasto):**
  1. **Cortar o QA de 3→1 tentativa** na ilustração do carrossel (`generateIllustration` em
     `src/app/api/publish/route.ts:667`, hoje usa o `maxTries` default = 3). Cada carrossel cai de
     ~$0,12 → ~$0,03; os 4 cabem folgado em $0,50. Se a única tentativa falhar, já existe a rede de
     segurança: cai no **motivo abstrato** (nunca publica defeito). **— decisão da ilustração: ver nota.**
  2. **402-de-orçamento vira `skip` (exit 0), não falha** — nos workflows `instagram-posts*.yml`
     (e espelhos), tratar `"blocked":true`+402 como pulo, e o catchup não reenfileirar slot sem verba.
     Mata o alarme vermelho. Independe da decisão da ilustração.
- **Nota da ilustração (conflito resolvido pelo git):** a memória antiga dizia que o dono *rejeitou*
  a ilustração (ED 89, 18/06, PR #33 → motivo). Mas o commit **`26bec4c5` (19/06)** *reverteu de
  volta pra ilustração editorial* ("desfaz #33"). Então o estado ATUAL e mais recente é
  **ilustração LIGADA** → o fix recomendado é o **(1) cortar QA 3→1** (mantém a ilustração). Confirmar
  com o dono só se ele quiser mudar de rumo agora.

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
| **Orçamento / 402** | ~6 | de4c4a58(17/06 sobe ig-reels) → budget-db-override(17/06) → 7640bdf3(cache copy) → b3d4de61(ilustração 1×) → 75d075ba(aposenta Tavily) → **ATUAL ig-posts** | Teto baixo p/ a cadência real; override no DB vence o código; ralos pagos (Tavily, fal 2×, retry 3×). |
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
