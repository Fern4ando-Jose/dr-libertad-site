# Projeto — Site Dr. Libertad

> **Objetivo:** Automatizar publicações diárias no Instagram para crescer seguidores, finalizar o site e lançar infoprodutos (livros).

---

## Metodologia de trabalho

- A cada nova tarefa com múltiplos passos: criamos o organograma primeiro
- Trabalhamos **um passo por vez** no chat
- Cada passo tem seus subpassos registrados aqui
- Resultados e erros são anotados antes de avançar
- Só partimos para o próximo passo após confirmação de conclusão sem erros

---

## Infraestrutura

| Item | Valor |
|------|-------|
| Repositório | GitHub (`Fern4ando-Jose/dr-libertad-site`) |
| Hospedagem | Vercel (plano Hobby) |
| Domínio | `www.drlibertad.com` |
| Banco de dados | Neon Postgres (conectado via Vercel Storage) |
| Geração de conteúdo | Claude API (`claude-haiku-4-5-20251001`) |
| Pesquisa de temas | Tavily API |
| Publicação social | Instagram Business API v25 (`graph.instagram.com`) |
| Arquivos do projeto | `D:\Claude\dr-libertad-site\` |

---

## Variáveis de ambiente (Vercel)

| Variável | Status | Descrição |
|----------|--------|-----------|
| `ANTHROPIC_API_KEY` | ✅ | Chave da API Claude |
| `TAVILY_API_KEY` | ✅ | Chave de pesquisa Tavily |
| `CRON_SECRET` | ✅ | `bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1` |
| `META_ACCESS_TOKEN` | ✅ ⚠️ Expira em ~60 dias | Token Instagram Business API |
| `META_INSTAGRAM_ACCOUNT_ID` | ✅ | `27549362607981575` (ID novo API) |
| `META_DEFAULT_IMAGE_URL` | ✅ | URL da imagem padrão dos posts |
| `POSTGRES_URL` | ✅ | Neon (automático via Vercel Storage) |
| `DAILY_TOPIC` | ⬜ Opcional | Tema fixo do dia (fallback se não enviado) |
| `META_IMAGE_URLS` | ⬜ Opcional | Lista de imagens separadas por vírgula |

**⚠️ IMPORTANTE:** O `META_ACCESS_TOKEN` expira em ~60 dias. Para renovar, ver `TROUBLESHOOTING.md`.

---

## Credenciais do App Meta

| Item | Valor |
|------|-------|
| App ID (Facebook) | `2214160215805028` |
| App Secret (Facebook) | `4630351ff29dc01aa57a67e54fe53554` |
| App ID (Instagram) | `26694771986884986` |
| Instagram Account ID (novo) | `27549362607981575` |
| Instagram Username | `dr.liberdad` |
| Painel Meta Developer | https://developers.facebook.com/apps/2214160215805028 |
| API Setup (tokens) | https://developers.facebook.com/apps/2214160215805028/use_cases/customize/API-Setup/?use_case_enum=INSTAGRAM_BUSINESS&selected_tab=API-Setup&product_route=instagram-business&business_id=659071410613239 |

---

## Cron Jobs

| Slot | Horário (UTC) | Horário (BRT) | URL |
|------|--------------|---------------|-----|
| Manhã | 12:00 | 09:00 | `/api/publish?slot=manha` |
| Tarde | 16:00 | 13:00 | `/api/publish?slot=tarde` |
| Noite | 23:00 | 20:00 | `/api/publish?slot=noite` |

Para testar manualmente (com `?topic=` opcional):
```powershell
# PowerShell:
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/publish?slot=manha&topic=seu+tema+aqui" -Headers @{ Authorization = "Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" }
```

```cmd
:: Prompt de Comando (cmd.exe):
curl -H "Authorization: Bearer bad6e4fd26f990aadc4babed1210a9cea626eeb1c28390db6f06148196014ed1" "https://www.drlibertad.com/api/publish?slot=manha&topic=seu+tema+aqui"
```

---

## FASE 1 — Automação Instagram

**Status: ✅ Concluída em 2026-05-30**

Todos os passos concluídos. Sistema publicando 3 posts/dia automaticamente.

Primeiro post publicado: ID `18082397880445842` — "A Perfeição é Inimiga do Bem"

---

## FASE 2 — Finalizar o Site

**Status: ⬜ Próxima**

### Passo 1 — Blog com posts automáticos
- Exibir na home os posts salvos no banco
- Página `/blog/[slug]` para cada post

### Passo 2 — Revisão visual e de conteúdo
- Ajustar layout, tipografia, cores
- Revisar textos fixos do site

### Passo 3 — SEO básico
- Meta tags, sitemap, robots.txt

---

## FASE 3 — Infoprodutos

**Status: ⬜ Aguardando Fase 2**

### Passo 1 — Publicar livros no site
### Passo 2 — Integração de pagamento (Stripe / Hotmart / Kiwify)
### Passo 3 — Funil Instagram → site

---

## Log de sessões

| Data | O que foi feito |
|------|----------------|
| 2026-05-29 | Projeto iniciado. route.ts para 3 posts/dia. schema.sql com coluna `slot`. |
| 2026-05-30 | Variáveis Vercel configuradas. Banco Neon criado. Modelo Claude corrigido. Geração de conteúdo funcionando. |
| 2026-05-30 (cont.) | **FASE 1 CONCLUÍDA.** API Instagram Business v25 configurada. Token gerado. Schema banco corrigido (topic+slot). Imagem via GitHub raw URL. Primeiro post publicado (ID: 18082397880445842). Cron 3x/dia ativo. |
