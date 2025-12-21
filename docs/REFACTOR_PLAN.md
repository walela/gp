# GP Tracker Refactor Plan (2026 Season)

## Overview

Complete architectural refactor before the 2026 GP season (starting February). Goals:
- Clean up the codebase mess
- Add seasons support (2025 archive, 2026 current)
- Add ladies rankings section
- Build admin UI so the system isn't dependent on one person
- Move from SQLite file to hosted database

---

## Current State (The Mess)

### Problems Identified

**Scraper (`chess_results.py` - 430 lines):**
- Filters to KEN-only during scrape → data loss
- N+1 HTTP requests per player (FIDE ID lookup, walkover check)
- Tightly coupled to `db.py`
- Throws away useful data (sex/gender field, non-KEN players)

**Database (`db.py` - 733 lines):**
- God object doing everything:
  - Schema definition (inline `CREATE TABLE IF NOT EXISTS`)
  - Ad-hoc migrations (`ALTER TABLE ADD COLUMN`)
  - All CRUD operations
  - Ranking calculation business logic
  - Snapshot diffing logic (overengineered - just need previous_rank)
- No single source of truth for schema
- Column existence checks scattered in code

**API (`app.py` - 655 lines):**
- `cascading_sort_key` function duplicated 3 times
- Raw SQL queries bypass db layer (lines 272-344, 576-615)
- 164-line single endpoint (`/api/player/<fide_id>`)
- Export routes are copy-paste of main routes
- Business logic mixed into route handlers

**Project structure:**
- 6 random utility scripts in root folder
- No tests
- SQLite file requires volume mount on Fly.io

---

## Target Architecture

### Tech Stack

| Layer | Current | Target |
|-------|---------|--------|
| API Framework | Flask | FastAPI |
| Database | SQLite file | Turso (hosted SQLite) |
| ORM | None (raw SQL soup) | None (raw SQL, but organized) |
| Schema | Inline Python | `schema.sql` source of truth |
| Frontend | Next.js | Next.js (unchanged, UI only) |
| Scraper | Python | Python (refactored) |

### Folder Structure

```
/gp
├── backend/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── app.py              # FastAPI app setup
│   │   ├── deps.py             # Dependency injection (db connection, etc.)
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── tournaments.py  # /api/tournaments endpoints
│   │       ├── rankings.py     # /api/rankings endpoints
│   │       ├── players.py      # /api/player endpoints
│   │       └── admin.py        # /api/admin endpoints (protected)
│   │
│   ├── scraper/
│   │   ├── __init__.py
│   │   ├── client.py           # HTTP fetching, retry logic, session management
│   │   ├── parser.py           # HTML → raw data structures (ALL players)
│   │   ├── enricher.py         # FIDE ID lookup, walkover detection (batched)
│   │   └── types.py            # RawTournament, RawResult, RawPlayer dataclasses
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── schema.sql          # Single source of truth
│   │   ├── connection.py       # Turso connection setup
│   │   └── queries/
│   │       ├── __init__.py
│   │       ├── tournaments.py  # Tournament CRUD
│   │       ├── players.py      # Player CRUD
│   │       ├── results.py      # Results CRUD
│   │       ├── rankings.py     # Rankings table CRUD
│   │       └── seasons.py      # Seasons CRUD
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   └── rankings.py         # Ranking calculation, eligibility filtering
│   │
│   ├── requirements.txt
│   └── main.py                 # Entry point
│
├── frontend/                   # Renamed from client/
│   ├── app/
│   │   ├── (public)/           # Public routes
│   │   │   ├── page.tsx
│   │   │   ├── rankings/
│   │   │   ├── ladies/         # NEW: Ladies rankings
│   │   │   ├── player/[id]/
│   │   │   ├── tournament/[id]/
│   │   │   └── archive/        # NEW: Historical seasons
│   │   │       ├── page.tsx
│   │   │       └── [season]/
│   │   └── admin/              # NEW: Admin UI
│   │       ├── page.tsx        # Dashboard
│   │       ├── scrape/         # Scrape tournaments
│   │       ├── players/        # Edit player data
│   │       └── tournaments/    # Edit tournament metadata
│   ├── components/
│   ├── services/
│   │   └── api.ts
│   └── package.json
│
├── docs/
│   └── REFACTOR_PLAN.md        # This file
│
├── scripts/                    # Moved from root
│   ├── seed.py
│   └── migrate.py
│
├── Dockerfile
├── fly.toml
└── README.md
```

---

## Data Model Changes

### New Schema

