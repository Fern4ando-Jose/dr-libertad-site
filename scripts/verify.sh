#!/usr/bin/env bash
# =============================================================
# scripts/verify.sh — Verificação de integridade do dr-libertad-site
# Rodar após QUALQUER edição, antes de commitar.
# É o mesmo script que o pre-commit-guard do workspace executa.
# Uso: bash scripts/verify.sh
#
# Ordem (falha PARA na primeira etapa vermelha, set -e):
#   1. typecheck  — tsc --noEmit  (pega o satori/edge type-error)
#   2. testes     — vitest run    (invariantes de rotação/lang-guard/run-ledger)
#   3. build      — next build    (a família Satori / /api/og só quebra aqui)
# =============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "======================================================="
echo "  Dr. Libertad — Verificação de Integridade"
echo "======================================================="

# -- 1. Typecheck --------------------------------------------
echo ""
echo "> [1/3] Typecheck (tsc --noEmit)"
npx tsc --noEmit
echo "  OK  typecheck limpo"

# -- 2. Testes -----------------------------------------------
echo ""
echo "> [2/3] Testes (vitest run)"
npm test
echo "  OK  testes verdes"

# -- 3. Build ------------------------------------------------
echo ""
echo "> [3/3] Build de produção (next build)"
npm run build
echo "  OK  build concluído"

# -- Resultado -----------------------------------------------
echo ""
echo "======================================================="
echo "  OK  TUDO OK — seguro para commitar"
echo "======================================================="
echo ""
