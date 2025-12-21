-- GP Tracker Schema
-- Source of truth for database structure

-- Seasons (2025, 2026, etc.)
CREATE TABLE IF NOT EXISTS seasons (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    start_date  DATE,
    end_date    DATE,
    is_active   BOOLEAN DEFAULT FALSE
);

-- Events (groups related tournament sections)
CREATE TABLE IF NOT EXISTS events (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    short_name  TEXT NOT NULL,
    season_id   TEXT REFERENCES seasons(id)
);

-- Tournaments (individual sections)
CREATE TABLE IF NOT EXISTS tournaments (
    id              TEXT PRIMARY KEY,
    event_id        TEXT REFERENCES events(id),
    season_id       TEXT REFERENCES seasons(id),
    name            TEXT NOT NULL,
    section_type    TEXT,
    location        TEXT,
    rounds          INTEGER,
    start_date      DATE,
    end_date        DATE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Players (ALL players, not just KEN)
CREATE TABLE IF NOT EXISTS players (
    id          INTEGER PRIMARY KEY,
    fide_id     TEXT UNIQUE,
    name        TEXT NOT NULL,
    federation  TEXT,
    sex         TEXT
);

-- Results (ALL results, raw data)
CREATE TABLE IF NOT EXISTS results (
    tournament_id   TEXT REFERENCES tournaments(id),
    player_id       INTEGER REFERENCES players(id),
    rating          INTEGER,
    points          REAL,
    tpr             INTEGER,
    rank            INTEGER,
    start_rank      INTEGER,
    has_walkover    BOOLEAN,
    result_status   TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tournament_id, player_id)
);

-- Pre-computed rankings (per season, KEN only)
CREATE TABLE IF NOT EXISTS rankings (
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
    previous_rank       INTEGER,
    PRIMARY KEY (player_id, season_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_players_federation ON players(federation);
CREATE INDEX IF NOT EXISTS idx_players_sex ON players(sex);
CREATE INDEX IF NOT EXISTS idx_tournaments_season ON tournaments(season_id);
CREATE INDEX IF NOT EXISTS idx_results_tournament ON results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_results_player ON results(player_id);
CREATE INDEX IF NOT EXISTS idx_events_season ON events(season_id);
