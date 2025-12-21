"""
Season queries.
"""

from typing import Optional


def get_all(conn) -> list[dict]:
    """Get all seasons, ordered by start date descending."""
    result = conn.execute("""
        SELECT id, name, start_date, end_date, is_active
        FROM seasons
        ORDER BY start_date DESC
    """)
    return [dict(row) for row in result.fetchall()]


def get_active(conn) -> Optional[dict]:
    """Get the currently active season."""
    result = conn.execute("""
        SELECT id, name, start_date, end_date, is_active
        FROM seasons
        WHERE is_active = TRUE
        LIMIT 1
    """)
    row = result.fetchone()
    return dict(row) if row else None


def get_by_id(conn, season_id: str) -> Optional[dict]:
    """Get a season by ID."""
    result = conn.execute("""
        SELECT id, name, start_date, end_date, is_active
        FROM seasons
        WHERE id = ?
    """, (season_id,))
    row = result.fetchone()
    return dict(row) if row else None


def create(conn, season_id: str, name: str, start_date: Optional[str] = None,
           end_date: Optional[str] = None, is_active: bool = False) -> None:
    """Create a new season."""
    conn.execute("""
        INSERT INTO seasons (id, name, start_date, end_date, is_active)
        VALUES (?, ?, ?, ?, ?)
    """, (season_id, name, start_date, end_date, is_active))
    conn.commit()


def set_active(conn, season_id: str) -> None:
    """Set a season as active (and deactivate all others)."""
    conn.execute("UPDATE seasons SET is_active = FALSE")
    conn.execute("UPDATE seasons SET is_active = TRUE WHERE id = ?", (season_id,))
    conn.commit()
