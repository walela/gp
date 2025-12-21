"""
Player queries.
"""

from typing import Optional


def get_by_id(conn, player_id: int) -> Optional[dict]:
    """Get a player by internal ID."""
    result = conn.execute("""
        SELECT id, fide_id, name, federation, sex
        FROM players
        WHERE id = ?
    """, (player_id,))
    row = result.fetchone()
    return dict(row) if row else None


def get_by_fide_id(conn, fide_id: str) -> Optional[dict]:
    """Get a player by FIDE ID."""
    result = conn.execute("""
        SELECT id, fide_id, name, federation, sex
        FROM players
        WHERE fide_id = ?
    """, (fide_id,))
    row = result.fetchone()
    return dict(row) if row else None


def find_by_name_and_federation(conn, name: str, federation: str) -> Optional[dict]:
    """Find a player by name and federation (for matching when no FIDE ID)."""
    result = conn.execute("""
        SELECT id, fide_id, name, federation, sex
        FROM players
        WHERE name = ? AND federation = ?
    """, (name, federation))
    row = result.fetchone()
    return dict(row) if row else None


def create(conn, name: str, federation: str, sex: Optional[str] = None,
           fide_id: Optional[str] = None) -> int:
    """
    Create a new player and return their ID.

    Returns:
        The auto-generated player ID
    """
    cursor = conn.execute("""
        INSERT INTO players (name, federation, sex, fide_id)
        VALUES (?, ?, ?, ?)
    """, (name, federation, sex, fide_id))
    conn.commit()
    return cursor.lastrowid


def get_or_create(conn, name: str, federation: str, sex: Optional[str] = None,
                  fide_id: Optional[str] = None) -> int:
    """
    Get existing player or create new one.

    Matching priority:
    1. FIDE ID (if provided)
    2. Name + Federation

    Returns:
        Player ID
    """
    # Try FIDE ID first
    if fide_id:
        existing = get_by_fide_id(conn, fide_id)
        if existing:
            return existing["id"]

    # Try name + federation
    existing = find_by_name_and_federation(conn, name, federation)
    if existing:
        # Update sex if we have it now but didn't before
        if sex and not existing.get("sex"):
            update_sex(conn, existing["id"], sex)
        return existing["id"]

    # Create new player
    return create(conn, name, federation, sex, fide_id)


def update_fide_id(conn, player_id: int, fide_id: str) -> None:
    """Update a player's FIDE ID (from enrichment)."""
    conn.execute("""
        UPDATE players SET fide_id = ? WHERE id = ?
    """, (fide_id, player_id))
    conn.commit()


def update_sex(conn, player_id: int, sex: str) -> None:
    """Update a player's sex."""
    conn.execute("""
        UPDATE players SET sex = ? WHERE id = ?
    """, (sex, player_id))
    conn.commit()


def get_kenyan_players(conn) -> list[dict]:
    """Get all Kenyan players."""
    result = conn.execute("""
        SELECT id, fide_id, name, federation, sex
        FROM players
        WHERE federation = 'KEN'
        ORDER BY name
    """)
    return [dict(row) for row in result.fetchall()]


def get_women_players(conn) -> list[dict]:
    """Get all women players (for ladies rankings)."""
    result = conn.execute("""
        SELECT id, fide_id, name, federation, sex
        FROM players
        WHERE sex = 'w'
        ORDER BY name
    """)
    return [dict(row) for row in result.fetchall()]
