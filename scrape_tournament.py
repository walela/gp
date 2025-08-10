#!/usr/bin/env python3
"""
Generic script to scrape and save any tournament data.
Usage: python scrape_tournament.py <tournament_id> "<tournament_name>"
Example: python scrape_tournament.py 1234567 "Nairobi Open 2025"
"""
import sys
import logging
from chess_results import ChessResultsScraper
from db import Database
from result_validator import ResultValidator

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def scrape_and_save_tournament(tournament_id: str, tournament_name: str):
    """Scrape and save tournament data with validation."""
    logger.info(f"Scraping tournament: {tournament_name} (ID: {tournament_id})")
    
    scraper = ChessResultsScraper()
    db = Database()
    validator = ResultValidator(session=scraper.session)  # Share session for efficiency
    
    try:
        # Check if tournament already exists
        if db.does_tournament_exist(tournament_id):
            logger.warning(f"Tournament {tournament_name} already exists in database.")
            response = input("Do you want to delete existing data and re-scrape? (y/n): ")
            if response.lower() == 'y':
                logger.info("Deleting existing data...")
                db.delete_tournament_data(tournament_id)
            else:
                logger.info("Exiting without scraping.")
                return None
        
        # Scrape fresh data
        name, results = scraper.get_tournament_data(tournament_id)
        
        # Use the scraped name if no custom name provided
        if tournament_name == "AUTO":
            tournament_name = name
        
        # Log some basic stats
        logger.info(f"Tournament name from site: {name}")
        logger.info(f"Tournament name to save: {tournament_name}")
        logger.info(f"Total results: {len(results)}")
        logger.info(f"Kenyan players: {len([r for r in results if r.player.federation == 'KEN'])}")
        
        # Process and validate each player's result
        logger.info("\n=== Validating player results ===")
        processed_results = []
        
        for i, result in enumerate(results):
            if i % 10 == 0:
                logger.info(f"Validating player {i+1}/{len(results)}: {result.player.name}")
            
            # Get player's game results and status
            game_results, status = validator.get_player_game_results(tournament_id, result.start_rank)
            
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
            
            # Log validation issues
            if status != "valid" and result.player.federation == "KEN":
                logger.warning(f"  ⚠️  {result.player.name}: {status}")
        
        # Count validation results
        kenyan_results = [r for r in processed_results if r["player"]["federation"] == "KEN"]
        valid_kenyan = [r for r in kenyan_results if r["result_status"] == "valid"]
        invalid_kenyan = [r for r in kenyan_results if r["result_status"] != "valid"]
        
        logger.info("\n=== Validation Summary ===")
        logger.info(f"Total Kenyan players: {len(kenyan_results)}")
        logger.info(f"Valid results: {len(valid_kenyan)}")
        logger.info(f"Invalid results: {len(invalid_kenyan)}")
        
        if invalid_kenyan:
            logger.info("\nInvalid results breakdown:")
            status_counts = {}
            for r in invalid_kenyan:
                status = r["result_status"]
                status_counts[status] = status_counts.get(status, 0) + 1
            for status, count in status_counts.items():
                logger.info(f"  - {status}: {count}")
        
        # Save to database with validation statuses
        logger.info("\nSaving to database...")
        save_tournament_with_validation(db, tournament_id, tournament_name, processed_results)
        
        logger.info(f"\n✅ Successfully saved tournament: {tournament_name}")
        
        # Return some stats
        return {
            "id": tournament_id,
            "name": tournament_name,
            "results_count": len(processed_results),
            "kenyan_players": len(kenyan_results),
            "valid_kenyan": len(valid_kenyan),
            "invalid_kenyan": len(invalid_kenyan),
            "status": "completed"
        }
    except Exception as e:
        logger.error(f"Error scraping tournament {tournament_name}: {e}", exc_info=True)
        raise


def save_tournament_with_validation(db: Database, tournament_id: str, tournament_name: str, results):
    """Save tournament data with result validation status."""
    import sqlite3
    
    with sqlite3.connect(db.db_file) as conn:
        c = conn.cursor()
        
        # Insert tournament
        c.execute('INSERT OR REPLACE INTO tournaments (id, name) VALUES (?, ?)', 
                  (tournament_id, tournament_name))
        
        for result in results:
            # Get or create player
            player = result["player"]
            
            # Check if player exists
            c.execute('SELECT id FROM players WHERE fide_id = ?', (player["fide_id"],))
            player_row = c.fetchone()
            
            if player_row:
                player_db_id = player_row[0]
                # Update player info
                c.execute('''
                    UPDATE players 
                    SET name = ?, federation = ? 
                    WHERE id = ?
                ''', (player["name"], player["federation"], player_db_id))
            else:
                # Insert new player
                c.execute('''
                    INSERT INTO players (name, fide_id, federation) 
                    VALUES (?, ?, ?)
                ''', (player["name"], player["fide_id"], player["federation"]))
                player_db_id = c.lastrowid
            
            # Save result with status
            c.execute('''
                INSERT OR REPLACE INTO results 
                (tournament_id, player_id, rating, points, tpr, has_walkover, start_rank, result_status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                tournament_id,
                player_db_id,
                player["rating"],
                result["points"],
                result["tpr"],
                result["has_walkover"],
                result["start_rank"],
                result["result_status"]
            ))
        
        conn.commit()
        logger.info(f"Saved tournament {tournament_name} with {len(results)} results")


def main():
    if len(sys.argv) < 2:
        print("Usage: python scrape_tournament.py <tournament_id> [tournament_name]")
        print("Example: python scrape_tournament.py 1234567 'Nairobi Open 2025'")
        print("Or use AUTO to get name from site: python scrape_tournament.py 1234567 AUTO")
        sys.exit(1)
    
    tournament_id = sys.argv[1]
    tournament_name = sys.argv[2] if len(sys.argv) > 2 else "AUTO"
    
    # Validate tournament ID
    if not tournament_id.isdigit():
        print(f"Error: Tournament ID must be numeric. Got: {tournament_id}")
        sys.exit(1)
    
    result = scrape_and_save_tournament(tournament_id, tournament_name)
    if result:
        print("\n✅ Scraping complete!")
        print(f"Tournament: {result['name']}")
        print(f"Total players: {result['results_count']}")
        print(f"Kenyan players: {result['kenyan_players']}")
        print(f"  - Valid results: {result['valid_kenyan']}")
        print(f"  - Invalid results: {result['invalid_kenyan']}")
        print("\nDon't forget to add this tournament to TOURNAMENT_NAMES in app.py:")
        print(f'    "{tournament_id}": "{result["name"]}",')

if __name__ == "__main__":
    main() 