# Agent Notes

## Git

- Do not add "Co-Authored-By" lines or any self-attribution in commit messages.

## Tournament Update Workflow

When a Grand Prix event is finished, update it in this order:

1. Scrape the finished event from Chess-Results.
   - Use the numeric Chess-Results tournament ID from `tnr<id>.aspx`.
   - Check available sections first. Open and Ladies sections may have different source tournament IDs.
   - The backend/admin scrape flow lives in `app.py`:
     - `/api/admin/scrape/sections`
     - `/api/admin/scrape/preview`
     - `/api/admin/scrape/validate`
     - `/api/admin/scrape/commit`
   - The admin UI for this flow is `client/app/admin/scrape/page.tsx`.

2. Validate results before committing rankings.
   - Validation uses `ResultValidator` in `result_validator.py`.
   - It sets `result_status` values such as `valid`, `walkover`, `incomplete`, and `withdrawn`.
   - Rankings only count Kenyan players whose result status is `valid` or `NULL`.

3. Save tournament data through `Database.save_tournament(...)`.
   - Main persistence logic is in `db.py`.
   - Ladies sections should use `section='ladies'`.
   - Ladies tournament rows usually use an ID like `<open_id>_ladies` when stored under the open event family.
   - Preserve `source_id` when the Chess-Results source ID differs from the stored DB ID.

4. Recalculate rankings.
   - Use `db.recalculate_rankings(...)`.
   - Open rankings use Open-section results only.
   - Ladies rankings include female players from all sections and all players from Ladies sections.
   - `scripts/recalculate.py` recalculates all seasons.

5. Update upcoming/planned events.
   - Static upcoming/planned tournament data is in `client/lib/active-tournaments.ts`.
   - Once an event is scraped and saved as completed, remove it from `upcomingTournaments`.
   - If an event is postponed or not completed, update/move its static record instead of removing it.

## Sataranji Context

As of April 20, 2026:

- `Sataranji Africa Chess Festival - Grand Prix` was scraped and removed from `client/lib/active-tournaments.ts`.
- Open source/storage ID: `1393501`.
- Ladies source ID: `1396283`; stored as `1393501_ladies`.
- Dates were set manually to `2026-04-18` through `2026-04-19` because the scraped details page returned a bad start date.
- Location was set to `USIU Africa, USIU Road`.
- Open validation counts at update time: 66 valid, 26 walkover.
- Ladies validation counts at update time: 24 valid, 3 walkover.

## Known Footguns

- Some CLI scrape scripts currently have broken multiline string literals and may not compile:
  - `scripts/scrape_tournament.py`
  - `scripts/scrape_2026_tournaments.py`
  - `scripts/backfill_ladies_2025.py`
- The admin scrape path in `app.py` is the more reliable source of truth for the current workflow.

## Quick Checks

Useful local checks after an update:

```bash
sqlite3 -header -column gp_tracker.db "select id, name, short_name, start_date, end_date, location, rounds, section, source_id from tournaments order by start_date desc, name desc;"
sqlite3 -header -column gp_tracker.db "select season, count(*) from player_rankings group by season order by season desc;"
python3 -B -m py_compile app.py db.py chess_results.py result_validator.py
```
