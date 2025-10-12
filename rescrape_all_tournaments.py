"""
Script to rescrape all tournaments with improved result status detection.
"""
import logging
import re
import requests
from bs4 import BeautifulSoup
from chess_results import ChessResultsScraper
from result_validator import ResultValidator
from db import Database

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Tournament IDs for 2025 Grand Prix
TOURNAMENTS = {
    "1095243": "Eldoret Open",
    "1126042": "Mavens Open",
    "1130967": "Waridi Chess Festival",
    "1135144": "Kisumu Open",
    "1165146": "The East Africa Chess Championship Nakuru Grand Prix 2025",
    "1173578": "Kiambu Open"
}

def get_tournament_dates(tournament_id):
    """Extract tournament dates from chess-results.com."""
    base_url = "https://chess-results.com"
    tournament_url = f"{base_url}/tnr{tournament_id}.aspx?lan=1"
    
    try:
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        response = session.get(tournament_url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Look for date information in the page
        date_pattern = re.compile(r'\d{2}\.\d{2}\.\d{4}')
        
        # Try to find dates in various places
        date_text = None
        
        # Method 1: Look in the title
        title = soup.find('title')
        if title and date_pattern.search(title.text):
            date_text = title.text
        
        # Method 2: Look for specific elements with date info
        if not date_text:
            date_elements = soup.find_all(string=date_pattern)
            if date_elements:
                date_text = date_elements[0]
        
        # Method 3: Try to find in tournament details
        if not date_text:
            details_url = f"{base_url}/tnr{tournament_id}.aspx?lan=1&flag=30&turdet=YES"
            details_response = session.get(details_url)
            details_soup = BeautifulSoup(details_response.text, 'html.parser')
            
            # Look for date label and adjacent text
            date_label = details_soup.find(string=re.compile('Date', re.IGNORECASE))
            if date_label and date_label.parent and date_label.parent.next_sibling:
                date_text = date_label.parent.next_sibling.text
            
            # If still not found, try to find any date pattern
            if not date_text:
                date_elements = details_soup.find_all(string=date_pattern)
                if date_elements:
                    date_text = date_elements[0]
        
        # Extract dates from text
        if date_text:
            dates = date_pattern.findall(date_text)
            if len(dates) >= 2:
                start_date = dates[0]
                end_date = dates[1]
                return f"{start_date} - {end_date}"
            elif len(dates) == 1:
                return dates[0]
        
        # Default fallback
        return "Date not found"
    
    except Exception as e:
        logger.error(f"Error extracting tournament dates: {e}")
        return "Date not found"

def scrape_and_save_tournament(tournament_id, tournament_name):
    """Scrape tournament data for all players and save with result status."""
    logger.info(f"Scraping tournament: {tournament_name} (ID: {tournament_id})")
    
    scraper = ChessResultsScraper()
    validator = ResultValidator(session=scraper.session)
    db = Database()
    
    try:
        # Check if tournament already exists
        if db.does_tournament_exist(tournament_id):
            logger.info(f"Tournament {tournament_name} already exists. Deleting existing data...")
            db.delete_tournament_data(tournament_id)
        
        # Scrape tournament data (this will get all players)
        name, results, metadata = scraper.get_tournament_data(tournament_id)

        tournament_dates = None
        if metadata.get("start_date") and metadata.get("end_date"):
            tournament_dates = f"{metadata['start_date']} - {metadata['end_date']}"
        elif metadata.get("start_date"):
            tournament_dates = metadata['start_date']
        else:
            tournament_dates = get_tournament_dates(tournament_id)

        logger.info(
            "Tournament metadata -> rounds: %s, start: %s, end: %s, location: %s",
            metadata.get("rounds"),
            metadata.get("start_date"),
            metadata.get("end_date"),
            metadata.get("location"),
        )
        
        # Log some basic stats
        logger.info(f"Tournament name: {name}")
        logger.info(f"Total results: {len(results)}")
        
        # Process each result to determine status
        processed_results = []
        
        for i, result in enumerate(results):
            if i % 20 == 0:
                logger.info(f"Processing player {i+1}/{len(results)}: {result.player.name}")
            
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
            
            # Log status for some players
            if i < 3 or i % 50 == 0:
                logger.info(f"Player: {result.player.name}, Federation: {result.player.federation}, Status: {status}")
        
        # Save to database with custom function to handle the result_status field
        save_tournament_with_status(
            tournament_id,
            name,
            processed_results,
            metadata=metadata,
        )
        
        logger.info(f"Successfully saved tournament: {name} with {len(processed_results)} results")
        
        # Return some stats
        return {
            "name": name,
            "results_count": len(processed_results),
            "dates": tournament_dates,
            "status": "completed"
        }
    except Exception as e:
        logger.error(f"Error scraping tournament {tournament_name}: {e}", exc_info=True)
        raise

def save_tournament_with_status(tournament_id, tournament_name, results, *, metadata=None):
    """Save tournament data with result status to database."""
    metadata = metadata or {}
    db = Database()
    db.save_tournament(
        tournament_id,
        tournament_name,
        results,
        start_date=metadata.get("start_date"),
        end_date=metadata.get("end_date"),
        location=metadata.get("location"),
        rounds=metadata.get("rounds"),
    )
    logger.info(f"Saved tournament {tournament_name} with {len(results)} results")

if __name__ == "__main__":
    # First ensure the database schema is updated
    import update_schema
    update_schema.update_schema()
    
    # Process each tournament
    tournament_results = {}
    
    for tournament_id, tournament_name in TOURNAMENTS.items():
        try:
            result = scrape_and_save_tournament(tournament_id, tournament_name)
            tournament_results[tournament_id] = result
        except Exception as e:
            logger.error(f"Failed to process tournament {tournament_name}: {e}")
    
    # Print summary
    logger.info("\n--- SCRAPING SUMMARY ---")
    for tournament_id, result in tournament_results.items():
        logger.info(f"{result['name']}: {result['results_count']} results, Dates: {result['dates']}")
    logger.info("--- END OF SUMMARY ---")
