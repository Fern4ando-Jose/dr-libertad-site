# App Review — submissão `instagram_business_manage_comments`

Material pronto pra colar no formulário do App Review da Meta (app `2214160215805028`,
"Instagram API com login do Instagram"). Reviewer lê em **inglês** → os textos do
formulário estão em EN; o entorno (instruções pro dono) em PT.

> **Onde colar:** painel do app → **Analisar → Análise do app** → caso de uso
> **API do Instagram** → escopo `instagram_business_manage_comments` →
> **Ações → Adicionar à análise** → preencher os campos abaixo → subir o screencast → **Enviar**.
> Ordem e travas do menu SPA: ver `app-review-verificacao-estado` (memória).

Dados fixos que o formulário pede:
- **Callback / app domain:** `https://www.drlibertad.com`
- **Webhook callback URL:** `https://www.drlibertad.com/api/webhooks/instagram`
- **Privacy Policy URL:** `https://www.drlibertad.com/pt/privacidade` (ES: `/es/privacidade`)
- **Data Deletion:** mesma página, seção dedicada de exclusão de dados (≤30 dias)
- **Plataforma:** Website
- **Acesso pedido:** Advanced Access

---

## 1. Caso de uso (campo "How will you use this permission?")

> Dr. Libertad is the official content studio that manages the Instagram Business
> account `@dr.liberdad` (and its Portuguese counterpart `@dr.liberdade.br`). The app
> publishes the account's own editorial content and sustains the conversation it starts.
>
> We use `instagram_business_manage_comments` to **read and reply to comments left by
> followers on the account's OWN media**. When a follower comments on one of our posts,
> the app receives the `comments` webhook, reads the comment text, generates a short
> reply in the brand's editorial voice, and publishes it as a reply to that same comment
> (`POST /{comment-id}/replies`).
>
> The purpose is genuine community management: answering questions, acknowledging
> feedback, and keeping the discussion going under our own posts — the same thing a
> social-media manager does by hand, done reliably and on time.
>
> **Scope is strictly inbound and first-party.** We only read and reply to comments on
> media owned by the connected Business account. The app never reads, comments on, or
> acts on any third-party media or any account we do not own. Toxic, spam, or
> self-authored comments are skipped (never engaged). All processing is server-side via
> the official Graph API — we use no browser automation.

## 2. Justificativa / detalhes (campo "Tell us how your app uses this permission")

> **What the permission unlocks:** Without Advanced Access we can only reply to comments
> from accounts that are testers/admins of the app. To manage our real audience's
> comments on our own posts, we need Advanced Access to
> `instagram_business_manage_comments`.
>
> **End-to-end flow (server-side, Graph API only):**
> 1. A follower comments on one of OUR posts.
> 2. Instagram sends the `comments` field webhook to our endpoint
>    `https://www.drlibertad.com/api/webhooks/instagram`.
> 3. We validate `X-Hub-Signature-256` (HMAC-SHA256 with the app secret); invalid → 401.
> 4. We route the event to the correct connected account by `entry.id`.
> 5. We skip comments that are our own, replies we authored, empty, or toxic/spam
>    (anti-loop + safety guards).
> 6. We generate one short reply in the brand voice and publish it with
>    `POST /{comment-id}/replies`.
>
> **Data handling:** We process the comment text and commenter id only to produce and
> attribute the reply, and to deduplicate so we never reply twice. We do not sell or
> share this data. Users can request deletion per our privacy policy
> (`https://www.drlibertad.com/pt/privacidade`), within 30 days.
>
> **Why automated:** the account posts on a fixed daily cadence in two languages;
> replying promptly to every comment by hand is not feasible, and timely replies are
> exactly what sustains the community.

## 3. Roteiro do screencast (grave a tela mostrando isto, em ordem)

O reviewer precisa **ver a permissão em ação**. Grave com **duas contas de teste**
(ambas adicionadas como **Instagram Testers** do app): a **conta-marca** conectada (A) e
uma **segunda conta** (B) que comenta. Narre em inglês (ou legende).

