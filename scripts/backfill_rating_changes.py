"""Fill results.rating_change from each Kenyan player's Chess-Results card.

Only rated results without a stored change are fetched, so the script can be stopped and rerun.
"""
import os
import sqlite3
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from chess_results import ChessResultsScraper
from db import Database

DB_FILE = os.environ.get("DB_PATH", "gp_tracker.db")

if __name__ == "__main__":
    Database(DB_FILE)  # adds the column if missing
    con = sqlite3.connect(DB_FILE)
    rows = con.execute(
        """SELECT r.tournament_id, r.player_id, COALESCE(t.source_id, t.id), r.start_rank
           FROM results r
           JOIN players p ON p.id = r.player_id
           JOIN tournaments t ON t.id = r.tournament_id
           WHERE p.federation = 'KEN' AND r.rating > 0 AND r.start_rank IS NOT NULL AND r.rating_change IS NULL
           ORDER BY t.start_date DESC"""
    ).fetchall()
    scraper = ChessResultsScraper()
    found = 0
    for i, (tournament_id, player_id, source_id, start_rank) in enumerate(rows, 1):
        change = scraper._get_player_details(source_id, start_rank)["rating_change"]
        if change is not None:
            con.execute(
                "UPDATE results SET rating_change = ? WHERE tournament_id = ? AND player_id = ?",
                (change, tournament_id, player_id),
            )
            found += 1
        if i % 50 == 0:
            con.commit()
            print(f"{i}/{len(rows)} fetched, {found} with a rating change", flush=True)
        time.sleep(0.2)
    con.commit()
    print(f"Done: {found} of {len(rows)} results have a rating change")
