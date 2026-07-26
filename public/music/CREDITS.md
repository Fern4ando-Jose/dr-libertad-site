# Créditos — trilhas dos Reels

> **Fonte única desta lista:** as tags ID3 dos próprios `.mp3` desta pasta.
> `node scripts/build-music-credits.mjs` lê autor e título de cada arquivo e gera
> `src/content/music-credits.json`, que alimenta a página pública **`/<lang>/creditos`**
> (linkada no rodapé do site). Este arquivo aqui é a explicação; a lista viva é o JSON.
> Um teste de invariante (`src/lib/music-credits.invariants.test.ts`) **falha o CI** se
> entrar mp3 com autor de terceiro e ninguém regenerar os créditos.

## O que há nesta pasta (verificado nas tags, 2026-07-26)

| grupo | arquivos | autor | licença | crédito |
|---|---|---|---|---|
| pool por pilar | `bed-pilar-<pilar>-NN.mp3` (92) | **Kevin MacLeod** (82 obras) | CC BY 4.0 | **obrigatório** |
| pilar legado | `bed-pilar-freedom.mp3` | **JR Tundra** ("Across The Ocean") | CC BY (YouTube Audio Library) | **obrigatório** |
| pilar legado | os outros `bed-pilar-<pilar>.mp3` | — (sem autor na tag) | áudio gerado por IA (fal) | não exige |
| legado run | `bed-0.mp3` … `bed-5.mp3`, `bed.wav` | — (sem autor na tag) | áudio gerado por IA (fal) | não exige |

**Atribuição em uso (Kevin MacLeod)** — texto que o próprio autor exige
(<https://incompetech.com/music/royalty-free/faq.html>):

> "Music by Kevin MacLeod (incompetech.com) — Licensed under Creative Commons:
> By Attribution 4.0 License (creativecommons.org/licenses/by/4.0/)"

O autor aceita que o crédito fique num lugar onde "quem quiser saber de onde veio a
música não tenha dificuldade em achar" — um link de créditos serve. Por isso o crédito
mora na página do site e **não** na legenda de cada Reel (que é espaço de conteúdo).
Ele também vende uma *Standard License* para quem precisa usar **sem** creditar.

As faixas foram cortadas para ~28s (fade in/out) a partir da original; o trecho não
modifica a composição, só a duração usada no Reel.

## Correções de rota registradas aqui (para não se repetir)

1. **A fonte não foi a que o dono pediu.** O pedido era buscar as faixas na *YouTube
   Audio Library*; a curadoria de 2026-07-15 baixou do **incompetech.com**. A troca de
   fonte nunca foi comunicada — e ela traz uma obrigação (creditar) que o dono não
   sabia que estava assumindo.
2. **"Grátis" ≠ "sem crédito".** Na YouTube Audio Library convivem dois regimes: a
   *YouTube Audio Library License* (não exige crédito, mas vale **só para vídeo no
   YouTube** — não cobre Reel no Instagram) e **CC BY** (vale em qualquer plataforma,
   **exige** crédito). Para quem publica no Instagram, a faixa sem-crédito de lá não
   serve; a que serve exige crédito. Não existe a terceira opção.
3. **A versão anterior deste arquivo estava errada.** Ela afirmava que todos os
   `bed-pilar-<pilar>.mp3` sem sufixo eram áudio de IA "sem exigência de atribuição".
   `bed-pilar-freedom.mp3` é de terceiro (JR Tundra, CC BY) e vinha sendo publicado
   **sem crédito desde junho/2026**.
4. **Cuidado com o repo público.** Redistribuir o arquivo é permitido em CC BY (com
   crédito). Faixa baixada sob a *YouTube Audio Library License* **não** pode ser
   redistribuída — logo, nunca commitar mp3 desse regime aqui. Ver `README.md`.
