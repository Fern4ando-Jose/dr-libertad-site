# Troubleshooting — Dr. Libertad

Registro de problemas encontrados e como foram resolvidos.

---

## 🔑 Token do Instagram — Renovação manual

**Sintoma:** Erro `API access blocked (code 200)` ou `190 - Cannot parse access token`.

**Causa:** Token Meta expirou (validade ~60 dias).

**Como renovar:**
1. Acesse: https://developers.facebook.com/apps/2214160215805028/use_cases/customize/API-Setup/?use_case_enum=INSTAGRAM_BUSINESS&selected_tab=API-Setup&product_route=instagram-business&business_id=659071410613239
2. Clique em **"Gerar token"** ao lado de `dr.liberdad`
3. Copie o novo token
4. No Vercel → Settings → Environment Variables → edite `META_ACCESS_TOKEN`
5. Faça um **Redeploy** no Vercel
6. Rode o migrate para gravar o token no banco:
```powershell
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/migrate" -Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" } -UseBasicParsing | Select-Object -ExpandProperty Content
```

> **A partir de agora:** o cron `/api/refresh-token` roda todo dia 1 do mês e renova automaticamente. Renovação manual só necessária se o token já tiver expirado.

---

## 🔄 Auto-renovação do token

Cron mensal automático — dia 1 de cada mês às 10h UTC.

**Para forçar renovação manual:**
```powershell
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/refresh-token" -Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" } -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Requer no Vercel:**
- `META_APP_ID` = `2214160215805028`
- `META_APP_SECRET` = (ver PROJETO.md)

---

## 🧪 Publicar post manualmente

```powershell
# Manhã
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/publish?slot=manha" -Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" } -UseBasicParsing | Select-Object -ExpandProperty Content

# Tarde
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/publish?slot=tarde" -Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" } -UseBasicParsing | Select-Object -ExpandProperty Content

# Noite
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/publish?slot=noite" -Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" } -UseBasicParsing | Select-Object -ExpandProperty Content

# Com tema específico
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/publish?slot=manha&topic=libertad+mental" -Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" } -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

## 🗄️ Banco de dados — Migrate

**Quando rodar:** após renovar token manualmente, ou se aparecer erro de coluna inexistente.

```powershell
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/migrate" -Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" } -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Tabelas:**

`posts` — um registro por post publicado:
```
id, topic, slot, title, content, body, instagram_caption,
tags (text[]), instagram_post_id, published_at, created_at
```

`config` — configurações dinâmicas:
```
key (PK)           | value   | updated_at
meta_access_token  | {token} | {data}
```

---

## 📸 Slides do carrossel (/api/og)

Três tipos de slide, visualizáveis no browser:

**Capa (slide 1):**
```
https://www.drlibertad.com/api/og?slide=cover&slot=tarde&title=Tu+atención+es+el+recurso+más+valioso
```

**Insight (slides 2-3):**
```
https://www.drlibertad.com/api/og?slide=insight&slot=tarde&text=Cada+notificación+roba+23+minutos&num=2&total=4
```

**CTA invertido (slide final):**
```
https://www.drlibertad.com/api/og?slide=cta&slot=tarde&text=¿Cuántas+horas+al+día+le+regalas+a+una+pantalla?
```

**Erro: Instagram rejeita imagem (9004/2207052)**
- Causa: URL de preview do Vercel (`*.vercel.app`) em vez de produção
- Solução: verificar variável `PRODUCTION_URL=https://www.drlibertad.com` no Vercel

---

## ⏱️ Timeout da função (10s → 60s)

O carrossel leva ~25s para executar. O publish route tem `export const maxDuration = 60` para suportar isso no plano Hobby.

**Se a função travar:** verificar se `maxDuration = 60` está no topo de `src/app/api/publish/route.ts`.

---

## ⏰ Frequência dos posts

**Produção (3x/dia — padrão):**
```json
{ "path": "/api/publish?slot=manha", "schedule": "0 12 * * *" },
{ "path": "/api/publish?slot=tarde", "schedule": "0 16 * * *" },
{ "path": "/api/publish?slot=noite", "schedule": "0 23 * * *" }
```
Horários BRT: 09h / 13h / 20h

**Teste (a cada 2h):**
```json
{ "path": "/api/publish?slot=manha", "schedule": "0 12 * * *" },
{ "path": "/api/publish?slot=tarde", "schedule": "0 14 * * *" },
{ "path": "/api/publish?slot=noite", "schedule": "0 16 * * *" }
```

Editar `vercel.json` e fazer push.

---

## 🐛 Erros comuns da API Instagram

| Código | Mensagem | Causa | Solução |
|--------|----------|-------|---------|
| `200` | API access blocked | Token expirado | Renovar token + rodar migrate |
| `190` | Cannot parse access token | Token corrompido | Re-salvar no Vercel + migrate |
| `9004/2207052` | Media download failed | URL de preview do Vercel | Verificar `PRODUCTION_URL` no Vercel |
| `9007/2207027` | Cannot Publish | Permissão ausente | Verificar `instagram_business_content_publish` no app Meta |

---

## 🔒 CRON_SECRET

Valor: `bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1`

Para gerar um novo:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔧 Git index.lock (erro no Windows)

**Sintoma:** `fatal: Unable to create '.git/index.lock': File exists`

**Causa:** VS Code ou Cursor com o repositório aberto.

**Solução:**
```powershell
del .git\index.lock
del .git\HEAD.lock
```
