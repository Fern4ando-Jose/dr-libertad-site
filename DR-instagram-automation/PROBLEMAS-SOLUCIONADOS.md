# Problemas Solucionados — Dr. Libertad

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

**Situação atual:** Sistema de carrossel com imagens geradas pelo `/api/og` (Satori + P052-Bold).

**URLs que NÃO funcionam:** URLs do próprio site Vercel/Next.js são bloqueadas pelo crawler do Instagram. Use GitHub raw, Cloudinary, imgbb, ou outro CDN público para imagens estáticas.

**Para usar imagens personalizadas estáticas:**
- Adicione a variável `META_IMAGE_URLS` no Vercel com URLs separadas por vírgula

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

Valor: guardado no cofre (Vercel/GitHub Secrets) — **NUNCA** colar o valor real aqui (repo público). Use o placeholder `<CRON_SECRET>` nos exemplos.

**Chamada manual correta (PowerShell):**
```powershell
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/publish?slot=manha&topic=seu+tema" -Headers @{ Authorization = "Bearer <CRON_SECRET>" }
```

**Chamada manual correta (cmd.exe):**
```cmd
curl -H "Authorization: Bearer <CRON_SECRET>" "https://www.drlibertad.com/api/publish?slot=manha&topic=seu+tema"
```

---

## 🐛 Erros comuns da API Instagram

| Código | Mensagem | Causa | Solução |
|--------|----------|-------|---------|
| `190` | Cannot parse access token | Token expirado ou corrompido | Renovar token (ver acima) |
| `190` | Failed to decrypt | Token salvo incorretamente | Re-salvar o token no Vercel manualmente (não via JS) |
| `9004 / 2207052` | Media download has failed | URL da imagem inacessível pelo Instagram | Usar URL pública direta (GitHub raw, Cloudinary) |
| `9007 / 2207027` | Cannot Publish / Media ID not available | Permissão ausente ou container não processado | Verificar permissão `instagram_business_content_publish` no app; aguardar 3s antes de publicar |
| `Carousel child error: Only photo or video` | `/api/og` retornando erro em vez de imagem | Bug no código (ex: `Array.from` incompatível com Satori) | Verificar log do Vercel; usar arrays literais em vez de `Array.from` no edge runtime |

---

## ⚙️ Fonte das imagens — P052-Bold

A fonte usada nas imagens é **P052-Bold** (OTF), embedded em base64 no `og/route.tsx`.
Registrada sob o alias `"Fraunces"` para compatibilidade com Satori.
O `preview-carousel.html` usa Fraunces do Google Fonts apenas para visualização local.

---

## 🎨 Sistema de Arte — Carrossel

**Arquivo de geração:** `src/app/api/og/route.tsx`
**Arquivo de preview local:** `preview-carousel.html` (não afeta os posts reais)

**Mood alternado por edição:**
- Edições **ímpares** (17, 19, 21...) → mood **red** (régua e dot vermelhos)
- Edições **pares** (18, 20, 22...) → mood **ink** (régua e dot escuros)

**Problemas resolvidos em 2026-06-02:**
- Fundo preto removido do Frame (`INK` → `OFFWHITE`)
- Títulos maiores (função `titleSize` aumentada)
- Link `www.drlibertad.com` adicionado na caption bar
- CTA sem duplicidade — tag única `👇 COMENTA ABAJO` com ênfase visual
- Progress dots com posição evolutiva por slide (5 dots, ativo destacado)
- Slide 5 (CTA) agora recebe `total` correto via URL → mostra 5 dots
- Subtítulos limitados a 90 chars para não cortar
- Slides limitados a 80 chars no prompt de geração
- `Array.from` substituído por array literal `[1,2,3,4,5]` (Satori não suporta `Array.from`)
- Deduplicação: sistema verifica se tópico já foi publicado nas últimas 24h

---

## ⏰ Cron Jobs

> **Atualizado 2026-06-16:** o agendamento **NÃO roda mais no Vercel** — migrou para
> **GitHub Actions** (grátis, sem limite de cron). A tabela antiga de 3 slots no Vercel
> virou histórico abaixo. **Fonte da verdade da cadência = `../CLAUDE.md` / `PROJETO.md`.**

**Configuração VIGENTE — 6 posts/dia (4 Reels + 2 carrosséis), no GitHub Actions:**

| Run | Horário BRT / UTC | Formato | Workflow |
|---|---|---|---|
| 0 | 12h · 15 UTC | Reel vídeo | `instagram-reels.yml` |
| 1 | 17h · 20 UTC | Reel vídeo | `instagram-reels.yml` |
| 2 | 21h · 00 UTC | Reel vídeo | `instagram-reels.yml` |
| 3 | 19h · 22 UTC | Reel clássico | `instagram-reels-classic.yml` |
| 4 | 09h · 12 UTC | Carrossel | `instagram-posts.yml` |
| 5 | 14h · 17 UTC | Carrossel | `instagram-posts.yml` |

O `run` (tópico distinto) vem da **expressão cron que disparou** (`github.event.schedule`),
não de `hora/4`. `force=1` burla a trava anti-duplicata de 24h.

<details><summary>Histórico — config antiga no Vercel (3 carrosséis/dia, REVOGADA 2026-06-15)</summary>

| Slot | Horário UTC | Horário BRT |
|------|------------|-------------|
| Manhã | 12:00 | 09:00 |
| Tarde | 16:00 | 13:00 |
| Noite | 23:00 | 20:00 |

Plano Hobby do Vercel tinha "flexible time window of 1-hour" **e** limite de cron jobs
(empiricamente 4 deployam, 7 não) — foi o motivo de migrar para o GitHub Actions.
**Não recriar crons no `vercel.json`.**
</details>

---

## 🔧 Git index.lock (erro no Windows)

**Sintoma:** `fatal: Unable to create '.git/index.lock': File exists` ou git mostrando todos os arquivos como "deleted".

**Solução:**
```powershell
del D:\Claude\dr-libertad-site\.git\index.lock
git restore --staged .
git status
```

---

## 📁 Estrutura de arquivos importantes

```
src/app/api/
  publish/route.ts    → API principal (gerar + publicar + salvar)
  og/route.tsx        → Geração das imagens do carrossel (Satori + P052-Bold)
  migrate/route.ts    → Migração do banco (uso único)
  instagram/route.ts  → Diagnóstico do token Instagram
  refresh-token/      → Renovação automática do token (roda dia 1 de cada mês)

preview-carousel.html → Preview local do design (não afeta posts reais)
vercel.json           → Configuração dos cron jobs
```
