# Diretriz de atenção — como o gerador de posts captura atenção (sem trair a marca)

> Guia canônico vivo para redigir legendas/roteiros que PRENDEM atenção — o irmão de
> `_DIRETRIZ-SEGURANCA-META.md`. Destila em regras acionáveis de geração os **9 princípios
> verificados** do **Playbook de Atenção** (cargo `estrategista-de-atencao`, aprovado pelo dono
> em 2026-07-11).
> Fonte única dos princípios (LEITURA, §1.0): `D:\Claude\.claude\marca\atencao\PLAYBOOK-ATENCAO.html`
> + `CHECKLIST-ATENCAO.html`. Este arquivo é o **delta acionável para ESTE pipeline** — não recopia
> a pesquisa, aponta para ela.
> Aplicado em runtime pela seção **MOTOR DE ATENCIÓN** do prompt em `src/app/api/publish/route.ts`
> (`generateContent`). Editar in-place, nunca `-v2` (§1.12). Evolui com o passo-5 (medição pós-post).

## Regra de ouro
As alavancas de atenção são **as mesmas** que uma marca anti-vício em dopamina critica. Por isso
usamos **gancho honesto + arousal positivo + open loop que ensina** — e **nunca** o loop de recompensa
intermitente que gera o vício que combatemos. O mecanismo do vício vira **conteúdo** ("por que você não
consegue parar de rolar"), nunca **arma**.

## As 6 regras acionáveis (o que o gerador DEVE fazer)

### 1 · Gancho nos 3 segundos — e que CASE com o conteúdo  (princ. 1 e 5)
- O `postTitle` e o **1º slide** cravam o scroll em ~1s: **pergunta provocadora** que implica "você",
  **dado contraintuitivo/comportamental** concreto, ou **tensão**. Curto e afiado.
- O gancho **entrega a promessa** no corpo. Gancho enganoso (clickbait vazio) derruba o *completion* —
  e completion é o que **destrava a distribuição** (princ. 7 e 9). Sem entrega, não se usa.

### 2 · Emoção-alvo = AROUSAL POSITIVO (admiração · surpresa · deleite)  (princ. 5)
- A peça aterrissa no **"uau" de entender um mecanismo**, no **giro que reenquadra**, na **surpresa** de
  um dado contraintuitivo, no **deleite** de uma virada de transformação.
- ⛔ **NUNCA ancorar em raiva/indignação nem em "um inimigo a odiar".** É eficaz para viralizar
  (dado: raiva +34%, admiração +30%), mas **colide com o tom terapêutico** da marca — e o ódio já é
  proibido (§ linha editorial). Ataca-se a **ideia/o sistema/o comportamento**, jamais a pessoa.
- **Nuance que reconcilia com a linha provocativa aprovada:** a marca continua **provocando pela IDEIA
  e pela verdade incômoda** — essa incomodidade é **surpresa/insight**, arousal positivo, não fúria.
  Polêmica que faz **pensar/debater** ✅; peça que faz **odiar** ❌.

### 3 · Recompensa honesta por peça + completion  (princ. 2, 3, 4 e 9)
- Ao menos **um insight** é reenquadre ou **micro-método acionável** que a pessoa queira **salvar** (🔖).
- Cada peça deixa **UMA lição concreta** — a recompensa honesta. O **último slide RESOLVE a tensão** que
  o gancho abriu (completion), não a deixa no ar.
- Slides **curtos de verdade** (máx ~80 chars, legíveis em 1-2s) e duração enxuta → a peça é vista
  **inteira** (completion + rewatch dominam o For You do TikTok e o watch time do IG).

### 4 · CTA orientado a ENVIOS (sends) — alavanca nº1 de alcance NOVO  (princ. 6/8)
- O `cta` e o fecho da legenda convidam a **ENVIAR a peça a uma pessoa concreta**
  ("marca alguém que precisa disso", "manda para quem…") — enviar/marcar = compartilhar, o sinal que mais
  traz **não-seguidores**. Somar a **salvar** (🔖) e ao **CTA de seguir** (com razão de marca).
- Escolha do sinal por objetivo: **crescer audiência nova → SENDS**; **consolidar seguidores → likes**;
  watch time em ambos.

### 5 · Trava ética (GATE, não sugestão)  (princ. 4 — nosso território)
- A peça **EXPÕE** o mecanismo do enganche (nosso território: "por que você não consegue parar de rolar")
  — **nunca o REPLICA.** Proibido desenhar o conteúdo como **loop de recompensa intermitente** ou isca
  manipuladora. O "enganche" é a **verdade que ilumina**, não uma armadilha.

### 6 · Saliência visual (capa/ilustração)  (princ. 6) — design-time
- Regra para `THEMES.subject` e para o layout da capa (`/api/og`, `ReelV2`): **rosto/elemento-chave
  ao centro** nos primeiros frames; **texto-gancho no terço superior** (lido primeiro). Não depender só
  de cor chamativa — **posição + rosto/texto** guiam o olhar em vídeo full-screen.
- (Em vídeo full-screen o olho vai ao **centro/rosto**; em UI estática, ao topo-esquerdo — daí o texto no topo.)

## O que NÃO fazer (refutado na pesquisa — §1.14)
- **Nunca citar multiplicadores de retenção/alcance** do tipo *">85% de retenção = 2,8× alcance"*,
  *"3s acima de 65% = 4–7× impressões"*, *">70% decidem em 3s"*: **foram refutados** (3 votos a 0).
  Vale o **conceito qualitativo** (a retenção inicial importa), nunca esses números. — Já coberto pela
  trava `stats-guard` (bloqueia %/estudos fabricados), mas reforçado aqui na origem.

## Como isto vira runtime
1. **Prompt** (`generateContent`, seção `MOTOR DE ATENCIÓN`): regras 1–5 codificadas nas instruções e nos
   campos JSON (`postTitle`, `slides`, `cta`, `instagramCaption`). A narração do Reel é **derivada verbatim**
   de `postTitle + slides` → melhorar o texto melhora a voz automaticamente.
2. **Design-time** (regra 6): ao criar/editar `THEMES.subject`, manter figura/rosto ao centro; o layout de
   capa já põe o título no topo.
3. **Guardas existentes** cobrem parte: `stats-guard` (números falsos), `lang-guard` (idioma), `literal-lock`
   (temas-convicção). Esta diretriz **não os altera** — soma a camada de atenção.

## Medição (passo 5 — alimenta a evolução deste arquivo)
Comparar retenção/alcance/sends/salvamentos **reais** de cada post (via `analista-de-metricas`/Graph API)
com o previsto no checklist; o que não performar revisa esta diretriz e o playbook. Canônico vivo.

## Histórico
- 2026-07-11 — Criado a partir do Playbook + Checklist de Atenção aprovados. Integrado ao prompt de
  `generateContent` (MOTOR DE ALCANCE → MOTOR DE ATENCIÓN, +arousal positivo, +trava ética, +sends,
  +completion). Tensão com a linha provocativa reconciliada (provocação pela ideia = surpresa/insight,
  não raiva) e sinalizada ao dono.