```sql
-- db/schema.sql

-- Seasons
CREATE TABLE seasons (
    id          TEXT PRIMARY KEY,   -- "2025", "2026"
    name        TEXT NOT NULL,      -- "2025 Grand Prix Season"
    start_date  DATE,
    end_date    DATE,
    is_active   BOOLEAN DEFAULT FALSE
);

-- Events (groups related tournament sections)
CREATE TABLE events (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,      -- "Eldoret Chess Championships 2025"
    season_id   TEXT REFERENCES seasons(id)
);

-- Tournaments (individual sections)
CREATE TABLE tournaments (
    id              TEXT PRIMARY KEY,
    event_id        TEXT REFERENCES events(id),
    season_id       TEXT REFERENCES seasons(id),
    name            TEXT NOT NULL,
    short_name      TEXT,
    section_type    TEXT,           -- 'open', 'ladies', 'juniors', NULL
    location        TEXT,
    rounds          INTEGER,
    start_date      DATE,
    end_date        DATE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Players (ALL players, not just KEN)
CREATE TABLE players (
    id          INTEGER PRIMARY KEY,
    fide_id     TEXT UNIQUE,
    name        TEXT NOT NULL,
    federation  TEXT,
    sex         TEXT                -- 'w', 'm', or NULL (captured from chess-results)
);

-- Results (ALL results, raw data)
CREATE TABLE results (
    tournament_id   TEXT REFERENCES tournaments(id),
    player_id       INTEGER REFERENCES players(id),
    rating          INTEGER,
    points          REAL,
    tpr             INTEGER,
    rank            INTEGER,        -- Final rank in tournament
    start_rank      INTEGER,
    has_walkover    BOOLEAN,
    result_status   TEXT,           -- 'valid', 'walkover', 'incomplete', 'withdrawn'
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tournament_id, player_id)
);

-- Pre-computed rankings (per season)
CREATE TABLE player_rankings (
    player_id           INTEGER REFERENCES players(id),
    season_id           TEXT REFERENCES seasons(id),
    name                TEXT NOT NULL,
    fide_id             TEXT,
    rating              INTEGER,
    tournaments_played  INTEGER,
    best_1              REAL,
    tournament_1        TEXT,
    best_2              REAL,
    best_3              REAL,
    best_4              REAL,
    current_rank        INTEGER,
    previous_rank       INTEGER,        -- For showing ↑↓ changes
    PRIMARY KEY (player_id, season_id)
);
CREATE INDEX idx_results_tournament ON results(tournament_id);
CREATE INDEX idx_results_player ON results(player_id);
CREATE INDEX idx_tournaments_season ON tournaments(season_id);
CREATE INDEX idx_players_federation ON players(federation);
CREATE INDEX idx_players_sex ON players(sex);
```

### Key Changes from Current

| Current | New |
|---------|-----|
| No seasons concept | `seasons` table, `season_id` on tournaments/rankings |
| No events concept | `events` table to group Open/Ladies/Juniors sections |
| KEN players only | ALL players stored |
| No sex field | `players.sex` captured from chess-results |
| Rankings global | Rankings per-season |
| Schema in Python | `schema.sql` source of truth |

---

## Data Flow

### Scraping (Raw Layer)

```
chess-results.com
    ↓
client.fetch_tournament(id)
    → Raw HTML
    ↓
parser.parse_tournament(html)
    → RawTournament with ALL players (KEN, UGA, TAN, etc.)
    → Captures sex field ('w'/'m')
    → Detects related sections from "Tournament selection" row
    ↓
[Store raw data to DB]
    → tournaments table (with section_type, event_id)
    → players table (with sex)
    → results table (ALL results)
```

### Enrichment (Optional, Batched)

```
enricher.enrich_tournament(tournament_id)
    ↓
For players missing FIDE ID:
    → Batch lookup from player detail pages
    ↓
For results needing walkover check:
    → Batch check game results
    ↓
[Update DB with enriched data]
```

### Rankings (Computed Layer)

```
services.rankings.recalculate(season_id)
    ↓
Fetch all results for season
    ↓
Filter by eligibility:
    → federation = 'KEN'
    → result_status = 'valid'
    → has_walkover = FALSE
    ↓
Group by player, calculate best 1/2/3/4 TPR
    ↓
Calculate new ranks (cascading sort)
    ↓
UPDATE player_rankings:
    → previous_rank = current_rank (before update)
    → current_rank = new rank
    → best_1, best_2, etc.
    ↓
Rank change = current_rank - previous_rank
    → Positive = moved down (↓)
    → Negative = moved up (↑)
    → previous_rank NULL = NEW
```

### API (Query Layer)

