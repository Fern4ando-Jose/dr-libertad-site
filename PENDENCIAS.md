# Pendências — Dr. Libertad

> O que está PRONTO esperando ação, e o que ainda FALTA. Atualizado em 2026-06-16.

## ✅ Pronto, aguardando você (branch `feat/multi-idioma` — PR #8, NÃO mergeado)

Base **multi-idioma** (ES + PT-BR) inteira, validada por `tsc`, **nada no ar ainda**:
- `src/lib/accounts.ts`, `?lang=` em `/api/publish` e `/api/publish-reel`,
  `generateContent(lang)`, `handle`/`brand` por props nos 2 motores de Reel.
- 3 workflows PT (`*-pt.yml`) espelhando os ES com `lang=pt`.
- `CLAUDE.md` documenta tudo.

## 🔜 Para ATIVAR o PT-BR (você + eu)

1. ✅ **Conectar @dr.liberdade.br à API** — feito (2026-06-16). Token gerado;
   account-id `27810947805190407` confirmado via `graph.instagram.com/me`.
2. ✅ **Credenciais PT no ar** — `META_ACCESS_TOKEN_PT` + `META_INSTAGRAM_ACCOUNT_ID_PT`
   no cofre e setados como **env no Vercel (Production)** (2026-06-16). *(GitHub secret
   não é necessário: o ES também só vive no Vercel — o token é lido por `process.env`
   nas rotas de API, que rodam no servidor, não no CI.)*
3. **Mergear** o PR #8 `feat/multi-idioma` na `main` (você revisa primeiro). ← **falta isto** (será feito junto da automação)
4. **Testar PT sem publicar**: Actions → "Instagram Reels … (PT-BR)" → Run workflow →
   `publish: no` → revisar o mp4 (copy PT + @dr.liberdade.br).
5. ✅ **Refresh do token PT** — feito em **PR #8** (entra no merge). `/api/refresh-token`
   agora renova toda conta com `dbTokenKey` (ES + PT): a 1ª rodada do cron lê a env
   `META_ACCESS_TOKEN_PT`, renova e **semeia** `meta_access_token_pt` no DB; daí o DB
   é a fonte e renova sozinho mensalmente. Falhas isoladas por conta. Sem seed manual.

## 🔍 Validar (do que já está no ar)

- **Reel CLÁSSICO** (`ReelClassic` + `illus=1`): preview de hoje renderizou verde.
  Confirmar o mp4 antes de confiar no cron das 19h BRT.
- Acompanhar os 4 primeiros crons reais (3 vídeo + 1 clássico) amanhã.

## 🔜 Áudio variado nos Reels (mecânica pronta — faltam as faixas)

Hoje há **1 só faixa** (`bed.wav`) → todos os Reels saem com o mesmo áudio. A
rotação por `run` já está implementada (`scripts/pick-music.cjs`; ligada no
`instagram-reels.yml`). Para ativar (opção escolhida: **royalty-free, grátis**):

1. Largue 3–6 faixas em `public/music/` como `bed-0.wav` … `bed-5.wav`
   (Pixabay Music / YouTube Audio Library "sem atribuição"), **ou** me passe URLs
   diretas e eu baixo/committo.
2. Pronto: cada `run` (0..5) pega uma faixa distinta; sem faixas numeradas continua
   usando `bed.wav` (não quebra). Testar: `node scripts/pick-music.cjs --run=2`.
3. ⚠️ Repo público: prefira faixas que você possa redistribuir (ver `public/music/README.md`).

## ✅ Corrigido nesta sessão

- **Footage "último clipe fora de contexto"** (`scripts/fetch-footage.mjs`): a coleta
  era gulosa por termo e caía no fallback genérico de categoria, jogando um clipe
  fora do tema na cena final (CTA). Agora faz **round-robin nas `videoQueries` do
  Claude** (clipes no tema e diversos) e **só** usa o fallback genérico se o Claude
  render ZERO clipes — senão o `Reel.tsx` cicla os clipes no tema (CTA reusa um deles).

## 🧹 Melhorias / dívidas (não urgentes)

- ✅ **og do carrossel em PT** — feito em **PR #8**. `/api/og` lê `?lang=` (default `es`)
  e o `publish` o repassa. Localizados: marca (Folio + rodapé do CTA), os 6 rótulos de
  categoria, "Deslize para ler", "UMA PERGUNTA", "Responda nos comentários". Smoke test
  HTTP 200 nos 3 slides ×2 idiomas. ES inalterado.
- **Governança de custo**: sessão dedicada (chip "Painel de créditos") — inventário
  de gasto + teto/gate + reuso da ilustração do dia. fal já ficou sem saldo 1x.
- **Grafia do @ ES**: `@dr.liberdad` é híbrido; se quiser simetria, `@dr.libertad.es`
  um dia (perde histórico — baixa prioridade).
- **Música PT**: `public/music/bed.wav` é instrumental (sem idioma) — serve as duas.

---
*Obs.: este arquivo está na raiz do projeto (visível p/ você). Há uma cópia idêntica
na branch `feat/multi-idioma`; ao mergear o PR #8, mantenha uma só.*
