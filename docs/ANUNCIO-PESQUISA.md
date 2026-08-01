# Anúncio pago da pesquisa — criativos e acompanhamento

Tudo que a campanha paga da pesquisa "Redes Sociais e Relacionamentos" precisa:
a arte (BR e ES), os links marcados e onde ver o resultado.

---

## 1. Os arquivos

`npm run render:ads` gera quatro PNGs em `public/ads/`:

| Arquivo | Tamanho | Onde entra |
|---|---|---|
| `pesquisa-br-feed-1080x1350.png` | 1080×1350 (4:5) | Feed do Instagram/Facebook — BR |
| `pesquisa-br-reel-1080x1920.png` | 1080×1920 (9:16) | Reels / Stories, e capa do reel — BR |
| `pesquisa-es-feed-1080x1350.png` | 1080×1350 (4:5) | Feed — ES |
| `pesquisa-es-reel-1080x1920.png` | 1080×1920 (9:16) | Reels / Stories, e capa do reel — ES |

No 9:16 as faixas de cima (240 px) e de baixo (330 px) ficam **vazias de
propósito**: é onde o Instagram desenha o perfil, a legenda e os botões. Nada
importante mora ali, então nada importante é coberto.

Para mudar a copy: `scripts/render-ad-cards.mjs`, objeto `COPY`, e rodar de novo.
O render **falha de propósito** se o texto novo não couber na moldura — arte que
vaza não vira PNG em silêncio.

---

## 1b. O QR (para compartilhar fora da internet)

`npm run render:qr` gera em `public/qr/`:

| Arquivo | O que é |
|---|---|
| `pesquisa-br-qr.png` / `pesquisa-es-qr.png` | QR puro, 1600×1600 — colar em qualquer arte, imprimir, projetar |
| `pesquisa-br-card-1080x1350.png` / `pesquisa-es-card-…` | cartão da marca pronto para mandar no story, no grupo, no WhatsApp |

O QR aponta para **`drlibertad.com/qr`** (ES: `/qr-es`), que o `next.config.js` redireciona
para a pesquisa **já com a marcação de campanha** (`utm_source=qr&utm_medium=offline`). Ou
seja: no painel dá para separar quem veio do QR de quem veio do anúncio pago — e o endereço
impresso continua curto, que é o que faz o código ser lido de longe.

Correção de erro **H (30%)**: o código continua abrindo sujo, dobrado ou com um canto tapado.
O script **decodifica os PNGs que ele mesmo gerou** e falha se algum não apontar para a URL
certa — QR bonito que não abre é lixo caro.

---

## 2. Os links (é isto que faz o painel enxergar o anúncio)

Cada criativo entra no Gerenciador com um link **marcado**. Sem a marcação, a
resposta chega e o painel só sabe dizer "veio de algum lugar".

**BR**

```
https://www.drlibertad.com/pesquisa?utm_source=meta&utm_medium=cpc&utm_campaign=pesquisa-br&utm_content=card-feed
https://www.drlibertad.com/pesquisa?utm_source=meta&utm_medium=cpc&utm_campaign=pesquisa-br&utm_content=card-reel
```

**ES**

```
https://www.drlibertad.com/investigacion?utm_source=meta&utm_medium=cpc&utm_campaign=investigacion-es&utm_content=card-feed
https://www.drlibertad.com/investigacion?utm_source=meta&utm_medium=cpc&utm_campaign=investigacion-es&utm_content=card-reel
```

Trocou o criativo? Troca só o `utm_content` (`card-feed-b`, `gancho-ciume`, …).
É assim que se compara arte contra arte dentro da mesma campanha.

O que é gravado da marcação: **só** `utm_source / utm_medium / utm_campaign /
utm_content`, em coluna separada das respostas — mais o **código do país** (BR, MX, AR…),
que a plataforma informa no cabeçalho da requisição. Nenhum IP, nenhum user-agent,
nenhum identificador — o termo de participação continua verdadeiro ao pé da letra.

---

## 3. Onde acompanhar

**Painel:** `/admin/pesquisa` (aba "Pesquisa"; entra com o `ADMIN_TOKEN` da Vercel).

Mostra, na janela escolhida (7 / 30 / 90 dias / tudo) e por idioma:

