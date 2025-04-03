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
import sqlite3
from db import Database

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
    BASE_URL = "https://chess-results.com"
    
    def __init__(self):
        self.session = requests.Session()
        # Add headers to mimic browser behavior
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def get_tournament_data(self, tournament_id: str) -> Tuple[str, List[TournamentResult]]:
        """Get tournament data for a given tournament ID."""
        # Fetch tournament info
        tournament_url = f"{self.BASE_URL}/tnr{tournament_id}.aspx?lan=1"
        response = self.session.get(tournament_url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Get tournament name and round count
        tournament_name = soup.find('title').text.split('-')[0].strip()
        round_count = 8 if tournament_id == "1126042" else self._get_round_count(soup)
        
        # For Mavens tournament, use crosstable view to get final points
        if tournament_id == "1126042":
            standings_url = f"{self.BASE_URL}/tnr{tournament_id}.aspx?lan=1&art=2"
        else:
            standings_url = f"{self.BASE_URL}/tnr{tournament_id}.aspx?lan=1&art=1&rd={round_count}"
            
        response = self.session.get(standings_url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Parse standings table
        results = self._parse_standings(soup, round_count, tournament_id)
        
        return tournament_name, results
    
    def _get_round_count(self, soup: BeautifulSoup) -> int:
        """Extract total number of rounds from the tournament."""
        # Try different patterns to find round count
        patterns = [
            r"Final Ranking after (\d+) Rounds",
            r"Ranking after Round (\d+)",
            r"Round (\d+)",
            r"(\d+) Rounds"
        ]
        
        # First try to find in the title
        title = soup.find('title')
        if title:
            title_text = title.text
            for pattern in patterns:
                match = re.search(pattern, title_text)
                if match:
                    return int(match.group(1))
        
        # Then try to find in any text
        for pattern in patterns:
            round_text = soup.find(string=re.compile(pattern))
            if round_text:
                match = re.search(pattern, round_text)
                if match:
                    return int(match.group(1))
        
        # If we still can't find it, look for the last round number in the crosstable
        round_links = soup.find_all('a', href=re.compile(r'art=3.*rd=\d+'))
        if round_links:
            rounds = [int(re.search(r'rd=(\d+)', link['href']).group(1)) 
                     for link in round_links 
                     if re.search(r'rd=(\d+)', link['href'])]
            if rounds:
                return max(rounds)
        
        # Default to 9 rounds if we can't find it
        logger.warning("Could not find round count, defaulting to 9")
        return 9
    
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
                
            # Check if this is a crosstable view (art=2)
            if tournament_id == "1126042":
                # In crosstable, player details are in a different format
                name_cell = cells[1]  # Name is always in second column
                name = name_cell.text.strip()
                # Skip non-Kenyan players by checking their name in the database
                with sqlite3.connect(db.db_file) as conn:
                    c = conn.cursor()
                    c.execute('SELECT federation FROM players WHERE name = ?', (name,))
                    result = c.fetchone()
                    if not result or result[0] != 'KEN':
                        continue
                
                # Get player info from database
                c.execute('SELECT fide_id, rating FROM players WHERE name = ?', (name,))
                player_info = c.fetchone()
                if not player_info:
                    continue
                    
                fide_id, rating = player_info
                points = float(cells[-2].text.replace(',', '.'))  # Points are in second-to-last column
                rank = int(cells[0].text)  # Rank is in first column
                start_rank = rank  # In crosstable, we don't have start rank
                
                # TPR is not available in crosstable
                tpr = 0
            else:
                # Regular standings view (art=1)
                if 'KEN' not in cells[headers.index('fed')].text:
                    continue
                    
                # Get player info
                name = cells[headers.index('name')].text.strip()
                rating = int(cells[headers.index('rtg')].text) if cells[headers.index('rtg')].text.strip() else 0
                points = float(cells[headers.index('pts.')].text.replace(',', '.'))
                rank = int(cells[headers.index('rk.')].text)
                start_rank = int(cells[headers.index('sno')].text)
                
                # Calculate TPR
                tpr_cell = cells[headers.index('rp')]
                tpr = int(tpr_cell.text) if tpr_cell.text.strip() else 0
                
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
        player_url = f"{self.BASE_URL}/tnr{tournament_id}.aspx?lan=1&art=9&fed=KEN&turdet=YES&flag=30&snr={start_rank}"
        try:
            response = self.session.get(player_url)
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
        player_url = f"{self.BASE_URL}/tnr{tournament_id}.aspx?lan=1&art=9&fed=KEN&turdet=YES&flag=30&snr={start_rank}"
        try:
            response = self.session.get(player_url)
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
