"""
Script to rescrape tournament data to populate the start_rank field.
"""
import logging
from chess_results import ChessResultsScraper
from db import Database

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Tournament IDs for 2025 Grand Prix
TOURNAMENTS = {
    "1095243": "Eldoret Open",
    "1126042": "Mavens Open",
    "1130967": "Waridi Chess Festival",
    "1135144": "Kisumu Open"
}

def rescrape_tournaments():
    """Rescrape all tournaments to populate the start_rank field."""
    scraper = ChessResultsScraper()
    db = Database()
    
    for tournament_id, tournament_name in TOURNAMENTS.items():
        logger.info(f"Rescraping tournament: {tournament_name} (ID: {tournament_id})")
        
        try:
            # Delete existing tournament data
            db.delete_tournament_data(tournament_id)
            logger.info(f"Deleted existing data for tournament: {tournament_name}")
            
            # Scrape fresh data
            name, results = scraper.get_tournament_data(tournament_id)
            
            # Save to database (this will include the start_rank field)
            db.save_tournament(tournament_id, name, results)
            
            logger.info(f"Successfully rescrapped and saved tournament: {name} with {len(results)} results")
        except Exception as e:
            logger.error(f"Error rescraping tournament {tournament_name}: {e}")
    
    logger.info("Rescraping complete!")

if __name__ == "__main__":
    rescrape_tournaments()
