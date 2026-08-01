# 📥 Inbox de pendências
> Caixa de entrada para agentes da NUVEM (que não alcançam D:\Claude\.claude\pendencias\).
> Acrescente UMA pendência por linha em `- [ ] texto`. A máquina local drena isto pro
> painel central (D:\Claude\.claude\pendencias\) e ESVAZIA. Não é fonte de verdade — é só fila.
>
> ⛔ **NUNCA cole valor de segredo aqui** (token, chave, secret, verify token). Este repo é
> PÚBLICO e este arquivo vive no HEAD **e** no histórico git (clonável p/ sempre). Use sempre
> placeholder: `<REDACTED — ver cofre>` / `$NOME_DA_VAR`. Já houve vazamento de
> `META_WEBHOOK_VERIFY_TOKEN` por aqui (2026-06-28).

- [ ] Copiar `painel-local\pesquisa.html` (já vem no repo, em `D:\Claude\dr-libertad-site\painel-local\`) para `...\automações\Dr-liberdade-site\` e, se o painel tiver índice, acrescentar o item "Pesquisa" apontando pro arquivo. Página de acompanhamento da pesquisa: abre com duplo clique, pede o `$ADMIN_TOKEN` uma vez e guarda no navegador.
- [ ] Conferir na Vercel se a env `$NEXT_PUBLIC_META_PIXEL_ID` existe no projeto dr-libertad-site (Settings → Environment Variables). Sem ela o Pixel NÃO carrega e o evento `pesquisa_enviada` não chega ao Gerenciador — a campanha paga sobe sem otimização por conversão. Se faltar: criar a env com o ID do Pixel do Business Manager e redeployar.
