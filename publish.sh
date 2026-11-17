#!/bin/bash
# Publica: código-fonte -> repositório PRIVADO (caderno-de-campo-src, ramo main); casca pública -> caderno-de-campo (main, GitHub Pages).
set -e
cd "$(dirname "$0")"
MSG=${1:-"Nova versão"}
git add -A; git commit -qm "$MSG" || true
git push -q priv src:main
cd ../cdc-public; git add -A; git commit -qm "Nova versão" || true; git push -q origin main
echo "publicado"
