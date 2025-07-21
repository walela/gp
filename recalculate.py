from db import Database
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

if __name__ == "__main__":
    logging.info("Starting the recalculation of player rankings...")
    db = Database()
    db.recalculate_rankings()
    logging.info("Player rankings have been successfully recalculated and stored.") 