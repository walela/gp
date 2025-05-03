"""
Script to remove invalid results (zero or NULL TPR) from the database.
"""
import sqlite3
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clean_invalid_tpr():
    """Remove results with zero or NULL TPR from the database."""
    with sqlite3.connect('gp_tracker.db') as conn:
        c = conn.cursor()
        
        # First, let's see how many invalid TPRs we have
        c.execute('SELECT COUNT(*) FROM results WHERE tpr = 0 OR tpr IS NULL')
        invalid_tpr_count = c.fetchone()[0]
        logger.info(f"Found {invalid_tpr_count} results with invalid TPR")
        
        if invalid_tpr_count > 0:
            # Get details of the invalid TPR results
            c.execute('''
                SELECT t.name, p.name, r.points, r.tpr 
                FROM results r 
                JOIN players p ON r.player_id = p.id 
                JOIN tournaments t ON r.tournament_id = t.id 
                WHERE r.tpr = 0 OR r.tpr IS NULL
            ''')
            invalid_tpr_results = c.fetchall()
            
            # Log the details
            logger.info("Invalid TPR results to be deleted:")
            for tournament, player, points, tpr in invalid_tpr_results:
                logger.info(f"Tournament: {tournament}, Player: {player}, Points: {points}, TPR: {tpr}")
            
            # Delete the invalid results
            c.execute('DELETE FROM results WHERE tpr = 0 OR tpr IS NULL')
            conn.commit()
            
            logger.info(f"Deleted {invalid_tpr_count} invalid results")
        else:
            logger.info("No invalid TPR results found")

if __name__ == "__main__":
    clean_invalid_tpr()