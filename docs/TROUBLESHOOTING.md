# Troubleshooting — Dr. Libertad

Registro de problemas encontrados e como foram resolvidos.

---

## 🔑 Token do Instagram — Renovação manual (a cada 60 dias)

**Sintoma:** Erro `API access blocked (code 200)` ou `190 - Cannot parse access token`.

**Causa:** O token Meta expirou.

**Como renovar:**
1. Acesse: https://developers.facebook.com/apps/2214160215805028/use_cases/customize/API-Setup/?use_case_enum=INSTAGRAM_BUSINESS&selected_tab=API-Setup&product_route=instagram-business&business_id=659071410613239
2. Na seção **"2. Gerar tokens de acesso"**, clique em **"Gerar token"** ao lado de `dr.liberdad`
3. Copie o novo token
4. No Vercel → Settings → Environment Variables → edite `META_ACCESS_TOKEN`
5. Faça um **Redeploy** no Vercel
6. Rode o migrate para gravar o token no banco:
```powershell
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/migrate" -Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" } -UseBasicParsing | Select-Object -ExpandProperty Content
```

> **A partir de agora:** o cron `/api/refresh-token` roda todo dia 1 do mês e renova automaticamente. A renovação manual só é necessária se o token já tiver expirado antes do cron rodar.

---

## 🔄 Auto-renovação do token (NOVO)

O sistema renova o token automaticamente todo dia 1 do mês via cron.

**Para forçar renovação manual:**
```powershell
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/refresh-token" -Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" } -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Requer no Vercel:**
- `META_APP_ID` = `2214160215805028`
- `META_APP_SECRET` = (ver PROJETO.md)

---

## 🗄️ Banco de dados — Migrate

**Quando rodar o migrate:**
- Após renovar o token manualmente (grava o novo token no banco)
- Se aparecer erro de coluna inexistente

```powershell
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/migrate" -Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" } -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Tabelas:**

`posts` — um registro por post publicado:
```
id, topic, slot, title, body, instagram_caption,
tags (text[]), instagram_post_id, published_at, created_at
```

`config` — configurações dinâmicas:
```
key (PK) | value         | updated_at
─────────────────────────────────────
meta_access_token | {token} | {data}
```

---

## 📸 Imagem dos posts (template editorial)

**Sistema atual:** imagem gerada dinamicamente via `/api/og`
- Formato: **1080 × 1350 px** (4:5 — feed Instagram mobile)
- URL: `https://www.drlibertad.com/api/og?slot={slot}&title={titulo}`
- Pré-visualizar: acesse a URL acima no browser

**Erro: Instagram rejeita a imagem (`9004 / 2207052`)**
- Causa: URL de preview do Vercel (`*.vercel.app`) em vez de produção
- Solução: garantir que `PRODUCTION_URL=https://www.drlibertad.com` está no Vercel

**URLs que NÃO funcionam com Instagram:** qualquer URL `*.vercel.app` ou com redirect. Sempre usar o domínio de produção.

---

## 🔒 CRON_SECRET

Valor: `bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1`

Usar em todos os endpoints protegidos:
```powershell
-Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" }
```

Para gerar um novo se necessário:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🧪 Testar publicação manual

```powershell
# Slot manhã
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/publish?slot=manha" -Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" } -UseBasicParsing | Select-Object -ExpandProperty Content

# Slot tarde
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/publish?slot=tarde" -Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" } -UseBasicParsing | Select-Object -ExpandProperty Content

# Slot noite
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/publish?slot=noite" -Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" } -UseBasicParsing | Select-Object -ExpandProperty Content

# Com tema específico
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/publish?slot=manha&topic=libertad+mental" -Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" } -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

## 🐛 Erros comuns da API Instagram

| Código | Mensagem | Causa | Solução |
|--------|----------|-------|---------|
| `200` | API access blocked | Token expirado | Renovar token + rodar migrate |
| `190` | Cannot parse access token | Token corrompido | Re-salvar token no Vercel + migrate |
| `9004 / 2207052` | Media download has failed | URL de preview do Vercel | Verificar variável `PRODUCTION_URL` no Vercel |
| `9007 / 2207027` | Cannot Publish | Permissão ausente | Verificar `instagram_business_content_publish` no app Meta |

---

## ⏱️ Alterar frequência dos posts

**Produção (3x/dia):**
```json
{ "path": "/api/publish?slot=manha", "schedule": "0 12 * * *" },
{ "path": "/api/publish?slot=tarde", "schedule": "0 16 * * *" },
{ "path": "/api/publish?slot=noite", "schedule": "0 23 * * *" }
```

**Teste (a cada 2h):**
```json
{ "path": "/api/publish?slot=manha", "schedule": "0 12 * * *" },
{ "path": "/api/publish?slot=tarde", "schedule": "0 14 * * *" },
{ "path": "/api/publish?slot=noite", "schedule": "0 16 * * *" }
```

Editar em `vercel.json` e fazer push.

---

## 🔧 Git index.lock (erro no Windows)

**Sintoma:** `fatal: Unable to create '.git/index.lock': File exists`

**Causa:** VS Code ou Cursor com o repositório aberto travou o índice.

**Solução:**
```powershell
del .git\index.lock
del .git\HEAD.lock
```
