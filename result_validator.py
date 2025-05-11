"""
Module for validating chess tournament results and determining their status.
"""
import re
import logging
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional, Tuple

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ResultValidator:
    """Class for validating chess tournament results."""
    
    BASE_URL = "https://chess-results.com"
    
    def __init__(self, session=None):
        """Initialize with optional session for reuse."""
        self.session = session or requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def get_player_game_results(self, tournament_id: str, start_rank: int) -> Tuple[List[str], str]:
        """
        Get a player's individual game results and determine result status.
        
        Args:
            tournament_id: Chess-results.com tournament ID
            start_rank: Player's starting rank in the tournament
            
        Returns:
            Tuple of (list of game results, result status)
        """
        player_url = f"{self.BASE_URL}/tnr{tournament_id}.aspx?lan=1&art=9&turdet=YES&flag=30&snr={start_rank}"
        
        try:
            response = self.session.get(player_url)
            player_soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all tables with class CRs1
            results_tables = player_soup.find_all('table', {'class': 'CRs1'})
            
            # Look for the results table (it has "Rd." in its header)
            game_results = []
            results_text = ""
            
            for table in results_tables:
                if "Rd." in table.text:
                    results_text = table.text.strip()
                    
                    # Extract individual game results
                    rows = table.find_all('tr')
                    for row in rows[1:]:  # Skip header row
                        cells = row.find_all('td')
                        if len(cells) >= 3:  # Round, Color, Result
                            result = cells[2].text.strip()
                            game_results.append(result)
                    
                    break
            
            # Determine result status
            status = self._determine_result_status(game_results, results_text)
            
            return game_results, status
            
        except Exception as e:
            logger.error(f"Error fetching player game results: {str(e)}")
            return [], "unknown"
    
    def _determine_result_status(self, game_results: List[str], results_text: str) -> str:
        """
        Determine the status of a player's tournament result.
        
        Args:
            game_results: List of individual game results
            results_text: Full text of results table
            
        Returns:
            Status string: 'valid', 'walkover', 'incomplete', 'withdrawn', or 'unknown'
        """
        # Check for walkovers (marked as '+', '-', or 'K')
        if any('+' in result or '-' in result or 'K' in result for result in game_results):
            return "walkover"
        
        # Check for missing games or not paired
        if 'not paired' in results_text:
            return "incomplete"
            
        # Check for withdrawals
        if 'withdrawn' in results_text.lower():
            return "withdrawn"
            
        # If no issues found, result is valid
        return "valid"
