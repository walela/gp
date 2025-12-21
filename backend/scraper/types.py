"""
Data structures for scraped tournament data.

These represent what we get from chess-results.com.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class Player:
    """A player as they appear in tournament results."""
    name: str
    fide_id: Optional[str]
    federation: str
    sex: Optional[str]  # 'w', 'm', or None


@dataclass
class Result:
    """A single result row from a tournament standings table."""
    player: Player
    rating: Optional[int]
    points: float
    tpr: Optional[int]
    rank: int
    start_rank: int


@dataclass
class RelatedSection:
    """A related tournament section (Open or Ladies - the ones that count for GP)."""
    name: str           # "Ladies" or "Open"
    tournament_id: str  # chess-results ID


@dataclass
class Tournament:
    """A tournament scraped from chess-results.com."""
    id: str
    name: str
    rounds: Optional[int]
    start_date: Optional[str]
    end_date: Optional[str]
    location: Optional[str]
    results: list[Result]
    related_sections: list[RelatedSection]  # Only Open and Ladies
