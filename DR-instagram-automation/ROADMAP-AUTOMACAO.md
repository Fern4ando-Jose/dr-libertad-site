# Roadmap — Automação (Dr. Libertad)

> Pendências **só de automação** (geração + distribuição de conteúdo).
> Para o site em si, ver [`../ROADMAP-SITE.md`](../ROADMAP-SITE.md).
> Histórico/origem do projeto: [`PROJETO.md`](PROJETO.md).

Legenda: 🔴 alta · 🟡 média · ⚪ futuro · ✅ feito

---

## 🎬 1. Vídeo diário — TAREFA PRINCIPAL ✅ (no ar 2026-06-14)

Gera e publica **1 Reel/dia** no @drlibertad, 1x/dia às 21h UTC (18h BRT),
via GitHub Actions (render Remotion → Vercel Blob → `/api/publish-reel`).
Capa com ilustração de IA. Ver [`ORGANOGRAMA-VIDEO.md`](ORGANOGRAMA-VIDEO.md).
Primeiro Reel: postId `18105694460054846`.

> Pendente (refino, não bloqueia): review visual; opcionalmente registrar o
> Reel no banco + trava anti-duplicata (hoje o `?preview=1` não grava post).

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

## 📐 Regras de copy dos posts diários ✅ (desde 2026-06-15)

Geradas a partir dos **dados reais** do perfil (ver dashboard `/insights`): o que mais
empurra o alcance é **retenção + guardados (saves) + compartilhamentos (shares)** — e
hoje saves/shares estão **≈ 0** em quase tudo. As regras abaixo entram **automáticas**
no prompt do `generateContent` (`src/app/api/publish/route.ts`), o gerador de **texto**
dos posts — valem para todo conteúdo que passa por ele (carrossel e os Reels que
reaproveitam esse texto via `?preview=1`).

1. **Gancho que para o scroll** — título + 1º insight dirigidos a "tú", com brecha de
   curiosidade ou giro inesperado; concretos e específicos, nunca genéricos
   (ex.: *"Revisas el móvil 144 veces al día"* > *"El uso del móvil es alto"*).
2. **Pelo menos 1 insight GUARDÁVEL** — um reencuadre ou micro-método acionável que
   dê vontade de salvar para reler.
3. **CTA que convida a comentar E compartilhar** — pergunta + *"Etiqueta a quien…"*
   (etiquetar = compartilhar).
4. **Legenda fecha sempre com CTA explícito** de guardar (🔖) e compartilhar (📩),
   antes das hashtags.

> Dado que embasou (2026-06-15, n=50): Reel alcança ~5x o carrossel (melhor Reel ~14x);
> o Reel vencedor reteve **4,9s** de watch médio vs 3,9s do outro. Eng% até maior no
> carrossel (1,6% vs 1,2%) — o gargalo do carrossel é **alcance**, não engajamento.
> Direção paralela do usuário: **reduzir carrosséis e aumentar Reels**.

---

## ✅ Concluído

- Automação Instagram publicando **6 posts/dia (4 Reels + 2 carrosséis)** — GitHub Actions. (Era 3 carrosséis/dia até 2026-06-15; ver "Cadência" no `PROJETO.md`.)
- Ilustração por IA (fal/Flux) na capa — 1 imagem/post.
- QA de imagem por visão (Claude) — reprova defeito anatômico (mão/dedo/membro
  extra), regera até 3x; se esgota, usa o motivo abstrato (nunca publica defeito).
- **Dashboard de Insights** (`/insights` + `/api/insights`) — métricas reais por
  formato (alcance/views-dia/eng%/saves/shares/watch) para decidir o que replicar.
- **Framework de copy** dos posts diários (gancho + guardável + CTA de save/share) —
  ver seção acima.
- Reorganização da pasta `DR-instagram-automation/` + higiene de git.
