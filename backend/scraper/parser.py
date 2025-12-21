"""
HTML parser for chess-results.com tournament pages.

Extracts tournament data, player results, and related sections.
"""

import re
from bs4 import BeautifulSoup
from typing import Optional

from .types import Player, Result, RelatedSection, Tournament


def parse_tournament(html: str, tournament_id: str) -> Tournament:
    """
    Parse a tournament standings page.

    Args:
        html: Raw HTML from chess-results.com
        tournament_id: The tournament ID (needed for the Tournament object)

    Returns:
        Tournament object with all parsed data
    """
    soup = BeautifulSoup(html, "html.parser")

    name = _parse_tournament_name(soup)
    metadata = _parse_tournament_metadata(soup)
    results = _parse_standings_table(soup)
    related = _parse_related_sections(soup)

    return Tournament(
        id=tournament_id,
        name=name,
        rounds=metadata.get("rounds"),
        start_date=metadata.get("start_date"),
        end_date=metadata.get("end_date"),
        location=metadata.get("location"),
        results=results,
        related_sections=related,
    )


def _parse_tournament_name(soup: BeautifulSoup) -> str:
    """Extract tournament name from page title or header."""
    # Usually in a div with class "defaultDialog" or the page title
    title_div = soup.find("div", class_="defaultDialog")
    if title_div:
        return title_div.get_text(strip=True)

    # Fallback to page title
    title = soup.find("title")
    if title:
        return title.get_text(strip=True)

    return "Unknown Tournament"


def _parse_tournament_metadata(soup: BeautifulSoup) -> dict:
    """Extract tournament metadata (dates, rounds, location)."""
    metadata = {}

    # Look for the info table that contains tournament details
    # This varies by page layout, so we search for common patterns
    for table in soup.find_all("table"):
        text = table.get_text()

        # Look for round count
        round_match = re.search(r"(\d+)\s*Rounds?", text, re.IGNORECASE)
        if round_match:
            metadata["rounds"] = int(round_match.group(1))

        # Look for dates (format: DD.MM.YYYY or DD/MM/YYYY)
        date_matches = re.findall(r"(\d{1,2}[./]\d{1,2}[./]\d{4})", text)
        if len(date_matches) >= 2:
            metadata["start_date"] = _normalize_date(date_matches[0])
            metadata["end_date"] = _normalize_date(date_matches[1])
        elif len(date_matches) == 1:
            metadata["start_date"] = _normalize_date(date_matches[0])
            metadata["end_date"] = metadata["start_date"]

    return metadata


def _normalize_date(date_str: str) -> str:
    """Convert DD.MM.YYYY or DD/MM/YYYY to YYYY-MM-DD."""
    # Replace / with .
    date_str = date_str.replace("/", ".")
    parts = date_str.split(".")
    if len(parts) == 3:
        day, month, year = parts
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    return date_str


def _parse_standings_table(soup: BeautifulSoup) -> list[Result]:
    """
    Parse the main standings table.

    The table has columns like:
    Rk. | SNo | (flag) | Typ | Name | FED | Rtg | Club/City | Pts. | TB1 | TB2 | TB3 | Rp

    We extract: rank, start_rank, name, sex, federation, rating, points, tpr
    """
    results = []

    # Find the standings table - chess-results uses CRs1 class
    standings_table = soup.find("table", class_="CRs1")

    if not standings_table:
        return results

    # Find all rows
    rows = standings_table.find_all("tr")
    if not rows:
        return results

    # First row is headers
    header_row = rows[0]
    headers = [cell.get_text(strip=True).lower() for cell in header_row.find_all(["th", "td"])]

    # Map column names to indices
    col_map = {}
    for i, h in enumerate(headers):
        if h == "rk.":
            col_map["rank"] = i
        elif h == "sno":
            col_map["start_rank"] = i
        elif h == "name":
            col_map["name"] = i
        elif h == "sex":
            col_map["sex"] = i
        elif h == "fed":
            col_map["federation"] = i
        elif h == "rtg":
            col_map["rating"] = i
        elif h == "pts.":
            col_map["points"] = i
        elif h == "rp":
            col_map["tpr"] = i

    # Parse data rows (skip header)
    for row in rows[1:]:
        cells = row.find_all("td")
        if len(cells) < 5:
            continue

        try:
            result = _parse_result_row(cells, col_map)
            if result:
                results.append(result)
        except (ValueError, IndexError):
            # Skip malformed rows
            continue

    return results


def _parse_result_row(cells: list, col_map: dict) -> Optional[Result]:
    """Parse a single result row into a Result object."""

    def get_cell(key: str) -> str:
        """Get cell text by column key, empty string if not found."""
        if key not in col_map:
            return ""
        idx = col_map[key]
        if idx >= len(cells):
            return ""
        return cells[idx].get_text(strip=True)

    # Required fields
    rank_str = get_cell("rank")
    name = get_cell("name")

    if not rank_str or not name:
        return None

    # Parse rank (might have suffix like "1." or just "1")
    rank = int(re.sub(r"\D", "", rank_str) or "0")
    if rank == 0:
        return None

    # Parse start rank
    start_rank_str = get_cell("start_rank")
    start_rank = int(re.sub(r"\D", "", start_rank_str) or "0") or rank

    # Parse federation
    federation = get_cell("federation")

    # Parse sex (w for women, empty for men)
    sex = get_cell("sex").lower() or None
    if sex and sex != "w":
        sex = "m" if sex == "m" else None

    # Parse rating (optional)
    rating_str = get_cell("rating")
    rating = int(re.sub(r"\D", "", rating_str) or "0") or None

    # Parse points
    points_str = get_cell("points")
    # Handle formats like "7" or "7.5" or "7,5"
    points_str = points_str.replace(",", ".")
    try:
        points = float(points_str) if points_str else 0.0
    except ValueError:
        points = 0.0

    # Parse TPR (tournament performance rating)
    tpr_str = get_cell("tpr")
    tpr = int(re.sub(r"\D", "", tpr_str) or "0") or None

    player = Player(
        name=name,
        fide_id=None,  # Will be enriched later
        federation=federation,
        sex=sex,
    )

    return Result(
        player=player,
        rating=rating,
        points=points,
        tpr=tpr,
        rank=rank,
        start_rank=start_rank,
    )


def _parse_related_sections(soup: BeautifulSoup) -> list[RelatedSection]:
    """
    Find related tournament sections (Open, Ladies).

    Chess-results shows a "Tournament selection" row with links to other sections.
    We only care about Open and Ladies (not Juniors, Blitz, etc.)
    """
    sections = []

    # Look for links that match tournament URL pattern
    # Example: tnr1026867.aspx (different ID for Ladies section)
    for link in soup.find_all("a", href=True):
        href = link["href"]
        text = link.get_text(strip=True).lower()

        # Check if it's a tournament link
        tnr_match = re.search(r"tnr(\d+)", href)
        if not tnr_match:
            continue

        section_id = tnr_match.group(1)

        # Check if it's a section we care about
        if "ladies" in text or "women" in text:
            sections.append(RelatedSection(name="Ladies", tournament_id=section_id))
        elif "open" in text:
            sections.append(RelatedSection(name="Open", tournament_id=section_id))

    return sections
