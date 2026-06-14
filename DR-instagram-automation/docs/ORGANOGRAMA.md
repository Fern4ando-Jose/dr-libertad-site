# Organograma — Automação Dr. Libertad

## Fluxo completo de publicação

```
┌─────────────────────────────────────────────────────────────────┐
│                     CRON JOB (Vercel)                           │
│  09h BRT → /api/publish?slot=manha   (12h UTC)                 │
│  11h BRT → /api/publish?slot=tarde   (14h UTC)  ← TEMP 2h      │
│  13h BRT → /api/publish?slot=noite   (16h UTC)  ← TEMP 2h      │
│  Dia 1 de cada mês → /api/refresh-token  (renovação automática) │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Authorization: Bearer {CRON_SECRET}
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              src/app/api/publish/route.ts                       │
│                                                                 │
│  1. Verifica CRON_SECRET                                       │
│  2. Define tema (DAILY_TOPIC ou ?topic= na URL)                │
│  3. Define slot (manha / tarde / noite)                        │
│  4. Lê META_ACCESS_TOKEN do banco (tabela config)              │
└──────────┬──────────────────────────────────────────────────────┘
           │
     ┌─────▼─────┐        ┌──────────────────────┐
     │  Tavily   │        │   Claude Haiku 4.5   │
     │  Search   │───────►│   Gera conteúdo      │
     │  (5 URLs) │        │   JSON em español    │
     └───────────┘        └──────────┬───────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
     ┌────────────────┐   ┌──────────────────┐   ┌──────────────────┐
     │  postTitle     │   │  instagramCaption│   │  tags (text[])   │
     │  postBody      │   │  (legenda IG)    │   │  (para o banco)  │
     │  (markdown)    │   └────────┬─────────┘   └──────────────────┘
     └────────────────┘            │
                                   ▼
                    ┌──────────────────────────────┐
                    │      /api/og (Next.js Edge)   │
                    │   Gera imagem 1080x1350px     │
                    │   Formato 4:5 (feed mobile)  │
                    │   Fonte adaptável 76–120px   │
                    └──────────────┬───────────────┘
                                   │ URL pública (drlibertad.com)
                                   ▼
                    ┌──────────────────────────────┐
                    │   Instagram Business API v25  │
                    │   graph.instagram.com/v25.0   │
                    │                              │
                    │  1. POST /media              │
                    │     → cria container         │
                    │     → image_url (/api/og)    │
                    │                              │
                    │  2. (aguarda 3s)             │
                    │                              │
                    │  3. POST /media_publish      │
                    │     → publica o post         │
                    └──────────────┬───────────────┘
                                   │ instagram_post_id
                                   ▼
                    ┌──────────────────────────────┐
                    │        Neon Postgres          │
                    │   tabela: posts              │
                    │                              │
                    │  INSERT: topic, slot, title, │
                    │  body, instagram_caption,    │
                    │  tags, instagram_post_id,    │
                    │  published_at                │
                    └──────────────────────────────┘
```

---

## Auto-renovação do token (NOVO)

```
Dia 1 do mês (10h UTC)
        │
        ▼
/api/refresh-token
        │
        ├── Lê token atual da tabela config
        ├── Chama graph.facebook.com/oauth/access_token
        │   (grant_type=fb_exchange_token)
        └── Salva novo token na tabela config
            (válido por mais 60 dias)
```

**Primeira vez / após expiração:** renovar manualmente no Meta Developer
e chamar `/api/migrate` para gravar o novo token no banco.

---

## Componentes do sistema

```
dr-libertad-site/
│
├── src/app/api/
│   ├── publish/route.ts        ← API principal (gerar + publicar + salvar)
│   ├── migrate/route.ts        ← Migração do banco + seed do token
│   ├── refresh-token/route.ts  ← Renovação automática mensal do token (NOVO)
│   ├── og/route.tsx            ← Gerador de imagem editorial 1080x1350
│   └── instagram/route.ts      ← Diagnóstico: testa se o token está válido
│
├── vercel.json                 ← Configura os 4 cron jobs
│
└── docs/
    ├── ORGANOGRAMA.md          ← Este arquivo
    ├── GUIA.md                 ← Tutorial atualizado
    └── TROUBLESHOOTING.md      ← Erros comuns e soluções
```

---

## Variáveis de ambiente

```
CRON_SECRET               → Protege os endpoints /api/publish e /api/refresh-token
ANTHROPIC_API_KEY         → Acesso ao Claude Haiku 4.5
TAVILY_API_KEY            → Pesquisa de temas
META_ACCESS_TOKEN         → Token Instagram (seed inicial — depois gerido pelo banco)
META_APP_ID               → 2214160215805028 (para renovação automática)
META_APP_SECRET           → App Secret Meta (para renovação automática)
META_INSTAGRAM_ACCOUNT_ID → 27549362607981575
PRODUCTION_URL            → https://www.drlibertad.com (URL da imagem OG)
POSTGRES_URL              → Neon Postgres (auto via Vercel Storage)
DAILY_TOPIC               → Tema fixo do dia (opcional, fallback em español)
```

---

## Banco de dados

**Tabela `posts`** — um registro por post publicado
```
id, topic, slot, title, body, instagram_caption, tags (text[]),
instagram_post_id, published_at, created_at
```

**Tabela `config`** — configurações dinâmicas (NOVO)
```
key (PK), value, updated_at
─────────────────────────────
meta_access_token  │ token atual do Instagram
```

---

## Ângulos por slot

| Slot | Horário BRT (produção) | Ângulo editorial |
|------|------------------------|-----------------|
| Manhã | 09:00 | Reflexivo / inspirador — gera consciência |
| Tarde | 13:00 | Prático / informativo — dados e dicas concretas |
| Noite | 20:00 | Provocativo / engajador — pergunta ou CTA |

> **Modo teste:** slots a cada 2h (09h / 11h / 13h BRT). Voltar ao normal editando `vercel.json`.

---

## Template de imagem (/api/og)

- **Formato:** 1080 × 1350 px (4:5) — padrão feed Instagram mobile
- **Margem segura:** 80px em todos os lados
- **Fonte:** 76–120px adaptável ao tamanho do título
- **Marca:** "Dr. Libertad" discreto no topo esquerdo
- **Cor de destaque:** `#8B1A1A` (vermelho editorial)
- **Última linha do título:** sempre em negrito e vermelho
