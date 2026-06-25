# 📥 Inbox de pendências
> Caixa de entrada para agentes da NUVEM (que não alcançam D:\Claude\.pendencias\).
> Acrescente UMA pendência por linha em `- [ ] texto`. A máquina local drena isto pro
> painel central (D:\Claude\.pendencias\) e ESVAZIA. Não é fonte de verdade — é só fila.

## Funil comment→DM (@drlibertad)
- [x] Endpoint webhook /api/webhooks/instagram (GET verify + POST validação X-Hub-Signature-256) + voice.ts + engagement.ts (decisões puras + funil private reply) + testes invariantes — CONSTRUÍDO e mergeado, flags DESLIGADAS. Runbook: docs/ENGAJAMENTO.md
- [x] Palavra-chave do funil "LIBERTAD"(ES)/"LIBERDADE"(PT) — agora é DEFAULT automático (= palavra de marca da conta); dono pode trocar via ENGAGEMENT_FUNNEL_KEYWORD_ES/_PT sem deploy
- [ ] DONO: setar na Vercel (prod) META_APP_SECRET (painel Meta → app → Config → Básico → Chave secreta) + META_WEBHOOK_VERIFY_TOKEN = 5b560cb797143aa52495ef28bd25eecf0327250dd57e8f23fd97198cb205708a
- [ ] DONO: no painel da Meta → Webhooks → Instagram → Callback URL https://<domínio>/api/webhooks/instagram, Verify token = o mesmo acima, Subscribe ao campo "comments"
- [ ] DONO: App Review (Advanced Access) dos 2 escopos: instagram_business_manage_comments + instagram_business_manage_messages — texto da submissão + roteiro do screencast prontos em docs/ENGAJAMENTO.md. Submeter SÓ depois de testar na conta-dona (Standard Access)
- [ ] DONO: ligar as flags ENGAGEMENT_ENABLED=on (e depois ENGAGEMENT_FUNNEL_ENABLED=on) na Vercel quando o App Review aprovar
- [ ] Lead magnet = guia grátis bilíngue (PDF ES+PT, ~10pág, 1 dos 5 pilares) — isca do funil; eu produzo via skill lancamento-ebook-bilingue e hospedo o link → daí setar ENGAGEMENT_LEAD_NAME/_URL
