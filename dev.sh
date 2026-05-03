#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${ROOT_DIR}/.logs"
BACKEND_LOG="${LOG_DIR}/backend.log"

if ! command -v uv >/dev/null 2>&1; then
  echo "Error: uv is required. Install it from https://github.com/astral-sh/uv" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required to run the frontend." >&2
  exit 1
fi

mkdir -p "${LOG_DIR}"

cd "${ROOT_DIR}"

if [[ ! -d ".venv" ]]; then
  echo "Creating virtual environment with uv..."
  uv venv
fi

REQ_STAMP="${ROOT_DIR}/.venv/.req-stamp"
if [[ ! -f "${REQ_STAMP}" || "${ROOT_DIR}/requirements.txt" -nt "${REQ_STAMP}" ]]; then
  echo "Syncing Python dependencies..."
  uv pip install -r requirements.txt >/dev/null
  touch "${REQ_STAMP}"
fi

PYTHON_BIN="${ROOT_DIR}/.venv/bin/python"
if [[ "${OS:-}" == "Windows_NT" && -f "${ROOT_DIR}/.venv/Scripts/python.exe" ]]; then
  PYTHON_BIN="${ROOT_DIR}/.venv/Scripts/python.exe"
fi

NPM_STAMP="${ROOT_DIR}/client/node_modules/.install-stamp"
if [[ ! -f "${NPM_STAMP}" || "${ROOT_DIR}/client/package-lock.json" -nt "${NPM_STAMP}" ]]; then
  echo "Installing frontend dependencies..."
  (cd "${ROOT_DIR}/client" && npm install >/dev/null)
  touch "${NPM_STAMP}"
fi

echo "Starting Flask API (logs -> ${BACKEND_LOG})..."
cd "${ROOT_DIR}"
"${PYTHON_BIN}" "${ROOT_DIR}/app.py" >"${BACKEND_LOG}" 2>&1 &
BACKEND_PID=$!

cleanup() {
  echo
  echo "Stopping dev servers..."
  kill "${BACKEND_PID}" 2>/dev/null || true
  wait "${BACKEND_PID}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting Next.js dev server..."
echo "Backend: http://127.0.0.1:5004 (tail -f ${BACKEND_LOG})"
echo "Frontend: http://localhost:3000"
cd "${ROOT_DIR}/client"
npm run dev
