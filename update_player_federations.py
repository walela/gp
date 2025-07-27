"""
Script to update player federations for non-Kenyan players incorrectly registered as Kenyan.
"""
import sqlite3
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# List of players to update with their correct federations
PLAYERS_TO_UPDATE = [
    {"name": "Chitundu Limbikani", "federation": "ZAM"},  # Zambia
    {"name": "Ngony John", "federation": "SSD"},          # South Sudan
    {"name": "Chiman Garang", "federation": "SSD"},       # South Sudan
    {"name": "Garang Chiman", "federation": "SSD"},       # South Sudan
    {"name": "Chvoro Viacheslav", "federation": "RUS"},    # Russia
    {"name": "Khot, Ajak David", "federation": "SSD"},    # South Sudan
    {"name": "Atem Gak, Ngong", "federation": "SSD"}      # South Sudan
]

def update_player_federations():
    """Update federation for non-Kenyan players incorrectly registered as Kenyan."""
    try:
        with sqlite3.connect('gp_tracker.db') as conn:
            c = conn.cursor()
            
            # Get all players currently registered as Kenyan
            c.execute("SELECT id, name, federation FROM players WHERE federation = 'KEN'")
            kenyan_players = c.fetchall()
            
            # Check each player to update
            for player_data in PLAYERS_TO_UPDATE:
                player_name = player_data["name"]
                new_federation = player_data["federation"]
                
                # Try to find exact match first
                player_id = None
                for db_id, db_name, db_fed in kenyan_players:
                    if db_name.lower() == player_name.lower():
                        player_id = db_id
                        break
                
                # If no exact match, try partial match (for name variations)
                if player_id is None:
                    for db_id, db_name, db_fed in kenyan_players:
                        # Check if the player name contains the name we're looking for
                        # or if the name we're looking for contains the player name
                        if player_name.lower() in db_name.lower() or db_name.lower() in player_name.lower():
                            player_id = db_id
                            logger.info(f"Found partial match: '{db_name}' for '{player_name}'")
                            break
                
                if player_id:
                    # Update the player's federation
                    c.execute(
                        "UPDATE players SET federation = ? WHERE id = ?",
                        (new_federation, player_id)
                    )
                    logger.info(f"Updated player '{player_name}' federation from 'KEN' to '{new_federation}'")
                else:
                    logger.warning(f"Could not find player '{player_name}' in the database")
            
            # Commit changes
            conn.commit()
            
            # Verify the updates
            logger.info("\n--- UPDATED PLAYERS ---")
            for player_data in PLAYERS_TO_UPDATE:
                player_name = player_data["name"]
                c.execute("SELECT name, federation FROM players WHERE name LIKE ?", (f"%{player_name}%",))
                results = c.fetchall()
                for name, federation in results:
                    logger.info(f"Player: {name}, Federation: {federation}")
            logger.info("--- END OF UPDATED PLAYERS ---")
            
    except Exception as e:
        logger.error(f"Error updating player federations: {e}")
        raise

if __name__ == "__main__":
    update_player_federations()
