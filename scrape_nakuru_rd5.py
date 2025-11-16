#!/usr/bin/env python3
"""
Quick script to scrape Nakuru tournament round 5 results.
The main scraper tries round 6 which doesn't exist yet.
"""
from chess_results import ChessResultsScraper
from db import Database
from result_validator import ResultValidator
from bs4 import BeautifulSoup
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

tournament_id = '1292319'
scraper = ChessResultsScraper()
validator = ResultValidator(session=scraper.session)
db = Database()

# Fetch round 5 standings
logger.info('Fetching round 5 standings...')
response = scraper._request('GET', f'tnr{tournament_id}.aspx',
                            params={'lan': 1, 'art': 1, 'rd': 5, 'zeilen': 99999})

soup = BeautifulSoup(response.text, 'html.parser')

# Get tournament name
title = soup.find('title').text
tournament_name = '2025 Nakuru Open Chess Championship'

logger.info(f'Tournament: {tournament_name}')

# Parse standings
results = scraper._parse_standings(soup, 5, tournament_id)
logger.info(f'Total players scraped: {len(results)}')

# Process and validate (only KEN players)
logger.info('\n=== Validating Kenyan player results ===')
processed_results = []

for i, result in enumerate(results):
    if result.player.federation == "KEN":
        if i % 20 == 0:
            logger.info(f"Validating player {i+1}/{len(results)}")

        # Validate
        game_results, status = validator.get_player_game_results(tournament_id, result.start_rank)
    else:
        status = "valid"

    # Create result dict
    result_dict = {
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
        "result_status": status
    }

    processed_results.append(result_dict)

# Save to database
logger.info('\nSaving to database...')
db.save_tournament(
    tournament_id,
    tournament_name,
    processed_results,
    start_date="2025-11-16",
    end_date="2025-11-16",  # Will update when complete
    location="Nakuru",
    rounds=6
)

logger.info(f'✅ Saved {len(processed_results)} results ({len([r for r in processed_results if r["player"]["federation"] == "KEN"])} Kenyan)')

# Recalculate rankings
logger.info('Recalculating rankings...')
db.recalculate_rankings()
logger.info('✅ Done!')
