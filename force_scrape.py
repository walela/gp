import argparse
from app import get_tournament_data, TOURNAMENT_NAMES, db # Import db as well
import logging

# Configure logging to see output from app.py
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description="Force re-scrape tournament data.")
    parser.add_argument("tournament_id", type=str, help="The ID of the tournament to re-scrape.")
    args = parser.parse_args()

    tournament_id = args.tournament_id

    if tournament_id not in TOURNAMENT_NAMES:
        logger.error(f"Invalid tournament ID: {tournament_id}. Not found in TOURNAMENT_NAMES.")
        print(f"Error: Tournament ID {tournament_id} is not a known tournament.")
        print("Available tournament IDs:")
        for tid, tname in TOURNAMENT_NAMES.items():
            print(f"  {tid}: {tname}")
        return

    logger.info(f"Attempting to force re-scrape tournament ID: {tournament_id} ({TOURNAMENT_NAMES[tournament_id]})")
    
    try:
        # The database is assumed to be initialized already by app.py or its Database class.
        # db.init_db() # REMOVED this line
        
        name, results = get_tournament_data(tournament_id, force_refresh=True)
        logger.info(f"Successfully re-scraped and updated: {name} (ID: {tournament_id}). Found {len(results)} results.")
        print(f"Successfully re-scraped and updated: {name} (ID: {tournament_id}). Found {len(results)} results.")
    except Exception as e:
        logger.error(f"An error occurred while re-scraping tournament {tournament_id}: {e}", exc_info=True)
        print(f"Error re-scraping tournament {tournament_id}: {e}")

if __name__ == "__main__":
    main() 