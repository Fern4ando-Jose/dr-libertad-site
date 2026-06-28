# Engajamento automático — auto-resposta a comentários + funil comment→DM

Gera **interação de verdade** na voz da marca: responde os comentários nos NOSSOS
posts e, quando alguém comenta uma palavra-chave de campanha, dispara **1 DM**
(funil comment→DM). Tudo via **API oficial** do Instagram — nada de bot de navegador.

> **Por que só inbound (responder quem já interage) e NÃO outbound (curtir/comentar
> em terceiros):** a Graph API **não permite** curtir/comentar no post dos outros; a
> única via é automação não-oficial, que **viola o ToS e derruba a conta** — pior ainda
> numa conta nova (taxa de ação alta + pouca idade = assinatura de spam-bot). O inbound
> é o que mais pesa no algoritmo (retenção/conversa) e é 100% sancionado. Outbound, se
> for feito, é **fila + 1 clique** (humano no loop), nunca bot.

## Arquitetura

```
Comentário no nosso post ──webhook──► POST /api/webhooks/instagram
   1. valida X-Hub-Signature-256 (HMAC com META_APP_SECRET)  → 401 se falhar
   2. flag-mestra ENGAGEMENT_ENABLED off? → 200 e PÁRA (merge seguro)
   3. roteia entry.id → conta ES/PT (accounts.ts)
   4. decideComment (PURO): anti-loop (própria conta / nossa resposta), vazio, tóxico/spam → SKIP
   5. dedup engagement_events (idempotente; nossas respostas entram aqui → anti-loop forte)
   6. gate de orçamento (balde ig-engagement) → estourou? SKIP, não falha o webhook
   7. gera resposta (haiku, voz da marca) → POST /{comment-id}/replies
   8. [flag ENGAGEMENT_FUNNEL_ENABLED] palavra-chave bateu? → private reply (1 DM)

DM no Direct (inbound) ──webhook (campo "messages")──► POST /api/webhooks/instagram
   [flag ENGAGEMENT_DM_ENABLED] decideDm (anti-eco/própria-conta/vazio/tóxico) →
   gera resposta 1:1 na voz → POST /{ig-id}/messages recipient.id (janela 24h)
```

Peças: `src/lib/voice.ts` (voz reutilizável), `src/lib/engagement.ts` (decisões puras +
prompt builders + geração haiku), `src/app/api/webhooks/instagram/route.ts` (I/O). Travas em
`engagement.invariants.test.ts`. Custo no balde `ig-engagement` de `src/lib/spend.ts`.

## Flags (nascem DESLIGADAS — ligar só depois do App Review + secrets)

| Env | Default | Liga |
|---|---|---|
| `ENGAGEMENT_ENABLED` | off | auto-resposta a comentários (Fase 1) |
| `ENGAGEMENT_FUNNEL_ENABLED` | off | DM do funil comment→DM (Fase 2) |
| `ENGAGEMENT_DM_ENABLED` | off | auto-resposta a DMs do Direct (inbound) |
| `ENGAGEMENT_FUNNEL_KEYWORD_ES` / `_PT` | — | palavra-chave por idioma. **Default = a palavra de marca da conta** (ES `LIBERTAD`, PT `LIBERDADE`) — não precisa setar p/ usar a decisão do dono |
| `ENGAGEMENT_FUNNEL_KEYWORD` | — | override global (vale p/ os dois idiomas se os por-idioma não existirem) |
| `ENGAGEMENT_LEAD_NAME_ES` / `_PT` (+ global `ENGAGEMENT_LEAD_NAME`) | **default embutido** | nome do lead magnet entregue na DM |
| `ENGAGEMENT_LEAD_URL_ES` / `_PT` (+ global `ENGAGEMENT_LEAD_URL`) | **default embutido** | link do lead magnet. Default = a página da prévia **"I Love Dopamina"** (`/{lang}/livros/i-love-dopamina`, download 1-clique). Sem URL → a DM só abre conversa, não inventa link |

