"""
Script to add the start_rank column to the database and rescrape tournament data.
"""
import sqlite3
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

def add_start_rank_column():
    """Add the start_rank column to the results table if it doesn't exist."""
    try:
        with sqlite3.connect('gp_tracker.db') as conn:
            c = conn.cursor()
            
            # Check if start_rank column exists
            c.execute("PRAGMA table_info(results)")
            columns = [column[1] for column in c.fetchall()]
            
            if 'start_rank' not in columns:
                logger.info("Adding start_rank column to results table")
                c.execute('ALTER TABLE results ADD COLUMN start_rank INTEGER')
                conn.commit()
                logger.info("Added start_rank column successfully")
            else:
                logger.info("start_rank column already exists")
    except Exception as e:
        logger.error(f"Error adding start_rank column: {e}")
        raise

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
            
            # Log start_rank values for debugging
            for i, result in enumerate(results[:5]):  # Log first 5 results
                logger.info(f"Result {i+1}: Player={result.player.name}, Rank={result.rank}, Start_Rank={result.start_rank}")
            
            # Save to database (this will include the start_rank field)
            db.save_tournament(tournament_id, name, results)
            
            logger.info(f"Successfully rescrapped and saved tournament: {name} with {len(results)} results")
        except Exception as e:
            logger.error(f"Error rescraping tournament {tournament_name}: {e}")
    
    logger.info("Rescraping complete!")

if __name__ == "__main__":
    # First, add the start_rank column if it doesn't exist
    add_start_rank_column()
    
    # Then rescrape all tournaments to populate the start_rank field
    rescrape_tournaments()
