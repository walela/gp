"""
Script to update the database schema to include tournament dates and extract dates from chess-results.com.
"""
import sqlite3
import logging
import requests
import re
from bs4 import BeautifulSoup
from datetime import datetime

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
    "1173578": {"name": "Kiambu Open", "start_date": "2025-05-11", "end_date": "2025-05-11"}  # Today's date as placeholder
}

def update_schema():
    """Update the database schema to include tournament date fields."""
    try:
        with sqlite3.connect('gp_tracker.db') as conn:
            c = conn.cursor()
            
            # Check if start_date and end_date columns exist in tournaments table
            c.execute("PRAGMA table_info(tournaments)")
            columns = [column[1] for column in c.fetchall()]
            
            # Add start_date column if it doesn't exist
            if 'start_date' not in columns:
                logger.info("Adding start_date column to tournaments table")
                c.execute('ALTER TABLE tournaments ADD COLUMN start_date TEXT')
                conn.commit()
                logger.info("Added start_date column successfully")
            else:
                logger.info("start_date column already exists")
                
            # Add end_date column if it doesn't exist
            if 'end_date' not in columns:
                logger.info("Adding end_date column to tournaments table")
                c.execute('ALTER TABLE tournaments ADD COLUMN end_date TEXT')
                conn.commit()
                logger.info("Added end_date column successfully")
            else:
                logger.info("end_date column already exists")
                
            logger.info("Schema update complete")
    except Exception as e:
        logger.error(f"Error updating schema: {e}")
        raise

def extract_date_from_chess_results(tournament_id):
    """Try to extract tournament dates from chess-results.com with improved logic."""
    base_url = "https://chess-results.com"
    details_url = f"{base_url}/tnr{tournament_id}.aspx?lan=1&flag=30&turdet=YES"
    
    try:
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        # Get the tournament details page
        response = session.get(details_url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Look specifically for the date field in the tournament details
        date_patterns = [
            # Look for "Date" label in a table
            (soup.find(string=re.compile(r'Date', re.IGNORECASE)), 
             lambda elem: elem.find_next('td').text if elem and elem.find_next('td') else None),
            
            # Look for date in the title
            (soup.find('title'), 
             lambda elem: re.search(r'(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})', elem.text) if elem else None),
            
            # Look for date in any text
            (soup.find(string=re.compile(r'\d{2}\.\d{2}\.\d{4}\s*-\s*\d{2}\.\d{2}\.\d{4}')),
             lambda elem: re.search(r'(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})', elem) if elem else None)
        ]
        
        for elem, extractor in date_patterns:
            if elem:
                result = extractor(elem)
                if result:
                    if isinstance(result, re.Match):
                        start_date = result.group(1)
                        end_date = result.group(2)
                        return start_date, end_date
                    else:
                        # Try to parse the text for dates
                        date_match = re.search(r'(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})', result)
                        if date_match:
                            return date_match.group(1), date_match.group(2)
                        
                        # Try to find single date
                        single_date = re.search(r'(\d{2}\.\d{2}\.\d{4})', result)
                        if single_date:
                            return single_date.group(1), single_date.group(1)
        
        # If we couldn't find dates with the above methods, try a more general approach
        all_text = soup.get_text()
        date_range_match = re.search(r'(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})', all_text)
        if date_range_match:
            return date_range_match.group(1), date_range_match.group(2)
            
        # Try to find any dates
        all_dates = re.findall(r'(\d{2}\.\d{2}\.\d{4})', all_text)
        if len(all_dates) >= 2:
            return all_dates[0], all_dates[1]
        elif len(all_dates) == 1:
            return all_dates[0], all_dates[0]
            
        return None, None
    except Exception as e:
        logger.error(f"Error extracting dates for tournament {tournament_id}: {e}")
        return None, None

def update_tournament_dates():
    """Update tournament dates in the database."""
    try:
        with sqlite3.connect('gp_tracker.db') as conn:
            c = conn.cursor()
            
            # Get all tournaments
            c.execute('SELECT id, name FROM tournaments')
            tournaments = c.fetchall()
            
            for tournament_id, tournament_name in tournaments:
                logger.info(f"Processing tournament: {tournament_name} (ID: {tournament_id})")
                
                # Try to extract dates from chess-results.com
                start_date_str, end_date_str = extract_date_from_chess_results(tournament_id)
                
                # If extraction failed, use our known dates
                if not start_date_str or not end_date_str:
                    if tournament_id in TOURNAMENT_DATES:
                        start_date_str = TOURNAMENT_DATES[tournament_id]["start_date"]
                        end_date_str = TOURNAMENT_DATES[tournament_id]["end_date"]
                        logger.info(f"Using known dates for {tournament_name}: {start_date_str} to {end_date_str}")
                    else:
                        logger.warning(f"Could not determine dates for tournament {tournament_name}")
                        continue
                else:
                    # Convert from DD.MM.YYYY to YYYY-MM-DD format
                    try:
                        start_date = datetime.strptime(start_date_str, "%d.%m.%Y")
                        end_date = datetime.strptime(end_date_str, "%d.%m.%Y")
                        start_date_str = start_date.strftime("%Y-%m-%d")
                        end_date_str = end_date.strftime("%Y-%m-%d")
                    except ValueError:
                        logger.warning(f"Could not parse dates {start_date_str} - {end_date_str} for tournament {tournament_name}")
                        if tournament_id in TOURNAMENT_DATES:
                            start_date_str = TOURNAMENT_DATES[tournament_id]["start_date"]
                            end_date_str = TOURNAMENT_DATES[tournament_id]["end_date"]
                            logger.info(f"Using known dates for {tournament_name}: {start_date_str} to {end_date_str}")
                        else:
                            continue
                
                # Update the tournament with dates
                c.execute('''
                    UPDATE tournaments 
                    SET start_date = ?, end_date = ? 
                    WHERE id = ?
                ''', (start_date_str, end_date_str, tournament_id))
                
                logger.info(f"Updated tournament {tournament_name} with dates: {start_date_str} to {end_date_str}")
            
            conn.commit()
            logger.info("Tournament dates update complete")
    except Exception as e:
        logger.error(f"Error updating tournament dates: {e}")
        raise

if __name__ == "__main__":
    # First update the schema to include date fields
    update_schema()
    
    # Then update the tournament dates
    update_tournament_dates()