```
GET /api/rankings?season=2026
    → Fetch from player_rankings where season_id = '2026'
    → Apply cascading sort
    → Return JSON

GET /api/rankings?season=2026&category=ladies
    → Same, but JOIN players WHERE sex = 'w'

GET /api/tournament/{id}
    → Fetch tournament with ALL results (not just KEN)
    → Shows full tournament context
```

---

## API Endpoints

### Public

| Endpoint | Description |
|----------|-------------|
| `GET /api/seasons` | List all seasons |
| `GET /api/tournaments?season={id}` | List tournaments for season |
| `GET /api/tournament/{id}` | Tournament details with ALL results |
| `GET /api/rankings?season={id}` | Open rankings for season |
| `GET /api/rankings?season={id}&category=ladies` | Ladies rankings |
| `GET /api/player/{fide_id}` | Player profile with history |
| `GET /api/*/export` | CSV export variants |

### Admin (Protected)

| Endpoint | Description |
|----------|-------------|
| `POST /api/admin/scrape` | Scrape tournament by ID |
| `GET /api/admin/scrape/preview/{id}` | Preview what would be scraped (shows related sections) |
| `PATCH /api/admin/player/{id}` | Edit player data |
| `PATCH /api/admin/tournament/{id}` | Edit tournament metadata |
| `POST /api/admin/rankings/recalculate` | Trigger ranking recalculation |
| `POST /api/admin/season` | Create new season |

---

## Admin UI

### Pages

```
/admin                      # Dashboard - recent scrapes, quick stats
/admin/scrape               # Scrape tournament
                            #   1. Enter tournament ID
                            #   2. Shows preview (name, sections found)
                            #   3. Select which sections to scrape
                            #   4. Assign to season
                            #   5. Execute
/admin/tournaments          # List all tournaments, edit metadata
/admin/players              # Search players, edit name/FIDE ID/federation/sex
/admin/seasons              # Manage seasons (create, set active)
/admin/rankings             # View current rankings, trigger recalculation
```

### Auth

Simple password protection:
- Environment variable `ADMIN_PASSWORD`
- Login page sets HTTP-only cookie
- Middleware checks cookie on `/admin/*` and `/api/admin/*`

Not a multi-tenant SaaS. One password is fine.

---

## Frontend Changes

### New Routes

| Route | Description |
|-------|-------------|
| `/` | Current season overview |
| `/rankings` | Current season open rankings |
| `/ladies` | Current season ladies rankings |
| `/archive` | List of past seasons |
| `/archive/{season}` | Season overview |
| `/archive/{season}/rankings` | Season final rankings |
| `/archive/{season}/ladies` | Season ladies rankings |
| `/tournament/{id}` | Tournament details (unchanged) |
| `/player/{id}` | Player profile (now shows results by season) |

### UI Updates

- Season switcher in header (or on relevant pages)
- Ladies section navigation
- Archive browsing
- Player profiles grouped by season

---

## Migration Plan

### Phase 1: Setup

1. Create new folder structure (keep old code working)
2. Set up Turso database
3. Write `schema.sql`
4. Create migration script to export current SQLite → Turso

### Phase 2: Backend Refactor

1. Build new scraper (client.py, parser.py, types.py)
   - Test against live chess-results
   - Verify captures ALL players and sex field
2. Build new db layer (connection.py, queries/)
3. Build services (rankings.py - calculation, eligibility)
4. Build FastAPI routes
5. Verify API parity with current Flask app

### Phase 3: Data Migration

1. Re-scrape 2025 tournaments with new scraper (captures previously lost data)
2. Populate seasons table
3. Link tournaments to seasons
4. Recalculate rankings

### Phase 4: Frontend Updates

1. Add admin UI pages
2. Add ladies section
3. Add archive/seasons navigation
4. Update API calls to include season parameter

### Phase 5: Deployment

1. Update Dockerfile for FastAPI
2. Update fly.toml (remove volume mount)
3. Set Turso credentials in Fly secrets
4. Deploy and verify
5. Remove old code

---

## Open Questions

1. **Historical data:** Re-scrape all 2025 tournaments to capture full data, or just start fresh with 2026?

2. **Event grouping:** Auto-detect from "Tournament selection" links, or manual in admin UI?

3. **Ladies detection:** Trust the 'w' flag from chess-results, or allow manual override in admin?

4. **Ranking eligibility:** Any other criteria beyond KEN + valid + no walkover?

5. **Archive cutoff:** How far back to go? Just 2025, or earlier seasons too?

---

## Timeline

Low season until February 2026. Rough phases:

1. **Backend refactor** - Get FastAPI + new scraper + Turso working
2. **Data migration** - Re-scrape 2025 data with new scraper
3. **Frontend updates** - Admin UI, ladies section, archive
4. **Testing & deployment** - Before February

No specific dates - work at your own pace during low season.
