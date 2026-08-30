# GP Tracker

GP Tracker powers [1700chess.sh](https://www.1700chess.sh), a tracker for the
Chess Kenya Grand Prix circuit. It publishes completed and upcoming events,
Open and Ladies rankings, player histories, tournament standings, exports, and
season insights.

## Architecture

### Backend

- Python 3.9+ and Flask 3
- SQLite for tournaments, players, results, ranking snapshots, and calculated rankings
- Beautiful Soup and Requests for Chess-Results scraping
- Gunicorn on Fly.io with a persistent `/data/gp_tracker.db` volume

The backend entry point is `app.py`. Persistence and ranking calculations live
in `db.py`; Chess-Results parsing lives in `chess_results.py`; per-player result
validation lives in `result_validator.py`.

### Frontend

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Radix UI primitives and shadcn-style components
- Vercel hosting and Speed Insights

The frontend is in `client/`. Public data requests go through
`client/services/api.ts` and share the `gp-data` Next.js cache tag.

## Local development

### Prerequisites

- [uv](https://github.com/astral-sh/uv)
- Node.js and npm

Run both applications with:

```bash
./dev.sh
```

This creates or refreshes `.venv`, installs dependencies when needed, and starts:

- Flask API: http://127.0.0.1:5004
- Next.js frontend: http://localhost:3000
- Backend log: `.logs/backend.log`

Useful overrides:

```bash
OPEN_BROWSER=0 ./dev.sh
BACKEND_PORT=5014 FRONTEND_PORT=3014 ./dev.sh
```

For a manual setup:

```bash
uv venv
uv pip install -r requirements.txt
uv run python app.py
```

```bash
cd client
npm install
NEXT_PUBLIC_API_URL=http://127.0.0.1:5004/api npm run dev
```

## Tournament update workflow

The supported update path is the admin scraper at `/admin/scrape`, backed by:

1. `POST /api/admin/scrape/sections`
2. `POST /api/admin/scrape/preview`
3. `POST /api/admin/scrape/validate`
4. `POST /api/admin/scrape/commit`

Use the numeric ID from a Chess-Results `tnr<id>.aspx` URL. Always inspect the
available sections first because Open and Ladies may use different source IDs.
The commit step saves the validated results and recalculates rankings.

After committing a completed tournament, remove its entry from
`client/lib/active-tournaments.ts`. Postponed or unfinished events should remain
there with corrected dates or status.

Ranking rules:

- Only eligible Kenyan players count.
- Results with `result_status = 'valid'` or legacy `NULL` status count.
- Open rankings use Open-section results only.
- Ladies rankings include female players from all sections and every player in a Ladies section.
- Rankings use the average of a player's best one, two, three, or four TPRs, prioritizing players with more qualifying tournaments.

Some old CLI maintenance scripts are not the canonical scrape path.
`scripts/scrape_2026_tournaments.py` and `scripts/backfill_ladies_2025.py`
currently contain broken multiline string literals; use the admin flow instead.

## Public API

The main read endpoints are:

- `GET /api/tournaments`
- `GET /api/tournament/<id>`
- `GET /api/rankings`
- `GET /api/player/<fide_id>`
- `GET /api/seasons`
- `GET /api/<season>/insights`

Tournament, ranking, and player CSV exports are also available from their
respective `/export` routes. Admin endpoints require a bearer token matching
`ADMIN_PASSWORD`.

## Deployment and cache revalidation

Pushes to `main` trigger the Fly.io backend deployment in
`.github/workflows/fly-deploy.yml`; Vercel deploys the Next.js frontend.

Public frontend fetches are cached for up to one day with the `gp-data` tag. A
successful Fly deployment is not enough to prove the frontend is fresh. The
workflow must also make an authenticated request to:

```text
https://www.1700chess.sh/api/revalidate
```

`REVALIDATE_SECRET` must have the same strong value in GitHub Actions and the
production Vercel project. The Fly workflow stages that value on the backend so
admin mutations can request the same invalidation. Do not log or commit it.

After deployment, verify a cache-busted public page plus the tournament detail,
Open rankings, and Ladies rankings. A `401` from the revalidation endpoint means
authentication was missing or incorrect; `503` means Vercel does not have the
secret configured.

## Verification

Backend checks:

```bash
python3 -B -m py_compile app.py db.py chess_results.py result_validator.py
.venv/bin/python -m pytest -q scripts/test_result_validator.py
```

Frontend checks:

```bash
cd client
npm run lint
npm run build
```

Database spot checks:

```bash
sqlite3 -header -column gp_tracker.db "select id, name, short_name, start_date, end_date, location, rounds, section, source_id from tournaments order by start_date desc, name desc;"
sqlite3 -header -column gp_tracker.db "select season, count(*) from player_rankings group by season order by season desc;"
```

## Project structure

```text
.
├── app.py                         # Flask routes and admin API
├── chess_results.py               # Chess-Results scraper
├── result_validator.py            # Walkover/incomplete/withdrawn validation
├── player_eligibility.py          # GP eligibility exclusions
├── tournament_metadata.py         # Metadata inference helpers
├── db.py                          # SQLite schema, queries, and rankings
├── gp_tracker.db                  # Versioned data snapshot deployed to Fly
├── scripts/                       # Maintenance and verification utilities
├── client/
│   ├── app/                       # Next.js pages and route handlers
│   ├── components/                # UI components
│   ├── lib/                       # Static tournament data and cache config
│   └── services/                  # Public and admin API clients
├── dev.sh                         # Combined local environment
├── Dockerfile
└── fly.toml
```
