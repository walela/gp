"""Live Grand Prix standings while an event is being played.

Reads the round pairings from Chess-Results, works out each Kenyan player's
performance so far and ranks the season as if the event ended after the last
played game. Nothing is stored; the event is saved through the usual scrape
flow once it finishes, and the live view switches off when it is.
"""
import datetime as dt
import logging
import re
import sqlite3
import threading
import time
from typing import Dict, List, Optional

from bs4 import BeautifulSoup

from chess_results import ChessResultsScraper
from db import Database, round_half_up

logger = logging.getLogger(__name__)

LIVE_EVENT = {
    "name": "Karen Open",
    "start_date": "2026-11-28",
    "end_date": "2026-11-29",
    "rounds": 6,
    "sections": {"open": "1552122", "ladies": "1552127"},
}

NAIROBI = dt.timezone(dt.timedelta(hours=3))
CACHE_SECONDS = 60
STARTING_LIST_SECONDS = 30 * 60
# Players further down can't reach the qualifying places, unless they're playing.
SHOWN_RANKS = 60

# FIDE rating difference for a percentage score of 50-100% (Handbook B.02, 8.1.2).
DP = [
    0, 7, 14, 21, 29, 36, 43, 50, 57, 65, 72, 80, 87, 95, 102, 110, 117, 125, 133, 141,
    149, 158, 166, 175, 184, 193, 202, 211, 220, 230, 240, 251, 262, 273, 284, 296, 309, 322,
    336, 351, 366, 383, 401, 422, 444, 470, 501, 538, 589, 677, 800,
]
SCORES = {"1": 1.0, "½": 0.5, "0": 0.0, "+": 1.0, "-": 0.0}
# Chess-Results rates unrated opponents at 1400 in its performance ratings.
UNRATED = 1400
BYE_LABELS = {"bye", "spielfrei", "not paired", "nicht gepaart"}

_scraper = ChessResultsScraper()
_lock = threading.Lock()
_cache: Dict[str, object] = {"at": 0.0, "payload": None}
_starting_lists: Dict[str, tuple] = {}


def performance(opponent_ratings: List[int], score: float) -> Optional[int]:
    """FIDE performance rating: average opponent rating plus the table difference for the score."""
    if not opponent_ratings:
        return None
    percent = round_half_up(score * 100 / len(opponent_ratings))
    difference = DP[percent - 50] if percent >= 50 else -DP[50 - percent]
    return round_half_up(sum(opponent_ratings) / len(opponent_ratings) + difference)


def _cell_texts(row) -> List[str]:
    return [cell.get_text(" ", strip=True) for cell in row.find_all(["td", "th"])]


def _results_table(html: str):
    return BeautifulSoup(html, "html.parser").find("table", {"class": "CRs1"})


def _starting_list(tournament_id: str) -> Dict[int, Dict]:
    cached = _starting_lists.get(tournament_id)
    if cached and time.time() - cached[0] < STARTING_LIST_SECONDS:
        return cached[1]

    response = _scraper._request(
        "GET", f"tnr{tournament_id}.aspx", params={"lan": 1, "art": 0, "zeilen": 99999}
    )
    table = _results_table(response.text)
    players: Dict[int, Dict] = {}
    if table is not None:
        rows = table.find_all("tr")
        headers = [text.lower() for text in _cell_texts(rows[0])]
        column = {name: headers.index(name) for name in ("no.", "name", "fideid", "fed", "rtg", "sex") if name in headers}
        for row in rows[1:]:
            cells = _cell_texts(row)
            if len(cells) < len(headers) or not cells[column["no."]].isdigit():
                continue
            rating = cells[column["rtg"]] if "rtg" in column else ""
            fide_id = cells[column["fideid"]] if "fideid" in column else ""
            sex = cells[column["sex"]].lower() if "sex" in column else ""
            players[int(cells[column["no."]])] = {
                "name": cells[column["name"]],
                "fide_id": fide_id if fide_id.isdigit() and fide_id != "0" else None,
                "federation": cells[column["fed"]] if "fed" in column else "",
                "rating": int(rating) if rating.isdigit() else 0,
                "gender": "F" if sex in {"w", "f"} else None,
            }
    _starting_lists[tournament_id] = (time.time(), players)
    return players


