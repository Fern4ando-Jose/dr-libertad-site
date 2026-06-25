# 📥 Inbox de pendências
> Caixa de entrada para agentes da NUVEM (que não alcançam D:\Claude\.pendencias\).
> Acrescente UMA pendência por linha em `- [ ] texto`. A máquina local drena isto pro
> painel central (D:\Claude\.pendencias\) e ESVAZIA. Não é fonte de verdade — é só fila.

## Funil comment→DM (@drlibertad)
- [x] Endpoint webhook /api/webhooks/instagram (GET verify + POST validação X-Hub-Signature-256) + voice.ts + engagement.ts (decisões puras + funil private reply) + testes invariantes — CONSTRUÍDO e mergeado, flags DESLIGADAS. Runbook: docs/ENGAJAMENTO.md
- [x] Palavra-chave do funil "LIBERTAD"(ES)/"LIBERDADE"(PT) — agora é DEFAULT automático (= palavra de marca da conta); dono pode trocar via ENGAGEMENT_FUNNEL_KEYWORD_ES/_PT sem deploy
- [ ] DONO: setar na Vercel (prod) META_APP_SECRET (painel Meta → app → Config → Básico → Chave secreta) + META_WEBHOOK_VERIFY_TOKEN = 5b560cb797143aa52495ef28bd25eecf0327250dd57e8f23fd97198cb205708a
- [ ] DONO: no painel da Meta → Webhooks → Instagram → Callback URL https://<domínio>/api/webhooks/instagram, Verify token = o mesmo acima, Subscribe aos campos "comments" E "messages" (messages = DMs do Direct pro auto-responder)
- [ ] DONO: App Review (Advanced Access) dos 2 escopos: instagram_business_manage_comments + instagram_business_manage_messages — texto da submissão + roteiro do screencast prontos em docs/ENGAJAMENTO.md. Submeter SÓ depois de testar na conta-dona (Standard Access)
- [ ] DONO: ligar as flags na Vercel quando o App Review aprovar — ENGAGEMENT_ENABLED=on (comentários), ENGAGEMENT_FUNNEL_ENABLED=on (funil DM), ENGAGEMENT_DM_ENABLED=on (resposta a DM inbound)
- [x] Lead magnet PRODUZIDO: guia bilíngue "El Reinicio / O Reinício" (dopamina/detox, 11pág, voz da marca, regenerado por mercado). PDFs em public/lead/, servidos em drlibertad.com/lead/. É o DEFAULT do funil por idioma (sem env). Source offline em D:\Claude\.marca\dr-libertad\lead-magnet\. Runbook: docs/ENGAJAMENTO.md
- [ ] DONO: confirmar o VISUAL do lead magnet (abrir os 2 PDFs em public/lead/) — eu não vejo PDF localmente; se quiser ajuste de texto/design, eu regero
