# Temas — *O Menestrel* → automação IG Dr. Libertad

> **Fonte de INSPIRAÇÃO** (não é livro do dono): o texto que circula como "O Menestrel".
> `cat`/`motif`/`subject` = direção de arte. **NÃO há seção LITERAIS** (leia a proveniência).
> Tudo aqui é fala **ORIGINAL na voz do Dr. Libertad** — aprovada pelo dono (2026-07-13) e
> **refinada pelos agentes `copywriter` + `guardiao-editorial` + `estrategista-de-atencao`**.
> ES em **tuteo neutro** (decisão do dono 2026-07-13, alinhado às âncoras ES já publicadas).

## Proveniência e por que NADA é verbatim (P4 · honestidade)

- **"O Menestrel" NÃO é de William Shakespeare** — atribuição falsa e desmentida (pensador.com).
  Nunca creditar Shakespeare num post.
- É **adaptação (adulterada) do poema "Comes the Dawn" / "After a While", de Veronica Shoffstall**,
  do livro de formatura dela, **registrado em 1971**. **Obra protegida** (não domínio público).
- Consequência: **não copiamos verbatim**. O poema é só **disparador temático**; as falas abaixo são
  **próprias do Dr. Libertad**, com imagem/metáfora própria (não-`literal` em `THEMES`).

## Encaixe com os pilares

Maturidade masculina (perder de pé), liberdade/limites no amor (amar sem apertar o punho),
autorresponsabilidade (por você responde você), autossuficiência (parar de esperar flores), domínio
de si (governar os próprios atos). Ângulo novo, não repetição do catálogo.

## As 13 falas (versão FINAL em produção — MEN1..MEN13)

Formato: **ES (topic canônico) · PT (referência) · pilar** — texto refinado pelos 3 agentes.

MEN1 · ES "Amar no es apretar el puño: es abrir la mano" · PT "Amar não é apertar o punho: é abrir a mão" · self/boundary
   · disparador: "dar a mão × acorrentar uma alma" (imagem própria apertar→abrir; +completion pelo copywriter)

MEN2 · ES "Apoyarte en alguien no es amar: es tener miedo de estar solo" · PT "Apoiar-se em alguém não é amar: é ter medo de ficar só" · self/isolation
   · disparador: "amar não significa apoiar-se" (uma lâmina só + reframe da solidão masculina)

MEN3 · ES "El adulto pierde de pie; el niño se queda en el ayer" · PT "O adulto perde de pé; o menino fica preso no ontem" · freedom/descent
   · disparador: "aceitar derrotas com a cabeça erguida". ⚠️ Reescrito: a versão anterior ("chorar o ontem, de menino") CONFLITAVA com o Pilar 3 da marca (o homem que não pode chorar) — troca aprovada.

MEN4 · ES "Construye sobre el hoy: el suelo del mañana no sostiene planes" · PT "Construa sobre o hoje: o chão do amanhã não sustenta planos" · self/branches
   · disparador: "construir suas estradas no hoje, o amanhã é incerto" (imagem única do chão; metáfora anterior era opaca)

MEN5 · ES "Deja de esperar flores: conviértete en quien planta" · PT "Pare de esperar flores: vire quem planta" · self/branches  [TRAVADA pelo dono — conceito/PT mantido; só o ES foi p/ tuteo]
   · disparador: "plante seu jardim ao invés de esperar flores"

MEN6 · ES "El ambiente te influye, no te absuelve: quien responde por ti eres tú" · PT "O ambiente influencia, não absolve: quem responde por você é você" · freedom/mirror
   · disparador: "os ambientes influenciam, mas somos responsáveis por nós mesmos"

MEN7 · ES "Tu único rival es el mejor que podrías ser" · PT "Seu único rival é o melhor que você poderia ser" · self/mirror
   · disparador: "não se compare com os outros, mas com o melhor que pode ser" (removido o "não se compare" gasto + o registro de coach)

MEN8 · ES "O gobiernas tus actos, o ellos te gobiernan a ti" · PT "Ou você governa seus atos, ou eles governam você" · self/boundary
   · disparador: "ou você controla seus atos ou eles o controlarão" (eleita a mais forte do lote)

MEN9 · ES "Ser flexible no es ser débil: es doblarse sin quebrarse" · PT "Ser flexível não é fraco: é dobrar sem se quebrar" · self/branches
   · disparador: "ser flexível não significa ser fraco" (imagem concreta do junco; "ter dois lados" era abstrato)

MEN10 · ES "Tienes derecho a tu rabia, no a la crueldad" · PT "Você tem direito à sua raiva, não à crueldade" · anxiety/decay
   · disparador: "tem direito de estar com raiva, mas não de ser cruel"

MEN11 · ES "A veces no alcanza con que te perdonen: tienes que perdonarte tú" · PT "Às vezes não basta ser perdoado: você tem que se perdoar" · self/embrace
   · disparador: "aprender a perdoar-se a si mesmo"

MEN12 · ES "La madurez no cuenta cumpleaños: cuenta lo que aprendiste" · PT "Maturidade não conta aniversários: conta o que você aprendeu" · mind/clock
   · disparador: "maturidade tem a ver com experiência, não com aniversários"

MEN13 · ES "Aguantas mucho más de lo que crees" · PT "Você aguenta muito mais do que pensa" · self/burst
   · disparador: "você é forte, pode ir mais longe do que pensa". Encurtado: cortado o trecho de "valor" (o guardião marcou como registro de autoajuda/consolo, fora da voz).

## Onde vive na rotação

`THEMES` em `src/app/api/publish/route.ts` (bloco MEN1..MEN13, não-`literal`). Contagem total: **178**.
Ao editar qualquer tema, rodar `scripts/build-music-manifest.mjs` e conferir `public/music/manifest.json`.

## Histórico

- 2026-07-12 — Criado. Proveniência real (Shoffstall 1971, não Shakespeare) + decisão não-verbatim.
  13 propostas originais na voz do Dr. Libertad. (PR #156 → main: 165→178.)
- 2026-07-13 — **Refino pós-publicação** pelos 3 agentes especialistas (cada um na sua parte, a pedido
  do dono): MEN3 reescrita (conflito com Pilar 3), MEN1/2/4/7/9/13 afiadas, ES padronizado em
  **tuteo neutro** (voseo removido). MEN5 mantida (travada). MEN6/8/10/11/12 mantidas no conteúdo.