## Go-live (pós-aprovação) — ✅ App Review APROVADO 2026-06-25

Os escopos `instagram_business_manage_comments` + `instagram_business_manage_messages`
estão em **Acesso Avançado** → a automação pode atingir o **público** (não só testers).
Ligar é **faseado e reversível** (é flag de env). Ordem recomendada:

**Fase 0 — pré-checagem (1x):**
- [ ] Secrets na **Vercel**: `META_APP_SECRET` (= secret do app **Instagram**, não o do
      Facebook) + `META_WEBHOOK_VERIFY_TOKEN`. Os tokens de publicação já existem.
- [ ] App **publicado** (Go Live) — sem isso a Meta não entrega webhook.
- [ ] Webhook inscrito por conta em `comments`+`messages`:
      `GET graph.instagram.com/v21.0/me/subscribed_apps`. **ES já confirmada** (`["comments","messages"]`, 25/06).
      **PT `@dr.liberdade.br`: CONFERIR** (não checável local — token PT não está no `.env.local`).

**Fase 1 — comentários (menor risco, escopo aprovado):**
- [ ] Setar `ENGAGEMENT_ENABLED=on` (Vercel). Valida em **comentário público real** num
      post nosso → resposta automática aparece. Custo no balde `ig-engagement` (~US$0/dia conta nova).

**Fase 2 — funil comment→DM e DM inbound:**
- [x] ✅ **BLOQUEIO RESOLVIDO:** o bug de **auto-reply duplicado** (`@dr.liberdade.br`,
      prints 25/06) está corrigido pela **trava anti-repetição** (abaixo). Pode ligar.
