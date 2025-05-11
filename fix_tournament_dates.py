"""
Script to fix tournament dates in the database using known dates.
"""
import sqlite3
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Tournament IDs and known dates (based on tournament announcements and other sources)
TOURNAMENT_DATES = {
    "1095243": {"name": "Eldoret Open", "start_date": "2025-01-25", "end_date": "2025-01-26"},
    "1126042": {"name": "Mavens Open", "start_date": "2025-02-28", "end_date": "2025-03-02"},
    "1130967": {"name": "Waridi Chess Festival", "start_date": "2025-03-08", "end_date": "2025-03-09"},
    "1135144": {"name": "Kisumu Open", "start_date": "2025-03-22", "end_date": "2025-03-23"},
    "1165146": {"name": "Nakuru Grand Prix", "start_date": "2025-05-01", "end_date": "2025-05-03"},
    "1173578": {"name": "Kiambu Open", "start_date": "2025-05-11", "end_date": "2025-05-12"}
}

def fix_tournament_dates():
    """Update tournament dates in the database with known dates."""
    try:
        with sqlite3.connect('gp_tracker.db') as conn:
            c = conn.cursor()
            
            for tournament_id, data in TOURNAMENT_DATES.items():
                logger.info(f"Updating tournament {data['name']} (ID: {tournament_id}) with dates: {data['start_date']} to {data['end_date']}")
                
                # Update the tournament with dates
                c.execute('''
                    UPDATE tournaments 
                    SET start_date = ?, end_date = ? 
                    WHERE id = ?
                ''', (data['start_date'], data['end_date'], tournament_id))
            
            conn.commit()
            logger.info("Tournament dates update complete")
            
            # Verify the updates
            c.execute('SELECT id, name, start_date, end_date FROM tournaments')
            tournaments = c.fetchall()
            
            logger.info("\n--- TOURNAMENT DATES SUMMARY ---")
            for tournament in tournaments:
                logger.info(f"ID: {tournament[0]}, Name: {tournament[1]}, Dates: {tournament[2]} to {tournament[3]}")
            logger.info("--- END OF SUMMARY ---")
            
    except Exception as e:
        logger.error(f"Error updating tournament dates: {e}")
        raise

if __name__ == "__main__":
    fix_tournament_dates()
