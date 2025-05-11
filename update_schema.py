"""
Script to update the database schema with result_status field and make other improvements.
"""
import sqlite3
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_schema():
    """Update the database schema to add result_status field and make other improvements."""
    try:
        with sqlite3.connect('gp_tracker.db') as conn:
            c = conn.cursor()
            
            # Check if result_status column exists
            c.execute("PRAGMA table_info(results)")
            columns = [column[1] for column in c.fetchall()]
            
            if 'result_status' not in columns:
                logger.info("Adding result_status column to results table")
                c.execute('ALTER TABLE results ADD COLUMN result_status TEXT DEFAULT "valid"')
                conn.commit()
                logger.info("Added result_status column successfully")
            else:
                logger.info("result_status column already exists")
                
            # Create index on federation for faster filtering
            try:
                logger.info("Creating index on players.federation")
                c.execute('CREATE INDEX IF NOT EXISTS idx_players_federation ON players(federation)')
                conn.commit()
                logger.info("Created index successfully")
            except sqlite3.OperationalError as e:
                logger.warning(f"Could not create index: {e}")
                
            # Create index on TPR for faster ranking queries
            try:
                logger.info("Creating index on results.tpr")
                c.execute('CREATE INDEX IF NOT EXISTS idx_results_tpr ON results(tpr)')
                conn.commit()
                logger.info("Created index successfully")
            except sqlite3.OperationalError as e:
                logger.warning(f"Could not create index: {e}")
                
            logger.info("Schema update complete")
    except Exception as e:
        logger.error(f"Error updating schema: {e}")
        raise

if __name__ == "__main__":
    update_schema()
