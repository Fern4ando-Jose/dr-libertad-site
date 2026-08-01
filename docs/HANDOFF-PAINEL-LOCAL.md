# Handoff — o que só a máquina local termina

> ## ✅ CONCLUÍDO em 2026-08-01 — este arquivo vira histórico
>
> As três tarefas foram executadas na máquina do dono. O que a sessão da nuvem não podia saber:
>
> 1. **A pasta do painel local não existia.** Foi criada em
>    `D:\Claude\Meus Projetos\Automações\Dr-liberdade-site\` e o `pesquisa.html` está lá.
>    **Não há índice** para acrescentar item — e nenhum foi criado de propósito: em 27/07/2026 o
>    dono determinou que *só existe UM painel*, o painel-adm online, e o painel local de
>    automações foi apagado por isso. Uma página avulsa de acompanhamento não recria aquele
>    painel; um índice novo, sim.
> 2. **O Pixel já estava no ar.** `NEXT_PUBLIC_META_PIXEL_ID` existia em Production; a prova é o
>    navegador carregando `connect.facebook.net/en_US/fbevents.js` e o `signals/config/<id>` em
>    `/pesquisa`. Nada foi criado.
> 3. **A chave do painel (`ADMIN_TOKEN`) NÃO existia em nenhum ambiente da Vercel** — este era o
>    bloqueio real: `/api/survey/results` devolvia 401 para qualquer token, então nem o painel do
>    site nem o local mostravam número. A chave foi criada em Production (valor só no cofre local,
>    nunca em arquivo do repositório) e o site foi reimplantado com o mesmo código já no ar.
>
> O `PENDENCIAS.inbox.md` está vazio de novo.

> Para uma sessão do Claude Code rodando **no PC** (`D:\Claude\dr-libertad-site`).
> A sessão da nuvem fez tudo que dependia do repositório e do site; sobraram duas
> coisas que exigem disco local e conta da Vercel. Este arquivo é o escopo inteiro
> — não é preciso reconstituir a conversa anterior.

**Prompt para colar na sessão local:**
`Leia docs/HANDOFF-PAINEL-LOCAL.md e execute as três tarefas, na ordem.`

---

## Contexto em cinco linhas

A pesquisa "Redes Sociais e Relacionamentos" (`/pesquisa` BR, `/investigacion` ES)
ganhou acompanhamento: painel no site em `/admin/pesquisa`, gravação de campanha
(`utm_*`) e país por resposta, meta de 10 mil por idioma, criativos de anúncio em
`public/ads/` e QR em `public/qr/`. O banco já foi migrado (colunas `source` e
`country` existem em produção). Falta plugar o painel **local** e conferir o Pixel.

---

## Tarefa 1 — instalar a página no painel local

O arquivo já está no repositório, portanto já está no PC:

```
D:\Claude\dr-libertad-site\painel-local\pesquisa.html
```

1. Copiar para a pasta do painel local: `...\automações\Dr-liberdade-site\pesquisa.html`
   (o caminho exato do painel é o que o dono já usa; se houver dúvida, procurar a
   pasta `automações` sob `D:\Claude\.claude\` e listar o que existe lá dentro
   antes de escrever).
2. Se essa pasta tiver um **índice** (um `index.html`, um `README`, um menu que
   lista as páginas), acrescentar o item **"Pesquisa — acompanhamento"** apontando
   para o arquivo, **no mesmo padrão dos itens que já existem** — copiar o formato
   do vizinho, não inventar um novo.
3. Verificar: abrir o `pesquisa.html` copiado. Ele deve pedir o `ADMIN_TOKEN`;
   colando o token (Vercel → Settings → Environment Variables), tem de aparecer o
   semáforo ("Coletando · última resposta há…") e os números. Se aparecer "Sem
   resposta do site", conferir a linha `const BASE` no topo do arquivo.

⚠️ O `ADMIN_TOKEN` fica só no navegador (`localStorage`). **Não** escrever o valor
dentro do HTML, nem em qualquer arquivo do repositório — este repo é público.

## Tarefa 2 — conferir o Pixel da Meta

A campanha paga depende disto e **ninguém além de quem tem a conta consegue ver**.

1. Vercel → projeto `dr-libertad-site` → Settings → Environment Variables →
   procurar `NEXT_PUBLIC_META_PIXEL_ID` (se a CLI da Vercel estiver logada no PC,
   `vercel env ls` resolve mais rápido).
2. **Se faltar:** criar com o ID do Pixel do Business Manager (Production) e
   redeployar — a env é lida no build, então sem redeploy ela não vale.
3. **Prova de que está no ar** (vale mais que a env existir): abrir
   `https://www.drlibertad.com/pesquisa` com o DevTools na aba Network e confirmar
   que `connect.facebook.net/en_US/fbevents.js` carrega. Sem a env, nenhum byte do
   Pixel entra na página — é assim por construção (`src/components/survey/MetaPixel.tsx`).

⚠️ Nunca colar o ID do Pixel no `PENDENCIAS.inbox.md` nem em outro arquivo versionado.

## Tarefa 3 — drenar a fila

`PENDENCIAS.inbox.md` (na raiz do repo) tem as duas pendências acima enfileiradas
para o painel central. Depois de executá-las, drenar o arquivo como de costume —
ele é fila, não fonte de verdade.

---

## Como saber que acabou

- a página do painel local abre da pasta do painel e mostra o semáforo com números;
- `fbevents.js` aparece no Network ao abrir `/pesquisa` em produção;
- o `PENDENCIAS.inbox.md` está vazio de novo.

Nada disso exige tocar no código do site. Se aparecer vontade de mudar o site,
é sinal de que algo saiu do escopo — vale perguntar antes.
