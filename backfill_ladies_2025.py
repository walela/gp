#!/usr/bin/env python3
"""
Backfill script to scrape Ladies sections from 2025 tournaments.

For each 2025 tournament:
1. Check if a Ladies section exists on chess-results
2. If yes, scrape it and save with section='ladies'
3. Mark those players as gender='F'
"""

import logging
from chess_results import ChessResultsScraper
from db import Database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
            logger.info(f"  Found sections: {[s['name'] for s in sections]}")

            # Find ladies section
            ladies_section = next((s for s in sections if s.get('is_ladies')), None)

            if ladies_section:
                ladies_found += 1
                logger.info(f"  Ladies section found: {ladies_section['name']}")

                # Create a unique ID for the ladies section tournament
                ladies_tournament_id = f"{tournament_id}_ladies"

                # Check if already scraped
                if db.does_tournament_exist(ladies_tournament_id):
                    logger.info(f"  Ladies section already scraped, skipping")
                    continue

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

                    # Convert results to dict format
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

                    # Save with ladies section indicator
                    # Use the original tournament dates
                    db.save_tournament(
                        ladies_tournament_id,
                        f"{tournament_name} - Ladies",
                        results_dict,
                        start_date=tournament.get('start_date'),
                        end_date=tournament.get('end_date'),
                        location=tournament.get('location'),
                        rounds=metadata.get('rounds'),
                        section='ladies',
                    )

                    ladies_scraped += 1
                    logger.info(f"  Successfully saved Ladies section")
                else:
                    logger.warning(f"  No results found in Ladies section")
            else:
                logger.info(f"  No Ladies section found")

        except Exception as e:
            logger.error(f"  Error processing tournament {tournament_id}: {e}")

    logger.info(f"\nSummary:")
    logger.info(f"  Tournaments checked: {len(tournaments_2025)}")
    logger.info(f"  Ladies sections found: {ladies_found}")
    logger.info(f"  Ladies sections scraped: {ladies_scraped}")

    # Recalculate rankings for 2025
    logger.info("\nRecalculating 2025 rankings...")
    db.recalculate_rankings(season=2025)
    logger.info("Done!")


if __name__ == '__main__':
    main()