1. **Contexto (5s):** mostre o painel do app na seção **Roles → Instagram Testers** com
   a conta-marca (A) e a conta B listadas como testers. Diga: *"This is our own Business
   account managed by the app; we only act on its own media."*
2. **Webhook inscrito (5s):** mostre **Webhooks → Instagram** com o campo `comments`
   inscrito e a Callback URL `https://www.drlibertad.com/api/webhooks/instagram`.
3. **O post é nosso (5s):** abra um post da conta-marca (A) no Instagram.
4. **Follower comenta (10s):** da conta B, comente algo neutro no post da conta A
   (ex.: *"This really spoke to me"*). Mostre o comentário publicado.
5. **App responde sozinho (15s):** volte ao post; mostre a **resposta automática
   aparecendo aninhada** sob o comentário da conta B, na voz da marca. Esta é a prova de
   `instagram_business_manage_comments`.
6. **Só mídia própria (5s):** narre: *"The app only reads and replies to comments on
   media owned by the connected account. It never acts on third-party media. Toxic or
   spam comments are skipped."*

> **Dica:** se a resposta automática demora, mostre também o log/registro
> (`engagement_events`) confirmando que o webhook entrou e a resposta foi publicada —
> reforça que é via API oficial, server-side. Mantenha o vídeo curto (≤60–90s) e mostre
> claramente o nome da permissão narrado.

> **Se for submeter `messages` no mesmo screencast** (funil comment→DM): após o passo 5,
> mostre a conta B comentando a palavra-chave (`LIBERTAD`/`LIBERDADE`) e o **DM chegando
> no Direct** com o guia. Isso cobre `instagram_business_manage_messages` — submeta os
> dois juntos pra reusar o vídeo. Este doc cobre o escopo de **comentários**; o roteiro
> do DM está em `docs/ENGAJAMENTO.md`.

## 4. Checklist antes de apertar "Enviar"

**Pré-requisitos da conta/app**
- [ ] Verificação de Negócio **aprovada** ("conta verificada"). ✅ (25/06)
- [ ] App é **Tech Provider** (irreversível, já feito 25/06).
- [ ] **Verificação de acesso** concluída (menu Analisar → Verificação).
- [ ] App **publicado** (Go Live) — exige Privacidade + Exclusão de dados + Categoria.

**Webhook / técnico (já validado pra testers)**
- [ ] Campo `comments` inscrito no painel **e** `subscribed_apps` da conta com `comments`
      (não só `messages`).
- [ ] Callback URL responde ao GET de verificação (devolve `hub.challenge`).
- [ ] `META_APP_SECRET` = secret do app **Instagram** (não o do Facebook) → assinatura 200.
- [ ] Resposta automática confirmada chegando em post real de tester (PR #93).

**Formulário**
- [ ] Texto do caso de uso colado (seção 1).
- [ ] Justificativa/detalhes colados (seção 2).
- [ ] **Advanced Access** selecionado (não Standard).
- [ ] Privacy Policy URL preenchida e pública.
- [ ] Data Deletion preenchido (URL ou instruções).
- [ ] Screencast subido (≤60–90s, mostra a permissão narrada — seção 3).
- [ ] Plataforma/test instructions descrevem como o reviewer reproduz com contas tester.
- [ ] Revisar que NADA no texto sugere agir em mídia de terceiros (motivo nº 1 de rejeição).

**Pós-envio**
- [ ] Anotar data de envio + prazo no painel central de pendências.
- [ ] Se rejeitar: ler o motivo, ajustar texto/screencast, reenviar.

---

### Causas comuns de rejeição (evitar)

1. **Screencast não mostra a permissão real** — tem que ver o comentário entrando e a
   resposta publicada, não só o painel.
2. **Texto sugere outbound / terceiros** — deixar explícito "own media only, inbound only".
3. **Privacy/Data Deletion ausente ou quebrada** — testar as URLs antes.
4. **App não publicado** — em Dev, o reviewer não consegue reproduzir.
