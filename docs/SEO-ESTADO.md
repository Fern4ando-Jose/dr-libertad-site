# SEO do site — estado, pendências e um erro em aberto

> Documento de passagem de bastão. Escrito em 01/08/2026, no fim da rodada de SEO.
> Se você abriu uma sessão nova (aqui ou no seu computador), **leia isto primeiro**:
> ele diz o que já foi feito, o que falta, e o único ponto que precisa de uma
> decisão sua.

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

### Não verificado contra dados reais

A sessão que escreveu o blog **não tinha acesso ao Neon** nem à preview da Vercel
(política de rede do ambiente). Foi tudo testado com dados de mentira num servidor
de produção local. O que ninguém conferiu ainda:

- quantos dos artigos reais passam do corte de 200 caracteres
- se o texto sustenta uma página
- se PT e ES estão duplicados

**Antes de mergear o #218, abra `/br/blog` na preview da Vercel.** Se vier vazio
ou raso, o corte (`ARTICLE_MIN_BODY`) ou o filtro de idioma é o primeiro lugar a
olhar.

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

- a pendência do Search Console ficou para o dono
- ~~o handle do Instagram não pôde ser conferido direto na fonte~~ — resolvido
  pela sessão local em 01/08, que abriu as duas contas no navegador
- **o blog nunca foi testado contra o banco real** — esta continua de pé

A divisão que funcionou: a sessão da nuvem faz o código e os testes; a sessão
local verifica o que só existe fora do repositório (navegador, banco, Vercel).

Se quiser que uma sessão futura faça a parte da Vercel, é preciso liberar a rede
nas configurações do ambiente e guardar um `VERCEL_TOKEN` lá nas variáveis —
**nunca colar token no chat**. O Search Console continua sendo manual de todo
jeito: verificar propriedade de domínio exige uma conta Google logada.
