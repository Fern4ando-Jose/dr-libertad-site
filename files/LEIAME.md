# Automação de Publicação — Dr. Libertad

Sistema que roda diariamente no Vercel: recebe um tema, pesquisa, gera 3 publicações com Claude e posta no Instagram automaticamente.

---

## Como funciona

1. Você define o **tema do dia** (via variável de ambiente ou parâmetro na URL)
2. O cron dispara às **9h UTC** (6h Brasília)
3. A API pesquisa o tema (Tavily), gera **3 posts distintos** com Claude e publica os 3 no Instagram em sequência
4. Cada post é salvo no banco (Vercel Postgres) para exibição no site

---

## Estrutura dos arquivos

```
src/app/api/publish/route.ts   → API principal (gera e publica os 3 posts)
vercel.json                    → Cron Job (disparo às 9h UTC diariamente)
src/lib/topics-queue.ts        → Fila de temas no banco (opcional)
files/schema.sql               → Tabela de posts no Vercel Postgres
files/.env.local.example       → Variáveis de ambiente necessárias
```

---

## Status da instalação

- [x] 1. Arquivos copiados para o projeto
- [x] 2. Banco criado no Vercel (Postgres)
- [x] 3. Dependências instaladas (`@vercel/postgres`)
- [x] 4. Variáveis de ambiente configuradas (exceto Instagram)
- [ ] **5. Configurar o Instagram ← ESTAMOS AQUI**
- [ ] 6. Gerar o `CRON_SECRET`
- [ ] 7. Deploy final

---

## Passo 5 — Configurar o Instagram (Facebook Developers)

### 5.1 — Criar o app no Facebook Developers

1. Acesse [developers.facebook.com](https://developers.facebook.com) e faça login
2. Clique em **"Meus Apps"** → **"Criar app"**
3. Escolha o tipo **"Business"** (ou "Outro" → "Business")
4. Preencha o nome do app (ex: `dr-libertad-publisher`) e seu e-mail
5. Clique em **"Criar app"**

### 5.2 — Adicionar o produto Instagram Graph API

1. No painel do app, vá em **"Adicionar produto"**
2. Encontre **"Instagram Graph API"** e clique em **"Configurar"**
3. Na barra lateral aparecerá o menu **Instagram**

### 5.3 — Conectar sua conta Business do Instagram

> Pré-requisito: sua conta Instagram precisa ser **Profissional (Business ou Creator)** e estar vinculada a uma **Página do Facebook**.

1. No menu **Instagram → Configurações básicas**
2. Em "Usuários do Instagram", clique em **"Adicionar usuário do Instagram"**
3. Faça login com a conta Instagram da marca
4. Autorize as permissões: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`

### 5.4 — Gerar o token de acesso

1. Vá em **Instagram → Gerador de token** (ou use o **Graph API Explorer**)
2. Selecione sua página do Facebook vinculada
3. Marque as permissões: `instagram_basic`, `instagram_content_publish`
4. Clique em **"Gerar token"** — isso dá um **token de curta duração (1 hora)**
5. Converta para **token de longa duração (60 dias)**:

```bash
curl -i -X GET "https://graph.facebook.com/v19.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={TOKEN_CURTO}"
```

6. Guarde o token longo — este é o `META_ACCESS_TOKEN`

> ⚠️ O token expira em 60 dias. Lembre de renovar ou configurar renovação automática.

### 5.5 — Obter o Instagram Account ID

```bash
curl "https://graph.facebook.com/v19.0/me/accounts
  ?access_token={SEU_TOKEN_LONGO}"
```

Pegue o `id` da página, depois:

```bash
curl "https://graph.facebook.com/v19.0/{PAGE_ID}?fields=instagram_business_account&access_token={TOKEN}"
```

O `id` dentro de `instagram_business_account` é o seu `META_INSTAGRAM_ACCOUNT_ID`.

### 5.6 — Adicionar ao .env.local

```env
META_ACCESS_TOKEN=seu_token_aqui
META_INSTAGRAM_ACCOUNT_ID=123456789
META_DEFAULT_IMAGE_URL=https://seusite.com/imagem-padrao.jpg
```

---

## Passo 6 — Gerar o CRON_SECRET

```bash
openssl rand -hex 32
```

Cole o resultado como `CRON_SECRET` no `.env.local` e nas variáveis de ambiente do Vercel.

---

## Passo 7 — Deploy

```bash
git add .
git commit -m "feat: automação de 3 publicações diárias"
git push
```

O Vercel detecta o `vercel.json` e ativa o Cron automaticamente.

---

## Como definir o tema do dia

**Opção 1 — Variável de ambiente (mais simples):**
No Vercel → Settings → Environment Variables, edite `DAILY_TOPIC` com o tema desejado.

**Opção 2 — Fila de temas (avançado):**
Use `topics-queue.ts` para cadastrar temas com antecedência no banco. A route pega o próximo automaticamente.

**Opção 3 — Chamada manual com tema:**
```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  "https://seusite.vercel.app/api/publish?topic=dopamina+e+redes+sociais"
```

---

## Testando manualmente

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  "https://seusite.vercel.app/api/publish?topic=ansiedade+digital"
```

Resposta esperada:
```json
{
  "ok": true,
  "posts": [
    { "slot": "manha", "instagramPostId": "...", "title": "..." },
    { "slot": "tarde", "instagramPostId": "...", "title": "..." },
    { "slot": "noite", "instagramPostId": "...", "title": "..." }
  ]
}
```

---

## Adicionando o X (Twitter) futuramente

1. Crie conta de desenvolvedor em [developer.twitter.com](https://developer.twitter.com) (plano Basic ~$100/mês)
2. Instale: `npm install twitter-api-v2`
3. Adicione na `route.ts` após o bloco do Instagram:

```ts
import { TwitterApi } from "twitter-api-v2";
const twitterClient = new TwitterApi({ appKey, appSecret, accessToken, accessSecret });
await twitterClient.v2.tweet(post.instagramCaption.slice(0, 280));
```

---

## Exibindo posts no site

```ts
// src/app/blog/page.tsx
import { sql } from "@vercel/postgres";

export default async function BlogPage() {
  const { rows } = await sql`
    SELECT id, title, topic, slot, tags, published_at
    FROM posts
    ORDER BY published_at DESC
    LIMIT 20
  `;
  return (
    <ul>
      {rows.map((post) => (
        <li key={post.id}>[{post.slot}] {post.title}</li>
      ))}
    </ul>
  );
}
```