- [ ] `ENGAGEMENT_FUNNEL_ENABLED=on` e `ENGAGEMENT_DM_ENABLED=on`.
- [ ] Palavra-chave/lead usam default embutido (`LIBERTAD`/`LIBERDADE` → prévia "I Love
      Dopamina") — só setar env se for mudar.

> Tudo OFF reverte na hora (apagar/`off` a flag). Espelhar ES + PT ("rodar = ES + PT").

## Secrets a setar (Vercel + GitHub) — AÇÃO DO DONO

- `META_APP_SECRET` — App Secret do app Meta (valida a assinatura do webhook).
- `META_WEBHOOK_VERIFY_TOKEN` — string aleatória; a MESMA vai no painel da Meta
  (campo "Verify token") e aqui. **Já escolhida** (ver `PENDENCIAS.inbox.md`) — é só
  setar o mesmo valor na Vercel/GitHub e no painel da Meta. (É só o aperto-de-mão da
  verificação, baixa sensibilidade; o segredo de verdade é o `META_APP_SECRET`.)

Os tokens de publicação (`META_ACCESS_TOKEN`/`_PT`, `META_INSTAGRAM_ACCOUNT_ID`/`_PT`)
já existem e são reaproveitados.

## Configurar o webhook no painel da Meta — AÇÃO DO DONO

1. Meta App → **Webhooks** → produto **Instagram** → **Subscribe** aos campos `comments`
   **e `messages`** (`messages` é o que entrega os DMs do Direct pro auto-responder).
2. **Callback URL:** `https://<seu-domínio-vercel>/api/webhooks/instagram`
3. **Verify token:** o mesmo valor de `META_WEBHOOK_VERIFY_TOKEN`.
4. A Meta chama o GET de verificação; deve aceitar (devolve o `hub.challenge`).

## App Review — o CAMINHO CRÍTICO (faça primeiro, leva dias)

Responder comentário e mandar DM a quem **não é admin do app** exige **Advanced Access**:
- `instagram_business_manage_comments` (responder comentários)
- `instagram_business_manage_messages` (DM do funil)

Enquanto o review não aprova, o webhook só atinge contas que são **testers** do app —
dá pra validar tudo, mas não atinge o público. Submeta assim que possível.

> **Política de Privacidade (exigência da submissão — já no ar):** o formulário do App
> Review pede uma **URL pública de política de privacidade** e um **caminho de exclusão
> de dados**. Use `https://www.drlibertad.com/pt/privacidade` (ES: `/es/privacidade`).
> A página cobre os dados da automação (comentários/DMs via API oficial), terceiros,
> retenção e tem **seção dedicada de exclusão de dados** por e-mail/DM (≤30 dias) —
> que é o que a Meta exige no campo de data deletion. Fonte: bloco `privacy` em
> `src/lib/i18n/dictionaries.ts` (PT/ES).

### Texto sugerido do caso de uso (cole no formulário, ajuste o domínio)

> **instagram_business_manage_comments** — "Our app is the official content studio for the
> Instagram account it manages. When a follower comments on one of OUR OWN posts, the
> app reads the comment and publishes a reply in the brand's editorial voice, to sustain
> conversation with our audience. We only read and reply to comments on media owned by
> the connected account. We never act on third-party media."
>
> **instagram_business_manage_messages** — "When a follower comments a campaign keyword on our
> own post, the app sends ONE private reply (comment→DM) delivering the requested
> resource (a free guide), in the brand's voice. We only message users who initiated
> contact by commenting the keyword on our media."

### Roteiro do screencast (grave a tela mostrando)

1. Login no app/painel com uma conta Instagram Business de teste.
2. Um post da conta de teste recebe um comentário (feito por uma 2ª conta tester).
3. O app detecta o comentário e publica a resposta automática — mostre a resposta
   aparecendo no comentário.
4. Uma conta tester comenta a palavra-chave (ex.: "GUIA"); mostre o DM chegando no
   Direct com o material.
5. Narre que tudo ocorre só em mídia da própria conta conectada.

## Trava anti-repetição (nunca a MESMA resposta 2x no mesmo post/janela)

**Bug (25/06, `@dr.liberdade.br`):** a MESMA frase saía em comentários DIFERENTES.
Causa: a idempotência só olhava o `comment_id` (impede responder 2x o MESMO comentário,
não o mesmo TEXTO em comentários distintos) e o haiku **colapsa** quando o input é
quase-constante — comentário curto/genérico (emoji, "verdad") ou, no funil, só a
palavra-chave + um lead magnet **fixo**. Sem post-context, a saída repetia.

**Fix (defesa em profundidade):**
- `engagement_events` passou a gravar o TEXTO enviado (`reply_text`/`reply_norm`) e o
  post (`media_id`) — migração idempotente (`ADD COLUMN IF NOT EXISTS`), fail-open.
- **Proativo:** toda geração injeta `buildAntiRepeatDirective(recentes)` no prompt —
  o haiku já recebe as frases JÁ usadas e é mandado dizer algo distinto.
- **Garantia dura:** `generateDistinctText` regenera (até 3×) e compara por forma
  canônica (`normalizeReply`: minúsculas, sem acento, só letras/números — pontuação e
  emoji não contam). Se ainda colidir: **resposta PÚBLICA de comentário PULA** (não
  repete no feed → `skip:dup-reply`); **DM 1:1/funil ENVIA mesmo assim** (entregar o
  lead importa mais e a DM não fica visível lado a lado).
- **Escopo ES≠PT:** os recentes são por conta (`account_id` = user_id do idioma) e a
  regeneração usa a voz/`marketBrief` da conta → a frase nova é **nativa por idioma**
  (BR é BR, ES é ES), nunca reaproveitada.
- Invariantes em `engagement.invariants.test.ts` (normalizeReply/isDuplicateReply/
  buildAntiRepeatDirective/generateDistinctText). Custo: no pior caso ~3 chamadas haiku
  por interação (raro), tudo no balde `ig-engagement` já aprovado.

## Lead magnet (isca do funil)

Prévia editorial do livro **"I Love Dopamina"** — recorte fiel das primeiras partes
(o reframe da dopamina + o diagnóstico do sequestro + os 4 primeiros movimentos), na
voz da marca, **bilíngue regenerado por mercado** (não traduzido), 14 páginas, sem
promessa de saúde e com o "Dr." blindado (estúdio editorial, não médico real). Fecha o
loop: comenta a palavra → recebe a prévia → responde `LIVRO`/`LIBRO` → lista de espera
do livro.

- **O DM manda a PÁGINA do livro, não o PDF cru:** `https://www.drlibertad.com/{lang}/livros/i-love-dopamina`
  (ES/PT). A página apresenta o livro e tem **botão de download 1-clique** que serve o PDF
  (`public/lead/I-Love-Dopamina_Previa_{ES,PT}.pdf`). Aquece o lead, fica sob a marca e abre upsell
  do livro completo. É o **default embutido** do funil (`LEAD_DEFAULTS` em `webhooks/instagram/route.ts`;
  trocável por env `ENGAGEMENT_LEAD_URL_*` sem deploy). A página é o livro `i-love-dopamina` em
  `src/lib/books.ts` (`free:true` + `leadPdf`), renderizada por `BookSales` (modo grátis = download).
  Capa por idioma: PT e ES próprias (`/images/i-love-dopamina-capa-{pt,es}.png`).
- **Fonte (offline, fora do Git):** `D:\Claude\Livros-Escrevendo\I love Dopamina\`
  (`design/build-interior.mjs` + `build-interior-es.mjs` → Chrome `--print-to-pdf`;
  trava `preflight.mjs` no PDF real antes de publicar). Só o PDF entra no Git; o source é
  ativo de marca.

## Custo

Haiku curto por interação (~US$0,005–0,01). Conta nova = quase US$0/dia. Teto diário
`ig-engagement` = US$0,25 (override em runtime via `config` key `budget:ig-engagement`,
igual às outras automações). Estoura → o webhook PULA a geração (não bloqueia o 200).

## Multi-idioma

Um único webhook serve ES e PT: roteia pelo `entry.id` (account-id que recebeu o
evento) → conta certa em `accounts.ts` → responde no idioma e com o `marketBrief` da
conta. Espelha a regra "rodar = ES + PT".

## Esteira de comentário assistida (OUTBOUND — humano no loop, 1 clique)

Crescimento de alcance frio: comentar em posts de contas GRANDES do nicho. A Graph API
**não permite** comentar em terceiros (só inbound) → quem posta é o DONO. A esteira só
PREPARA: acha o post fresco + escreve o comentário na voz. **Nunca bot** (bot derruba a
conta). Lista-guia (contas 1M+, decisão de rodar 1 mês e reavaliar) mora OFFLINE em
`D:\Claude\.marca\dr-libertad\contas-guia.md`.

- **Alvos:** `src/lib/comment-targets.ts` (contas 1M+ por idioma + teto de cadência:
  ES 10/dia, PT 5/dia — ES é a conta antiga, mais agressiva).
- **Lógica pura:** `src/lib/comment-queue.ts` — frescor do post (comentar nos 1ºs minutos
  é o que faz a mega pagar; senão afunda), ranqueamento frescor×engajamento, dedup,
  prompt do comentário (curto, **sem citar a marca/@**, sem puxa-saco). Testes em
  `comment-queue.invariants.test.ts`.
- **FASE 1 — `/api/comment-queue` (PROBE, grátis):** lê via `business_discovery` (oficial,
  read-only) os posts recentes das contas-alvo → devolve quais são lendíveis, seguidores
  AO VIVO e engajamento dos últimos posts, já ranqueando os frescos. Protegido por
  `CRON_SECRET`. ⚠️ `business_discovery` exige Instagram API **com Facebook Login** + alvo
  Business/Creator público — o probe confirma se o nosso token lê.
- **FASE 2 (após probe OK + aprovação de custo ~US$5/mês):** ligar a geração dos
  comentários na voz (haiku, balde `ig-engagement`) + a entrega da fila com aviso de
  "post fresco". O dono lê e posta com 1 toque.
