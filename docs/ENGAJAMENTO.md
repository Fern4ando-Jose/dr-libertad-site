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
| `ENGAGEMENT_LEAD_URL_ES` / `_PT` (+ global `ENGAGEMENT_LEAD_URL`) | **default embutido** | link do lead magnet. Default = o guia **"El Reinicio / O Reinício"** servido em `/lead/*.pdf` (já no repo). Sem URL → a DM só abre conversa, não inventa link |

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

## Lead magnet (isca do funil)

Guia grátis **"El Reinicio / O Reinício"** — 7 dias de detox de dopamina/atenção, na
voz da marca, **bilíngue regenerado por mercado** (não traduzido), 11 páginas, sem
promessa de saúde e com o "Dr." blindado (estúdio editorial, não médico real).

- **Servido pelo site:** `public/lead/El-Reinicio_DrLibertad_ES.pdf` (ES) e
  `public/lead/O-Reinicio_DrLiberdade_PT.pdf` (PT) → `https://www.drlibertad.com/lead/…`.
  É o **default embutido** do funil por idioma (não precisa setar env pra funcionar).
- **Fonte (offline, fora do Git):** `D:\Claude\.marca\dr-libertad\lead-magnet\build.mjs`
  (HTML + Fraunces embutida → Chrome `--print-to-pdf`). Regerar = `node build.mjs`,
  recopiar os PDFs pra `public/lead/`, commit. Só o PDF entra no Git; o source é ativo
  de marca (AGENTS.md §1.7).

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
