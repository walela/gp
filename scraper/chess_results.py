"""
Scraper for chess-results.com to collect tournament data and TPRs for Kenyan players.
"""
import re
import logging
import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from urllib.parse import urljoin

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    BASE_URL = "https://chess-results.com"
    
    def __init__(self):
        self.session = requests.Session()
        # Add headers to mimic browser behavior
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def get_tournament_data(self, tournament_id: str) -> Tuple[str, List[TournamentResult]]:
        """
        Scrapes tournament data for a given tournament ID.
        
        Args:
            tournament_id: The chess-results.com tournament ID
            
        Returns:
            Tuple of (tournament_name, list of TournamentResult objects for Kenyan players)
        """
        # First get tournament info and round count
        url = f"{self.BASE_URL}/tnr{tournament_id}.aspx?lan=1"
        logger.info(f"Fetching tournament info from {url}")
        response = self.session.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        tournament_name = self._get_tournament_name(soup)
        total_rounds = self._get_round_count(soup)
        logger.info(f"Found tournament: {tournament_name} with {total_rounds} rounds")
        
        # Now get the final standings with TPR
        # Modify parameters to get HTML instead of Excel
        standings_url = f"{self.BASE_URL}/tnr{tournament_id}.aspx?lan=1&art=1&rd={total_rounds}"
        logger.info(f"Fetching standings from {standings_url}")
        response = self.session.get(standings_url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        results = self._parse_standings(soup, total_rounds, tournament_id)
        return tournament_name, results
    
    def _get_tournament_name(self, soup: BeautifulSoup) -> str:
        """Extract tournament name from the page."""
        title = soup.find('h2')
        if title:
            return title.text.strip()
        return "Unknown Tournament"
    
    def _get_round_count(self, soup: BeautifulSoup) -> int:
        """Extract total number of rounds from the tournament."""
        # Try different patterns to find round count
        patterns = [
            r"Final Ranking after (\d+) Rounds",
            r"Ranking after Round (\d+)",
            r"Round (\d+)"
        ]
        
        for pattern in patterns:
            round_text = soup.find(string=re.compile(pattern))
            if round_text:
                match = re.search(pattern, round_text)
                if match:
                    return int(match.group(1))
        
        # Default to 6 rounds if we can't find it
        logger.warning("Could not find round count, defaulting to 6")
        return 6
    
    def _parse_standings(self, soup: BeautifulSoup, total_rounds: int, tournament_id: str) -> List[TournamentResult]:
        """Parse the final standings table to extract player results."""
        results = []
        
        # Find the main standings table - try different selectors
        table = (
            soup.find('table', {'class': 'CRs1'}) or  # Try original class
            soup.find('table', {'class': 'std_table'}) or  # Try another common class
            soup.find('table')  # Try any table as fallback
        )
        if not table:
            logger.error("Could not find standings table")
            return results
            
        # Get all player rows
        rows = table.find_all('tr')
        logger.info(f"Found {len(rows)} rows")
        
        # Find the header row to determine column indices
        header_row = table.find('tr')
        if not header_row:
            logger.error("Could not find header row")
            return results
        
        # Get header texts
        headers = [th.text.strip().lower() for th in header_row.find_all(['th', 'td'])]
        logger.info(f"Found headers: {headers}")
        
        # Find column indices
        rank_idx = next((i for i, h in enumerate(headers) if 'rank' in h or 'rk' in h or 'pos' in h or '#' in h), 0)
        start_rank_idx = next((i for i, h in enumerate(headers) if 'sno' in h), 1)  # sno column is for starting rank
        name_idx = next((i for i, h in enumerate(headers) if 'name' in h or 'player' in h), 2)
        fed_idx = next((i for i, h in enumerate(headers) if 'fed' in h or 'flag' in h), 3)
        rating_idx = next((i for i, h in enumerate(headers) if 'rtg' in h or 'rating' in h), 4)
        points_idx = next((i for i, h in enumerate(headers) if 'pts' in h or 'points' in h), 5)
        tpr_idx = next((i for i, h in enumerate(headers) if 'rp' in h or 'tpr' in h or 'perf' in h), 7)
        
        # Skip the header row
        rows = rows[1:]
        
        for row in rows:
            cols = row.find_all('td')
            if len(cols) < max(rank_idx, start_rank_idx, name_idx, fed_idx, rating_idx, points_idx, tpr_idx) + 1:
                continue
            
            try:
                # Extract rank and starting rank
                try:
                    rank = int(cols[rank_idx].text.strip().split('.')[0])  # Handle "1." format
                    start_rank = int(cols[start_rank_idx].text.strip())  # Get starting rank from sno column
                except (ValueError, IndexError):
                    rank = start_rank = 0
                
                # Extract player info
                name = cols[name_idx].text.strip()
                federation = cols[fed_idx].text.strip() if len(cols) > fed_idx else ""
                
                # Extract rating - handle empty or invalid values
                try:
                    rating = int(cols[rating_idx].text.strip())
                except (ValueError, IndexError):
                    rating = None
                
                # Extract points - handle empty or invalid values
                try:
                    points_text = cols[points_idx].text.strip()
                    points = float(points_text) if points_text and points_text[0].isdigit() else 0.0
                except (ValueError, IndexError):
                    points = 0.0
                
                # Extract TPR - handle empty or invalid values
                try:
                    tpr_text = cols[tpr_idx].text.strip()
                    tpr = int(tpr_text) if tpr_text and tpr_text[0].isdigit() else None
                except (ValueError, IndexError):
                    tpr = None
                
                # Skip rows without a valid name or federation
                if not name or not federation:
                    continue
                
                # Create player object
                player = Player(
                    name=name,
                    fide_id=self._extract_fide_id(cols[name_idx], tournament_id, start_rank),
                    federation=federation,
                    rating=rating,
                    title=None,  # We'll add this later if needed
                    club=None  # We'll add this later if needed
                )
                
                # Create result object
                result = TournamentResult(
                    player=player,
                    rank=rank,
                    start_rank=start_rank,
                    games_played=total_rounds,  # We'll refine this later
                    total_rounds=total_rounds,
                    points=points,
                    tpr=tpr,
                    has_walkover=self._check_for_walkover(points, total_rounds)
                )
                
                # Only include Kenyan players
                if federation == "KEN":
                    logger.info(f"Found Kenyan player: {name} (Rank: {rank}, TPR: {tpr})")
                    results.append(result)
                    
            except Exception as e:
                logger.error(f"Error parsing row: {str(e)}")
                continue
        
        return results
    
    def _extract_fide_id(self, cell, tournament_id: str, start_rank: int) -> Optional[str]:
        """Extract FIDE ID from player cell."""
        # Construct player details URL using starting rank
        player_url = f"{self.BASE_URL}/tnr{tournament_id}.aspx?lan=1&art=9&fed=KEN&turdet=YES&flag=30&snr={start_rank}"
        try:
            logger.debug(f"Fetching player details from {player_url}")
            response = self.session.get(player_url)
            player_soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for FIDE ID in player details
            fide_row = player_soup.find('td', string=re.compile(r'Fide-ID'))
            if fide_row and fide_row.find_next_sibling('td'):
                fide_id = fide_row.find_next_sibling('td').text.strip()
                if fide_id and fide_id.isdigit():
                    logger.debug(f"Found FIDE ID: {fide_id}")
                    return fide_id
                    
        except Exception as e:
            logger.error(f"Error fetching player details: {str(e)}")
            
        return None
    
    def _extract_rating(self, rating_text: str) -> Optional[int]:
        """Extract numerical rating from text."""
        try:
            # Remove any non-digit characters except minus sign
            clean_text = ''.join(c for c in rating_text if c.isdigit() or c == '-')
            return int(clean_text) if clean_text else None
        except ValueError:
            return None
            
    def _check_for_walkover(self, points: float, total_rounds: int) -> bool:
        """
        Check if a player likely had a walkover based on their points.
        This is a simplified check - ideally we'd look at individual games.
        """
        # If points are not a multiple of 0.5, there might have been a walkover/forfeit
        return not (points * 2).is_integer() or points > total_rounds
    
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
