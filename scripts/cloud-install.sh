#!/usr/bin/env bash
set -euo pipefail
cd /workspace/WildlifeDATA
export UV_CACHE_DIR=/workspace/.cache/uv
export npm_config_cache=/workspace/.cache/npm
uv sync --project backend --frozen
npm ci --prefix frontend --no-audit --no-fund
npm run build --prefix frontend
python3 scripts/create-local-env.py --path /workspace/.wildlife-data.env
python3 scripts/cloud-compose.py up -d --build --wait --wait-timeout 120
python3 scripts/test-backend.py --env-file /workspace/.wildlife-data.env
backend/.venv/bin/ruff check backend
python3 scripts/smoke.py --env-file /workspace/.wildlife-data.env
