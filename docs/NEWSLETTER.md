# Newsletter semanal (e-mail)

Captura → banco → envio semanal HÍBRIDO (curadoria da semana + 1 ensaio na voz da
marca), ES + PT. Tudo no nosso stack; envio pelo **Resend**. **Nasce DESLIGADO** —
nada é enviado até o dono configurar o Resend e ligar a flag.

## Estado das peças

| Peça | Onde | Estado |
|---|---|---|
| Captura de e-mail | `/api/subscribe` → tabela `subscribers` | ✅ no ar (gera `unsub_token` na inscrição) |
| Descadastro | `/api/unsubscribe?token=…` (soft, bilíngue) | ✅ no ar |
| Template + voz | `src/lib/newsletter.ts` (puro, testado) | ✅ |
| Geração do ensaio | Anthropic haiku, na rota | ✅ |
| Envio | Resend `/emails/batch` (lotes de 100) | ⏳ precisa de `RESEND_API_KEY` + DNS |
| Disparo semanal | `.github/workflows/newsletter.yml` (dom 12:00 UTC) | ✅ (gated) |
| Custo | balde `newsletter` em `src/lib/spend.ts` (teto US$0,10/dia) | ✅ |

## Fluxo

```
/api/newsletter/send?lang=es|pt  (POST, Bearer CRON_SECRET)
  1. gate de orçamento (balde "newsletter")
  2. inscritos ativos do idioma (unsubscribed_at IS NULL)
  3. curadoria = posts dos últimos 7 dias (title) + temas (semente do ensaio)
  4. gera o ENSAIO (haiku, voz da marca) → logSpend
  5. renderEmail (curadoria + ensaio + LINK DE DESCADASTRO obrigatório)
  6a. ?dry=1  → devolve a prévia (html + assunto + nº de destinatários), NÃO envia
  6b. envio real → SÓ se NEWSLETTER_ENABLED=1 E RESEND_API_KEY setada; senão "skipped"
```

Regra inviolável: **todo e-mail carrega o link de descadastro** (legal + a Política de
Privacidade promete). Coberto por `newsletter.invariants.test.ts`.

## AÇÃO DO DONO — ligar o envio (2 passos)

1. **Conta no Resend** (resend.com) → criar uma **API key** → setar `RESEND_API_KEY`
   na **Vercel** (Production). Free tier: 3.000 e-mails/mês, sobra muito.
2. **Verificar o domínio `drlibertad.com`** no Resend → ele dá uns **registros DNS**
   (SPF/DKIM) p/ colar onde o domínio está hospedado. Sem isso o e-mail cai em spam
   (ou o Resend recusa o envio). Remetente padrão: `newsletter@drlibertad.com`
   (override por `NEWSLETTER_FROM_ADDR`).
3. Quando estiver pronto: setar **`NEWSLETTER_ENABLED=1`** (Vercel). Só então o envio
   real acontece.

> Antes de ligar de vez: rode um **dry-run** (`workflow_dispatch` com `dry=true`, o
> padrão) e olhe a prévia no log; ou `POST /api/newsletter/send?lang=pt&dry=1` com o
> Bearer. O envio real é uma ação outward-facing — **confirme a prévia antes**.

## Envs

| Env | Onde | Para quê |
|---|---|---|
| `RESEND_API_KEY` | Vercel (Production) | enviar pelo Resend |
| `NEWSLETTER_ENABLED` | Vercel | flag-mestra do envio real (off = só dry/skip) |
| `NEWSLETTER_FROM_ADDR` | Vercel (opcional) | remetente; default `newsletter@drlibertad.com` |
| `CRON_SECRET` | já existe | autentica a rota |
| `SITE_URL` | já existe (secret GH) | base das chamadas do workflow |
| `ANTHROPIC_API_KEY` | já existe | gera o ensaio |

## Notas

- **Single opt-in** hoje (salva direto). Endurecer depois (double opt-in / rate-limit
  no formulário) se aparecer abuso.
- Curadoria usa `posts` (só carrossel grava lá) — v1 lista títulos da semana + botão
  p/ o perfil. Permalink real por post não é guardado; melhoria futura.
- ES e PT **sempre juntos** (workflow roda os dois) — [[run-both-languages]].
