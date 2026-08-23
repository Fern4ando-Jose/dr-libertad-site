---
target: critique o site drliberdade (home /es e /br)
total_score: 23
max_score: 32
na_heuristics: 7,10
p0_count: 2
p1_count: 3
timestamp: 2026-08-23T16-39-00Z
slug: drlibertad-com
---
Method: dual-agent (A: general-purpose design review · B: general-purpose detector + browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Newsletter mostra Enviando…/Inscrito ✓/erro; galeria tem skeleton. Falta `aria-live` no status assíncrono. |
| 2 | Match System / Real World | 3/4 | Voz autêntica e coloquial. Rodapé BR chama a seção de "Tópicos", o menu chama de "Temas" — mesma seção, dois nomes. |
| 3 | User Control and Freedom | 3/4 | Troca de idioma preserva rota e posição de scroll (raro fazer bem). Falta "voltar ao topo"; `/el-estudio` não tem par `/o-estudo` no mesmo padrão de troca. |
| 4 | Consistency and Standards | 2/4 | Header de `/el-estudio` foge do padrão do site: logo aponta para `/investigacion` (pula a home) e troca de idioma vira link "PT" solto em vez do componente `LangToggle` usado em toda a casa. |
| 5 | Error Prevention | 3/4 | Newsletter valida formato e trava duplo-envio. Falta destaque visual (borda/`aria-invalid`) no campo com erro — só o texto de ajuda muda. |
| 6 | Recognition Rather Than Recall | 3/4 | Item "Estudio" do menu vem em vermelho/negrito sem legenda do que é antes de clicar. |
| 7 | Flexibility and Efficiency | n/a | Página de marketing (modo Persuadir) — atalho de teclado não se aplica. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Grade de Temas orfanata (5 cards em 4 colunas no desktop); 2 dos 4 princípios do Manifesto repetem a mesma ideia quase com as mesmas palavras (ES e BR). |
| 9 | Error Recovery | 3/4 | Copy de erro no tom certo da marca, fica visível no lugar (não some em toast). Falta `aria-live` e "próximo passo" no texto. |
| 10 | Help and Documentation | n/a | Não se aplica a landing page. |
| **Total** | | **23/32** | **72% — Bom, mas ver o achado P0 abaixo, que não estava no radar desta tabela** |

Nota: esta tabela foi montada pela revisão A em 1280px/375px. A avaliação B (abaixo) achou, num range de tela que a A não testou (768–1024px), um botão primário que fica **fisicamente inalcançável** — isso não está refletido nos pontos acima porque nenhum dos 10 heurísticos clássicos de Nielsen cobre "quebra de layout responsivo"; entra como Prioridade P0 separada.

## Veredito de Especificidade de Design

**Avaliação A (subjetiva):** veredito dividido. O **texto** é genuinamente autoral da marca (os aforismos, o "ED. 220" que trata post de Instagram como edição de revista, a postura de "a tese só fica se os números baterem" do `/el-estudio`) — isso não cai em qualquer site genérico. Mas o **sistema visual** que carrega esse texto — cards translúcidos com blur, cantos arredondados grandes, CTA em pílula com seta, serifada+sans, um único acento terracota sobre quase-preto — é o kit visual padrão de dezenas de templates Framer/Webflow de "luxo discreto" 2025–2026 (newsletter, wellness, revista indie). Uma marca que se declara "não teme a polêmica" e fala de gaiola, guerra e vício está na temperatura visual de um café artesanal, não de um confronto. O conteúdo diferencia; a moldura não briga por ele.

**Varredura determinística (detector B):** rodou sobre o código-fonte (`page.tsx` + `src/components`) — **saída 2 (achados)**, 4 ocorrências, todas fora do escopo da home: 2× `layout-transition` (barra de progresso do funil dopamina e da pesquisa animando `width` em vez de `transform: scaleX`), 1× `side-tab` (borda do quiz), 1× `broken-image` — **este último é falso positivo** (o `<img>` detectado está dentro de um comentário CSS, não é elemento real). Nenhum dos 4 arquivos é importado pela home (`DopaminaFunnel`, `QuizExperience`, `SurveyExperience`, `Book3D` não aparecem em `page.tsx`) — são achados reais, mas de outras rotas (funil, quiz, página de livro), não desta crítica.

**Evidência ao vivo:** captura de tela (pixels) não ficou disponível neste ambiente de navegador; a evidência veio de árvore de acessibilidade, estilo computado, console e rede — igualmente concreta, mas sem overlay visual para abrir numa aba.

## Impressão Geral

A home entrega a melhor abertura de texto do site (o gancho da gaiola + a revelação sobre dopamina/solidão) e um detalhe técnico de verdadeiro nível sênior (a troca de idioma preserva rota e scroll — a maioria dos sites bilíngues erra isso). Mas a página **quebra fisicamente** numa faixa de tela comum (tablet/notebook pequeno) — o botão de assinar a lista simplesmente some da tela, nas duas línguas — e o argumento de venda inteiro (manifesto, temas, citações, newsletter) depende de JavaScript rodar para deixar de estar invisível/borrado. A maior oportunidade não é estética: é garantir que a página **sempre apareça e sempre seja clicável**, antes de qualquer ajuste de tom.

## O Que Está Funcionando

1. **Troca de idioma bem projetada.** `LanguageProvider.tsx` troca só o segmento `/[lang]` da rota (preserva `/br/livros` → `/es/livros`, nunca volta pra home), mantém a posição do scroll e lembra a escolha em cookie e localStorage.
2. **O card flutuante do "ritual de 90 segundos"** reage à posição do mouse na tela inteira com física de mola (`useSpring`, sutil, não genérico) e se comporta bem em toque.
3. **A voz escrita.** Frases como "la dopamina barata es amable: solo pide cinco minutos más" e a postura do `/el-estudio` de defender a tese só se os dados baterem são específicas e cabíveis só nesta marca.

## Prioridades

**[P0] O botão principal (assinar a lista) fica fisicamente inalcançável entre 768–1024px, nas duas línguas.**
Por quê importa: o menu desktop (`StudioNav.tsx`) e o botão hamburguer trocam num único ponto de corte (768px), sem faixa intermediária nem quebra de linha na barra. Medido ao vivo: em ES a borda direita do CTA fica fixa em x=1021 (192px pra fora da tela em 768px de largura); em BR, x=1036 (268px pra fora). Não é assunto de rolagem — `elementFromPoint` no local visível devolve `null`: o botão não existe pra quem clica ali. É a faixa de iPad na vertical e de notebook pequeno/tela dividida — tráfego real.
Conserto: dar ao menu um nível intermediário (ex.: esconder 1–2 itens secundários entre 768–1024px) ou permitir quebra de linha/scroll horizontal na barra em vez de cortar sem aviso.
Comando sugerido: `/impeccable adapt`

**[P0] O conteúdo da página pode nascer invisível sem JavaScript.**
Por quê importa: os títulos de seção e a maioria dos blocos (princípios do manifesto, cards de tema, citações, newsletter) usam Framer Motion com estado inicial `opacity:0, blur(10px)` — sem equivalente em CSS puro. Se a hidratação travar (conexão lenta, extensão do navegador, erro no cliente) ou o JS for bloqueado, o argumento de venda inteiro pode ficar permanentemente invisível ou borrado, sem `<noscript>`.
Conserto: dar a esses blocos um estado inicial visível (`opacity:1`) e deixar só o *timing* da animação a cargo do JS, ou usar `@starting-style` em CSS.
Comando sugerido: `/impeccable harden`

**[P1] Não existe caminho para seguir o Instagram a partir da home — mesmo sendo a meta de crescimento declarada da marca.**
Por quê importa: nem cabeçalho, nem rodapé, nem o herói trazem "Seguir @dr.libertad/@dr.liberdade.br". A única rota possível é abrir um post na galeria e, se existir link, cair no permalink de UM Reel — não no perfil.
Conserto: um botão direto "Seguir no Instagram" no cabeçalho/rodapé, apontando pro perfil.
Comando sugerido: `/impeccable clarify`

**[P1] Se a galeria falhar ao buscar posts, o site ES mostra texto de reserva em português.**
Por quê importa: `EditorialGrid.tsx` tem um `FALLBACK` fixo em português ("VOCÊ NÃO ESTÁ CANSADO.") sem variar por idioma. Não aconteceu durante o teste (a API respondeu 200 nas duas línguas), mas o caminho existe no código — é o mesmo tipo de vazamento de idioma que a casa trata como falha grave em outros motores (ver `lang-guard.ts` no `CLAUDE.md` do projeto), só que aqui é texto estático de UI, não conteúdo gerado, então nenhuma trava atual o cobre.
Conserto: localizar o `FALLBACK` por `lang`, ou esconder a seção em vez de mostrar texto no idioma errado.
Comando sugerido: `/impeccable harden`

**[P1] Atenção diluída: 8 itens de menu + 2 CTAs de peso igual no herói + newsletter enterrada depois de 6 seções.**
Por quê importa: numa página de venda, ter 8 escolhas de navegação e duas chamadas de ação com o mesmo peso visual espalha a primeira decisão do visitante logo na abertura; o único mecanismo real de conversão (newsletter) fica no fim da rolagem, sem destaque.
Conserto: eleger UM CTA dominante no herói (provavelmente newsletter, é o único público que a marca é dona) e rebaixar o segundo a link de texto.
Comando sugerido: `/impeccable layout`

## Sinais de Persona

**Jordan (primeira vez, confuso):** o herói abre em metáfora ("gaiola sem grade") — quem nunca ouviu falar da marca só entende o assunto (dopamina/atenção/solidão) depois de ler o parágrafo inteiro. O item "Estudio" vem em vermelho/negrito sem dizer o que é antes do clique. "ED. 220" nos cards da galeria reembala post de Instagram como "edição" — decodificável, mas exige um segundo de tradução mental.

**Riley (testador de limites):** confirmado por código — se `/api/posts` falhar, a galeria ES mostra cards em português (achado P1 acima). Imagens/vídeos da galeria vêm de URLs assinadas e temporárias do Instagram (`&oh=...&oe=...`); se o cache do site guardar a resposta além da validade do token, a prova social "AO VIVO DO INSTAGRAM" quebra sem aviso — só `image:null` tem tratamento, um 403 de token vencido não.

**Casey (celular, distraído):** não existe CTA fixo no cabeçalho mobile ("Unirme a la lista" é `hidden md:inline-flex`) — no celular só chega à newsletter rolando até o fim ou abrindo o menu. Botão hamburguer (36×36px), troca de idioma (~24×36px) e fechar da galeria (36×36px) ficam abaixo do mínimo de toque de 44×44pt — justo os controles mais usados com o polegar.

## Observações Menores

- Dois dos 4 princípios do Manifesto (ES #1/#3) repetem a mesma ideia quase com as mesmas palavras — desperdiça um dos 4 espaços da seção que deveria ser o núcleo intelectual da venda.
- BR usa "Hombridade" (princípio 4) — palavra rara/arcaica em português (vem do espanhol "hombría"); a maioria vai ler como erro de digitação. Trocar por "masculinidade"/"virilidade".
- Rodapé BR chama a seção de "Tópicos", menu chama de "Temas" — mesma seção, dois nomes (ES é consistente nos dois lugares).
- `Marquee.tsx` duplica as 9 palavras da marca para o loop sem `aria-hidden` no conjunto duplicado e sem controle de pausa — leitor de tela anuncia 18 itens repetidos; rolagem infinita sem pausa fere WCAG 2.2.2.
- Botão "Suscribirme" da newsletter: texto `#F4F0E8` sobre fundo terracota `#A45A5A` em 14px/600 mede **4.41:1** de contraste — fica um triz abaixo do mínimo AA (4.5:1) pra texto normal. Os outros usos do acento (H1, CTA "Leer el manifiesto", marca no cabeçalho) passam com folga (12.8–18.5:1) — não é um problema da cor em si, é só este botão específico sendo pequeno demais para a combinação.
- URL `/livros` é compartilhada pelas duas línguas mesmo no site ES ("livros" é grafia portuguesa; "libros" seria o correto em espanhol) — resolve 200 e mostra conteúdo certo, só a URL destoa.
- Achados do detector fora do escopo da home (rotas de funil/quiz/livro) ficam registrados acima em "Veredito de Especificidade" para uma futura auditoria dessas páginas.

## Perguntas para Considerar

- E se a home abrisse com só UMA decisão acima da dobra — não "ler o manifesto" × "responder a pesquisa" × 8 itens de menu × newsletter três telas abaixo — com tudo o mais rebaixado a navegação secundária?
- E se o sistema visual tivesse a mesma temperatura do texto — cantos mais secos, vermelho mais forte, menos vidro/blur — pra "a guerra invisível do homem" parecer confronto, não retiro de bem-estar?
- E se "AO VIVO DO INSTAGRAM" levasse a algum lugar realmente vivo — um botão de seguir o perfil — em vez de, no melhor caso, terminar em UM post, dois cliques depois, num site cuja meta declarada é crescer esse seguimento?
