# Projeto — Site Dr. Libertad

> **Objetivo:** Automatizar publicações diárias no Instagram para crescer seguidores, finalizar o site e lançar infoprodutos (livros).

> **Pendências (fonte ativa):** este arquivo guarda a origem/histórico. O que
> falta fazer vive separado em dois roadmaps:
> - Automação → [`ROADMAP-AUTOMACAO.md`](ROADMAP-AUTOMACAO.md)
> - Site → [`../ROADMAP-SITE.md`](../ROADMAP-SITE.md)

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
| `CRON_SECRET` | ✅ | No cofre `.chaves/dr-libertad.env` — **nunca** colar o valor aqui |
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
| App Secret (Facebook) | No cofre `.chaves/dr-libertad.env` — **nunca** colar o valor aqui |
| App ID (Instagram) | `26694771986884986` |
| Instagram Account ID (novo) | `27549362607981575` |
| Instagram Username | `dr.liberdad` |
| Painel Meta Developer | https://developers.facebook.com/apps/2214160215805028 |
| API Setup (tokens) | https://developers.facebook.com/apps/2214160215805028/use_cases/customize/API-Setup/?use_case_enum=INSTAGRAM_BUSINESS&selected_tab=API-Setup&product_route=instagram-business&business_id=659071410613239 |

---

## Cadência diária de publicação (REGRA VIGENTE — definida 2026-06-15)

> **6 posts/dia** no @drlibertad = **4 Reels + 2 carrosséis**.
> A regra antiga de **"6 carrosséis/dia"** foi **REVOGADA em 2026-06-15** — não vale mais.

| Horário (BRT) | Formato |
|---|---|
| 09:00 | Carrossel |
| 12:00 | Reel (vídeo) |
| 14:00 | Carrossel |
| 17:00 | Reel (vídeo) |
| 19:00 | Reel clássico |
| 21:00 | Reel (vídeo) |

- Composição: **3 Reels vídeo** (12/17/21h) + **1 Reel clássico** (19h) + **2 carrosséis** (9/14h).
- Decisão veio da análise de desempenho (Reel ~6× o alcance do carrossel; Reel campeão às 19h).
- Agendamento roda no **GitHub Actions** (não Vercel); `force=1` burla a trava anti-duplicata de 24h.
- ⚠️ **Pendência de código:** o `.github/workflows/instagram-posts.yml` ainda carrega o esquema antigo (6 carrosséis em 00/04/08/12/16/20 UTC). Alinhar ao mix acima.

Teste manual — o segredo vive no cofre `.chaves/dr-libertad.env`, **NUNCA** colar o valor aqui:
```powershell
# PowerShell (exporte $env:CRON_SECRET antes):
Invoke-WebRequest -Uri "https://www.drlibertad.com/api/publish?slot=manha&topic=seu+tema" -Headers @{ Authorization = "Bearer $env:CRON_SECRET" }
```

```cmd
:: cmd.exe (defina %CRON_SECRET% antes):
curl -H "Authorization: Bearer %CRON_SECRET%" "https://www.drlibertad.com/api/publish?slot=manha&topic=seu+tema"
```

---

## FASE 1 — Automação Instagram

**Status: ✅ Concluída em 2026-05-30**

Todos os passos concluídos. (Cadência **atual** = ver "Cadência diária de publicação" no topo: 6 posts/dia, 4 Reels + 2 carrosséis. O "3 posts/dia" foi só o estado inicial de 05/2026.)

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
