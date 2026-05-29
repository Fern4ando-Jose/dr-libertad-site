# Automação de Publicação — Dr. Libertad

Sistema que roda diariamente no Vercel, pesquisa um tema, gera conteúdo com Claude e publica no site e no Instagram.

---

## Estrutura dos arquivos

```
route.ts              → API Route principal (/app/api/publish/route.ts)
vercel.json           → Cron Job (disparo às 9h UTC diariamente)
schema.sql            → Tabela de posts no Vercel Postgres
topics-queue.ts       → (opcional) fila de temas no banco
.env.local.example    → variáveis de ambiente necessárias
```

---

## Passo a passo de instalação

### 1. Copiar os arquivos

```
route.ts        → src/app/api/publish/route.ts
vercel.json     → raiz do projeto (junto ao package.json)
topics-queue.ts → src/lib/topics-queue.ts   (se quiser usar a fila)
```

### 2. Criar o banco no Vercel

- Acesse: vercel.com → seu projeto → Storage → Create Database → Postgres
- As variáveis `POSTGRES_URL` e `POSTGRES_URL_NON_POOLING` são geradas automaticamente
- Execute o `schema.sql` no query editor do painel

### 3. Instalar dependências

```bash
npm install @vercel/postgres
```

### 4. Configurar variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha cada valor.
No Vercel: Settings → Environment Variables → adicione as mesmas chaves.

### 5. Configurar o Instagram

1. Crie um app em developers.facebook.com
2. Adicione o produto "Instagram Graph API"
3. Conecte sua conta Business do Instagram
4. Gere um token de longa duração (válido por 60 dias — precisa renovar)
5. Anote o `META_INSTAGRAM_ACCOUNT_ID` (ID numérico da conta)

### 6. Gerar o CRON_SECRET

```bash
openssl rand -hex 32
```

Cole o resultado como valor de `CRON_SECRET` nas variáveis de ambiente.

### 7. Deploy

```bash
git add .
git commit -m "feat: automação de publicação diária"
git push
```

O Vercel detecta o `vercel.json` e ativa o Cron automaticamente.

---

## Testando manualmente

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  "https://seusite.vercel.app/api/publish?topic=dopamina+e+redes+sociais"
```

---

## Trocando o tema do dia

**Opção simples:** altere `DAILY_TOPIC` nas variáveis de ambiente da Vercel.

**Opção avançada (fila):** use `topics-queue.ts` e substitua a linha do tema na `route.ts`:
```ts
// Antes:
const topic = req.nextUrl.searchParams.get("topic") ?? process.env.DAILY_TOPIC ?? "...";

// Depois:
import { getNextTopic } from "@/lib/topics-queue";
const topic = req.nextUrl.searchParams.get("topic") ?? await getNextTopic();
```

---

## Adicionando o X (Twitter) futuramente

1. Crie conta de desenvolvedor em developer.twitter.com (plano Basic ~$100/mês)
2. Instale: `npm install twitter-api-v2`
3. Adicione na `route.ts`, após o bloco do Instagram:

```ts
import { TwitterApi } from "twitter-api-v2";

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
});

await twitterClient.v2.tweet(content.instagramCaption.slice(0, 280));
```

---

## Exibindo posts no site

Exemplo de como buscar os posts publicados:

```ts
// src/app/blog/page.tsx
import { sql } from "@vercel/postgres";

export default async function BlogPage() {
  const { rows } = await sql`
    SELECT id, title, topic, tags, published_at
    FROM posts
    ORDER BY published_at DESC
    LIMIT 20
  `;
  return (
    <ul>
      {rows.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```
