"""
Tournament queries.
"""

from typing import Optional


def get_by_id(conn, tournament_id: str) -> Optional[dict]:
    """Get a tournament by ID."""
    result = conn.execute("""
        SELECT id, event_id, season_id, name, section_type,
               location, rounds, start_date, end_date, created_at
        FROM tournaments
        WHERE id = ?
    """, (tournament_id,))
    row = result.fetchone()
    return dict(row) if row else None


def get_by_season(conn, season_id: str) -> list[dict]:
    """Get all tournaments for a season."""
    result = conn.execute("""
        SELECT id, event_id, season_id, name, section_type,
               location, rounds, start_date, end_date, created_at
        FROM tournaments
        WHERE season_id = ?
        ORDER BY start_date DESC
    """, (season_id,))
    return [dict(row) for row in result.fetchall()]


def create(conn, tournament_id: str, name: str, season_id: Optional[str] = None,
           event_id: Optional[str] = None, section_type: Optional[str] = None,
           location: Optional[str] = None, rounds: Optional[int] = None,
           start_date: Optional[str] = None, end_date: Optional[str] = None) -> None:
    """Create a new tournament."""
    conn.execute("""
        INSERT INTO tournaments (id, event_id, season_id, name, section_type,
                                  location, rounds, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (tournament_id, event_id, season_id, name, section_type,
          location, rounds, start_date, end_date))
    conn.commit()


def update(conn, tournament_id: str, **kwargs) -> None:
    """
    Update tournament fields.

    Args:
        tournament_id: The tournament to update
        **kwargs: Fields to update (name, season_id, section_type, etc.)
    """
    if not kwargs:
        return

    # Build SET clause dynamically
    set_parts = [f"{key} = ?" for key in kwargs.keys()]
    values = list(kwargs.values()) + [tournament_id]

    conn.execute(f"""
        UPDATE tournaments
        SET {', '.join(set_parts)}
        WHERE id = ?
    """, values)
    conn.commit()


def exists(conn, tournament_id: str) -> bool:
    """Check if a tournament exists."""
    result = conn.execute("""
        SELECT 1 FROM tournaments WHERE id = ?
    """, (tournament_id,))
    return result.fetchone() is not None


def delete(conn, tournament_id: str) -> None:
    """Delete a tournament (and its results via cascade or manual cleanup)."""
    # Delete results first
    conn.execute("DELETE FROM results WHERE tournament_id = ?", (tournament_id,))
    conn.execute("DELETE FROM tournaments WHERE id = ?", (tournament_id,))
    conn.commit()
