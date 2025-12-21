# GP Tracker

Kenya Chess Grand Prix tournament tracker.

## Current State

Undergoing major refactor for 2026 season. Read `docs/REFACTOR_PLAN.md` for full context on:
- Architectural decisions
- Target folder structure
- Data model changes
- Migration plan

## Quick Reference

- **Backend**: Python (FastAPI, replacing Flask)
- **Frontend**: Next.js (UI only)
- **Database**: Turso (hosted SQLite)
- **Branch**: `refactor/2026-architecture`

## Key Decisions

1. Scrape ALL players, filter later (not just KEN during scrape)
2. Capture sex field for ladies rankings
3. Seasons support (2025 archive, 2026 current)
4. Admin UI for non-technical operators
5. No ORM - raw SQL with `schema.sql` as source of truth
6. Rank changes via `previous_rank` column, not snapshots table
