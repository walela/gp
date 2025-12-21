"""
Results queries (tournament participation results).
"""

from typing import Optional


def get_by_tournament(conn, tournament_id: str) -> list[dict]:
    """Get all results for a tournament, with player info."""
    result = conn.execute("""
        SELECT r.tournament_id, r.player_id, r.rating, r.points, r.tpr,
               r.rank, r.start_rank, r.has_walkover, r.result_status,
               p.name, p.fide_id, p.federation, p.sex
        FROM results r
        JOIN players p ON r.player_id = p.id
        WHERE r.tournament_id = ?
        ORDER BY r.rank
    """, (tournament_id,))
    return [dict(row) for row in result.fetchall()]


def get_by_player(conn, player_id: int) -> list[dict]:
    """Get all tournament results for a player."""
    result = conn.execute("""
        SELECT r.tournament_id, r.player_id, r.rating, r.points, r.tpr,
               r.rank, r.start_rank, r.has_walkover, r.result_status,
               t.name as tournament_name, t.start_date, t.season_id
        FROM results r
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE r.player_id = ?
        ORDER BY t.start_date DESC
    """, (player_id,))
    return [dict(row) for row in result.fetchall()]


def get_by_player_and_season(conn, player_id: int, season_id: str) -> list[dict]:
    """Get tournament results for a player in a specific season."""
    result = conn.execute("""
        SELECT r.tournament_id, r.player_id, r.rating, r.points, r.tpr,
               r.rank, r.start_rank, r.has_walkover, r.result_status,
               t.name as tournament_name, t.start_date
        FROM results r
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE r.player_id = ? AND t.season_id = ?
        ORDER BY t.start_date DESC
    """, (player_id, season_id))
    return [dict(row) for row in result.fetchall()]


def create(conn, tournament_id: str, player_id: int, rating: Optional[int] = None,
           points: float = 0.0, tpr: Optional[int] = None, rank: int = 0,
           start_rank: int = 0, has_walkover: bool = False,
           result_status: str = "valid") -> None:
    """Create a result entry."""
    conn.execute("""
        INSERT INTO results (tournament_id, player_id, rating, points, tpr,
                             rank, start_rank, has_walkover, result_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (tournament_id, player_id, rating, points, tpr,
          rank, start_rank, has_walkover, result_status))
    conn.commit()


def upsert(conn, tournament_id: str, player_id: int, **kwargs) -> None:
    """Insert or update a result."""
    # Check if exists
    result = conn.execute("""
        SELECT 1 FROM results WHERE tournament_id = ? AND player_id = ?
    """, (tournament_id, player_id))

    if result.fetchone():
        # Update
        if kwargs:
            set_parts = [f"{key} = ?" for key in kwargs.keys()]
            values = list(kwargs.values()) + [tournament_id, player_id]
            conn.execute(f"""
                UPDATE results
                SET {', '.join(set_parts)}
                WHERE tournament_id = ? AND player_id = ?
            """, values)
    else:
        # Insert
        create(conn, tournament_id, player_id, **kwargs)

    conn.commit()


def mark_walkover(conn, tournament_id: str, player_id: int) -> None:
    """Mark a result as having a walkover."""
    conn.execute("""
        UPDATE results
        SET has_walkover = TRUE, result_status = 'walkover'
        WHERE tournament_id = ? AND player_id = ?
    """, (tournament_id, player_id))
    conn.commit()


def get_valid_kenyan_results_for_season(conn, season_id: str) -> list[dict]:
    """
    Get all valid results for Kenyan players in a season.

    Used for ranking calculation. Excludes walkovers.
    """
    result = conn.execute("""
        SELECT r.tournament_id, r.player_id, r.rating, r.points, r.tpr,
               r.rank, r.start_rank,
               p.name, p.fide_id, p.sex,
               t.name as tournament_name, t.start_date
        FROM results r
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE t.season_id = ?
          AND p.federation = 'KEN'
          AND r.result_status = 'valid'
          AND (r.has_walkover = FALSE OR r.has_walkover IS NULL)
          AND r.tpr IS NOT NULL
        ORDER BY p.id, r.tpr DESC
    """, (season_id,))
    return [dict(row) for row in result.fetchall()]


def get_results_needing_enrichment(conn, tournament_id: str) -> list[dict]:
    """
    Get results that need enrichment (missing FIDE ID or walkover status).

    Returns results with player info and start_rank for fetching detail pages.
    """
    result = conn.execute("""
        SELECT r.tournament_id, r.player_id, r.start_rank,
               p.fide_id, r.has_walkover
        FROM results r
        JOIN players p ON r.player_id = p.id
        WHERE r.tournament_id = ?
          AND (p.fide_id IS NULL OR r.has_walkover IS NULL)
    """, (tournament_id,))
    return [dict(row) for row in result.fetchall()]


def update_walkover_status(conn, tournament_id: str, player_id: int, has_walkover: bool) -> None:
    """Update walkover status for a result."""
    status = "walkover" if has_walkover else "valid"
    conn.execute("""
        UPDATE results
        SET has_walkover = ?, result_status = ?
        WHERE tournament_id = ? AND player_id = ?
    """, (has_walkover, status, tournament_id, player_id))
    conn.commit()