def _round_pairings(tournament_id: str, round_number: int, players: Dict[int, Dict]) -> List[Dict]:
    """Boards for one round as {white, black, result}; black is None for byes."""
    response = _scraper._request(
        "GET", f"tnr{tournament_id}.aspx", params={"lan": 1, "art": 2, "rd": round_number}
    )
    table = _results_table(response.text)
    if table is None:
        return []

    by_name = {player["name"]: snr for snr, player in players.items()}
    rows = table.find_all("tr")
    headers = [text.lower() for text in _cell_texts(rows[0])]
    if "white" not in headers or "result" not in headers:
        return []
    white_col, black_col, result_col = headers.index("white"), headers.index("black"), headers.index("result")

    def start_number(cell, text: str) -> Optional[int]:
        link = cell.find("a", href=True)
        match = re.search(r"snr=(\d+)", link["href"]) if link else None
        return int(match.group(1)) if match else by_name.get(text)

    boards = []
    for row in rows[1:]:
        cells = row.find_all("td")
        if len(cells) <= max(white_col, black_col, result_col):
            continue
        texts = [cell.get_text(" ", strip=True) for cell in cells]
        white = start_number(cells[white_col], texts[white_col])
        if white is None:
            continue
        black_text = texts[black_col]
        black = None if black_text.lower() in BYE_LABELS else start_number(cells[black_col], black_text)
        boards.append({
            "white": white,
            "black": black,
            "bye_label": black_text.lower() if black is None else None,
            "result": texts[result_col],
        })
    return boards


def _section_games(tournament_id: str, rounds: int):
    """Each player's games in a section and the last round with every result in."""
    players = _starting_list(tournament_id)
    games: Dict[int, List[Dict]] = {snr: [] for snr in players}
    completed_round = 0
    paired_round = 0

    for round_number in range(1, rounds + 1):
        boards = _round_pairings(tournament_id, round_number, players)
        if not boards:
            break
        paired_round = round_number
        finished = True
        for board in boards:
            result = board["result"].replace("K", "").strip()
            parts = [part.strip() for part in result.split(" - ")] if " - " in result else []
            if board["black"] is None:
                score = SCORES.get(parts[0] if parts else result)
                if score is None:
                    finished = False
                    continue
                kind = "unpaired" if board["bye_label"] in {"not paired", "nicht gepaart"} else "bye"
                games.setdefault(board["white"], []).append({"round": round_number, "kind": kind, "score": score})
                continue
            if len(parts) != 2 or parts[0] not in SCORES or parts[1] not in SCORES:
                finished = False
                continue
            kind = "forfeit" if "+" in parts or "-" in parts or "K" in board["result"] else "game"
            for side, opponent, token in (
                (board["white"], board["black"], parts[0]),
                (board["black"], board["white"], parts[1]),
            ):
                games.setdefault(side, []).append({
                    "round": round_number, "kind": kind, "score": SCORES[token], "opponent": opponent,
                })
        if finished:
            completed_round = round_number
    return players, games, completed_round, paired_round


def _live_result(games: List[Dict], players: Dict[int, Dict], completed_round: int) -> Dict:
    """Score, performance and result status so far, matching ResultValidator's rules."""
    played = [game for game in games if game["kind"] == "game"]
    ratings = [players.get(game["opponent"], {}).get("rating") or UNRATED for game in played]
    if any(game["kind"] == "forfeit" and game["score"] == 0 for game in games):
        status = "walkover"
    elif any(game["kind"] == "unpaired" for game in games) or len(games) < completed_round:
        status = "incomplete"
    else:
        status = "valid"
    return {
        "points": sum(game["score"] for game in games),
        "games": len(games),
        "tpr": performance(ratings, sum(game["score"] for game in played)),
        "status": status,
    }


def _known_players(db: Database, fide_ids: List[str]) -> Dict[str, Dict]:
    if not fide_ids:
        return {}
    with sqlite3.connect(db.db_file) as conn:
        conn.row_factory = sqlite3.Row
        placeholders = ",".join("?" * len(fide_ids))
        rows = conn.execute(
            f"SELECT id, fide_id, name, gender FROM players WHERE fide_id IN ({placeholders})", fide_ids
        ).fetchall()
    return {row["fide_id"]: dict(row) for row in rows}


