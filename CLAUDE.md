# GP Tracker

Kenya Chess Grand Prix tournament tracker.

## Current State

Refactoring for 2026 season. See `docs/REFACTOR_PLAN.md` for full architectural plan.

**Backend is functional** - ready to scrape 2025 tournaments.

## Quick Reference

- **Backend**: `backend/` - Python/FastAPI
- **Database**: Turso (hosted SQLite) - schema applied
- **Run**: `cd backend && .venv/bin/uvicorn api.app:app --reload`

## What's Built

```
backend/
├── api/                    # FastAPI routes
│   ├── app.py              # App setup, CORS
│   ├── deps.py             # DB connection dependency
│   └── routes/
│       ├── rankings.py     # GET /api/rankings
│       ├── tournaments.py  # GET /api/tournaments
│       ├── players.py      # GET /api/player/{id}
│       └── admin.py        # POST scrape, enrich, recalculate
├── db/
│   ├── schema.sql          # Source of truth
│   ├── connection.py       # Turso connection
│   └── queries/            # SQL query modules
├── scraper/
│   ├── client.py           # HTTP fetching (handles rounds detection)
│   ├── parser.py           # HTML → data (uses CRs1 table class)
│   ├── enricher.py         # FIDE ID lookup, walkover detection
│   └── types.py            # Player, Result, Tournament dataclasses
├── services/
│   └── rankings.py         # Ranking calculation (best 4 TPR)
└── main.py
```

## Key Decisions

1. Scrape ALL players, filter at query time (not during scrape)
2. Capture sex field ('w') for ladies rankings
3. Seasons auto-created on first scrape
4. No ORM - raw SQL with `schema.sql` as source of truth
5. Rank changes via `previous_rank` column

## 2025 Tournaments to Scrape

| ID | Name |
|---|---|
| 1095243 | Eldoret Open |
| 1126042 | Mavens Open |
| 1130967 | Waridi Chess Festival |
| 1135144 | Kisumu Open |
| 1165146 | Nakuru GP 2025 |
| 1173578 | Kiambu Open |

## Next Steps

1. Set ADMIN_PASSWORD env var
2. Scrape 2025 tournaments via admin API
3. Run enrichment (FIDE IDs, walkovers)
4. Recalculate rankings
5. Build admin UI (frontend)
