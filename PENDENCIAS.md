# Pendências — Dr. Libertad

> O que está PRONTO esperando ação, e o que ainda FALTA. Atualizado em 2026-06-16.

## ✅ Pronto na branch `feat/multi-idioma` (PR #8 — eu mergeio)

Base **multi-idioma** (ES + PT-BR) inteira + reintegrada com a `main` (governança de
custo e rotação de trilha preservadas), validada por `tsc`, **nada publicado ainda**:
- `src/lib/accounts.ts`, `?lang=` em `/api/publish`, `/api/publish-reel` e `/api/og`,
  `generateContent(lang, automation)`, `handle`/`brand` por props nos 2 motores de Reel.
- **Refresh do token PT** (`/api/refresh-token` itera contas com `dbTokenKey`).
- **Conteúdo BR-NATIVO** por `marketBrief` (regenera, não traduz).
- **Carrossel localizado** (`/api/og?lang=` — marca, rótulos, micro-copy).
- 3 workflows PT (`*-pt.yml`) com **crons comentados** (dispatch-only).

## 🔜 Para ATIVAR o PT-BR

1. **Mergear o PR #8** na `main` — **eu faço**. SEGURO: crons PT desligados → não
   publica sozinho; ES intocado (lang default = es; sem `marketBrief` no ES).
2. **Confirmar deploy Vercel verde** do merge.
3. **Validar a copy PT (sem publicar)** — chaves Anthropic/Tavily são *Sensitive* na
   Vercel, só rodam em **produção**; por isso a validação é **pós-merge**:
   - Rodo `/api/publish?preview=1&lang=pt&run=0` em produção e mostro **PT vs ES**.
   - Conferir voz **BR-nativa** (gancho/referências/jeito de falar). Soou importado?
     ajusto o `marketBrief` (campo de texto) e rodo de novo.
4. **RELIGAR os crons PT** (commit mínimo: descomentar `schedule:` nos 3 `*-pt.yml`)
   só **depois** de aprovar a voz. É o go-live do PT.

## 🔜 Áudio variado nos Reels (mecânica pronta — falta gerar as faixas)

Hoje há **1 só faixa** (`bed.wav`) → todos os Reels saem com o mesmo áudio. A rotação
por `run` já está implementada (`scripts/pick-music.cjs`, na `main`). **Decisão:** eu
**automatizo a geração** (provavelmente via fal, royalty-free/redistribuível) das
faixas `bed-0.wav`…`bed-5.wav` — custo mostrado e aprovado antes. Sem envio de arquivos.

## 🔍 Validar (do que já está no ar)

- **Reel CLÁSSICO** (`ReelClassic` + `illus=1`): preview renderizou verde. Confirmar o
  mp4 antes de confiar no cron das 19h BRT.
- Acompanhar os 4 primeiros crons reais (3 vídeo + 1 clássico).

## 🧹 Melhorias / dívidas (não urgentes)

- **Governança de custo**: base já na `main` (PR #7 — `spend_log`, teto/gate, cache
  24h, `/api/spend`). Painel dedicado de créditos segue como sessão futura.
- **Grafia do @ ES**: `@dr.liberdad` é híbrido; `@dr.libertad.es` um dia (perde
  histórico — baixa prioridade).
- **Música PT**: `public/music/bed.wav` é instrumental (sem idioma) — serve as duas.

---
*Obs.: arquivo na raiz do projeto. Ao concluir o merge do PR #8, manter só esta cópia.*
