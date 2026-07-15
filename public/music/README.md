# Trilha do Reel — uma faixa por TEMA, de um POOL por pilar

O motor do Reel (`video/Reel.tsx`) embute uma trilha **opcional** como camada por
cima do vídeo. Cada **tema** (os 61 de `THEMES`) escolhe a faixa pelo `topic` do
post, não pelo horário. Como cada tema reaparece a cada ~8 dias, a mesma faixa só
volta junto com o tema.

**Variedade (2026-07-15):** cada pilar (`dopamine`/`anxiety`/`mind`/`self`/`freedom`/
`network`) tem um **pool** de faixas — `bed-pilar-<pilar>.mp3` (legado, IA) +
`bed-pilar-<pilar>-01.mp3`…`-NN.mp3` (curadoria, ver `CREDITS.md`). Cada tema
escolhe 1 faixa fixa do pool do seu pilar por **hash determinístico do próprio
topic** (`scripts/build-music-manifest.mjs`) — reproduzível entre builds, sem
regenerar; adicionar mais faixas ao pool aumenta a variedade automaticamente na
próxima regeneração do manifest.

## Como funciona

- **Geração (author-time, paga, 1× por tema):** `scripts/generate-music.mjs` lê os
  51 temas de `THEMES` (em `src/app/api/publish/route.ts` — fonte única, não duplica),
  gera uma trilha por tema na fal e grava:
  - `public/music/bed-<NN>-<slug>.mp3` (uma por tema), e
  - `public/music/manifest.json` (`topic` → arquivo).
- **Seleção (CI, grátis):** `scripts/pick-music.cjs` recebe o `topic` do post, acha a
  faixa no `manifest.json` e devolve o caminho. **Reuso pra sempre:** tema repetido =
  mesmo arquivo já commitado; o CI nunca gera nada.

### Fail-open (não quebra a automação)

1. tema no manifest e arquivo no disco → usa a faixa do tema;
2. senão → rotação **legado** por `run` entre `bed-0.mp3`, `bed-1.mp3`, … (se houver);
3. senão → `bed.wav`/`bed.mp3` única;
4. nada → Reel renderiza **mudo** (nada quebra).

> **ES e PT compartilham os mesmos arquivos** (mesmo repo): mesmo tema → mesma faixa
> nas duas contas.

## Gerar / regenerar (author-time — NÃO roda no CI)

```
node scripts/generate-music.mjs --list            # SÓ lista temas+prompts (grátis)
FAL_KEY=... node scripts/generate-music.mjs --only=0     # gera só o tema índice 0 (teste, ~US$0,05)
FAL_KEY=... node scripts/generate-music.mjs              # gera os que FALTAM (pula existentes)
FAL_KEY=... node scripts/generate-music.mjs --force      # regenera TODOS os 51 (~US$2,55)
FAL_KEY=... node scripts/generate-music.mjs --only=soledad  # gera temas cujo topic casa "soledad"
```

Custo: **~US$0,05/faixa** na fal (`cassetteai/music-generator`), uma vez por tema
(51 → ~US$2,55). Depois é zero — o CI usa os mp3 + manifest commitados. Requer
**ffmpeg** no PATH (transcodifica o wav da fal p/ mp3 leve + normaliza loudness).

Testar a seleção: `node scripts/pick-music.cjs --topic="La soledad masculina que nadie ve"`.

## Especificação do arquivo

- Formato: **MP3** (a fal entrega wav, o script transcodifica). Nome gerenciado pelo
  script: `bed-<NN>-<slug>.mp3`.
- Duração: **~28s** (o Reel tem ~20s; sobra é cortada). Fade-in/-out automático no
  `Reel.tsx`.
- Mood: instrumental, sem vocais, cinematográfico — atmosfera por **pilar**
  (dopamina, redes/relações, guerra invisível do homem, verdades incômodas,
  liberdade), com variação de instrumento por tema.

## Licença — IMPORTANTE

Áudio **gerado por IA** (fal, `bed-pilar-<pilar>.mp3` sem sufixo) = redistribuível num
repo **público** (sem licença de terceiros). As faixas numeradas
`bed-pilar-<pilar>-NN.mp3` são de **Kevin MacLeod (incompetech.com)**, CC BY 4.0 —
redistribuição permitida, **exige atribuição** (ver `CREDITS.md`). **Nunca** commitar
aqui mp3 de serviços pagos/licenciados sem atribuição embutida ou que proíbam
redistribuição do arquivo (ex.: Epidemic Sound, YouTube Audio Library — mesmo grátis,
os termos cobrem "uso no seu vídeo", não redistribuição do arquivo bruto num repo
público) — repo público = redistribuição = violação de termos nesses casos.

## Legado

Os `bed-0.mp3`…`bed-5.mp3` (rotação antiga por slot) seguem no repo só como
**fallback** — usados quando um tema ainda não tem faixa própria. Podem ser removidos
quando os 51 temas estiverem gerados.
