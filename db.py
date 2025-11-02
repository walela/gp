import sqlite3
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

from tournament_metadata import infer_location, infer_rounds, infer_short_name

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_file: str = 'gp_tracker.db'):
        self.db_file = db_file
        self._init_db()
    
    def _init_db(self):
        """Initialize database schema."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            
            # Create tournaments table
            c.execute('''
                CREATE TABLE IF NOT EXISTS tournaments (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    start_date DATE,
                    end_date DATE,
                    short_name TEXT,
                    location TEXT,
                    rounds INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            existing_columns = {row[1] for row in c.execute('PRAGMA table_info(tournaments)')}
            if 'short_name' not in existing_columns:
                c.execute('ALTER TABLE tournaments ADD COLUMN short_name TEXT')
                existing_columns.add('short_name')
            if 'location' not in existing_columns:
                c.execute('ALTER TABLE tournaments ADD COLUMN location TEXT')
            if 'rounds' not in existing_columns:
                c.execute('ALTER TABLE tournaments ADD COLUMN rounds INTEGER')
            
            # Create players table
            c.execute('''
                CREATE TABLE IF NOT EXISTS players (
                    id INTEGER PRIMARY KEY,
                    fide_id TEXT,
                    name TEXT NOT NULL,
                    federation TEXT
                )
            ''')
            
            # Create results table
            c.execute('''
                CREATE TABLE IF NOT EXISTS results (
                    tournament_id TEXT,
                    player_id INTEGER,
                    rating INTEGER,
                    points REAL,
                    tpr INTEGER,
                    has_walkover BOOLEAN,
                    start_rank INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
                    FOREIGN KEY (player_id) REFERENCES players(id),
                    PRIMARY KEY (tournament_id, player_id)
                )
            ''')
            
            # Create player_rankings table
            c.execute('''
                CREATE TABLE IF NOT EXISTS player_rankings (
                    player_id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    fide_id TEXT,
                    rating INTEGER,
                    tournaments_played INTEGER,
                    best_1 REAL,
                    tournament_1 TEXT,
                    best_2 REAL,
                    best_3 REAL,
                    best_4 REAL,
                    FOREIGN KEY (player_id) REFERENCES players(id)
                )
            ''')

            c.execute('''
                CREATE TABLE IF NOT EXISTS ranking_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    snapshot_time TEXT NOT NULL,
                    player_id INTEGER NOT NULL,
                    fide_id TEXT,
                    rank INTEGER NOT NULL,
                    tournaments_played INTEGER,
                    best_4 REAL,
                    FOREIGN KEY (player_id) REFERENCES players(id)
                )
            ''')
            snapshot_columns = {row[1] for row in c.execute('PRAGMA table_info(ranking_snapshots)')}
            if 'tournaments_played' not in snapshot_columns:
                c.execute('ALTER TABLE ranking_snapshots ADD COLUMN tournaments_played INTEGER')
            if 'best_4' not in snapshot_columns:
                c.execute('ALTER TABLE ranking_snapshots ADD COLUMN best_4 REAL')
            c.execute('CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_time ON ranking_snapshots(snapshot_time)')
            c.execute('CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_player ON ranking_snapshots(player_id)')
            
            conn.commit()
    
    def save_tournament(
        self,
        tournament_id: str,
        tournament_name: str,
        results: List[Any],
        *,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        short_name: Optional[str] = None,
        location: Optional[str] = None,
        rounds: Optional[int] = None,
    ):
        """Save tournament data and results."""
        with sqlite3.connect(self.db_file) as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()

            inferred_location = location or infer_location(tournament_name)
            inferred_rounds = rounds or infer_rounds(tournament_name)
            inferred_short_name = infer_short_name(tournament_name)
            resolved_short_name = short_name or inferred_short_name or tournament_name

            c.execute(
                '''
                INSERT INTO tournaments (id, name, start_date, end_date, short_name, location, rounds)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    start_date = COALESCE(excluded.start_date, tournaments.start_date),
                    end_date = COALESCE(excluded.end_date, tournaments.end_date),
                    short_name = COALESCE(excluded.short_name, tournaments.short_name),
                    location = COALESCE(excluded.location, tournaments.location),
                    rounds = COALESCE(excluded.rounds, tournaments.rounds)
                ''',
                (
                    tournament_id,
                    tournament_name,
                    start_date,
                    end_date,
                    resolved_short_name,
                    inferred_location,
                    inferred_rounds,
                ),
            )

            for result in results:
                if hasattr(result, "player"):
                    player_obj = result.player
                    result_dict = {
                        "player": {
                            "name": getattr(player_obj, "name", None),
                            "fide_id": getattr(player_obj, "fide_id", None),
                            "federation": getattr(player_obj, "federation", None),
                            "rating": getattr(player_obj, "rating", None),
                        },
                        "points": getattr(result, "points", None),
                        "tpr": getattr(result, "tpr", None),
                        "has_walkover": getattr(result, "has_walkover", False),
                        "start_rank": getattr(result, "start_rank", None),
                        "rating": getattr(result, "rating", None),
                        "result_status": getattr(result, "result_status", None),
                    }
                else:
                    result_dict = result

                player_data = result_dict.get("player", {})
                player_fide_id = player_data.get("fide_id")
                player_name = player_data.get("name")
                player_federation = player_data.get("federation")
                player_rating = result_dict.get("rating") or player_data.get("rating")
                points = result_dict.get("points")
                tpr = result_dict.get("tpr")
                has_walkover = bool(result_dict.get("has_walkover", False))
                start_rank = result_dict.get("start_rank")
                result_status = result_dict.get("result_status")

                if not player_name:
                    logger.warning("Skipping result without player name for tournament %s", tournament_id)
                    continue

                player_db_id = None

                if player_fide_id:
                    c.execute('SELECT id FROM players WHERE fide_id = ?', (player_fide_id,))
                    existing_player = c.fetchone()
                    if existing_player:
                        player_db_id = existing_player[0]

                if player_db_id is None:
                    c.execute(
                        'SELECT id FROM players WHERE lower(name) = lower(?) AND (fide_id IS NULL OR fide_id = "")',
                        (player_name,),
                    )
                    existing_player_by_name = c.fetchone()
                    if existing_player_by_name:
                        player_db_id = existing_player_by_name[0]
                        if player_fide_id:
                            c.execute('UPDATE players SET fide_id = ? WHERE id = ?', (player_fide_id, player_db_id))

                if player_db_id is None:
                    c.execute(
                        '''
                        INSERT INTO players (fide_id, name, federation)
                        VALUES (?, ?, ?)
                        ''',
                        (player_fide_id, player_name, player_federation),
                    )
                    player_db_id = c.lastrowid

                c.execute(
                    '''
                    INSERT INTO results
                    (tournament_id, player_id, rating, points, tpr, has_walkover, start_rank, result_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(tournament_id, player_id) DO UPDATE SET
                        rating = excluded.rating,
                        points = excluded.points,
                        tpr = excluded.tpr,
                        has_walkover = excluded.has_walkover,
                        start_rank = COALESCE(excluded.start_rank, results.start_rank),
                        result_status = COALESCE(excluded.result_status, results.result_status)
                    ''',
                    (
                        tournament_id,
                        player_db_id,
                        player_rating,
                        points,
                        tpr,
                        has_walkover,
                        start_rank,
                        result_status,
                    ),
                )

            conn.commit()

    def get_all_tournaments(self) -> List[Dict]:
        """Get all tournaments."""
        with sqlite3.connect(self.db_file) as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute(
                '''
                SELECT
                    id,
                    name,
                    start_date,
                    end_date,
                    short_name,
                    location,
                    rounds
                FROM tournaments
                ORDER BY start_date DESC, name DESC
                '''
            )
            return [dict(row) for row in c.fetchall()]
    
    def get_tournament(self, tournament_id: str) -> Optional[Dict]:
        """Get tournament details and results."""
        with sqlite3.connect(self.db_file) as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            
            # Get tournament name and dates
            c.execute(
                '''
                SELECT name, start_date, end_date, short_name, location, rounds
                FROM tournaments
                WHERE id = ?
                ''',
                (tournament_id,),
            )
            tournament_row = c.fetchone()
            if not tournament_row:
                return None  # Tournament not found
            tournament_name = tournament_row['name']
            start_date = tournament_row['start_date']
            end_date = tournament_row['end_date']
            short_name = tournament_row['short_name']
            location = tournament_row['location']
            rounds = tournament_row['rounds']
            
            # Get results, joining players correctly
            try:
                c.execute('''
                    SELECT 
                        p.name, p.fide_id, p.federation,
                        r.rating, r.points, r.tpr, r.has_walkover, r.start_rank, r.result_status
                    FROM results r
                    JOIN players p ON r.player_id = p.id 
                    WHERE r.tournament_id = ?
                    ORDER BY r.tpr DESC
                ''', (tournament_id,))
            except sqlite3.OperationalError as e:
                # If start_rank column doesn't exist or can't be accessed, try without it
                if 'no such column: r.start_rank' in str(e):
                    logger.warning("start_rank column not found, using query without it")
                    c.execute('''
                        SELECT 
                            p.name, p.fide_id, p.federation,
                            r.rating, r.points, r.tpr, r.has_walkover, r.result_status
                        FROM results r
                        JOIN players p ON r.player_id = p.id 
                        WHERE r.tournament_id = ?
                        ORDER BY r.tpr DESC
                    ''', (tournament_id,))
                else:
                    raise
            
            results = []
            for row in c.fetchall():
                # Check row structure based on length
                has_start_rank = len(row) > 8  # With result_status, we have at least 9 columns
                has_result_status = len(row) > 7  # Either 8 (without start_rank) or 9 columns
                
                result_data = {
                    'player': {
                        'name': row[0],
                        'fide_id': row[1],
                        'federation': row[2]
                    },
                    'rating': row[3],
                    'points': row[4],
                    'tpr': row[5],
                    'has_walkover': bool(row[6])
                }
                
                # Add result_status if available (should be in all new data)
                if has_result_status:
                    result_status_idx = 8 if has_start_rank else 7
                    result_data['result_status'] = row[result_status_idx]
                else:
                    result_data['result_status'] = 'valid'  # Default for old data
                
                # Add start_rank if available
                if has_start_rank:
                    result_data['start_rank'] = row[7]
                
                results.append(result_data)
            
            return {
                'name': tournament_name,
                'short_name': short_name,
                'start_date': start_date,
                'end_date': end_date,
                'location': location,
                'rounds': rounds,
                'results': results
            }
    
    def get_all_results(self) -> Dict[int, List]:
        """Get all results grouped by player."""
        with sqlite3.connect(self.db_file) as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()

            c.execute(
                '''
                SELECT
                    p.id AS player_id,
                    p.name AS player_name,
                    p.fide_id,
                    p.federation,
                    r.rating,
                    r.points,
                    r.tpr,
                    r.has_walkover,
                    r.start_rank,
                    r.result_status,
                    t.id AS tournament_id,
                    COALESCE(t.short_name, t.name) AS tournament_name,
                    t.start_date,
                    t.end_date,
                    t.location,
                    t.rounds
                FROM results r
                JOIN players p ON r.player_id = p.id
                JOIN tournaments t ON r.tournament_id = t.id
                ORDER BY r.tpr DESC
                '''
            )

            all_results: Dict[str, List] = {}
            for row in c.fetchall():
                player_db_id = row['player_id']
                all_results.setdefault(player_db_id, [])

                result_data = {
                    'player': {
                        'name': row['player_name'],
                        'fide_id': row['fide_id'],
                        'federation': row['federation'],
                        'rating': row['rating'],
                    },
                    'points': row['points'],
                    'tpr': row['tpr'],
                    'has_walkover': bool(row['has_walkover']),
                    'start_rank': row['start_rank'],
                    'result_status': row['result_status'] or 'valid',
                    'tournament': {
                        'id': row['tournament_id'],
                        'name': row['tournament_name'],
                        'start_date': row['start_date'],
                        'end_date': row['end_date'],
                        'location': row['location'],
                        'rounds': row['rounds'],
                    },
                }

                all_results[player_db_id].append(result_data)

            return all_results

    def get_all_player_rankings(self) -> List[Dict]:
        """Get all player rankings from the pre-computed table."""
        with sqlite3.connect(self.db_file) as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute('SELECT * FROM player_rankings')
            return [dict(row) for row in c.fetchall()]

    @staticmethod
    def _ranking_priority(player: Dict[str, Any]) -> Tuple[int, float, float]:
        """Generate a sort key matching the cascading best-N priority used for GP rankings."""
        tournaments = player.get("tournaments_played", 0) or 0
        best_1 = player.get("best_1") or 0
        best_2 = player.get("best_2") or 0
        best_3 = player.get("best_3") or 0
        best_4 = player.get("best_4") or 0

        if tournaments >= 4 and best_4 > 0:
            return (4, best_4, best_3)
        if tournaments >= 3 and best_3 > 0:
            return (3, best_3, best_2)
        if tournaments >= 2 and best_2 > 0:
            return (2, best_2, best_1)
        if tournaments >= 1 and best_1 > 0:
            return (1, best_1, 0)
        return (0, 0, 0)

    def _store_ranking_snapshot(self, ranking_records: List[Dict[str, Any]]):
        """Persist a snapshot of the current ranking order for change tracking."""
        if not ranking_records:
            return

        sorted_records = sorted(
            ranking_records,
            key=self._ranking_priority,
            reverse=True,
        )

        snapshot_time = datetime.utcnow().isoformat()
        snapshot_rows = [
            (
                snapshot_time,
                record["player_id"],
                record.get("fide_id"),
                index + 1,
                record.get("tournaments_played"),
                record.get("best_4"),
            )
            for index, record in enumerate(sorted_records)
        ]

        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            c.executemany(
                '''
                INSERT INTO ranking_snapshots (snapshot_time, player_id, fide_id, rank, tournaments_played, best_4)
                VALUES (?, ?, ?, ?, ?, ?)
                ''',
                snapshot_rows,
            )
            conn.commit()

    def get_rank_changes(self, top_n: int = 25) -> Dict[int, Dict[str, Optional[int]]]:
        """Compute rank deltas for players in the latest snapshot compared to the previous snapshot."""
        with sqlite3.connect(self.db_file) as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()

            c.execute(
                '''
                SELECT DISTINCT snapshot_time
                FROM ranking_snapshots
                ORDER BY snapshot_time DESC
                LIMIT 10
                '''
            )
            snapshot_times = [row["snapshot_time"] for row in c.fetchall()]

            if len(snapshot_times) < 2:
                return {}

            def fetch_rows(snapshot_time: str) -> List[sqlite3.Row]:
                c.execute(
                    '''
                    SELECT player_id, rank, tournaments_played, best_4
                    FROM ranking_snapshots
                    WHERE snapshot_time = ?
                    ''',
                    (snapshot_time,),
                )
                return c.fetchall()

            latest_time = snapshot_times[0]
            latest_rows = fetch_rows(latest_time)
            latest_top_signature = sorted(
                (row["rank"], row["player_id"])
                for row in latest_rows
                if row["rank"] <= top_n
            )

            previous_rows: Optional[List[sqlite3.Row]] = None
            previous_time: Optional[str] = None

            for candidate_time in snapshot_times[1:]:
                candidate_rows = fetch_rows(candidate_time)
                candidate_signature = sorted(
                    (row["rank"], row["player_id"])
                    for row in candidate_rows
                    if row["rank"] <= top_n
                )
                if candidate_signature != latest_top_signature:
                    previous_rows = candidate_rows
                    previous_time = candidate_time
                    break

            if previous_rows is None or previous_time is None:
                return {}

            previous_map = {
                row["player_id"]: (
                    row["rank"],
                    row["tournaments_played"],
                    row["best_4"],
                )
                for row in previous_rows
            }

            changes: Dict[int, Dict[str, Optional[int]]] = {}
            for row in latest_rows:
                current_rank = row["rank"]
                if current_rank > top_n:
                    continue

                player_id = row["player_id"]
                previous_entry = previous_map.get(player_id)

                latest_tournaments = row["tournaments_played"]
                latest_best4 = row["best_4"]
                has_latest_best4 = (latest_tournaments or 0) >= 4 and (latest_best4 or 0) > 0

                if previous_entry is None:
                    changes[player_id] = {
                        "rank_change": None,
                        "previous_rank": None,
                        "is_new": True,
                    }
                    continue

                previous_rank, prev_tournaments, prev_best4 = previous_entry
                prev_has_best4 = (prev_tournaments or 0) >= 4 and (prev_best4 or 0) > 0
                prev_has_data = prev_tournaments is not None or prev_best4 is not None

                is_new = has_latest_best4 and prev_has_data and not prev_has_best4
                if is_new:
                    changes[player_id] = {
                        "rank_change": None,
                        "previous_rank": previous_rank,
                        "is_new": True,
                    }
                    continue

                rank_change = previous_rank - current_rank
                changes[player_id] = {
                    "rank_change": rank_change,
                    "previous_rank": previous_rank,
                    "is_new": False,
                }

            return changes

    def recalculate_rankings(self):
        """Recalculate and store all player rankings."""
        all_results = self.get_all_results()
        player_rankings_insert_data = []
        ranking_records: List[Dict[str, Any]] = []

        for player_id, results in all_results.items():
            valid_results = [r for r in results if r["player"]["federation"] == "KEN" and
                             (r.get("result_status", "valid") == "valid" or r.get("result_status") is None)]

            if not valid_results:
                continue

            valid_results.sort(key=lambda x: x["tpr"] if x["tpr"] else 0, reverse=True)

            best_1 = valid_results[0]["tpr"] if len(valid_results) >= 1 else 0
            tournament_1 = valid_results[0]["tournament"]["name"] if len(valid_results) >= 1 else None
            best_2 = sum(r["tpr"] for r in valid_results[:2]) / 2 if len(valid_results) >= 2 else 0
            best_3 = sum(r["tpr"] for r in valid_results[:3]) / 3 if len(valid_results) >= 3 else 0
            best_4 = sum(r["tpr"] for r in valid_results[:4]) / 4 if len(valid_results) >= 4 else 0
            
            player_info = valid_results[0]["player"]
            player_rankings_insert_data.append(
                (
                    player_id,
                    player_info["name"],
                    player_info["fide_id"],
                    player_info["rating"],
                    len(valid_results),
                    round(best_1),
                    tournament_1,
                    round(best_2),
                    round(best_3),
                    round(best_4),
                )
            )
            ranking_records.append(
                {
                    "player_id": player_id,
                    "name": player_info["name"],
                    "fide_id": player_info["fide_id"],
                    "rating": player_info["rating"],
                    "tournaments_played": len(valid_results),
                    "best_1": round(best_1),
                    "best_2": round(best_2),
                    "best_3": round(best_3),
                    "best_4": round(best_4),
                }
            )

        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            c.execute('DELETE FROM player_rankings')
            c.executemany('''
                INSERT INTO player_rankings 
                (player_id, name, fide_id, rating, tournaments_played, best_1, tournament_1, best_2, best_3, best_4)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', player_rankings_insert_data)
            conn.commit()
            logger.info(f"Recalculated and stored rankings for {c.rowcount} players.")

        self._store_ranking_snapshot(ranking_records)


    def get_tournament_dates(self, tournament_id: str) -> Tuple[Optional[str], Optional[str]]:
        """Get start and end dates for a tournament."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            c.execute('SELECT start_date, end_date FROM tournaments WHERE id = ?', (tournament_id,))
            result = c.fetchone()
            if result:
                return result[0], result[1]
            return None, None
    
    def get_tournament_info(self, tournament_id: str) -> Optional[Dict]:
        """Get tournament info including short_name."""
        with sqlite3.connect(self.db_file) as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute(
                'SELECT name, short_name, start_date, end_date, location, rounds FROM tournaments WHERE id = ?',
                (tournament_id,),
            )
            result = c.fetchone()
            if result:
                return {
                    'name': result['name'],
                    'short_name': result['short_name'],
                    'start_date': result['start_date'],
                    'end_date': result['end_date'],
                    'location': result['location'],
                    'rounds': result['rounds'],
                }
            return None
            
    def delete_tournament_data(self, tournament_id: str):
        """Delete tournament and its associated results."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            c.execute('DELETE FROM results WHERE tournament_id = ?', (tournament_id,))
            c.execute('DELETE FROM tournaments WHERE id = ?', (tournament_id,))
            conn.commit()
            logger.info(f"Deleted data for tournament ID: {tournament_id}")

    def does_tournament_exist(self, tournament_id: str) -> bool:
        """Check if a tournament ID exists in the tournaments table."""
        with sqlite3.connect(self.db_file) as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT 1 FROM tournaments WHERE id = ? LIMIT 1", (tournament_id,))
            return c.fetchone() is not None

    def get_tournament_results_count(self, tournament_id: str) -> int:
        """Get the count of results for a specific tournament."""
        with sqlite3.connect(self.db_file) as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            # Ensure the results table exists, handle potential error if it doesn't
            # (Though usually it should exist if tournaments do)
            try:
                c.execute("SELECT COUNT(*) as count FROM results WHERE tournament_id = ?", (tournament_id,))
                row = c.fetchone()
                return row['count'] if row else 0
            except sqlite3.OperationalError as e:
                logger.error(f"Error counting results for tournament {tournament_id}: {e}")
                return 0 # Return 0 if table/column missing or other SQL error

    def update_tournament_dates(self, tournament_id: str, start_date: str, end_date: str):
        """Update tournament start and end dates."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            c.execute('''
                UPDATE tournaments 
                SET start_date = ?, end_date = ? 
                WHERE id = ?
            ''', (start_date, end_date, tournament_id))
            conn.commit()
            return c.rowcount
