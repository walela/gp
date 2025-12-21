"""
Rankings queries (pre-computed rankings per season).
"""

from typing import Optional


def get_by_season(conn, season_id: str) -> list[dict]:
    """Get all rankings for a season, ordered by rank."""
    result = conn.execute("""
        SELECT player_id, season_id, name, fide_id, rating,
               tournaments_played, best_1, tournament_1,
               best_2, best_3, best_4, current_rank, previous_rank
        FROM rankings
        WHERE season_id = ?
        ORDER BY current_rank
    """, (season_id,))
    return [dict(row) for row in result.fetchall()]


def get_ladies_by_season(conn, season_id: str) -> list[dict]:
    """Get ladies rankings for a season (players with sex='w')."""
    result = conn.execute("""
        SELECT r.player_id, r.season_id, r.name, r.fide_id, r.rating,
               r.tournaments_played, r.best_1, r.tournament_1,
               r.best_2, r.best_3, r.best_4, r.current_rank, r.previous_rank
        FROM rankings r
        JOIN players p ON r.player_id = p.id
        WHERE r.season_id = ? AND p.sex = 'w'
        ORDER BY r.current_rank
    """, (season_id,))
    return [dict(row) for row in result.fetchall()]


def get_by_player(conn, player_id: int) -> list[dict]:
    """Get all rankings for a player across seasons."""
    result = conn.execute("""
        SELECT player_id, season_id, name, fide_id, rating,
               tournaments_played, best_1, tournament_1,
               best_2, best_3, best_4, current_rank, previous_rank
        FROM rankings
        WHERE player_id = ?
        ORDER BY season_id DESC
    """, (player_id,))
    return [dict(row) for row in result.fetchall()]


def get_by_player_and_season(conn, player_id: int, season_id: str) -> Optional[dict]:
    """Get a specific player's ranking for a season."""
    result = conn.execute("""
        SELECT player_id, season_id, name, fide_id, rating,
               tournaments_played, best_1, tournament_1,
               best_2, best_3, best_4, current_rank, previous_rank
        FROM rankings
        WHERE player_id = ? AND season_id = ?
    """, (player_id, season_id))
    row = result.fetchone()
    return dict(row) if row else None


def upsert(conn, player_id: int, season_id: str, name: str,
           fide_id: Optional[str] = None, rating: Optional[int] = None,
           tournaments_played: int = 0, best_1: Optional[float] = None,
           tournament_1: Optional[str] = None, best_2: Optional[float] = None,
           best_3: Optional[float] = None, best_4: Optional[float] = None,
           current_rank: Optional[int] = None, previous_rank: Optional[int] = None) -> None:
    """Insert or update a ranking entry."""
    conn.execute("""
        INSERT INTO rankings (player_id, season_id, name, fide_id, rating,
                              tournaments_played, best_1, tournament_1,
                              best_2, best_3, best_4, current_rank, previous_rank)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (player_id, season_id) DO UPDATE SET
            name = excluded.name,
            fide_id = excluded.fide_id,
            rating = excluded.rating,
            tournaments_played = excluded.tournaments_played,
            best_1 = excluded.best_1,
            tournament_1 = excluded.tournament_1,
            best_2 = excluded.best_2,
            best_3 = excluded.best_3,
            best_4 = excluded.best_4,
            previous_rank = rankings.current_rank,
            current_rank = excluded.current_rank
    """, (player_id, season_id, name, fide_id, rating, tournaments_played,
          best_1, tournament_1, best_2, best_3, best_4, current_rank, previous_rank))
    conn.commit()


def delete_for_season(conn, season_id: str) -> None:
    """Delete all rankings for a season (before recalculation)."""
    conn.execute("DELETE FROM rankings WHERE season_id = ?", (season_id,))
    conn.commit()


def get_previous_ranks(conn, season_id: str) -> dict[int, int]:
    """Get map of player_id -> current_rank for preserving previous ranks."""
    result = conn.execute("""
        SELECT player_id, current_rank
        FROM rankings
        WHERE season_id = ?
    """, (season_id,))
    return {row[0]: row[1] for row in result.fetchall()}
