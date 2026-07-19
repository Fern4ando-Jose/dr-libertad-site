# VISUAL_GENERATION_LOG — "A Travessia da Gaiola"

> Registro obrigatório de TODA geração visual do redesign (VISUAL_DIRECTION.md §15).
> Orçamento: `FAL_MAX_BUDGET_USD=20` (aprovado pelo dono em 18/07/2026, "sim" na conversa).

## Resumo de gasto

| Data | Lote | Gerações | Custo | Acumulado |
|---|---|---|---|---|
| 2026-07-18 | Fase 2 — imagem-mestra (3 alternativas) | 3 × Nano Banana 2 | US$ 0,24 | US$ 0,24 / 20,00 |
| 2026-07-18 | Fase 2 — rodada da REFERÊNCIA do dono (2 candidatas finais) | 2 × Nano Banana 2 | US$ 0,16 | US$ 0,40 / 20,00 |
| 2026-07-18 | Fase 3 — storyboard cenas 2–7 ANCORADO na mestra (cena 1 = mestra, custo 0) | 6 × Nano Banana 2 /edit | US$ 0,48 | US$ 0,88 / 20,00 |
| 2026-07-18 | Fase 4 — prova técnica: vídeo cena 1 (720p · 5 s · mudo) | 1 × Seedance 2.0 mini ref-to-video | a confirmar no extrato | — |

## 2026-07-18 · Fase 2 · Imagem-mestra — 3 alternativas

- **Modelo:** `fal-ai/gemini-3.1-flash-image-preview` (Nano Banana 2 — modelo de imagem padrão da marca, decisão do dono 2026-07-15)
- **Endpoint:** `https://queue.fal.run/fal-ai/gemini-3.1-flash-image-preview`
- **Parâmetros comuns:** aspect_ratio 16:9 · resolution 2K (2752×1536) · output png · num_images 1
- **Custo:** US$ 0,08/imagem × 3 = **US$ 0,24** (autorização registrada no gate da casa antes do disparo)
- **Prompts:** variações A/B/C do prompt-mestre derivado de VISUAL_DIRECTION.md §1–§8
  (cena: smartphone grafite sem marca suspenso + gaiola tridimensional de impulsos âmbar
  #BE7A2A + silhueta adulta sentada ao fundo + fundo preto #0B0B0C + chiaroscuro + grão
  de filme + espaço negativo p/ tipografia; negativos: sem texto/logo/UI/neon/roxo/
  holograma/circuito/barras literais).

| Alt | request_id | seed | Arquivo local | Resultado do QA do agente |
|---|---|---|---|---|
| A | `019f780f-5fa3-7b23-98d8-c6ddc6722b5f` | 20260718 | `public/generated/master/master-alt-A.png` | Composição-altar centrada, fiel ao briefing. ⚠️ recorte de tela estilo iPhone (corrigir na edição antes de virar mestra); rosto desfocado ok, escurecer na mesma edição. |
| B | `019f780f-e2ea-77f1-95d3-3ebbf7aeb9e9` | 20260719 | `public/generated/master/master-alt-B.png` | Macro monólito, pessoa quase invisível (fiel ao fundo do briefing). ⚠️ mesmo recorte iPhone; gaiola densa beira "faiscante". |
| C | `019f780f-f064-7480-b159-2cd2778269df` | 20260720 | `public/generated/master/master-alt-C.png` | Relação pessoa-aparelho em terços; aparelho 100% original. ⚠️ rosto identificável demais — escurecer p/ silhueta na edição. |

- **Downloads:** feitos imediatamente (nenhuma dependência de URL temporária).
- **Estado:** SUPERADAS — antes de escolher A/B/C o dono enviou uma REFERÊNCIA visual
  própria na conversa; a rodada seguinte substitui esta.

## 2026-07-18 · Fase 2 · Rodada da REFERÊNCIA do dono — 2 candidatas finais

- **Contexto:** o dono respondeu à prova A/B/C enviando uma imagem de referência
  (aparelho limpo sem recorte · cortina de fios verticais âmbar com sinos de notificação ·
  ondas concêntricas no chão · homem pensativo em poltrona à esquerda · friso de luz
  vertical na parede · espaço negativo à direita). Prompt reescrito fiel à referência.
