# DR Instagram Automation — índice

Hub da automação de carrosséis do **@drlibertad**. Esta pasta reúne a
**documentação e os snapshots de referência**. O código que roda em produção
**continua em `src/` e `.github/`** porque o Next.js/Vercel exige essa estrutura
— mover essas rotas quebra o deploy e o cron.

## Nesta pasta (docs + referência — seguro mover)

- `docs/GUIA.md` — guia de uso
- `docs/ORGANOGRAMA.md` · `docs/organograma.html` — visão geral do fluxo
- `docs/TROUBLESHOOTING.md` — erros comuns e correções
- `PROBLEMAS-SOLUCIONADOS.md` — histórico de bugs resolvidos
- `PROJETO.md` — descrição do projeto
- `Organograma - dr_libertad_roadmap.html` — roadmap
- `preview-carousel.html` — preview local do design (não afeta posts reais)
- `files/` — snapshots de referência (`route.ts`, `schema.sql`, `topics-queue.ts`,
  `vercel.json`). **Cópias**, não são lidas em runtime.

## Código de runtime — NÃO MOVER (vive fora desta pasta)

As rotas existem porque estão em `src/app/api/`. Mover = a URL deixa de existir.

| Função | Caminho |
|---|---|
| Gera as imagens dos slides (satori/next-og) | `../src/app/api/og/route.tsx` |
| Monta e publica o carrossel | `../src/app/api/publish/route.ts` |
| Ilustração por IA (fal/Flux) | `../src/lib/illustration.ts` |
| Fila de temas | `../src/lib/topics-queue.ts` |
| API Instagram Graph | `../src/app/api/instagram/route.ts` |
| Renova token (60d) | `../src/app/api/refresh-token/route.ts` |
| Lista/grava posts | `../src/app/api/posts/route.ts` |
| Migração do banco | `../src/app/api/migrate/route.ts` |
| Cron de publicação (6/dia) | `../.github/workflows/instagram-posts.yml` |
| Cron de renovação de token | `../.github/workflows/refresh-token.yml` |
| Fontes embutidas (Fraunces 700) | `../public/fonts/` |

## Regras invioláveis

Ver `../CLAUDE.md` (ritual de início, acoplamento `TOPIC_CAT`↔`CATS`, CSS
satori-safe, `force=1`, agendamento no GitHub Actions, deploy verde antes de publicar).
