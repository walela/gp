import sqlite3
import logging
import sys

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def remove_player(player_name):
    """
    Remove a player and all their results from the database.
    
    Args:
        player_name: The name of the player to remove
    """
    db_file = 'gp_tracker.db'
    
    try:
        with sqlite3.connect(db_file) as conn:
            c = conn.cursor()
            
            # First, find the player ID
            c.execute('SELECT id FROM players WHERE name = ?', (player_name,))
            player_row = c.fetchone()
            
            if not player_row:
                logger.warning(f"Player '{player_name}' not found in database")
                return False
                
            player_id = player_row[0]
            logger.info(f"Found player '{player_name}' with ID {player_id}")
            
            # Delete player's results
            c.execute('DELETE FROM results WHERE player_id = ?', (player_id,))
            results_deleted = c.rowcount
            logger.info(f"Deleted {results_deleted} results for player '{player_name}'")
            
            # Delete the player
            c.execute('DELETE FROM players WHERE id = ?', (player_id,))
            logger.info(f"Deleted player '{player_name}' from database")
            
            conn.commit()
            return True
            
    except sqlite3.Error as e:
        logger.error(f"Database error: {e}")
        return False
    except Exception as e:
        logger.error(f"Error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Use player name from command line argument
        player_name = sys.argv[1]
    else:
        # Default player to remove if no argument provided
        player_name = input("Enter player name to remove: ")
    
    success = remove_player(player_name)
    
    if success:
        print(f"Player '{player_name}' successfully removed from the database.")
    else:
        print(f"Failed to remove player '{player_name}' from the database.")
