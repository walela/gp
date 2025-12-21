"""
Database query modules.

Each module handles CRUD for a specific entity.
"""

from . import seasons
from . import players
from . import tournaments
from . import results
from . import rankings

__all__ = ["seasons", "players", "tournaments", "results", "rankings"]