- se o motor está coletando e **quando foi a última resposta**;
- total, BR, ES, quantos deixaram e-mail para a entrevista, quantos escreveram história;
- respostas **por dia** (a curva que sobe quando o anúncio liga);
- **de onde vieram** — a tabela por campanha, que é onde o dinheiro pago aparece;
- **de que país** — clicar numa linha recorta o painel inteiro naquele país (México × Espanha
  dentro do mesmo ES, Brasil × Portugal dentro do BR). O país vem do cabeçalho de geo da
  plataforma; nenhum IP é lido ou guardado, e o CSV traz a coluna `country`;
- item a item, com "prefiro não responder" contado à parte (é ausência, não resposta);
- as histórias (respostas abertas) e as últimas respostas **inteiras**;
- CSV para analisar fora — com ou sem a coluna de e-mail.

**Pixel da Meta:** a página já dispara `PageView` e, na tela de obrigado, o evento
`pesquisa_enviada` — desde que `NEXT_PUBLIC_META_PIXEL_ID` esteja setada na Vercel.
Sem a env, nenhum byte do Pixel carrega. É esse evento que o Gerenciador usa para
otimizar por conversão, então **confira a env antes de subir a campanha**.
✅ Conferido no ar em 2026-08-01: a env existe em Production e o navegador carrega
`connect.facebook.net/en_US/fbevents.js` + `signals/config/<id>` em `/pesquisa`.

**Página local (fora do site):** `Meus Projetos\Automações\Dr-liberdade-site\pesquisa.html`
— arquivo único, abre com duplo clique, lê a MESMA rota (`/api/survey/results`) e guarda o
token só no navegador (`localStorage`, chave `dl_admin_token`). Instalada em 2026-08-01; a
cópia-fonte versionada fica em `painel-local/pesquisa.html`. **Não existe índice nessa pasta
e não se deve criar um** — em 27/07/2026 o dono determinou que só existe um painel, o
painel-adm online.

> ⚠️ **`ADMIN_TOKEN` só passou a existir na Vercel em 2026-08-01.** Antes disso a rota
> `/api/survey/results` devolvia 401 para qualquer token e nenhum painel mostrava número
> (o mesmo valia para `/admin/reprovadas`, `/api/guardian` e `/api/comment-draft`). A chave
> está em **Production** e o valor mora só no cofre local `.claude/chaves/dr-libertad.env` —
> nunca em arquivo deste repositório, que é público. Trocar a chave exige **reimplantar**: o
> deployment que já está no ar carrega as envs do momento em que foi criado.

---

## 4. A ideia visual — "Evidência Silenciosa"

*A filosofia por trás da arte, para as próximas peças nascerem irmãs desta.*

A chapa é escura porque a pergunta é íntima: fundo tinta, quase preto, com uma luz
baixa entrando pela quina superior esquerda como quem acende um abajur, não um
refletor. Sobre esse papel escuro, uma única voz tipográfica em serifa (Fraunces,
a mesma do site) faz a pergunta em escala de manchete — e uma segunda voz, mono,
faz o trabalho de laboratório: rótulos, condições, endereço. Duas vozes, nunca três.
O contraste entre a serifa emocional e a mono clínica **é** o argumento da peça:
sentimento medido com régua.

O vermelho da marca não decora. Ele marca exatamente uma coisa por vez — a metade
da pergunta que dói ("ou pior?"), a régua fina que fecha o bloco, o caminho no fim
do endereço. Onde o vermelho aparece, é porque ali está o que interessa; usado em
mais de um lugar por motivo diferente, ele deixaria de significar.

O campo de traços no rodapé é o coração da peça e o único elemento não-textual.
Cada marca é uma resposta; algumas acendem em vermelho. Lido de longe, é textura;
lido de perto, é uma amostra sendo colhida. É a prova visual da tese — o que todo
mundo trata como opinião pode ser contado, alinhado, medido — e não custa uma linha
de explicação. Acumulação paciente no lugar de ilustração.

O ritmo é de página impressa, não de tela: moldura fina como corte de papel, margens
largas, hierarquia em quatro degraus (rótulo, entrada, manchete, condições) que a
vista desce sem hesitar. O vazio não é sobra — é o que dá peso à pergunta. Toda
medida existe por uma razão, e a peça só está pronta quando nada pode ser tirado
sem que ela perca sentido.

Regra de sucessão: peça nova mantém o papel escuro, a dupla serifa/mono, o vermelho
de acento único e o campo de marcas; muda a pergunta. A identidade está no sistema,
não no texto.
