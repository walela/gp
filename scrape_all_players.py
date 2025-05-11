"""
Script to scrape tournament data for all players and determine result status.
"""
import logging
import sqlite3
from chess_results import ChessResultsScraper
from result_validator import ResultValidator
from db import Database
from dataclasses import asdict

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Tournament ID for Kiambu Open
TOURNAMENT_ID = "1173578"
TOURNAMENT_NAME = "Kiambu Open"

def scrape_and_save_all_players():
    """Scrape tournament data for all players and save with result status."""
    logger.info(f"Scraping tournament: {TOURNAMENT_NAME} (ID: {TOURNAMENT_ID})")
    
    scraper = ChessResultsScraper()
    validator = ResultValidator(session=scraper.session)
    db = Database()
    
    try:
        # Check if tournament already exists
        if db.does_tournament_exist(TOURNAMENT_ID):
            logger.info(f"Tournament {TOURNAMENT_NAME} already exists. Deleting existing data...")
            db.delete_tournament_data(TOURNAMENT_ID)
        
        # Scrape tournament data (this will get all players)
        name, results = scraper.get_tournament_data(TOURNAMENT_ID)
        
        # Log some basic stats
        logger.info(f"Tournament name: {name}")
        logger.info(f"Total results: {len(results)}")
        
        # Process each result to determine status
        processed_results = []
        
        for i, result in enumerate(results):
            if i % 10 == 0:
                logger.info(f"Processing player {i+1}/{len(results)}: {result.player.name}")
            
            # Get player's game results and status
            game_results, status = validator.get_player_game_results(TOURNAMENT_ID, result.start_rank)
            
            # Create a modified result with status
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
            
            # Log status for some players
            if i < 5 or i % 20 == 0:
                logger.info(f"Player: {result.player.name}, Federation: {result.player.federation}, Status: {status}")
        
        # Save to database with custom function to handle the result_status field
        save_tournament_with_status(TOURNAMENT_ID, name, processed_results)
        
        logger.info(f"Successfully saved tournament: {name} with {len(processed_results)} results")
        
        # Return some stats
        return {
            "name": name,
            "results_count": len(processed_results),
            "status": "completed"
        }
    except Exception as e:
        logger.error(f"Error scraping tournament {TOURNAMENT_NAME}: {e}", exc_info=True)
        raise

def save_tournament_with_status(tournament_id, tournament_name, results):
    """Save tournament data with result status to database."""
    with sqlite3.connect('gp_tracker.db') as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # Save tournament info
        c.execute('''
            INSERT OR REPLACE INTO tournaments (id, name) VALUES (?, ?)
        ''', (tournament_id, tournament_name))
        
        for result in results:
            player = result["player"]
            player_fide_id = player["fide_id"]
            player_name = player["name"]
            player_federation = player["federation"]
            player_rating = player["rating"]
            
            # Find or create player
            player_db_id = None
            
            # Try to find by FIDE ID first
            if player_fide_id:
                c.execute('SELECT id FROM players WHERE fide_id = ?', (player_fide_id,))
                existing_player = c.fetchone()
                if existing_player:
                    player_db_id = existing_player[0]
            
            # If no FIDE ID or not found by FIDE ID, try to find by name
            if player_db_id is None:
                c.execute('SELECT id FROM players WHERE lower(name) = lower(?) AND fide_id IS NULL', (player_name,))
                existing_player_by_name = c.fetchone()
                if existing_player_by_name:
                    player_db_id = existing_player_by_name[0]
                    # Update FIDE ID if it's now available
                    if player_fide_id:
                        c.execute('UPDATE players SET fide_id = ? WHERE id = ?', (player_fide_id, player_db_id))
            
            # If still not found, insert new player
            if player_db_id is None:
                c.execute('''
                    INSERT INTO players (fide_id, name, federation) VALUES (?, ?, ?)
                ''', (player_fide_id, player_name, player_federation))
                player_db_id = c.lastrowid
            
            # Save result with status
            c.execute('''
                INSERT OR REPLACE INTO results 
                (tournament_id, player_id, rating, points, tpr, has_walkover, start_rank, result_status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                tournament_id,
                player_db_id,
                player_rating,
                result["points"],
                result["tpr"],
                result["has_walkover"],
                result["start_rank"],
                result["result_status"]
            ))
        
        conn.commit()
        logger.info(f"Saved tournament {tournament_name} with {len(results)} results")

if __name__ == "__main__":
    result = scrape_and_save_all_players()
    logger.info(f"Scraping complete: {result}")
