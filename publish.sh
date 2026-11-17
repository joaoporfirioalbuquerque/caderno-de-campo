#!/bin/bash
# Publica: código-fonte -> repositório PRIVADO (caderno-de-campo-src, ramo main); casca pública -> caderno-de-campo (main, GitHub Pages).
set -e
cd "$(dirname "$0")"
MSG=${1:-"Nova versão"}
git add -A; git commit -qm "$MSG" || true
git push -q priv src:main
cd ../cdc-public; git add -A; git commit -qm "Nova versão" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_019SxizD9qnrKsfsmJxUKTiZ" || true; git push -q origin main
echo "publicado"
