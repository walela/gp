"""
Enricher for tournament data.

Handles:
1. FIDE ID lookup from player detail pages
2. Walkover detection from game results

These are separate from initial scraping to avoid N+1 HTTP requests.
Enrichment can be run after scraping, batched for efficiency.
"""

import re
from bs4 import BeautifulSoup
from typing import Optional

from .client import fetch_player_page, get_client


def get_fide_id_from_player_page(html: str) -> Optional[str]:
    """
    Extract FIDE ID from a player detail page.

    The FIDE ID appears in a link like:
    <a href="https://ratings.fide.com/profile/10800018">10800018</a>
    """
    soup = BeautifulSoup(html, "html.parser")

    # Look for FIDE profile link
    for link in soup.find_all("a", href=True):
        href = link["href"]
        if "ratings.fide.com" in href or "fide.com/profile" in href:
            # Extract ID from URL or link text
            match = re.search(r"/(\d{6,})", href)
            if match:
                return match.group(1)

            # Or from link text
            text = link.get_text(strip=True)
            if text.isdigit() and len(text) >= 6:
                return text

    # Also check for FIDE ID in text (some pages show it differently)
    text = soup.get_text()
    match = re.search(r"FIDE[- ]?ID[:\s]*(\d{6,})", text, re.IGNORECASE)
    if match:
        return match.group(1)

    return None


def has_walkover(html: str) -> bool:
    """
    Check if a player's game results contain a walkover.

    Walkovers are indicated by:
    - "+" (win by forfeit)
    - "-" (loss by forfeit)
    - "+" or "-" in result column without opponent

    A player with any walkover win/loss is flagged.
    """
    soup = BeautifulSoup(html, "html.parser")

    # Look for game result tables
    # Results typically shown as: 1 | 0 | ½ | + | -
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all("td")
            for cell in cells:
                text = cell.get_text(strip=True)
                # Standalone + or - indicates forfeit
                if text in ["+", "-"]:
                    return True
                # Sometimes shown as "+/-" in a result cell
                if re.match(r"^[+-]$", text):
                    return True

    return False


def enrich_player(tournament_id: str, start_number: int, client=None) -> dict:
    """
    Fetch player detail page and extract enrichment data.

    Args:
        tournament_id: Chess-results tournament ID
        start_number: Player's starting number
        client: Optional httpx client for connection reuse

    Returns:
        Dict with fide_id and has_walkover
    """
    html = fetch_player_page(tournament_id, start_number, client)

    return {
        "fide_id": get_fide_id_from_player_page(html),
        "has_walkover": has_walkover(html),
    }


def enrich_tournament(tournament_id: str, start_numbers: list[int]) -> list[dict]:
    """
    Enrich multiple players from a tournament.

    Uses a single HTTP client for connection reuse.

    Args:
        tournament_id: Chess-results tournament ID
        start_numbers: List of player starting numbers to enrich

    Returns:
        List of dicts with start_number, fide_id, has_walkover
    """
    results = []

    with get_client() as client:
        for snr in start_numbers:
            try:
                data = enrich_player(tournament_id, snr, client)
                data["start_number"] = snr
                results.append(data)
            except Exception as e:
                # Log but continue with other players
                print(f"Failed to enrich player {snr}: {e}")
                results.append({
                    "start_number": snr,
                    "fide_id": None,
                    "has_walkover": None,
                    "error": str(e),
                })

    return results
