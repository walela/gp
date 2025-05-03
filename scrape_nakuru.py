"""
Script to scrape and save Nakuru Open results
"""
from chess_results import ChessResultsScraper
from db import Database
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    # Initialize scraper and database
    scraper = ChessResultsScraper()
    db = Database()
    
    # Nakuru Open tournament ID
    tournament_id = "1165146"  # Updated to correct tournament ID
    
    # Get tournament data
    logger.info("Scraping Nakuru Open results...")
    tournament_name, results = scraper.get_tournament_data(tournament_id)
    
    # Save tournament
    logger.info(f"Saving tournament: {tournament_name}")
    db.save_tournament(tournament_id, tournament_name, results)
    logger.info("Done!")

if __name__ == "__main__":
    main()