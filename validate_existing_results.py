#!/usr/bin/env python3
"""
Script to validate existing tournament results and update their status.
"""
import sqlite3
import logging
from result_validator import ResultValidator
from db import Database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def validate_tournament_results(tournament_id: str):
    """Validate all results for a specific tournament."""
    db = Database()
    validator = ResultValidator()

    logger.info(f"Validating results for tournament {tournament_id}")

    # Get all results for this tournament
    with sqlite3.connect(db.db_file) as conn:
        c = conn.cursor()
        c.execute('''
            SELECT r.tournament_id, r.player_id, r.start_rank, p.name, p.federation
            FROM results r
            JOIN players p ON r.player_id = p.id
            WHERE r.tournament_id = ?
            ORDER BY r.start_rank
        ''', (tournament_id,))
        results = c.fetchall()

    logger.info(f"Found {len(results)} results to validate")

    # Validate each result and update status
    updated_count = 0
    invalid_count = 0

    with sqlite3.connect(db.db_file) as conn:
        c = conn.cursor()

        for tournament_id, player_id, start_rank, player_name, federation in results:
            if not start_rank:
                logger.warning(f"Skipping {player_name}: no start rank")
                continue

            # Get validation status
            game_results, status = validator.get_player_game_results(tournament_id, start_rank)

            # Update the database
            c.execute('''
                UPDATE results
                SET result_status = ?
                WHERE tournament_id = ? AND player_id = ?
            ''', (status, tournament_id, player_id))

            updated_count += 1

            if status != 'valid':
                logger.info(f"  {player_name} ({federation}, rank {start_rank}): {status}")
                invalid_count += 1

            # Log progress every 20 players
            if updated_count % 20 == 0:
                logger.info(f"  Processed {updated_count}/{len(results)} players...")

        conn.commit()

    logger.info(f"Validation complete!")
    logger.info(f"  Total processed: {updated_count}")
    logger.info(f"  Invalid results: {invalid_count}")
    logger.info(f"  Valid results: {updated_count - invalid_count}")

    # Recalculate rankings to exclude invalid results
    logger.info("Recalculating rankings...")
    db.recalculate_rankings()
    logger.info("Rankings updated!")

if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        print("Usage: python validate_existing_results.py <tournament_id>")
        print("Example: python validate_existing_results.py 1255540")
        sys.exit(1)

    tournament_id = sys.argv[1]
    validate_tournament_results(tournament_id)