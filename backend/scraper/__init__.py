"""
Scraper module for chess-results.com.

Usage:
    from scraper import fetch_tournament_page, parse_tournament

    html = fetch_tournament_page("1026866")
    tournament = parse_tournament(html, "1026866")

    # Enrichment (FIDE IDs, walkovers)
    from scraper import enrich_tournament
    enriched = enrich_tournament("1026866", [1, 2, 3])  # start numbers
"""

from .client import fetch_tournament_page, fetch_player_page, get_client
from .parser import parse_tournament
from .types import Player, Result, RelatedSection, Tournament
from .enricher import enrich_player, enrich_tournament

__all__ = [
    "fetch_tournament_page",
    "fetch_player_page",
    "get_client",
    "parse_tournament",
    "enrich_player",
    "enrich_tournament",
    "Player",
    "Result",
    "RelatedSection",
    "Tournament",
]