def _ranked(db: Database, results: Dict, season: int, gender: Optional[str]) -> Dict:
    ranked = db._assign_ranks(db._calculate_rankings_from_results(results, season, gender))
    return {ranking[0]: ranking for ranking in ranked}


def standings(event: Dict, db: Database) -> Dict:
    """Season standings with the event's games so far counted as a finished result."""
    season = int(event["start_date"][:4])
    all_results = db._results_before(db.get_all_results(season=season), event["start_date"])
    open_results = db._results_before(db.get_all_results(season=season, section="open"), event["start_date"])

    sections = {}
    entrants = []
    for section, tournament_id in event["sections"].items():
        players, games, completed_round, paired_round = _section_games(tournament_id, event["rounds"])
        sections[section] = {"id": tournament_id, "completed_round": completed_round, "paired_round": paired_round}
        for snr, player in players.items():
            if player["federation"] == "KEN" and player["fide_id"] and games.get(snr):
                live = _live_result(games[snr], players, completed_round)
                live["rounds"] = [
                    _live_result([game for game in games[snr] if game["round"] <= round_number], players, round_number)
                    for round_number in range(1, completed_round + 1)
                ]
                entrants.append((section, player, live))

    known = _known_players(db, [player["fide_id"] for _, player, _ in entrants])
    live_by_key = {}
    with_live_open = {key: list(value) for key, value in open_results.items()}
    with_live_all = {key: list(value) for key, value in all_results.items()}

    for section, player, live in entrants:
        if live["tpr"] is None:
            continue
        record = known.get(player["fide_id"])
        key = record["id"] if record else f"live:{player['fide_id']}"
        live_by_key[key] = {**live, "section": section}
        result = {
            "player": {
                "name": record["name"] if record else player["name"],
                "fide_id": player["fide_id"],
                "federation": "KEN",
                "rating": player["rating"],
                "gender": (record and record["gender"]) or player["gender"],
            },
            "points": live["points"],
            "tpr": live["tpr"],
            "has_walkover": live["status"] == "walkover",
            "result_status": live["status"],
            "tournament": {"id": event["sections"][section], "name": event["name"], "section": section,
                           "start_date": event["start_date"]},
        }
        with_live_all.setdefault(key, []).append(result)
        if section == "open":
            with_live_open.setdefault(key, []).append(result)

    categories = {}
    for category, before_results, live_results, gender in (
        ("open", open_results, with_live_open, None),
        ("ladies", all_results, with_live_all, "F"),
    ):
        before = _ranked(db, before_results, season, gender)
        after = _ranked(db, live_results, season, gender)
        rows = []
        for key, ranking in sorted(after.items(), key=lambda item: item[1][-1]):
            live = live_by_key.get(key)
            if live and category == "open" and live["section"] != "open":
                live = None
            previous = before.get(key)
            if ranking[-1] > SHOWN_RANKS and not live and not (previous and previous[-1] <= SHOWN_RANKS):
                continue
            rows.append({
                "fide_id": ranking[2],
                "name": ranking[1],
                "rank": ranking[-1],
                "rank_before": previous[-1] if previous else None,
                "tournaments_played": ranking[4],
                "best_1": ranking[5],
                "best_2": ranking[7],
                "best_3": ranking[8],
                "best_4": ranking[9],
                "live": live,
            })
        categories[category] = rows

    return {"live": True, "event": event["name"], "rounds": event["rounds"], "sections": sections,
            "categories": categories}


def _is_live(event: Dict, db: Database, now: Optional[dt.datetime] = None) -> bool:
    today = (now or dt.datetime.now(NAIROBI)).date().isoformat()
    if not event["start_date"] <= today <= event["end_date"]:
        return False
    return not db.does_tournament_exist(event["sections"]["open"])


def live_payload(db: Database) -> Dict:
    if not _is_live(LIVE_EVENT, db):
        return {"live": False}
    with _lock:
        if _cache["payload"] is not None and time.time() - _cache["at"] < CACHE_SECONDS:
            return _cache["payload"]
        try:
            payload = standings(LIVE_EVENT, db)
            payload["updated_at"] = dt.datetime.now(NAIROBI).isoformat(timespec="seconds")
        except Exception:
            logger.exception("live_standings_failed")
            if _cache["payload"] is not None:
                return _cache["payload"]
            return {"live": False}
        _cache.update(at=time.time(), payload=payload)
        return payload
