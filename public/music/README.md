# Trilha do Reel (`bed.mp3`)

O motor do Reel (`video/Reel.tsx`) embute uma trilha **opcional** como camada por
cima do vídeo. O pipeline (`.github/workflows/instagram-reels.yml`) liga a música
**sozinho** assim que existir o arquivo:

```
public/music/bed.mp3
```

Se o arquivo **não** existir, o Reel renderiza **mudo** (nada quebra).

## Especificação do arquivo

- Formato: **MP3** (ou outro que o ffmpeg leia), nome exato **`bed.mp3`**.
- Duração: **≥ 15s** (o Reel tem ~14s; sobra é cortada). Pode ser loopável.
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

- Trocar: substitua `bed.mp3`.
- Desligar pontualmente: remova o arquivo (ou edite o `music` em `reel-props`).
