# Organograma — Automação Dr. Libertad

## Fluxo completo de publicação

```
┌─────────────────────────────────────────────────────────────────┐
│                     CRON JOB (Vercel)                           │
│  09h BRT → /api/publish?slot=manha                             │
│  13h BRT → /api/publish?slot=tarde                             │
│  20h BRT → /api/publish?slot=noite                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Authorization: Bearer {CRON_SECRET}
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              src/app/api/publish/route.ts                       │
│                                                                 │
│  1. Verifica CRON_SECRET                                       │
│  2. Define tema (DAILY_TOPIC ou ?topic= na URL)                │
│  3. Define slot (manha / tarde / noite)                        │
└──────────┬──────────────────────────────────────────────────────┘
           │
     ┌─────▼─────┐        ┌──────────────────────┐
     │  Tavily   │        │   Claude Haiku 4.5   │
     │  Search   │───────►│   Gera conteúdo      │
     │  (5 URLs) │        │   JSON estruturado   │
     └───────────┘        └──────────┬───────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
     ┌────────────────┐   ┌──────────────────┐   ┌──────────────────┐
     │  postTitle     │   │  instagramCaption│   │  tags            │
     │  postBody      │   │  (legenda IG)    │   │  (para o banco)  │
     │  (markdown)    │   └────────┬─────────┘   └──────────────────┘
     └────────────────┘            │
                                   ▼
                    ┌──────────────────────────────┐
                    │   Instagram Business API v25  │
                    │   graph.instagram.com/v25.0   │
                    │                              │
                    │  1. POST /media              │
                    │     → cria container         │
                    │     → image_url (GitHub raw) │
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

## Componentes do sistema

```
dr-libertad-site/
│
├── src/app/api/
│   ├── publish/route.ts     ← API principal (gerar + publicar + salvar)
│   ├── migrate/route.ts     ← Migração do banco (uso único quando necessário)
│   └── instagram/route.ts   ← Diagnóstico: testa se o token está válido
│
├── Public/images/
│   └── post-1.jpg           ← Imagem padrão dos posts (P maiúsculo!)
│
├── files/
│   └── schema.sql           ← Schema da tabela posts
│
├── vercel.json              ← Configura os 3 cron jobs
│
└── docs/                    ← Documentação
    ├── ORGANOGRAMA.md       ← Este arquivo
    ├── GUIA.md              ← Tutorial atualizado
    └── TROUBLESHOOTING.md   ← Erros comuns e soluções
```

---

## Variáveis de ambiente

```
CRON_SECRET              → Protege o endpoint /api/publish
ANTHROPIC_API_KEY        → Acesso ao Claude Haiku
TAVILY_API_KEY           → Pesquisa de temas
META_ACCESS_TOKEN        → Token Instagram (expira em 60 dias!)
META_INSTAGRAM_ACCOUNT_ID → 27549362607981575
META_DEFAULT_IMAGE_URL   → URL da imagem padrão (opcional)
META_IMAGE_URLS          → Pool de imagens (separadas por vírgula, opcional)
POSTGRES_URL             → Neon Postgres (auto via Vercel Storage)
DAILY_TOPIC              → Tema padrão do dia (opcional)
```

---

## Ângulos por slot

| Slot | Horário BRT | Ângulo editorial |
|------|-------------|-----------------|
| Manhã | 09:00 | Reflexivo / inspirador — gera consciência |
| Tarde | 13:00 | Prático / informativo — dados e dicas concretas |
| Noite | 20:00 | Provocativo / engajador — pergunta ou CTA |
