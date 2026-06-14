# Organograma — Vídeo diário (Reels) Dr. Libertad

> **Objetivo:** publicar **≥1 Reel/dia** no `@drlibertad`, **grátis**, reaproveitando
> o conteúdo já gerado pela IA do carrossel. Base: o pipeline de Reels que **já
> funciona** no AnamnesisMed (Remotion + Vercel Blob + GitHub Actions).
> Metodologia: organograma → aprovação → um passo por vez.

---

## Fluxo (igual ao do AnamnesisMed, adaptado à marca)

```
GitHub Actions (1x/dia, horário a definir)
  │
  ├─ 1. curl /api/publish?preview=1&slot=<slot>   → conteúdo via Claude (NÃO publica)
  │        { title, slides, cta, caption }   ← precisa criar esse modo no Dr. Libertad
  │
  ├─ 2. monta REEL_PROPS (title, slides, accentWords, cta, kw, ed)
  │
  ├─ 3. node scripts/render-reel.mjs --props=reel-props.json
  │        Remotion renderiza remotion/index.ts → out/reel.mp4
  │        (1080x1920, 30fps, H.264/AAC, ~12–15s, fonte Fraunces)
  │
  ├─ 4. node scripts/upload-blob.mjs
  │        sobe out/reel.mp4 → Vercel Blob → imprime URL pública
  │
  └─ 5. curl /api/publish-reel?video=<URL>&caption=...
           container REELS → polling status_code até FINISHED → media_publish
```

Custo: **R$ 0** — render roda no runner do GitHub Actions (tem Chromium + ffmpeg);
Blob e Actions cabem no plano grátis no volume de 1 vídeo/dia.

---

## Inventário — 3 baldes

### A) Copiar do AnamnesisMed quase como está (lógica idêntica)
| Arquivo | Ajuste |
|---|---|
| `scripts/render-reel.mjs` | nenhum (CLI puro) |
| `scripts/upload-blob.mjs` | nenhum |
| `src/app/api/publish-reel/route.ts` | nenhum (mesmo fluxo Graph v25) |
| `remotion/Root.tsx` · `remotion/index.ts` | nenhum (registro/duração) |
| deps no `package.json` | add `remotion`, `@remotion/cli|bundler|renderer|google-fonts` (4.0.290) + `@vercel/blob` |

### B) Adaptar à marca Dr. Libertad
| Item | AnamnesisMed | Dr. Libertad |
|---|---|---|
| `remotion/Reel.tsx` — fontes | Playfair + DM Sans | **Fraunces** (via `@remotion/google-fonts/Fraunces`) |
| Handle/rodapé | `@anamnesismed` | `@drlibertad` |
| Paleta | INK/PAPER/CREAM/RED/TEAL fixos | paleta da marca / acento por categoria (`CATS`) |
| CTA final | "Anamnese no link da bio" | copy do Dr. Libertad |

> ⚠️ Nota da regra "só Fraunces 700": ela vale para o **bundle edge do `/api/og`**.
> O Remotion renderiza no **CI (Node)**, fora do edge — carregar Fraunces ali via
> google-fonts **não** infla o bundle edge. Regra respeitada.

### C) Criar novo no Dr. Libertad
| Item | Detalhe |
|---|---|
| Modo `?preview=1` no `/api/publish` | hoje só existe `?dryrun=1` (devolve diagnóstico de imagem, **não** o conteúdo). Precisa devolver `{ title, slides, cta, caption }` sem publicar. |
| `accentWords` (opcional) | o conteúdo do Dr. Libertad não gera palavra-destaque por slide. Sem ela o realce vermelho só não aparece (não quebra). Pode-se adicionar depois. |
| `.github/workflows/instagram-reels.yml` | cron 1x/dia + disparo manual; igual ao do AnamnesisMed, trocando URL e slot. |

---

## Infra / secrets

| Secret | Estado | Ação |
|---|---|---|
| `CRON_SECRET` | ✅ já existe (usado no `/api/publish`) | nenhuma |
| `BLOB_READ_WRITE_TOKEN` | ❌ criar | Vercel → projeto Dr. Libertad → Storage → Blob → criar store → copiar token → GitHub Secrets |

Também confirmar a **URL de produção** do Dr. Libertad na Vercel (ex.: `dr-libertad-site.vercel.app`) para o workflow.

---

## Decisões (definidas em 2026-06-14)

1. **Design do v1:** capa **com ilustração de IA (fal)** como fundo — igual à capa do carrossel.
2. **Horário do cron:** **21:00 UTC (18h BRT)**, 1x/dia + disparo manual.
3. **Slot do conteúdo:** **noite**.

> Consequência: o `?preview=1` gera **uma ilustração própria** para o Reel (1 imagem
> fal/dia extra). Otimização futura possível: reaproveitar a imagem do post do dia.

---

## Plano passo a passo (um por vez, com confirmação entre eles)

1. ✅ **`?preview=1`** no `/api/publish` — devolve `{ title, slides, cta, caption, kw, ed, illustration }` sem publicar. **No ar (deploy verde, responde 401 sem auth).**
2. ✅ **Engine Remotion**: deps no `package.json`, **`video/`** (Reel/Root/index — renomeado de `remotion/` p/ evitar colisão com o pacote por `baseUrl`) com Fraunces, marca e ilustração de IA na capa, `scripts/` (render + upload). Typecheck limpo + build Vercel verde.
3. ✅ **`/api/publish-reel`** — no ar (deploy verde, responde 401 sem auth).
4. ✅ **Blob store + secret** `BLOB_READ_WRITE_TOKEN` criados.
5. ✅ **Workflow** `instagram-reels.yml` no ar (21h UTC, slot noite) — **primeiro Reel publicado** (postId `18105694460054846`, run verde 2026-06-14).
6. 🟡 **Acertos finais** de design/duração — aguardando review visual do usuário no @drlibertad.

> **Pipeline LIVE.** Roda sozinho 1x/dia às 21h UTC. Disparo manual: aba Actions → "Instagram Reels — Dr. Libertad" → Run workflow.

### Bugs corrigidos durante o bring-up
- token do Blob: aceitava bloco `.env` colado → extrai `vercel_blob_rw_...`.
- **status do container era consultado em `.../{accountId}/{creationId}` (erro) → corrigido p/ raiz `.../{creationId}`.** ⚠️ **Mesmo bug existe no AnamnesisMed** — corrigir lá também.
- janela de polling 60s → ~250s.
