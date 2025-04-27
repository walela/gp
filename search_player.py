import sqlite3
import logging
import sys

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def search_player(search_term):
    """
    Search for players in the database whose names contain the search term.
    
    Args:
        search_term: The search term to look for in player names
    """
    db_file = 'gp_tracker.db'
    
    try:
        with sqlite3.connect(db_file) as conn:
            c = conn.cursor()
            
            # Search for players with names containing the search term
            c.execute('SELECT id, name, fide_id, federation FROM players WHERE name LIKE ?', (f'%{search_term}%',))
            players = c.fetchall()
            
            if not players:
                logger.warning(f"No players found with name containing '{search_term}'")
                return []
                
            logger.info(f"Found {len(players)} players with name containing '{search_term}'")
            return players
            
    except sqlite3.Error as e:
        logger.error(f"Database error: {e}")
        return []
    except Exception as e:
        logger.error(f"Error: {e}")
        return []

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Use search term from command line argument
        search_term = sys.argv[1]
    else:
        # Default search term if no argument provided
        search_term = input("Enter player name to search for: ")
    
    players = search_player(search_term)
    
    if players:
        print(f"\nPlayers matching '{search_term}':")
        print("-" * 50)
        print(f"{'ID':<5} {'Name':<40} {'FIDE ID':<15} {'Federation':<5}")
        print("-" * 50)
        for player in players:
            player_id, name, fide_id, federation = player
            print(f"{player_id:<5} {name:<40} {fide_id or 'None':<15} {federation or 'None':<5}")
    else:
        print(f"No players found matching '{search_term}'.")