- **Modelo/params:** `fal-ai/gemini-3.1-flash-image-preview` · 16:9 · 2K · png · US$ 0,08/img.

| Cand. | request_id | seed | Arquivo local | QA do agente |
|---|---|---|---|---|
| 1 | `019f7816-cf41-7491-8288-cb7dfd4e36a1` | 20260721 | `public/generated/master/master-ref-1.png` | Fiel; aparelho reto e limpo (SEM recorte); 1 anel orbital; personagem em meia-luz, anônimo. APROVADA no QA. |
| 2 | `019f7816-ea3d-7e11-927e-46f64eadc21d` | 20260722 | `public/generated/master/master-ref-2.png` | Fiel; cortina densa de fios+sinos (mais próxima da referência); aparelho levemente inclinado; personagem mais na sombra. APROVADA no QA — recomendada. |

- **Estado:** SUPERADAS — decisão do dono (18/07, na conversa): **a imagem-mestra é a
  IMAGEM DE REFERÊNCIA QUE ELE PRÓPRIO ENVIOU**, não uma geração. Motivo declarado:
  resultados de IA vinham abaixo do esperado; a referência dele já é a cena desejada.

## 2026-07-18 · Fase 2 · DECISÃO FINAL — imagem-mestra = a imagem do DONO (custo US$ 0,00)

- **Origem:** imagem enviada pelo dono na conversa (resgatada do transcript da sessão,
  1672×941 WebP) → ampliação FIEL local (ffmpeg lanczos + leve nitidez, sem IA, cena
  idêntica) para **1920×1080**.
- **Arquivos:** `public/generated/master/master-scene.png` (oficial, 1920×1080) ·
  `public/generated/master/master-scene-dono.webp` (original preservado).
- **QA do agente:** aparelho limpo sem marca ✓ · cortina de fios âmbar com sinos ✓ ·
  ondas concêntricas no chão ✓ · personagem anônimo na poltrona ✓ · friso de luz ✓ ·
  espaço negativo à direita p/ tipografia ✓ · sem texto/logo ✓ · ampliação sem artefatos ✓.
- **Alternativas descartadas** (5 gerações, US$ 0,40 já contabilizados): movidas para
  `Arquivo-Midia/Travessia-Master-Alternativas/` (fora do git e fora dos ativos finais).
- **Regra nova do projeto (pedido do dono):** toda geração futura de storyboard/vídeo é
  ANCORADA nesta imagem (modo edição/referência — nunca texto puro), para o resultado
  não fugir do que ele aprovou. Se a prova técnica de animação ficar abaixo do esperado,
  parar o gasto e cair no plano B: hero estática + movimento por código (custo zero).

## 2026-07-18 · Fase 3 · Storyboard (autorização integral do dono: "finalize dentro do que já foi aprovado")

- **Modelo:** `fal-ai/gemini-3.1-flash-image-preview/edit` (Nano Banana 2, modo edição) —
  `image_urls = [master-scene.png]` em TODAS: o modelo copia o mundo visual da mestra.
- **Params:** 16:9 · 2K · png · US$ 0,08/img · 6 gerações (cena 1 = a própria mestra, custo 0).
- **QA do agente: 7/7 APROVADAS na 1ª rodada, zero re-tentativas.**

