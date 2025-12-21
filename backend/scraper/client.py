"""
HTTP client for fetching pages from chess-results.com.

Handles retries, rate limiting, and session management.
"""

import httpx
from typing import Optional


# Base URL for chess-results
BASE_URL = "https://chess-results.com"

# Default timeout in seconds
TIMEOUT = 30

# Headers to avoid being blocked
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; GPTracker/1.0)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}


def get_client() -> httpx.Client:
    """Create a configured HTTP client."""
    return httpx.Client(
        base_url=BASE_URL,
        headers=HEADERS,
        timeout=TIMEOUT,
        follow_redirects=True,
    )


def fetch_tournament_page(tournament_id: str, client: Optional[httpx.Client] = None) -> str:
    """
    Fetch the final standings page for a tournament.

    Args:
        tournament_id: The chess-results tournament ID (e.g., "1026866")
        client: Optional httpx client (creates one if not provided)

    Returns:
        HTML content of the standings page

    Raises:
        httpx.HTTPError: If the request fails
    """
    url = f"/tnr{tournament_id}.aspx"
    own_client = client is None

    if own_client:
        client = get_client()

    try:
        # First fetch main page with details expanded to get round count
        response = client.get(url, params={"lan": 1, "turdet": "YES"})
        response.raise_for_status()

        # Extract round count from page
        round_count = _extract_round_count(response.text)

        # Fetch final standings with all players
        # art=1: standings view, rd=X: after round X, zeilen=99999: show all
        params = {
            "lan": 1,
            "art": 1,
            "rd": round_count,
            "zeilen": 99999,
        }

        response = client.get(url, params=params)
        response.raise_for_status()
        return response.text
    finally:
        if own_client:
            client.close()


def _extract_round_count(html: str) -> int:
    """Extract total round count from tournament page."""
    import re
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text()

    # Look for "Final Ranking after X Rounds" pattern (most reliable)
    match = re.search(r"Final Ranking.*?after\s+(\d+)\s*Rounds?", text, re.IGNORECASE)
    if match:
        return int(match.group(1))

    # Look for "Ranking list after: Rd.1, Rd.2, ... Rd.X" and find highest
    match = re.search(r"Rd\.(\d+)[^,\d]", text)
    if match:
        # Find all Rd.X patterns
        rd_matches = re.findall(r"Rd\.(\d+)", text)
        if rd_matches:
            return max(int(r) for r in rd_matches)

    # Look for "Number of rounds" row in details table
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all("td")
            if len(cells) >= 2:
                label = cells[0].get_text(strip=True).lower()
                if "number of rounds" in label:
                    try:
                        return int(cells[1].get_text(strip=True))
                    except ValueError:
                        pass

    # Fallback: look for max rd= link
    max_round = 1
    for link in soup.find_all("a", href=True):
        rd_match = re.search(r"rd=(\d+)", link["href"])
        if rd_match:
            max_round = max(max_round, int(rd_match.group(1)))

    # If we only found rd=1, default to 6 (most GP tournaments)
    if max_round <= 1:
        max_round = 6

    return max_round


def fetch_player_page(tournament_id: str, start_number: int, client: Optional[httpx.Client] = None) -> str:
    """
    Fetch a player's detail page within a tournament.

    Used for enrichment (getting FIDE ID, checking walkovers).

    Args:
        tournament_id: The chess-results tournament ID
        start_number: The player's starting number in the tournament
        client: Optional httpx client

    Returns:
        HTML content of the player detail page
    """
    # Player page URL pattern
    # Example: https://chess-results.com/tnr1026866.aspx?lan=1&art=9&snr=5
    url = f"/tnr{tournament_id}.aspx"
    params = {
        "lan": 1,
        "art": 9,  # Player card view
        "snr": start_number,
    }

    if client:
        response = client.get(url, params=params)
    else:
        with get_client() as c:
            response = c.get(url, params=params)

    response.raise_for_status()
    return response.text
