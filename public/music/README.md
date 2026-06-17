# Trilha do Reel (`bed.wav`)

O motor do Reel (`video/Reel.tsx`) embute uma trilha **opcional** como camada por
cima do vídeo. O pipeline (`.github/workflows/instagram-reels.yml`) liga a música
**sozinho** assim que existir o arquivo:

```
public/music/bed.wav   (ou bed.mp3)
```

Se **nenhum** arquivo existir, o Reel renderiza **mudo** (nada quebra).

## Rotação de faixas (varia o áudio entre os posts do dia)

> **Problema que isto resolve:** com uma faixa só, **todos** os Reels saíam com o
> mesmo áudio. A seleção agora é por `scripts/pick-music.cjs`.

- Largue faixas **numeradas** — `bed-0.wav`, `bed-1.wav`, `bed-2.wav`, … — e o
  pipeline **rotaciona** por `run`: `run % nº_de_faixas`. Como o `run` (0..5)
  define o tópico/slot do post, a mesma faixa sai sempre no mesmo horário
  (consistência por slot) e o dia tem áudios distintos.
- Sem faixas numeradas, usa a **`bed.wav`** única — comportamento idêntico ao de
  antes.
- Testar a seleção localmente: `node scripts/pick-music.cjs --run=2`.

Sugestão: 3–6 faixas (`bed-0`..`bed-5`) cobrem os 6 runs/dia sem repetir no mesmo dia.

## Especificação do arquivo

- Formato: **WAV** ou **MP3** (qualquer um que o ffmpeg leia). Nome: **`bed.wav`**
  (faixa única) ou **`bed-<n>.wav`** (rotação, `n` = 0,1,2,…). `.mp3` também vale.
- Duração: **≥ 20s** (o Reel tem ~20s; sobra é cortada). Pode ser loopável.
- Mood: instrumental sóbrio/atmosférico — combina com a marca (literário, calmo).
  Faz fade-in nos primeiros 0,5s e fade-out no fim, automático.

## Licença — IMPORTANTE

Use **só** áudio royalty-free / sem direitos de terceiros. Opções sem atribuição:

- **Pixabay Music** (pixabay.com/music) — uso livre, sem atribuição.
- **YouTube Audio Library** — filtre por "sem atribuição".

> Não comitamos uma faixa de terceiros automaticamente para não arriscar a
> licença ao redistribuir o binário em repositório público. **Escolha uma faixa
> que você possa usar e solte aqui como `bed.mp3`.** Se preferir, me diga qual
> faixa/URL e eu baixo e configuro.

## Trocar/desligar

- Trocar: substitua `bed.wav` (ou as `bed-<n>.wav`).
- Adicionar variedade: largue `bed-0.wav`, `bed-1.wav`, … (ver "Rotação" acima).
- Desligar pontualmente: remova os arquivos (ou edite o `music` em `reel-props`).