| Cena | Arco | request_id | seed | Arquivo | QA |
|---|---|---|---|---|---|
| 01 | captura | — (é a mestra do dono) | — | `storyboard/scene-01.png` | aprovada por definição |
| 02 | repetição | `019f7823-c468…` | 20260802 | `storyboard/scene-02.png` | corredores de vidro negro + laços âmbar circulares + sinos; paleta idêntica ✓ |
| 03 | saturação | **SUBSTITUÍDA pelo dono (18/07)** | — | `storyboard/scene-03.png` | o dono enviou a própria imagem na conversa ("troca pela scene-03 por essa"): sinapse orgânica com sinais âmbar, 1672×941→1920×1080 ampliação fiel (lanczos, sem IA). Original em `scene-03-dono.webp`; a gerada foi para `Arquivo-Midia/Travessia-Master-Alternativas/scene-03-gerada-descartada.png` ✓ |
| 04 | pausa | `019f7823-ea5e…` | 20260804 | `storyboard/scene-04.png` | sinos apagados congelados + único pulso branco quente central; manteve a SALA da mestra (continuidade extra) ✓ |
| 05 | consciência | **SUBSTITUÍDA pelo dono (18/07)** | — | `storyboard/scene-05.png` | o dono enviou a própria imagem ("scena-05 por essa"): homem de costas/perfil TOTALMENTE na sombra, mão a centímetros do aparelho, reflexo no vidro; 1672×941→1920×1080 fiel. Original em `scene-05-dono.webp`; a gerada foi p/ `Arquivo-Midia` (o rosto "borrado" da gerada era intencional — regra de personagem anônimo; a do dono resolve melhor) ✓ |
| 06 | escolha | `019f7824-14c6…` | 20260806 | `storyboard/scene-06.png` | aparelho de TELA PARA BAIXO na mesa + livro/papel/caneta/xícara; fios se desfazendo ✓ (obs.: miolo do livro tem texto impresso ilegível — realismo de objeto, não mensagem; aceito) |
| 07 | liberdade | `019f7824-2432…` | 20260807 | `storyboard/scene-07.png` | manhã, mesmo homem lendo na mesma poltrona, janela à direita, zero aparelho/fios; rosto suave não identificável ✓ |

- **Downloads:** imediatos. **Custo real do lote: US$ 0,48** (o gate reserva US$ 0,50/chamada
  por superestimativa conhecida do NB2; o real cobrado é US$ 0,08/img).

## 2026-07-18 · Fase 4 · Prova técnica — vídeo da cena 1

- **Modelo:** `bytedance/seedance-2.0/mini/reference-to-video` · `@Image1 = master-scene.png` ·
  720p · 5 s · 16:9 · `generate_audio: false` (filme mudo) · request `019f7826-0843…`.
- **Movimento pedido:** órbita lenta ao redor do aparelho; pulsos sobem/descem os fios;
  sinos pulsam; ondas do chão se expandem; homem imóvel respirando; sem cortes, sem tremor.
- **Resultado (18/07, QA do agente): APROVADO.** Vídeo 1280×720 · 24 qps · 5,04 s · 2,9 MB ·
  seed 133643690. Órbita lenta real ao redor do aparelho, cena do dono preservada (sala,
  poltrona, homem, fios, sinos, ondas), sem cortes, sem tremor, sem deformação.
- **Arquivos:** original em `Arquivo-Midia/Travessia-Videos/scene-01.mp4` (fora do git);
  quadros extraídos a 12 qps → `public/generated/sequences/scene-01/desktop/` (61× webp
  1280×720, 2,0 MB) e `mobile/` (61× webp 768×432, 0,97 MB) + `manifest.json` em cada.
- **Custo:** o extrato (`usage`) não é acessível com esta chave (403). Pela tabela pública
  do endpoint (US$ 0,007/1000 tokens): ≈ 108 mil tokens p/ 720p·5s ⇒ **≈ US$ 0,76
  (estimado, não confirmado)**. Total do projeto: ≈ US$ 1,64 de US$ 20,00.

## PROCESSO NOVO (ordem do dono, 18/07): vídeo/cena UM POR VEZ, com aprovação dele entre cada

- Frase literal: "não vai funcionar vc fazer tudo sozinho, vamos ter que ir por video e
  cena de cada vez comigo aprovando". Loop: gerar 1 → QA do agente → MP4 na conversa →
  "pode" → próxima. Orçamento (teto US$ 20) segue autorizado; engenharia segue em paralelo.
- **Cena 1 APROVADA pelo dono na conversa** ("sim pode, vamos para o proximo").

## 2026-07-19 · Fase 5 · Vídeo da CENA 2 — a travessia do vidro (em geração)

- **Modelo:** `bytedance/seedance-2.0/mini/reference-to-video` · 720p · 6 s · 16:9 · mudo.
- **Continuidade:** `@Image1` = último quadro REAL do vídeo da cena 1
  (`transitions/scene-01-last-frame.png`) · `@Image2` = storyboard da cena 2 (destino).
  Movimento: dolly frontal lento → o vidro preto toma o quadro → atravessa → emerge na
  arquitetura de estímulos. Plano único, sem cortes.
- **Request:** `019f7831-2dde-7323-844e-1834d7b4b548` · custo estimado ≈ US$ 0,91
  (tabela; 720p·6s ≈ 130 mil tokens).
