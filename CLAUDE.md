# Dr. Libertad — instruções do projeto

Site Next.js que gera e publica carrosséis no Instagram (@drlibertad) de forma automática.

## Ritual de início (SEMPRE seguir ao abrir o projeto)

1. **Ler as memórias** do projeto antes de mexer: `instagram-slide-design`, `scheduling-github-actions` e `project-skills`.
2. **Carregar as skills do projeto** quando a tarefa encostar nelas:
   - `frontend-design` — qualquer trabalho de UI/design (site e slides).
   - `svg-art` — desenhar/evoluir os motifs dos slides (radial, waves, particles, grid, fractal).
   - `instagram-carousel` — referência de hierarquia/copy/estrutura de carrossel (NÃO substitui o motor `/api/og`).
   - `social-media` — copy/estratégia de conteúdo para redes.
3. **Verificar render** das slides por HTTP 200 + bytes nas URLs `/api/og` (o `preview_screenshot` está quebrado neste ambiente — não há QA visual automático; o usuário confirma pelo link).

## Regras invioláveis

- **`TOPIC_CAT` (`src/app/api/publish/route.ts`) DEVE espelhar `CATS`/motifs (`src/app/api/og/route.tsx`)** — mexeu num, mexe no outro.
- **Fonte: só Fraunces 700** embutida. Não adicionar pesos (incha o bundle edge).
- **CSS satori-safe** em `/api/og` (flexbox em todo elemento multi-filho; sem CSS não suportado → erro 500).
- **`force=1`** em `/api/publish` só para republicar (burla a trava anti-duplicata de 24h).
- **Agendamento roda no GitHub Actions**, não no Vercel (limite de crons do Hobby). Não recriar crons no `vercel.json`.
- Antes de publicar em produção: confirmar **deploy Vercel verde** no commit.

## Stack

- Next.js 16 (Turbopack) · edge runtime · `next/og` (satori) para imagens.
- Neon Postgres (`@vercel/postgres`): tabelas `posts` e `config`.
- Instagram Graph API v25 (`graph.instagram.com`) — carrossel. Post publicado NÃO pode ter mídia trocada/editada e a API não deleta; correção de slide só vale para posts novos.
