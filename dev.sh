#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${ROOT_DIR}/.logs"
BACKEND_LOG="${LOG_DIR}/backend.log"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-5004}"
FRONTEND_HOST="${FRONTEND_HOST:-localhost}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://${BACKEND_HOST}:${BACKEND_PORT}/api}"

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

check_port() {
  local host="$1"
  local port="$2"
  local label="$3"

  if "${PYTHON_BIN}" - "$host" "$port" <<'PY'
import socket
import sys

host = sys.argv[1]
port = int(sys.argv[2])

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    sock.settimeout(0.25)
    sys.exit(0 if sock.connect_ex((host, port)) == 0 else 1)
PY
  then
    echo "Error: ${label} port ${port} is already in use on ${host}." >&2
    exit 1
  fi
}

check_port "${BACKEND_HOST}" "${BACKEND_PORT}" "Backend"
check_port "127.0.0.1" "${FRONTEND_PORT}" "Frontend"

NPM_STAMP="${ROOT_DIR}/client/node_modules/.install-stamp"
if [[ ! -f "${NPM_STAMP}" || "${ROOT_DIR}/client/package-lock.json" -nt "${NPM_STAMP}" ]]; then
  echo "Installing frontend dependencies..."
  (cd "${ROOT_DIR}/client" && npm install >/dev/null)
  touch "${NPM_STAMP}"
fi

echo "Starting Flask API (logs -> ${BACKEND_LOG})..."
cd "${ROOT_DIR}"
PORT="${BACKEND_PORT}" "${PYTHON_BIN}" "${ROOT_DIR}/app.py" >"${BACKEND_LOG}" 2>&1 &
BACKEND_PID=$!

cleanup() {
  trap - EXIT INT TERM
  echo
  echo "Stopping dev servers..."
  kill "${BACKEND_PID}" 2>/dev/null || true
  wait "${BACKEND_PID}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 1
if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
  echo "Error: Flask API failed to start. Last log lines:" >&2
  tail -n 40 "${BACKEND_LOG}" >&2 || true
  exit 1
fi

echo "Starting Next.js dev server..."
echo "Backend: http://${BACKEND_HOST}:${BACKEND_PORT} (tail -f ${BACKEND_LOG})"
echo "Frontend: http://${FRONTEND_HOST}:${FRONTEND_PORT}"
echo "API env: NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"
cd "${ROOT_DIR}/client"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" npm run dev -- -H "${FRONTEND_HOST}" -p "${FRONTEND_PORT}"
