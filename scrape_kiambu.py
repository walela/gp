"""
Script to scrape and save the Kiambu Open tournament data.
"""
import logging
from chess_results import ChessResultsScraper
from db import Database

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Tournament ID for Kiambu Open
TOURNAMENT_ID = "1173578"
TOURNAMENT_NAME = "Kiambu Open"

def scrape_and_save_tournament():
    """Scrape and save the Kiambu Open tournament data."""
    logger.info(f"Scraping tournament: {TOURNAMENT_NAME} (ID: {TOURNAMENT_ID})")
    
    scraper = ChessResultsScraper()
    db = Database()
    
    try:
        # Check if tournament already exists
        if db.does_tournament_exist(TOURNAMENT_ID):
            logger.info(f"Tournament {TOURNAMENT_NAME} already exists. Deleting existing data...")
            db.delete_tournament_data(TOURNAMENT_ID)
        
        # Scrape fresh data
        name, results = scraper.get_tournament_data(TOURNAMENT_ID)
        
        # Log some basic stats
        logger.info(f"Tournament name: {name}")
        logger.info(f"Total results: {len(results)}")
        
        # Log a few results for verification
        for i, result in enumerate(results[:5]):
            logger.info(f"Result {i+1}: Player={result.player.name}, Points={result.points}, TPR={result.tpr}")
        
        # Save to database
        db.save_tournament(TOURNAMENT_ID, name, results)
        
        logger.info(f"Successfully saved tournament: {name} with {len(results)} results")
        
        # Return some stats
        return {
            "name": name,
            "results_count": len(results),
            "status": "completed"
        }
    except Exception as e:
        logger.error(f"Error scraping tournament {TOURNAMENT_NAME}: {e}", exc_info=True)
        raise

if __name__ == "__main__":
    result = scrape_and_save_tournament()
    logger.info(f"Scraping complete: {result}")
