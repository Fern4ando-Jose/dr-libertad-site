# Roadmap — Site (Dr. Libertad)

> Pendências **do site em si** (páginas, conteúdo, SEO, infoprodutos).
> Para geração/distribuição de conteúdo, ver
> [`DR-instagram-automation/ROADMAP-AUTOMACAO.md`](DR-instagram-automation/ROADMAP-AUTOMACAO.md).

Legenda: 🔴 alta · 🟡 média · ⚪ futuro · ✅ feito

---

## FASE 2 — Finalizar o site 🟡

> 📄 **Estado detalhado do SEO e do blog: [`docs/SEO-ESTADO.md`](docs/SEO-ESTADO.md).**
> Lá está o que já foi feito, o que falta na Vercel, e um erro em aberto no @ do
> Instagram espanhol que precisa de decisão do dono.

### 1. Blog com posts automáticos
- ✅ Exibir na home os posts salvos no banco (Neon).
- 🟡 Página `/[lang]/blog/[slug]` para cada post — **feito no PR #218, aguardando merge.**
  Ainda não conferido contra os artigos reais (ver `docs/SEO-ESTADO.md`).

### 2. Revisão visual e de conteúdo
- Ajustar layout, tipografia, cores.
- Revisar os textos fixos do site.

### 3. SEO básico
- ✅ Meta tags, sitemap.xml, robots.txt — **PR #217, aguardando merge.**
- 🔴 Falta na Vercel: `GOOGLE_SITE_VERIFICATION` e `NEXT_PUBLIC_INSTAGRAM_URL`,
  mais submeter o sitemap no Search Console. Só o dono pode fazer (exige login).

---

## FASE 3 — Infoprodutos ⚪

### 1. Publicar livros no site
> ⚠️ **Em andamento em outra sessão** — páginas `src/app/_books/`,
> `src/app/libros/` (ES) e `src/app/livros/` (PT). Não duplicar esforço aqui.

### 2. Integração de pagamento
- Stripe / Hotmart / Kiwify (a decidir).

### 3. Funil Instagram → site
- Levar o público da automação para as páginas de venda.

---

## ✅ Concluído

- **FASE 1 — Automação Instagram** (ver roadmap de automação).
