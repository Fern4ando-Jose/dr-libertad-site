# Troubleshooting — Dr. Libertad

Registro de problemas encontrados e como foram resolvidos.

---

## 🔑 Token do Instagram (renovar a cada 60 dias)

**Sintoma:** Erro `190 - Cannot parse access token` ou `Failed to decrypt` ao tentar publicar.

**Causa:** O token Meta expira em 60 dias.

**Como renovar:**
1. Acesse: https://developers.facebook.com/apps/2214160215805028/use_cases/customize/API-Setup/?use_case_enum=INSTAGRAM_BUSINESS&selected_tab=API-Setup&product_route=instagram-business&business_id=659071410613239
2. Na seção **"2. Gerar tokens de acesso"**, clique em **"Gerar token"** ao lado de `dr.liberdad`
3. Copie o novo token
4. No Vercel → Settings → Environment Variables → edite `META_ACCESS_TOKEN` e cole o novo token
5. Faça um **Redeploy** no Vercel (Deployments → ⋯ → Redeploy)

---

## 📸 Imagem dos posts do Instagram

**Situação atual:** Usa a imagem `Public/images/post-1.jpg` do repositório, servida via GitHub raw URL:
```
https://raw.githubusercontent.com/Fern4ando-Jose/dr-libertad-site/main/Public/images/post-1.jpg
```

**Para usar imagens personalizadas:**
- Adicione a variável `META_IMAGE_URLS` no Vercel com URLs separadas por vírgula
- O sistema escolhe uma aleatoriamente a cada post
- Exemplo: `https://url1.jpg,https://url2.jpg,https://url3.jpg`

**Requisitos das imagens para o Instagram:**
- Formato JPEG ou PNG
- Resolução mínima: 320x320px — recomendado: 1080x1080px (quadrado) ou 1080x1350px (4:5)
- URL pública e direta (sem redirects, sem autenticação)
- O servidor deve retornar `Content-Type: image/jpeg`

**URLs que NÃO funcionam:** URLs do próprio site Vercel/Next.js (são bloqueadas pelo crawler do Instagram). Use GitHub raw, Cloudinary, imgbb, ou outro CDN público.

---

## 🗄️ Banco de dados — Schema

**Tabela:** `posts`

```sql
CREATE TABLE IF NOT EXISTS posts (
  id               SERIAL PRIMARY KEY,
  topic            TEXT NOT NULL,
  slot             TEXT NOT NULL DEFAULT 'manha',
  title            TEXT NOT NULL,
  body             TEXT NOT NULL,
  instagram_caption TEXT NOT NULL,
  tags             JSONB NOT NULL DEFAULT '[]',
  instagram_post_id TEXT,
  published_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Se o banco perder as colunas `topic` ou `slot`** (erro: `column "topic" does not exist`):
```
GET https://www.drlibertad.com/api/migrate
Header: Authorization: Bearer {CRON_SECRET}
```

---

## 🔒 CRON_SECRET

Valor atual: `bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1`

Está salvo no Vercel como variável de ambiente. Para gerar um novo se necessário:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🐛 Erros comuns da API Instagram

| Código | Mensagem | Causa | Solução |
|--------|----------|-------|---------|
| `190` | Cannot parse access token | Token expirado ou corrompido | Renovar token (ver acima) |
| `190` | Failed to decrypt | Token salvo incorretamente | Re-salvar o token no Vercel manualmente (não via JS) |
| `9004 / 2207052` | Media download has failed | URL da imagem inacessível pelo Instagram | Usar URL pública direta (GitHub raw, Cloudinary) |
| `9007 / 2207027` | Cannot Publish / Media ID not available | Permissão ausente ou container não processado | Verificar permissão `instagram_business_content_publish` no app; aguardar 3s antes de publicar |
| `9004` | Only photo or video accepted | Unsplash com redirects | Usar URL direta de imagem JPEG sem redirect |

---

## ⚙️ API Instagram Business — Referência rápida

**Endpoint base:** `https://graph.instagram.com/v25.0/{account_id}`

**Account ID atual:** `27549362607981575`

**Criar container de mídia:**
```
POST /media
{ image_url, caption, media_type: "IMAGE", access_token }
```

**Publicar:**
```
POST /media_publish
{ creation_id, access_token }
```

**Verificar token:**
```
GET https://graph.instagram.com/v25.0/me?fields=id,username&access_token={TOKEN}
```

---

## 🔧 Git index.lock (erro no Windows)

**Sintoma:** `fatal: Unable to create '.git/index.lock': File exists`

**Causa:** VS Code, Cursor ou outro editor tem o repositório aberto e travou o índice.

**Solução:**
```powershell
del .git\index.lock
```
Se o arquivo não existir no Windows mas o erro persistir, feche o editor e tente novamente.

---

## 📁 Estrutura de arquivos importantes

```
src/app/api/
  publish/route.ts    → API principal (gerar + publicar + salvar)
  migrate/route.ts    → Migração do banco (uso único)
  instagram/route.ts  → Diagnóstico do token Instagram

Public/images/
  post-1.jpg          → Imagem padrão dos posts (atenção: P maiúsculo!)

files/
  schema.sql          → Schema do banco
  topics-queue.ts     → Sistema de fila de temas (opcional)

vercel.json           → Configuração dos cron jobs
```
