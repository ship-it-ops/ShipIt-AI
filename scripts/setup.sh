#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

errors=0

# --- Prereq checks ---

# Node >= 22
if command -v node &>/dev/null; then
  NODE_VERSION=$(node -v | sed 's/^v//' | cut -d. -f1)
  if (( NODE_VERSION < 22 )); then
    echo "ERROR: Node >= 22 required (found $(node -v))"
    errors=1
  else
    echo "OK  node $(node -v)"
  fi
else
  echo "ERROR: node not found"
  errors=1
fi

# pnpm (auto-install via corepack if missing)
if ! command -v pnpm &>/dev/null; then
  echo "pnpm not found — enabling via corepack..."
  if command -v corepack &>/dev/null; then
    corepack enable
    echo "OK  pnpm installed via corepack ($(pnpm -v))"
  else
    echo "ERROR: pnpm not found and corepack unavailable — install with: brew install pnpm"
    errors=1
  fi
else
  echo "OK  pnpm $(pnpm -v)"
fi

# Docker
if command -v docker &>/dev/null; then
  echo "OK  docker $(docker --version | awk '{print $3}' | tr -d ',')"
else
  echo "ERROR: docker not found — install Docker Desktop"
  errors=1
fi

if (( errors )); then
  echo ""
  echo "Fix the errors above and re-run: pnpm setup"
  exit 1
fi

# --- .env ---
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Copied .env.example -> .env"
else
  echo "OK  .env already exists"
fi

# --- Install ---
echo ""
echo "Installing dependencies..."
pnpm install

# --- Build ---
echo ""
echo "Building packages..."
pnpm turbo build

echo ""
echo "Setup complete!"
