# Roadmap — Automação (Dr. Libertad)

> Pendências **só de automação** (geração + distribuição de conteúdo).
> Para o site em si, ver [`../ROADMAP-SITE.md`](../ROADMAP-SITE.md).
> Histórico/origem do projeto: [`PROJETO.md`](PROJETO.md).

Legenda: 🔴 alta · 🟡 média · ⚪ futuro · ✅ feito

---

## 🎬 1. Vídeo diário — TAREFA PRINCIPAL 🔴

Gerar e publicar **ao menos 1 vídeo por dia** (Reels).

- **Base de referência:** o **AnamnesisMed já tem Reels** via Remotion
  (`publish-reel`, `scripts/render-reel.mjs`, `upload-blob.mjs`) — reaproveitar
  a arquitetura para o Dr. Libertad em vez de começar do zero.
- Subpassos prováveis: roteiro/copy do vídeo → render (Remotion) → upload pro
  Blob → publicação como Reel → registro no banco + trava anti-duplicata.
- Decidir cadência e horário do cron (GitHub Actions, como os posts).

## 🔐 2. Rotacionar a `FAL_KEY` ⚪ (adiado)

A chave apareceu no chat anteriormente. Gerar nova no painel do fal, atualizar
no projeto Vercel correto e **redeploy**. Invalidar a antiga.

> **Decisão (2026-06-14):** adiado. Risco baixo enquanto o gasto no fal é
> pequeno; rotacionar quando escalar para valores maiores na conta.

## 🖼️ 3. Auto-salvar imagens geradas no Vercel Blob 🟡

Hoje as imagens do fal só existem como URL temporária (expira). Aprovado pelo
usuário: salvar cada capa gerada num storage durável e guardar a URL junto do
post (acervo permanente, reaproveitável). As já publicadas estão seguras no
próprio Instagram — isto é para o arquivo-fonte e repostagem.

## 📡 4. Distribuição multi-plataforma 🟡

Não ficar só no Instagram. Distribuir o mesmo conteúdo (carrossel/vídeo) para
outras redes. Pensar a arquitetura **agnóstica de plataforma**: gerar uma vez,
publicar em muitas.

- X (Twitter)
- TikTok
- YouTube Shorts
- Facebook
- LinkedIn
- (priorizar conforme estratégia de público)

## 📷 5. AnamnesisMed — imagens por IA ⚪

Implantar a camada de ilustração fal/Flux na automação do AnamnesisMed.
Conduzido pelo usuário via [GUIA-IMPLANTAR-IMAGENS-IA.md](../../AnamnesisMed-site/instagram-automation/GUIA-IMPLANTAR-IMAGENS-IA.md).
Eu dou suporte quando solicitado.

---

## ✅ Concluído

- Automação Instagram (carrossel) publicando 3 posts/dia — GitHub Actions.
- Ilustração por IA (fal/Flux) na capa — 1 imagem/post.
- Reorganização da pasta `DR-instagram-automation/` + higiene de git.
