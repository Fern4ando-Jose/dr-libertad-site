# Painel local — páginas para a máquina do dono

Páginas de **um arquivo só** feitas para viver fora do site, dentro do painel
local (`…\automações\Dr-liberdade-site\`). Abrem com duplo clique, sem servidor,
sem instalar nada.

| Arquivo | O que mostra |
|---|---|
| `pesquisa.html` | Acompanhamento da pesquisa: se está coletando, totais BR/ES, respostas por dia, país, campanha e as últimas respostas. Botão para o CSV e link para o painel completo. |

## Como instalar

Copiar o `.html` para a pasta do painel. Na primeira abertura ele pede o
`ADMIN_TOKEN` (Vercel → Settings → Environment Variables) e guarda **só naquele
navegador** (`localStorage`).

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
