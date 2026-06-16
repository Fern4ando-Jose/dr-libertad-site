# Pendências — Dr. Libertad

> O que está PRONTO esperando ação, e o que ainda FALTA. Atualizado em 2026-06-16.

## ✅ Pronto, aguardando você (branch `feat/multi-idioma` — NÃO mergeado)

Base **multi-idioma** (ES + PT-BR) inteira, validada por `tsc`, **nada no ar ainda**:
- `src/lib/accounts.ts`, `?lang=` em `/api/publish` e `/api/publish-reel`,
  `generateContent(lang)`, `handle`/`brand` por props nos 2 motores de Reel.
- 3 workflows PT (`*-pt.yml`) espelhando os ES com `lang=pt`.
- `CLAUDE.md` documenta tudo.

## 🔜 Para ATIVAR o PT-BR (você + eu)

1. **Conectar @dr.liberdade.br à API** (você): tornar Profissional → gerar token no
   app da Meta → pegar account-id (`graph.instagram.com/me?fields=id,username`).
2. **Setar credenciais PT** (você me passa, eu seto): secrets no GitHub **e** envs no
   Vercel — `META_ACCESS_TOKEN_PT` e `META_INSTAGRAM_ACCOUNT_ID_PT`.
3. **Mergear** o PR `feat/multi-idioma` na `main` (você revisa primeiro).
4. **Testar PT sem publicar**: Actions → "Instagram Reels … (PT-BR)" → Run workflow →
   `publish: no` → revisar o mp4 (copy PT + @dr.liberdade.br). **Conferir que a copy é
   BR-NATIVA, não tradução do ES** — gancho, referências e jeito de falar brasileiros
   (vem do `marketBrief` em `accounts.ts`). Se soar importado/traduzido, ajustar o brief.
5. ✅ **Refresh do token PT**: feito (2026-06-16). `/api/refresh-token` agora itera
   sobre toda conta com `dbTokenKey` (ES + PT). A 1ª rodada do cron lê a env
   `META_ACCESS_TOKEN_PT`, renova e **semeia** `meta_access_token_pt` no DB; daí em
   diante o DB é a fonte e renova sozinho mensalmente. Falhas isoladas por conta
   (PT <24h não derruba o ES). Sem seed manual.

## 🔍 Validar (do que já está no ar)

- **Reel CLÁSSICO** (`ReelClassic` + `illus=1`): foi disparado um preview hoje
  (`publish=no`); **confirmar o mp4** antes de confiar no cron das 19h BRT.
- Acompanhar os 4 primeiros crons reais (3 vídeo + 1 clássico) amanhã.

## 🧹 Melhorias / dívidas (não urgentes)

- ✅ **og do carrossel em PT**: feito (2026-06-16). `/api/og` agora recebe `?lang=`
  e o `publish` o repassa. Localizados por idioma: marca (Folio + rodapé do CTA),
  os 6 rótulos de categoria, "Deslize para ler", "UMA PERGUNTA" e "Responda nos
  comentários". Default `es` → ES inalterado. Smoke test HTTP 200 nos 3 slides ×2 idiomas.
- **Governança de custo**: sessão dedicada (chip "Painel de créditos") — inventário
  de gasto + teto/gate + reuso da ilustração do dia. fal já ficou sem saldo 1x.
- **Grafia do @ ES**: `@dr.liberdad` é híbrido; se quiser simetria, `@dr.libertad.es`
  um dia (perde histórico — baixa prioridade).
- **Música PT**: hoje `public/music/bed.wav` é compartilhada (instrumental, sem
  idioma) — serve as duas. OK como está.
