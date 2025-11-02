"""
Scraper for chess-results.com to collect tournament data and TPRs for Kenyan players.
"""
import re
import logging
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from typing import List, Optional, Tuple, Dict, Any
from dataclasses import dataclass
from db import Database
from tournament_metadata import infer_location

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize database
db = Database()

@dataclass
class Player:
    name: str
    fide_id: Optional[str]
    federation: str
    rating: Optional[int]
    title: Optional[str] = None
    club: Optional[str] = None

@dataclass
class TournamentResult:
    player: Player
    games_played: int
    total_rounds: int
    points: float
    tpr: Optional[float]
    has_walkover: bool
    rank: int
    start_rank: int

class ChessResultsScraper:
    def __init__(self):
        self.session = requests.Session()
        # Add headers to mimic browser behavior
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.base_urls = [
            "https://chess-results.com",
            "https://s1.chess-results.com",
            "https://s2.chess-results.com",
        ]

    def _request(self, method: str, path: str, *, params=None, data=None) -> requests.Response:
        """Attempt a request against the known chess-results mirrors."""
        last_exc: Optional[Exception] = None
        normalized_path = path.lstrip("/")

        for base in self.base_urls:
            url = f"{base}/{normalized_path}"
            try:
                response = self.session.request(method, url, params=params, data=data, timeout=20)
                response.raise_for_status()
                return response
            except requests.RequestException as exc:
                last_exc = exc
                logger.warning("Request to %s failed: %s", url, exc)

        raise requests.RequestException(f"All chess-results mirrors failed for {path}") from last_exc
    
    def get_tournament_data(self, tournament_id: str) -> Tuple[str, List[TournamentResult], Dict[str, Optional[Any]]]:
        """Get tournament data for a given tournament ID."""
        # Fetch tournament info
        response = self._request("GET", f"tnr{tournament_id}.aspx", params={"lan": 1})
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Get tournament name and round count
        title_text = soup.find('title').text
        title_parts = title_text.split('-')
        # Discard the first 3 standard parts ("Chess", "Results Server Chess", "results.com")
        if len(title_parts) > 3:
            tournament_name = ' '.join(part.strip() for part in title_parts[3:]).strip()
        else:
            # Fallback if title format is unexpected
            tournament_name = title_parts[-1].strip()
            
        # Remove common redundant suffixes like "Open Section"
        suffix_to_remove = "Open Section"
        if tournament_name.lower().endswith(suffix_to_remove.lower()):
            tournament_name = tournament_name[:-len(suffix_to_remove)].strip()

        round_count, start_date, end_date = self._get_round_count_and_dates(tournament_id)
        if tournament_id == "1126042":
            round_count = 8
        
        # Fetch the final ranking page for the determined round count with complete list
        response = self._request(
            "GET",
            f"tnr{tournament_id}.aspx",
            params={"lan": 1, "art": 1, "rd": round_count, "zeilen": 99999},
        )
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Parse standings table
        results = self._parse_standings(soup, round_count, tournament_id)

        metadata = {
            "rounds": round_count,
            "location": infer_location(tournament_name),
            "start_date": start_date,
            "end_date": end_date,
        }

        return tournament_name, results, metadata
    
    def _get_round_count_and_dates(self, tournament_id: str) -> Tuple[int, Optional[str], Optional[str]]:
        """Extract total number of rounds and tournament dates from the details page."""
        details_path = f"tnr{tournament_id}.aspx"
        round_count = None
        details_soup = None
        start_date_iso: Optional[str] = None
        end_date_iso: Optional[str] = None
        
        try:
            # Initial GET request
            logger.info(f"Fetching initial details page for tournament {tournament_id}")
            get_response = self._request(
                "GET",
                details_path,
                params={"lan": 1, "flag": 30, "turdet": "YES"},
            )
            get_response.raise_for_status()
            initial_soup = BeautifulSoup(get_response.text, 'html.parser')

            # Check if the 'Show details' button exists
            details_button = initial_soup.find('input', {'name': 'cb_alleDetails'})

            if details_button:
                logger.info("Details button found, simulating POST click...")
                # Extract form data needed for the POST request
                form_data = {
                    '__EVENTTARGET': '',
                    '__EVENTARGUMENT': '',
                    'cb_alleDetails': details_button.get('value', 'Show tournament details') # Get button value
                }
                # Find hidden fields and add them
                for hidden_input in initial_soup.find_all('input', {'type': 'hidden'}):
                    name = hidden_input.get('name')
                    value = hidden_input.get('value', '')
                    if name:
                        form_data[name] = value
                
                # Make the POST request to 'click' the button
                post_response = self._request(
                    "POST",
                    details_path,
                    data=form_data,
                )
                post_response.raise_for_status()
                details_soup = BeautifulSoup(post_response.text, 'html.parser')
            else:
                # No button found, details should be directly available
                logger.info("Details button not found, using initial page content.")
                details_soup = initial_soup

            # --- Parse the final soup (either from GET or POST) ---
            if details_soup is None:
                 raise ValueError("Failed to obtain details page content after GET/POST.")
                 
            # Find all tables that might contain the details
            detail_tables = details_soup.find_all('table') 
            found = False
            for table in detail_tables:
                rows = table.find_all('tr')
                for row in rows:
                    cells = row.find_all('td') # Find all td cells, regardless of class
                    if len(cells) >= 2 and cells[0].text.strip().lower() == 'number of rounds': # Case-insensitive compare
                        round_count = int(cells[1].text.strip())
                        logger.info(f"Found round count ({round_count}) for tournament {tournament_id}")
                        found = True
                        break # Exit inner loop once found
                if found:
                    break # Exit outer loop once found

            if details_soup:
                start_date_iso, end_date_iso = self._extract_dates(details_soup)
                 
        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP Error accessing details page {details_url}: {e}")
        except (AttributeError, ValueError, TypeError, IndexError) as e:
            logger.error(f"Failed to parse round count from details page {details_url}: {e}")

        if round_count is None:
            # Default to 9 rounds if we failed to find/parse it
            logger.warning(f"Could not find round count for {tournament_id}, defaulting to 9")
            round_count = 9
            
        return round_count, start_date_iso, end_date_iso

    def _extract_dates(self, details_soup: BeautifulSoup) -> Tuple[Optional[str], Optional[str]]:
        """Extract start and end dates from the details soup."""
        date_pattern = re.compile(r'\b(\d{2})\.(\d{2})\.(\d{4})\b')
        text_content = details_soup.get_text(" ", strip=True)
        matches = date_pattern.findall(text_content)

        unique_matches = []
        for match in matches:
            date_str = ".".join(match)
            if date_str not in unique_matches:
                unique_matches.append(date_str)

        if not unique_matches:
            return None, None

        start_iso = self._to_iso(unique_matches[0])
        end_iso = self._to_iso(unique_matches[1]) if len(unique_matches) > 1 else start_iso
        return start_iso, end_iso

    @staticmethod
    def _to_iso(raw_date: str) -> Optional[str]:
        """Convert dd.mm.yyyy to ISO date."""
        try:
            return datetime.strptime(raw_date, "%d.%m.%Y").date().isoformat()
        except ValueError:
            return None
    
    def _parse_standings(self, soup: BeautifulSoup, total_rounds: int, tournament_id: str = None) -> List[TournamentResult]:
        """Parse the standings table and return list of tournament results."""
        results = []
        
        # Find the standings table
        table = soup.find('table', {'class': 'CRs1'})
        if not table:
            return results
            
        # Get headers to find column indices
        headers = self._get_table_headers(table)
        if not headers:
            return results
            
        # Process each row
        rows = table.find_all('tr')[1:]  # Skip header row
        for row in rows:
            cells = row.find_all('td')
            if len(cells) < len(headers):
                continue
            
            # Use standard parsing logic for all tournaments (art=1 view)
            if 'KEN' not in cells[headers.index('fed')].text:
                continue
                
            # Get player info
            name = cells[headers.index('name')].text.strip()
            # Handle both 'rtg' and 'rtgi' headers
            rating_header = 'rtg' if 'rtg' in headers else 'rtgi'
            rating = int(cells[headers.index(rating_header)].text) if cells[headers.index(rating_header)].text.strip() else 0
            points = float(cells[headers.index('pts.')].text.replace(',', '.'))
            rank = int(cells[headers.index('rk.')].text)
            start_rank = int(cells[headers.index('sno')].text)
            
            # Calculate TPR - handle different column names
            tpr = 0
            tpr_columns = ['rp', 'tb6', 'tpr', 'perf']
            for col in tpr_columns:
                if col in headers:
                    tpr_cell = cells[headers.index(col)]
                    if tpr_cell.text.strip() and tpr_cell.text.strip() != '-':
                        try:
                            tpr = int(tpr_cell.text.strip())
                        except ValueError:
                            tpr = 0
                    break
            
            # Get FIDE ID if available
            fide_id = self._extract_fide_id(cells[headers.index('name')], tournament_id, start_rank)
        
            # Create player and result objects
            player = Player(name=name, fide_id=fide_id, federation="KEN", rating=rating)
            result = TournamentResult(
                player=player,
                games_played=total_rounds,
                total_rounds=total_rounds,
                points=points,
                tpr=tpr,
                has_walkover=False,  # Will be updated later
                rank=rank,
                start_rank=start_rank
            )
            
            # Check for walkovers
            if tournament_id:
                result.has_walkover = self._check_for_walkover(tournament_id, start_rank, name)
            
            results.append(result)
            
        return results
    
    def _get_table_headers(self, table):
        headers = []
        header_row = table.find('tr')
        for cell in header_row.find_all(['td', 'th']):
            header = cell.text.strip().lower()
            headers.append(header)
        return headers
    
    def _extract_fide_id(self, cell, tournament_id: str, start_rank: int) -> Optional[str]:
        """Extract FIDE ID from player cell."""
        # Construct player details URL using starting rank
        try:
            response = self._request(
                "GET",
                f"tnr{tournament_id}.aspx",
                params={
                    "lan": 1,
                    "art": 9,
                    "fed": "KEN",
                    "turdet": "YES",
                    "flag": 30,
                    "snr": start_rank,
                },
            )
            player_soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for FIDE ID in player details
            fide_row = player_soup.find('td', string=re.compile(r'Fide-ID'))
            if fide_row and fide_row.find_next_sibling('td'):
                fide_id = fide_row.find_next_sibling('td').text.strip()
                if fide_id and fide_id.isdigit():
                    return fide_id
            return None
        except Exception as e:
            logger.error(f"Error extracting FIDE ID: {str(e)}")
            return None
    
    def _extract_rating(self, rating_text: str) -> Optional[int]:
        """Extract numerical rating from text."""
        try:
            # Remove any non-digit characters except minus sign
            clean_text = ''.join(c for c in rating_text if c.isdigit() or c == '-')
            return int(clean_text) if clean_text else None
        except ValueError:
            return None
            
    def _check_for_walkover(self, tournament_id: str, start_rank: int, name: str) -> bool:
        """
        Check if a player likely had a walkover based on their points.
        This is a simplified check - ideally we'd look at individual games.
        """
        # If points are not a multiple of 0.5, there might have been a walkover/forfeit
        try:
            response = self._request(
                "GET",
                f"tnr{tournament_id}.aspx",
                params={
                    "lan": 1,
                    "art": 9,
                    "fed": "KEN",
                    "turdet": "YES",
                    "flag": 30,
                    "snr": start_rank,
                },
            )
            player_soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all tables with class CRs1
            results_tables = player_soup.find_all('table', {'class': 'CRs1'})
            
            # Look for the results table (it has "Rd." in its header)
            results_text = ""
            for table in results_tables:
                if "Rd." in table.text:
                    results_text = table.text.strip()
                    break
            
            # Check for walkovers or missing rounds
            return 'K' in results_text or 'not paired' in results_text
        except Exception as e:
            logger.error(f"Error fetching player game results: {str(e)}")
            return False
    
    def is_eligible_result(self, result: TournamentResult) -> bool:
        """
        Checks if a tournament result is eligible for GP points.
        
        Args:
            result: TournamentResult to validate
            
        Returns:
            True if the result is eligible (completed all rounds, no walkovers)
        """
        return (
            result.games_played == result.total_rounds
            and not result.has_walkover
            and result.player.federation == "KEN"
        )


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Scrape chess tournament results.')
    parser.add_argument('tournament_ids', metavar='ID', type=str, nargs='+',
                        help='One or more tournament IDs to scrape')

    args = parser.parse_args()

    scraper = ChessResultsScraper()
    db = Database() # Ensure db is initialized

    for tournament_id in args.tournament_ids:
        logger.info(f"--- Processing tournament: {tournament_id} ---")
        try:
            tournament_name, results = scraper.get_tournament_data(tournament_id)
            if tournament_name and results:
                logger.info(f"Scraped {len(results)} results for {tournament_name} ({tournament_id}). Saving to database...")
                # Calculate TPR before saving (ensure _calculate_tpr is accessible or logic moved)
                # Note: TPR calculation was moved into db.save_tournament previously, check that logic.
                # Assuming db.save_tournament now handles TPR implicitly or it needs data
                db.save_tournament(tournament_id, tournament_name, results)
                logger.info(f"Successfully saved tournament {tournament_id}.")
            elif tournament_name:
                logger.warning(f"Scraped tournament {tournament_name} ({tournament_id}) but found no results.")
            else:
                logger.warning(f"Could not scrape data for tournament {tournament_id}. Name or results missing.")
        except Exception as e:
            logger.error(f"An error occurred while processing tournament {tournament_id}: {e}", exc_info=True)
        logger.info(f"--- Finished processing tournament: {tournament_id} ---")

    logger.info("Scraping complete.")
