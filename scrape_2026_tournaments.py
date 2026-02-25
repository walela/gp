#!/usr/bin/env python3
"""
Scrape 2026 tournaments including both Open and Ladies sections.
"""

import logging
from chess_results import ChessResultsScraper
from db import Database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def scrape_tournament_all_sections(tournament_id: str, db: Database, scraper: ChessResultsScraper):
    """Scrape a tournament including all its sections (Open, Ladies, etc.)"""

    logger.info(f"Getting available sections for tournament {tournament_id}...")
    sections = scraper.get_available_sections(tournament_id)
    logger.info(f"Found sections: {[s['name'] for s in sections]}")

    for section in sections:
        section_name = section['name']
        section_param = section.get('url_param', '')
        source_tournament_id = section.get('tournament_id', tournament_id)
        is_ladies = section.get('is_ladies', False)

        # Determine tournament ID for storage
        if is_ladies:
            storage_id = f"{tournament_id}_ladies"
        else:
            storage_id = tournament_id

        logger.info(f"\nScraping {section_name}...")

        try:
            name, results, metadata = scraper.get_tournament_data(source_tournament_id, section_param=section_param)

            if not results:
                logger.warning(f"  No results found for {section_name}")
                continue

            logger.info(f"  Found {len(results)} results")

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

            # Save tournament
            db.save_tournament(
                storage_id,
                name,
                results_dict,
                start_date=metadata.get('start_date'),
                end_date=metadata.get('end_date'),
                location=metadata.get('location'),
                rounds=metadata.get('rounds'),
                section=metadata.get('section', 'open'),
            )

            logger.info(f"  Saved {section_name} as {storage_id}")

        except Exception as e:
            logger.error(f"  Error scraping {section_name}: {e}")


def main():
    db = Database()
    scraper = ChessResultsScraper()

    # 2026 tournaments to scrape
    # Eldoret Open 2026
    tournaments_2026 = [
        "1339853",  # Eldoret Open 2026
    ]

    for tournament_id in tournaments_2026:
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing tournament {tournament_id}")
        logger.info(f"{'='*60}")
        scrape_tournament_all_sections(tournament_id, db, scraper)

    # Recalculate rankings for 2026
    logger.info("\nRecalculating 2026 rankings...")
    db.recalculate_rankings(season=2026)
    logger.info("Done!")


if __name__ == '__main__':
    main()
