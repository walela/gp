#!/usr/bin/env python3
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

"""
Backfill script to scrape Ladies sections from 2025 tournaments.

For each 2025 tournament:
1. Check if a Ladies section exists on chess-results
2. If yes, scrape it and save with section='ladies'
3. Mark those players as gender='F'
4. Validate results (walkovers, incomplete, withdrawn)
"""

import logging
import sqlite3
from chess_results import ChessResultsScraper
from db import Database
from result_validator import ResultValidator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def validate_ladies_results(db: Database, validator: ResultValidator):
    """Validate results for all ladies tournaments using their source_id."""
    with sqlite3.connect(db.db_file) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        c.execute("""
            SELECT t.id, t.source_id, r.player_id, r.start_rank, p.name
            FROM results r
            JOIN tournaments t ON r.tournament_id = t.id
            JOIN players p ON r.player_id = p.id
            WHERE t.section = 'ladies' AND t.source_id IS NOT NULL
        """)
        rows = c.fetchall()

        logger.info(f"Validating {len(rows)} ladies results...")
        for row in rows:
            source_id = row['source_id']
            start_rank = row['start_rank']
            if not start_rank:
                continue

            _, status = validator.get_player_game_results(source_id, start_rank)
            if status != 'valid':
                logger.info(f"  {row['name']}: {status} (tournament source_id={source_id})")

            c.execute(
                "UPDATE results SET result_status = ? WHERE tournament_id = ? AND player_id = ?",
                (status, row['id'], row['player_id'])
            )
        conn.commit()
    logger.info("Validation complete.")

def main():
    db = Database()
    scraper = ChessResultsScraper()

    # Get all 2025 tournaments
    tournaments_2025 = db.get_all_tournaments(season=2025)
    logger.info(f"Found {len(tournaments_2025)} tournaments from 2025")

    ladies_found = 0
    ladies_scraped = 0

    for tournament in tournaments_2025:
        tournament_id = tournament['id']
        tournament_name = tournament['name']

        if tournament_id.endswith('_ladies'):
            logger.info(f"Skipping already backfilled ladies tournament {tournament_id}")
            continue

        logger.info(f"Checking {tournament_name} (ID: {tournament_id}) for Ladies section...")

        try:
            sections = scraper.get_available_sections(tournament_id)
            ladies_section = next((s for s in sections if s.get('is_ladies')), None)

            if ladies_section:
                ladies_found += 1
                logger.info(f"  Ladies section found: {ladies_section['name']}")

                ladies_tournament_id = f"{tournament_id}_ladies"

                # Delete existing to allow re-scrape
                with sqlite3.connect(db.db_file) as conn:
                    c = conn.cursor()
                    c.execute("DELETE FROM results WHERE tournament_id = ?", (ladies_tournament_id,))
                    c.execute("DELETE FROM tournaments WHERE id = ?", (ladies_tournament_id,))
                    conn.commit()

                # Scrape the ladies section
                logger.info(f"  Scraping ladies section...")
                source_tournament_id = ladies_section.get('tournament_id', tournament_id)
                section_param = ladies_section.get('url_param', '')
                name, results, metadata = scraper.get_tournament_data(
                    source_tournament_id,
                    section_param=section_param
                )

                if results:
                    logger.info(f"  Found {len(results)} results in Ladies section")

                    results_dict = []
                    for result in results:
                        r = {
                            "player": {
                                "name": result.player.name,
                                "fide_id": result.player.fide_id,
                                "rating": result.player.rating,
                                "federation": result.player.federation,
                            },
                            "points": result.points,
                            "tpr": result.tpr,
                            "has_walkover": result.has_walkover,
                            "start_rank": result.start_rank,
                        }
                        results_dict.append(r)

                    db.save_tournament(
                        ladies_tournament_id,
                        f"{tournament_name} - Ladies",
                        results_dict,
                        start_date=tournament.get('start_date'),
                        end_date=tournament.get('end_date'),
                        location=tournament.get('location'),
                        rounds=metadata.get('rounds'),
                        section='ladies',
                        source_id=source_tournament_id,
                    )

                    ladies_scraped += 1
                    logger.info(f"  Successfully saved Ladies section")
                else:
                    logger.warning(f"  No results found in Ladies section")
            else:
                logger.info(f"  No Ladies section found")

        except Exception as e:
            logger.error(f"  Error processing tournament {tournament_id}: {e}")

    logger.info(f"
Summary:")
    logger.info(f"  Tournaments checked: {len(tournaments_2025)}")
    logger.info(f"  Ladies sections found: {ladies_found}")
    logger.info(f"  Ladies sections scraped: {ladies_scraped}")

    # Validate results
    logger.info("
Validating ladies results...")
    validator = ResultValidator(session=scraper.session)
    validate_ladies_results(db, validator)

    # Recalculate rankings for 2025
    logger.info("
Recalculating 2025 rankings...")
    db.recalculate_rankings(season=2025)
    logger.info("Done!")


if __name__ == '__main__':
    main()
