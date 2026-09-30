#!/usr/bin/env bash
set -euo pipefail
echo "[NUMEN] Building and starting the platform..."
docker compose up --build
