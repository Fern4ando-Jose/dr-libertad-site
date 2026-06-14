# Guia de Operação — Dr. Libertad

Sistema de automação de posts no Instagram usando Claude + Tavily + Instagram Business API.

---

## Como funciona (resumo)

1. Cron job dispara 3x/dia no Vercel (9h, 13h, 20h BRT)
2. A API pesquisa o tema no Tavily (5 fontes)
3. Claude Haiku gera legenda + post em markdown com ângulo específico do slot
4. O post é publicado no Instagram via API
5. O conteúdo é salvo no banco Neon para exibição no site

---

## Testar manualmente

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  "https://www.drlibertad.com/api/publish?slot=manha&topic=ansiedade+digital"
```

**Slots disponíveis:** `manha`, `tarde`, `noite`  
**`?topic=`** é opcional — se omitido usa `DAILY_TOPIC` ou o tema padrão do código.

**Resposta esperada:**
```json
{
  "ok": true,
  "topic": "ansiedade digital",
  "posts": [
    {
      "slot": "manha",
      "title": "Título do post",
      "instagramPostId": "18082397880445842",
      "ok": true
    }
  ]
}
```

---

## Verificar se o token Instagram está válido

```
GET https://graph.instagram.com/v25.0/me?fields=id,username&access_token={TOKEN}
```

Deve retornar: `{ "id": "27549362607981575", "username": "dr.liberdad" }`

Ou use o endpoint de diagnóstico do próprio site:
```
GET https://www.drlibertad.com/api/instagram
```
*(requer o header `Authorization: Bearer {CRON_SECRET}`)*

---

## Renovar o token Instagram (a cada 60 dias)

1. Acesse o painel Meta Developer:
   https://developers.facebook.com/apps/2214160215805028/use_cases/customize/API-Setup/?use_case_enum=INSTAGRAM_BUSINESS&selected_tab=API-Setup&product_route=instagram-business&business_id=659071410613239

2. Na seção **"2. Gerar tokens de acesso"** → clique **"Gerar token"** ao lado de `dr.liberdad`

3. Copie o novo token

4. No Vercel → Settings → Environment Variables → edite `META_ACCESS_TOKEN`

5. Vá em Deployments → ⋯ → **Redeploy**

---

## Trocar a imagem dos posts

**Opção simples — uma imagem fixa:**
- No Vercel → Environment Variables → edite `META_DEFAULT_IMAGE_URL`
- Cole a URL pública da sua imagem JPEG (mínimo 1080x1080px)
- Faça redeploy

**Opção avançada — pool de imagens (sorteia uma aleatoriamente):**
- No Vercel → adicione a variável `META_IMAGE_URLS`
- Cole as URLs separadas por vírgula: `https://url1.jpg,https://url2.jpg`

**Requisitos da imagem:**
- JPEG ou PNG
- 1080x1080px (quadrado) ou 1080x1350px (vertical 4:5)
- URL pública direta sem redirect
- ⚠️ URLs do próprio site Vercel/Next.js **não funcionam** — use GitHub raw, Cloudinary, imgbb

---

## Trocar o tema do dia

**Opção 1 — Variável fixa:**
- Vercel → Environment Variables → `DAILY_TOPIC` = seu tema

**Opção 2 — Chamada manual com tema:**
```bash
curl -H "Authorization: Bearer {CRON_SECRET}" \
  "https://www.drlibertad.com/api/publish?slot=manha&topic=seu+tema+aqui"
```

**Opção 3 — Fila de temas no banco (avançado):**
Arquivo `files/topics-queue.ts` tem o código para cadastrar temas antecipados.

---

## Migração do banco (se necessário)

Se aparecer erro `column "topic" does not exist`:
```bash
curl -H "Authorization: Bearer {CRON_SECRET}" \
  "https://www.drlibertad.com/api/migrate"
```

---

## Adicionar X (Twitter) no futuro

1. Conta de desenvolvedor em developer.twitter.com (plano Basic ~$100/mês)
2. `npm install twitter-api-v2`
3. Adicionar em `publish/route.ts` após o bloco do Instagram:

```typescript
import { TwitterApi } from "twitter-api-v2";
const tw = new TwitterApi({ appKey, appSecret, accessToken, accessSecret });
await tw.v2.tweet(content.instagramCaption.slice(0, 280));
```

---

## Exibir posts no site (Fase 2)

```typescript
// src/app/blog/page.tsx
import { sql } from "@vercel/postgres";

export default async function BlogPage() {
  const { rows } = await sql`
    SELECT id, title, topic, slot, tags, published_at, body
    FROM posts
    ORDER BY published_at DESC
    LIMIT 20
  `;
  return (
    <ul>
      {rows.map((post) => (
        <li key={post.id}>
          [{post.slot}] {post.title} — {post.topic}
        </li>
      ))}
    </ul>
  );
}
```
