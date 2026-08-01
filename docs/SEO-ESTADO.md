# SEO do site — estado e pendências

> Documento de passagem de bastão. Escrito em 01/08/2026, atualizado no mesmo dia
> depois que a sessão local fechou os dois pontos que dependiam de acesso externo.
> Se você abriu uma sessão nova (aqui ou no seu computador), **leia isto primeiro**.
>
> **Em uma linha:** dois PRs prontos e verdes (#217 e #218), aguardando merge
> nessa ordem. Sobrou uma pendência, e ela é do dono: ligar o Search Console.

---

## Onde o trabalho está

Dois pull requests, os dois com CI verde, **nenhum dos dois mergeado ainda**.

| PR | branch | o que é | base |
| --- | --- | --- | --- |
| [#217](https://github.com/Fern4ando-Jose/dr-libertad-site/pull/217) | `claude/seo-site-configuration-89l11z` | correções de SEO | `main` |
| [#218](https://github.com/Fern4ando-Jose/dr-libertad-site/pull/218) | `claude/blog-artigos-indexaveis` | blog indexável | **`claude/seo-site-configuration-89l11z`** |

⚠️ O #218 está **empilhado** no #217 — a base dele não é a `main`. Quando o #217
for mergeado, o #218 precisa ser reapontado para a `main` (botão *Edit* no título
do PR → trocar a base). Só depois disso ele pode entrar.

Ordem de merge: **#217 primeiro, #218 depois.**

---

## O que o #217 corrigiu

Quatro coisas estavam impedindo indexação:

1. **`/[lang]/livros` se declarava cópia da home.** A página não exportava
   `metadata` e, no App Router, o `alternates.canonical` do layout pai é
   herdado — a vitrine dizia ao Google "sou uma cópia de `/br`". Nunca poderia
   rankear. Também herdava título e descrição da home.
2. **Metade do site estava fora do sitemap** (12 → 26 URLs). A lista era escrita
   à mão e envelheceu. Agora deriva de um registro único: `src/lib/seo.ts`.
3. **`<html lang>` era fixo em `pt-BR`**, inclusive nas páginas em espanhol.
4. **`/admin` e `/insights` eram rastreáveis.**

E mais:

- **Imagens: 7,4 MB → 1,5 MB.** Nenhum arquivo usava `next/image`; a capa do guia
  de plantas tinha 2,5 MB e era o LCP da página de venda. Medido depois: 23,6 KB
  em WebP a 640px.
- **JSON-LD** ganhou `Person` (autor), `Book` + `Offer`, `BreadcrumbList`, `ItemList`.
- Título da home de 74 → 58 caracteres (o Google corta em ~60).
- `og:image` próprio em 1200×630 (antes apontava para um slide 1080×1350 declarado
  como 1080×1080).
- Ícones PNG + `manifest.webmanifest`; 404 com a cara do site; 308 no redirect antigo.

### Detalhe de arquitetura: por que existem vários root layouts

Para servir o `<html lang>` certo. No App Router só o layout **raiz** renderiza
`<html>`, e ele não recebe o parâmetro de idioma. Ler `headers()` resolveria, mas
tornaria as 57 páginas estáticas em dinâmicas — e perder isso custaria o LCP que
o SEO quer. A saída foram grupos de rota, cada um com o seu root layout:

```
src/app/(pt)/       → /pesquisa, /o-estudo          html lang="pt-BR"
src/app/(es)/       → /investigacion, /el-estudio   html lang="es-ES"
src/app/(interno)/  → /admin, /insights             noindex
src/app/[lang]/     → /br/*, /es/*                  lang conforme a rota
```

O `<html>`/`<body>` e a moldura visual comum vivem em `src/components/RootShell.tsx`.
Os metadados globais em `src/lib/metadata-base.ts`. **Não existe `src/app/layout.tsx`** —
é de propósito; é o que permite mais de um root layout.

---

## O que o #218 entrega

A automação do Instagram já escrevia o artigo inteiro na tabela `posts` (coluna
`body`) toda vez que publicava. Esse texto só existia dentro de um modal na home,
carregado no navegador **depois** que a página abria: sem endereço próprio, fora
do HTML do servidor, fora do sitemap. Dezenas de artigos que o Google não tinha
como indexar.

Agora existem `/[lang]/blog` e `/[lang]/blog/[slug]`, renderizados no servidor,
com `Article` schema e entrada automática no sitemap (revalida de hora em hora —
artigo novo entra sozinho, sem deploy).

Decisões que valem saber:

- **Slug sem migração no banco.** A tabela não tem coluna de slug. O endereço é
  `título-legível` + sufixo estável derivado da data de publicação. Corrigir um
  título não quebra o link — a busca casa pelo sufixo.
- **Corpo abaixo de 200 caracteres não vira página.** Uma legenda de duas linhas
  viraria uma página quase vazia, que é o "conteúdo raso" que o Google penaliza —
  e a penalidade contamina as páginas boas do mesmo site. A constante é
  `ARTICLE_MIN_BODY`, em `src/lib/blog.ts`.
- **Artigos saem sem hreflang.** As versões PT e ES de um texto são linhas
  separadas no banco, sem nada que as ligue. Parear no chute seria pior que não
  parear.
- **O modal continua existindo.** O card do editorial na home virou `<a href>` de
  verdade quando o post tem artigo — é isso que faz o rastreador achar o texto a
  partir da home. Para o leitor nada mudou: o clique simples segue abrindo o modal.

### ✅ Verificado contra o banco real (01/08/2026)

A sessão que escreveu o blog não alcançava o Neon (política de rede) e testou tudo
com dados de mentira. A sessão local rodou contra o banco de produção:

```
/br/blog → 60 linhas no banco → 59 artigos publicados
/es/blog → 127 linhas         → 127 artigos
```

**186 artigos reais entram no índice.** É esse o salto: o site sai de ~12 páginas
indexáveis para quase 200.

E a verificação achou um bug meu: `listArticles` deduplicava por **slug**, e o
slug carrega o hash da data de publicação — então a mesma matéria republicada em
dias diferentes gerava endereços diferentes e passava inteira pelo filtro. Duas
páginas idênticas competindo entre si, exatamente o que o filtro existia para
impedir. (Caso real: *"O amor que morre de tédio"*, 24/06 e 25/06, corpo idêntico
ao caractere.)

Corrigido em `15525b91`: a chave passou a ser o **texto** (título + corpo,
ignorando espaço e caixa), não o endereço. Textos diferentes sob o mesmo título
continuam sendo dois artigos — é o caso de *"Ninguém te deve nada"*, que saiu
reescrito em 24/06 e 08/07 e merece as duas páginas.

---

## ✅ RESOLVIDO — o @ do Instagram espanhol (01/08/2026)

Ficou aberto por algumas horas e foi fechado pela sessão que roda no PC do dono,
que pôde abrir o navegador — coisa que a sessão da nuvem não conseguia.

**O que era:** o código escrevia o handle espanhol de duas formas.
`@dr.liberdad` (com **D**) em `src/lib/accounts.ts` e nos documentos;
`@dr.libertad` (com **T**, contaminado pelo domínio `drliber`**`t`**`ad.com`) em
`estudo.content.ts` e `survey.content.ts`.

**O problema:** a grafia com T era justamente a que virava **link clicável** em
`/el-estudio` e `/investigacion/gracias`. Verificado no navegador:

```
instagram.com/dr.liberdad  → 323 posts, 460 seguidores, é a nossa
instagram.com/dr.libertad  →   0 posts,   0 seguidores, é de outra pessoa
```

Quem respondia a pesquisa em espanhol e clicava em "Seguir a @dr.libertad" caía
numa conta vazia de terceiro — perdendo o seguidor no ponto do funil onde ele
custa mais caro. **Estava assim em produção.**

**Como foi corrigido:** não trocando a string, mas tirando a possibilidade de
haver duas. O @ é escrito UMA vez, em `ACCOUNTS[lang].handle`, e todo endereço é
derivado dele por `instagramUrlDe`. `src/lib/instagram-handle.invariants.test.ts`
trava as duas pontas — a grafia e a derivação.

De carona, o `sameAs` do JSON-LD passou a ser montado no código a partir dessa
mesma fonte. **A variável `NEXT_PUBLIC_INSTAGRAM_URL` deixou de ser necessária**
— ela nunca chegou a ser preenchida, e por isso o `sameAs` saía vazio em
produção.

Commit: `d4164ae2`.

---

## Pendências na Vercel / Google — só você pode fazer

Sobrou **uma** — a outra (`NEXT_PUBLIC_INSTAGRAM_URL`) deixou de existir quando o
`sameAs` passou a ser montado no código. Não é código; exige o seu login.

### `GOOGLE_SITE_VERIFICATION` + Search Console

Sem isso você está cego: não vê impressões, posição média nem erros de indexação.
O código já lê a variável (`src/lib/metadata-base.ts`).

1. [search.google.com/search-console](https://search.google.com/search-console) →
   adicionar propriedade `www.drlibertad.com` → método **"tag HTML"**
2. Copiar **só o valor do `content`** (não a tag inteira)
3. Vercel → projeto → *Settings* → *Environment Variables* → adicionar em
   **Production**: `GOOGLE_SITE_VERIFICATION` = `<o valor>`
4. Redeploy
5. Voltar ao Search Console e clicar em **Verificar**
6. Depois: *Sitemaps* → adicionar `sitemap.xml`

> ~~`NEXT_PUBLIC_INSTAGRAM_URL`~~ — não é mais necessária. O `sameAs` sai do
> registro de contas (`ACCOUNTS[lang].handle`) desde `d4164ae2`. Se a variável
> ainda existir na Vercel, pode apagar: ela é ignorada.

---

## Sobre "ser o primeiro no Google"

Vale registrar a expectativa, para ninguém se frustrar:

- **Para "Dr. Libertad" / "Dr. Liberdade"** (marca): com os PRs no ar e o Search
  Console ligado, primeiro lugar é alcançável em semanas.
- **Para "desintoxicação digital", "dopamina", "ansiedade moderna"**: não. Esses
  termos são disputados por sites com centenas de artigos e milhares de backlinks.
  Nenhuma correção técnica muda isso.

O que move o ponteiro nesses termos é o #218: sair de ~12 páginas indexáveis para
dezenas, atacando cauda longa ("como parar de rolar o feed", "sintomas de vício
em dopamina"). Daí em diante é volume de texto e tempo.

---

## Contexto do ambiente (por que algumas coisas não foram feitas)

Boa parte deste trabalho saiu de uma sessão rodando numa VM efêmera na nuvem, não
no computador do dono. A política de rede do ambiente bloqueia `vercel.com`,
`api.vercel.com`, `google.com`, `search.google.com` e `instagram.com`; não há
credencial da Vercel nem CLI instalada. Por isso:

- a pendência do Search Console ficou para o dono — **é a única que sobrou**
- ~~o handle do Instagram não pôde ser conferido direto na fonte~~ — resolvido
  pela sessão local em 01/08, que abriu as duas contas no navegador
- ~~o blog nunca foi testado contra o banco real~~ — resolvido em 01/08, contra
  o Neon de produção; achou um bug de duplicata que os dados de mentira não
  revelavam

A divisão que funcionou: a sessão da nuvem faz o código e os testes; a sessão
local verifica o que só existe fora do repositório (navegador, banco, Vercel).

Se quiser que uma sessão futura faça a parte da Vercel, é preciso liberar a rede
nas configurações do ambiente e guardar um `VERCEL_TOKEN` lá nas variáveis —
**nunca colar token no chat**. O Search Console continua sendo manual de todo
jeito: verificar propriedade de domínio exige uma conta Google logada.

---

## Dois pontos que a verificação local deixou anotados (01/08/2026)

Não bloqueiam nenhum dos dois PRs. Ficam registrados aqui para não se perderem.

### 1. Um artigo em português está dentro do blog espanhol

*"Você não conhece você mesmo (e isso te controla)"*, publicado em 17/06/2026,
está gravado na tabela `posts` com `lang = 'es'`. Ele aparece em `/es/blog`, em
português, dentro de uma página que se declara `<html lang="es-ES">`.

É **1 artigo entre 186** — e o erro está no dado que a automação gravou, não no
código do blog. Corrigir significa escrever na tabela da automação do Instagram,
que é de outra frente. Uma heurística de idioma no `blog.ts` foi considerada e
**descartada**: errar para o lado errado apagaria artigos legítimos do índice, o
que é pior que uma página no idioma trocado.

Quem for mexer: a linha é identificável por `title = 'Você não conhece você mesmo
(e isso te controla)' AND lang = 'es'`.

### 2. `npm run lint` estava mudo — voltou a rodar

Estava quebrado por dois motivos somados: o script chamava `next lint` (comando
removido no Next 16, que passava a ler "lint" como nome de pasta) e a
configuração estava no formato antigo (`.eslintrc.json`), que o ESLint 9 não abre
mais. O efeito era o pior: **não acusava problema nenhum porque nunca olhava o
código**.

Agora chama o `eslint` direto, com `eslint.config.mjs` no formato flat. Não
precisou de dependência nova — o `eslint-config-next` 16 já publica as regras
nesse formato.

Ele volta acusando **19 problemas (11 erros, 8 avisos), todos anteriores a este
trabalho e em outras frentes**: `react-hooks` nas páginas de `/admin` e nos
componentes de vídeo (`Reel`/`ReelClassic`), e `no-img-element` no gerador de
imagem de compartilhamento. Nenhum foi corrigido — são de outro escopo, e os de
vídeo ficam dentro da automação do Instagram, que não se toca. Ficam à vista, que
é o ponto de ligar o lint de volta.

Nenhum workflow de CI chama `npm run lint`, então isto não altera o resultado das
verificações automáticas.

**Sobra:** o `.eslintrc.json` ficou órfão (o ESLint 9 não o lê mais). Não foi
apagado — apagar arquivo pede autorização em duas etapas. Pode sair quando
alguém confirmar.
