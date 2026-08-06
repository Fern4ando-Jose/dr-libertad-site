# Painel local — páginas para a máquina do dono

Páginas de **um arquivo só** feitas para viver fora do site, dentro do painel
local (`…\automações\Dr-liberdade-site\`). Abrem com duplo clique, sem servidor,
sem instalar nada.

| Arquivo | O que mostra |
|---|---|
| `pesquisa.html` | Acompanhamento da pesquisa: se está coletando, totais BR/ES, respostas por dia, país, campanha e as últimas respostas. Botão para o CSV e link para o painel completo. |

## Como chega até o dono (NÃO se copia à mão)

O arquivo daqui é a **fonte**; a pasta que o dono abre
(`D:\Claude\Meus Projetos\Automações\Dr-liberdade-site\`) recebe um **espelho** que se
refaz sozinho:

- **quem se refaz:** a tarefa do Windows **`DrLibertad-PainelLocal-Espelho`**, todo dia às
  **07:20** (registro em `.claude\logs\painel-local-espelho.log`);
- **na hora, sem esperar o dia virar:** `node painel-local/instalar.mjs` — só escreve se
  estiver diferente;
- **alarme:** `node painel-local/instalar.mjs --conferir` sai com erro se as duas
  divergirem. **Mexeu no `.html`? rode o instalar** — não confie na memória de ninguém.

> ⛔ **Antes de 06/08/2026 este README mandava "copiar o `.html` para a pasta"** — e foi
> exatamente o que aconteceu: a tela do dono ficou parada em 01/08 (13.714 bytes) enquanto a
> daqui já tinha o bloco "Histórias" e os rótulos em português (17.267). As duas abrem, as
> duas mostram número — só que a dele mostrava menos, e nada acusava. **Passo manual é
> defeito (P8).**

Na primeira abertura a página pede o `ADMIN_TOKEN` (Vercel → Settings → Environment
Variables) e guarda **só naquele navegador** (`localStorage`).

O token **nunca** entra no arquivo: por isso a página pode ser copiada,
versionada aqui no Git e mandada por e-mail sem carregar segredo junto.

## Por que isto funciona a partir do disco

A página lê `GET /api/survey/results` do site em produção. Arquivo aberto do
disco tem origem `null`, então a rota devolve cabeçalhos de CORS — o que não
afrouxa nada, porque a única chave dela é o `Bearer ADMIN_TOKEN`, que o navegador
jamais anexa sozinho. Sem token, qualquer origem leva 401.

## Fonte única

Nenhum número é calculado aqui: é a mesma rota que alimenta `/admin/pesquisa`.
Se os dois discordarem, o errado é a página — nunca o banco.

## Esta tela ainda faz falta? (pendente da palavra do dono)

Em **01/08/2026** o dono ordenou que a pesquisa fosse acompanhada **dentro do painel-adm**, e
essa aba **já existe** (`painel-adm/src/app/pesquisa`), lendo a mesma rota pelo servidor —
o token não desce ao navegador. O que **só existe aqui** é a **ficha completa de cada pessoa**
(as 24 respostas de um respondente, lado a lado): no painel-adm as respostas abertas aparecem
**agrupadas por pergunta**, e o dado pessoal desce só pela **planilha**, de propósito (P3).
Enquanto ele não disser se aposenta esta tela, ela continua no ar e espelhada.
