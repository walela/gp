"""Chess Kenya standings audit helpers."""

from __future__ import annotations

import csv
import math
import sqlite3
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Optional

from player_eligibility import is_gp_eligible_player


REPO_ROOT = Path(__file__).resolve().parent
DEFAULT_CHESS_KENYA_OPEN_2026_CSV = REPO_ROOT / "data" / "audits" / "chess-kenya-open-2026.csv"
DEFAULT_CHESS_KENYA_LADIES_2026_CSV = REPO_ROOT / "data" / "audits" / "chess-kenya-ladies-2026.csv"

SEASON = 2026
SITE_BASE_URL = "https://1700chess.sh"

OPEN_EVENTS = [
    {
        "csv_column": 2,
        "id": "1339853",
        "name": "Eldoret Open",
        "tracker_ids": ["1339853"],
        "tracker_url_id": "1339853",
        "chess_results_id": "1339853",
    },
    {
        "csv_column": 3,
        "id": "1363408",
        "name": "Kisumu Open",
        "tracker_ids": ["1363408"],
        "tracker_url_id": "1363408",
        "chess_results_id": "1363408",
    },
    {
        "csv_column": 4,
        "id": "1374308",
        "name": "Mavens Open",
        "tracker_ids": ["1374308"],
        "tracker_url_id": "1374308",
        "chess_results_id": "1374308",
    },
    {
        "csv_column": 5,
        "id": "1393501",
        "name": "Sataranji Open",
        "tracker_ids": ["1393501"],
        "tracker_url_id": "1393501",
        "chess_results_id": "1393501",
    },
    {
        "csv_column": 6,
        "id": "1406639",
        "name": "Kiambu Open",
        "tracker_ids": ["1406639"],
        "tracker_url_id": "1406639",
        "chess_results_id": "1406639",
    },
    {
        "csv_column": 7,
        "id": "1424627",
        "name": "Kakamega Open",
        "tracker_ids": ["1424627"],
        "tracker_url_id": "1424627",
        "chess_results_id": "1424627",
    },
    {
        "csv_column": 8,
        "id": "1429665",
        "name": "Quo Vadis Nyeri Open",
        "tracker_ids": ["1429665"],
        "tracker_url_id": "1429665",
        "chess_results_id": "1429665",
    },
    {
        # The source CSV labels NCC in column 10, but the populated NCC TPRs are in column 9.
        "csv_column": 9,
        "id": "1408682",
        "name": "1st NCC GP",
        "tracker_ids": ["1408682"],
        "tracker_url_id": "1408682",
        "chess_results_id": "1408682",
    },
]

LADIES_EVENTS = [
    {
        "csv_column": 2,
        "id": "1339860",
        "name": "Eldoret Open",
        "tracker_ids": ["1339860", "1339853"],
        "tracker_url_id": "1339860",
        "chess_results_id": "1339860",
    },
    {
        "csv_column": 3,
        "id": "1363413",
        "name": "Kisumu Open",
        "tracker_ids": ["1363413", "1363408"],
        "tracker_url_id": "1363413",
        "chess_results_id": "1363413",
    },
    {
        "csv_column": 4,
        "id": "1374310",
        "name": "Mavens Open",
        "tracker_ids": ["1374308_ladies", "1374308"],
        "tracker_url_id": "1374308_ladies",
        "chess_results_id": "1374310",
    },
    {
        "csv_column": 5,
        "id": "1396283",
        "name": "Sataranji Open",
        "tracker_ids": ["1393501_ladies", "1393501"],
        "tracker_url_id": "1393501_ladies",
        "chess_results_id": "1396283",
    },
    {
        "csv_column": 6,
        "id": "1406640",
        "name": "Kiambu Open",
        "tracker_ids": ["1406640", "1406639"],
        "tracker_url_id": "1406640",
        "chess_results_id": "1406640",
    },
    {
        "csv_column": 7,
        "id": "1424627",
        "name": "Kakamega Open",
        "tracker_ids": ["1424627"],
        "tracker_url_id": "1424627",
        "chess_results_id": "1424627",
    },
    {
        "csv_column": 8,
        "id": "1429665",
        "name": "Quo Vadis Nyeri Open",
        "tracker_ids": ["1429665"],
        "tracker_url_id": "1429665",
        "chess_results_id": "1429665",
    },
    {
        # The source CSV labels NCC in column 10, but the populated NCC TPRs are in column 9.
        "csv_column": 9,
        "id": "1408683",
        "name": "1st NCC GP",
        "tracker_ids": ["1408683", "1408682"],
        "tracker_url_id": "1408683",
        "chess_results_id": "1408683",
    },
]

AUDIT_SECTIONS = [
    {
        "id": "open",
        "label": "Open",
        "source_label": "Grand Prix Standings 2026 - Open Section.csv",
        "events": OPEN_EVENTS,
    },
    {
        "id": "ladies",
        "label": "Ladies",
        "source_label": "Grand Prix Standings 2026 - Ladies Section.csv",
        "events": LADIES_EVENTS,
    },
]

KIND_LABELS = {
    "chess_kenya_includes_invalid_result": "CK includes invalid result",
    "event_tpr_mismatch": "Event TPR mismatch",
    "identity_issue": "Identity issue",
    "missing_in_chess_kenya": "Missing in Chess Kenya CSV",
    "missing_in_tracker": "Missing in tracker",
    "summary_mismatch": "Summary mismatch",
}

KIND_ORDER = {
    "chess_kenya_includes_invalid_result": 0,
    "event_tpr_mismatch": 1,
    "identity_issue": 2,
    "summary_mismatch": 3,
    "missing_in_tracker": 4,
    "missing_in_chess_kenya": 5,
}

SUMMARY_LABELS = {
    "top_1": "Best TPR",
    "top_2": "2nd Best TPR",
    "top_3": "3rd Best TPR",
    "top_4": "4th Best TPR",
    "events": "Number of Events",
    "ranking_score": "Ranking score",
    "avg_events_played": "Average of Events Played",
}


def parse_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    text = str(value).strip().replace(",", "")
    if not text:
        return None
    try:
        return int(round(float(text)))
    except ValueError:
        return None


def norm_name(name: Optional[str]) -> str:
    return " ".join((name or "").replace(",", " ").lower().split())


def name_match_keys(name: Optional[str]) -> list[str]:
    raw_name = name or ""
    keys = [norm_name(raw_name)]
    if "," in raw_name:
        last_name, rest = raw_name.split(",", 1)
        swapped = norm_name(f"{rest} {last_name}")
        if swapped:
            keys.append(swapped)
    return list(dict.fromkeys(key for key in keys if key))


def round_half_up(value: float) -> int:
    """Round positive ranking averages the same way spreadsheets do."""
    return math.floor(value + 0.5)


def ranking_score(values: Iterable[int]) -> int:
    ranked = sorted(values, reverse=True)[:4]
    return round_half_up(sum(ranked) / len(ranked)) if ranked else 0


def average_all(values: Iterable[int]) -> int:
    values = list(values)
    return round_half_up(sum(values) / len(values)) if values else 0


def top_values(values: Iterable[int]) -> list[Optional[int]]:
    ranked = sorted(values, reverse=True)
    return [ranked[i] if i < len(ranked) else None for i in range(4)]


def chess_results_url(event_id: str, start_rank: Optional[int] = None) -> str:
    base = f"https://chess-results.com/tnr{event_id}.aspx?lan=1"
    if start_rank:
        return f"{base}&art=9&snr={start_rank}"
    return base


def site_player_url(fide_id: Optional[str], section_id: str) -> Optional[str]:
    if not fide_id:
        return None
    gender = "f" if section_id == "ladies" else "open"
    return f"{SITE_BASE_URL}/player/{fide_id}?season={SEASON}&gender={gender}"


def site_tournament_url(event_id: Optional[str]) -> Optional[str]:
    if not event_id:
        return None
    return f"{SITE_BASE_URL}/tournament/{event_id}?sort=tpr&dir=desc"


def event_metadata(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            **event,
            "chess_results_url": chess_results_url(event["chess_results_id"]),
            "tracker_url": site_tournament_url(event["tracker_url_id"]),
        }
        for event in events
    ]


def summary_from_event_values(event_values: dict[str, int]) -> dict[str, Optional[int] | int]:
    values = list(event_values.values())
    top_1, top_2, top_3, top_4 = top_values(values)
    return {
        "top_1": top_1,
        "top_2": top_2,
        "top_3": top_3,
        "top_4": top_4,
        "events": len(values),
        "ranking_score": ranking_score(values),
        "avg_events_played": average_all(values),
    }


def collapse_duplicate_fides(players: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    players_by_fide: dict[str, list[dict[str, Any]]] = defaultdict(list)
    collapsed: dict[str, dict[str, Any]] = {}

    for player in players.values():
        fide_id = player.get("fide_id")
        if fide_id:
            players_by_fide[fide_id].append(player)
        else:
            player["duplicate_fide"] = False
            collapsed[player["key"]] = player

    for fide_id, group in players_by_fide.items():
        if len(group) == 1:
            player = group[0]
            player["duplicate_fide"] = False
            collapsed[player["key"]] = player
            continue

        primary = sorted(
            group,
            key=lambda player: (
                -len(player["events"]),
                -(player["summary"].get("events") or 0),
                -(player["summary"].get("ranking_score") or 0),
                player["source_rank"],
            ),
        )[0]

        merged_events = dict(primary["events"])
        conflicts: list[dict[str, Any]] = []
        for player in sorted(group, key=lambda item: item["source_rank"]):
            for event_id, value in player["events"].items():
                existing = merged_events.get(event_id)
                if existing is None:
                    merged_events[event_id] = value
                elif existing != value:
                    conflicts.append(
                        {
                            "event_id": event_id,
                            "source_row": player["source_row"],
                            "kept": existing,
                            "duplicate": value,
                        }
                    )

        primary["events"] = merged_events
        primary["summary"] = summary_from_event_values(merged_events)
        primary["duplicate_fide"] = True
        primary["duplicate_source_rows"] = [player["source_row"] for player in group]
        primary["duplicate_names"] = sorted({player["name"] for player in group})
        primary["duplicate_conflicts"] = conflicts
        collapsed[primary["key"]] = primary

    return collapsed


def read_chess_kenya(
    csv_path: Path,
    source_section: str,
    source_label: str,
    events: list[dict[str, Any]],
) -> tuple[dict[str, dict[str, Any]], list[str]]:
    rows = list(csv.reader(csv_path.open(newline="")))
    players: dict[str, dict[str, Any]] = {}
    notes: list[str] = []

    if len(rows) > 3 and len(rows[1]) > 10 and rows[1][10].strip() and any(
        len(row) > 9 and row[9].strip() for row in rows[3:]
    ):
        notes.append(
            f"The Chess Kenya {source_section.title()} CSV labels NCC in column 10, "
            "but the populated NCC TPR values are in column 9. This audit maps column 9 to NCC."
        )

    source_rank = 0
    for row_number, row in enumerate(rows[3:], start=4):
        if len(row) < 26:
            continue
        name = row[1].strip()
        if not name:
            continue

        source_rank += 1
        fide_id = row[0].strip()
        if not is_gp_eligible_player(fide_id, name):
            continue

        event_values: dict[str, int] = {}
        for event in events:
            value = parse_int(row[event["csv_column"]])
            if value is not None:
                event_values[event["id"]] = value

        player_key = f"{source_section}:{row_number}"
        players[player_key] = {
            "key": player_key,
            "source_section": source_section,
            "source_label": source_label,
            "source_row": row_number,
            "source_rank": source_rank,
            "fide_id": fide_id,
            "name": name,
            "norm_name": norm_name(name),
            "name_keys": name_match_keys(name),
            "events": event_values,
            "summary": {
                "top_1": parse_int(row[18]),
                "top_2": parse_int(row[19]),
                "top_3": parse_int(row[20]),
                "top_4": parse_int(row[21]),
                "events": parse_int(row[22]),
                "ranking_score": parse_int(row[24]),
                "avg_events_played": parse_int(row[25]),
            },
        }

    return collapse_duplicate_fides(players), notes


def _rank_tracker_players(players: dict[str, dict[str, Any]]) -> None:
    def rank_key(player: dict[str, Any]) -> tuple[int, int, int, int, str]:
        summary = player["summary"]
        return (
            summary.get("top_3") or 0,
            summary.get("top_2") or 0,
            summary.get("top_1") or 0,
            summary.get("events") or 0,
            player.get("name") or "",
        )

    ranked = sorted(
        (player for player in players.values() if player["events"]),
        key=rank_key,
        reverse=True,
    )
    for rank, player in enumerate(ranked, start=1):
        player["contender_rank"] = rank


def read_tracker(
    db_path: Path,
    audit_section: str,
    events: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    event_by_tracker_id = {
        tracker_id: event
        for event in events
        for tracker_id in event["tracker_ids"]
    }

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT
            p.fide_id,
            p.name,
            p.federation,
            p.gender,
            t.id AS tournament_id,
            t.section,
            COALESCE(t.short_name, t.name) AS tournament_name,
            COALESCE(t.source_id, t.id) AS source_id,
            r.tpr,
            r.result_status,
            r.start_rank,
            r.has_walkover,
            r.points
        FROM results r
        JOIN players p ON p.id = r.player_id
        JOIN tournaments t ON t.id = r.tournament_id
        WHERE t.start_date LIKE ?
        """,
        (f"{SEASON}%",),
    ).fetchall()
    conn.close()

    players: dict[str, dict[str, Any]] = {}
    for row in rows:
        event = event_by_tracker_id.get(row["tournament_id"])
        if not event:
            continue
        if audit_section == "open" and row["section"] != "open":
            continue
        if audit_section == "ladies" and not (row["gender"] == "F" or row["section"] == "ladies"):
            continue
        if row["federation"] != "KEN":
            continue
        if row["tpr"] is None:
            continue
        if not is_gp_eligible_player(row["fide_id"], row["name"]):
            continue

        key = row["fide_id"] or f"name:{norm_name(row['name'])}"
        player = players.setdefault(
            key,
            {
                "key": key,
                "fide_id": row["fide_id"] or "",
                "name": row["name"],
                "gender": row["gender"],
                "norm_name": norm_name(row["name"]),
                "name_keys": name_match_keys(row["name"]),
                "events": {},
                "event_details": {},
                "excluded_events": {},
                "excluded_event_details": {},
            },
        )

        event_id = event["id"]
        tpr = int(row["tpr"])
        status = row["result_status"] or "valid"
        detail = {
            "event_id": event_id,
            "source_id": row["source_id"],
            "name": row["tournament_name"],
            "start_rank": row["start_rank"],
            "tournament_id": row["tournament_id"],
            "section": row["section"],
            "result_status": status,
            "has_walkover": bool(row["has_walkover"]),
            "points": row["points"],
            "tpr": tpr,
        }

        if status != "valid":
            existing_excluded_tpr = player["excluded_events"].get(event_id)
            if existing_excluded_tpr is None or tpr > existing_excluded_tpr:
                player["excluded_events"][event_id] = tpr
                player["excluded_event_details"][event_id] = detail
            continue

        existing_tpr = player["events"].get(event_id)
        if existing_tpr is not None and existing_tpr >= tpr:
            continue

        player["events"][event_id] = tpr
        player["event_details"][event_id] = detail

    for player in players.values():
        values = list(player["events"].values())
        top_1, top_2, top_3, top_4 = top_values(values)
        player["summary"] = {
            "top_1": top_1,
            "top_2": top_2,
            "top_3": top_3,
            "top_4": top_4,
            "events": len(values),
            "ranking_score": ranking_score(values),
            "avg_events_played": average_all(values),
        }

    _rank_tracker_players(players)
    return players


def _priority_rank(
    ck_player: Optional[dict[str, Any]],
    tracker_player: Optional[dict[str, Any]],
) -> Optional[int]:
    if tracker_player and tracker_player.get("contender_rank"):
        return tracker_player["contender_rank"]
    if ck_player and ck_player.get("source_rank"):
        return ck_player["source_rank"]
    return None


def _severity(priority_rank: Optional[int]) -> str:
    if priority_rank is None:
        return "unranked"
    if priority_rank <= 10:
        return "top_10"
    if priority_rank <= 30:
        return "top_30"
    if priority_rank <= 75:
        return "top_75"
    return "long_tail"


def _links(
    ck_player: Optional[dict[str, Any]],
    tracker_player: Optional[dict[str, Any]],
    section_id: str,
    event: Optional[dict[str, Any]] = None,
) -> list[dict[str, str]]:
    fide_id = (tracker_player or ck_player or {}).get("fide_id")
    player_url = site_player_url(fide_id, section_id)
    links: list[dict[str, str]] = []
    if event:
        event_id = event["id"]
        event_detail = (tracker_player or {}).get("event_details", {}).get(event_id)
        excluded_detail = (tracker_player or {}).get("excluded_event_details", {}).get(event_id)
        start_rank = (event_detail or excluded_detail or {}).get("start_rank")
        links.append(
            {
                "label": "Chess-Results",
                "href": chess_results_url(event["chess_results_id"], start_rank),
            }
        )
        # The 1700 event page is redundant when we can already deep-link to the
        # player on 1700chess; only include it when there is no player link.
        if not player_url:
            tracker_event_url = site_tournament_url(event["tracker_url_id"])
            if tracker_event_url:
                links.append({"label": "1700 event", "href": tracker_event_url})
    if player_url:
        links.append({"label": "1700 player", "href": player_url})
    return links


def _row(
    kind: str,
    ck_player: Optional[dict[str, Any]],
    tracker_player: Optional[dict[str, Any]],
    field: str,
    chess_kenya: Any,
    tracker: Any,
    *,
    section_id: str,
    detail: str = "",
    event: Optional[dict[str, Any]] = None,
    delta: Optional[int] = None,
) -> dict[str, Any]:
    player = tracker_player or ck_player or {}
    priority_rank = _priority_rank(ck_player, tracker_player)
    event_id = event["id"] if event else None
    event_name = event["name"] if event else None
    return {
        "id": ":".join(
            str(part)
            for part in [
                section_id,
                kind,
                player.get("fide_id") or player.get("name") or "unknown",
                ck_player.get("source_row") if ck_player else "",
                event_id or field,
                chess_kenya,
                tracker,
            ]
        ),
        "section": section_id,
        "kind": kind,
        "kind_label": KIND_LABELS[kind],
        "player_name": player.get("name", ""),
        "chess_kenya_name": ck_player.get("name") if ck_player else None,
        "tracker_name": tracker_player.get("name") if tracker_player else None,
        "fide_id": player.get("fide_id") or "",
        "chess_kenya_fide_id": ck_player.get("fide_id") if ck_player else None,
        "tracker_fide_id": tracker_player.get("fide_id") if tracker_player else None,
        "field": field,
        "event_id": event_id,
        "event_name": event_name,
        "chess_kenya": chess_kenya,
        "tracker": tracker,
        "delta": delta,
        "detail": detail,
        "priority_rank": priority_rank,
        "severity": _severity(priority_rank),
        "chess_kenya_section": ck_player.get("source_section") if ck_player else None,
        "chess_kenya_row": ck_player.get("source_row") if ck_player else None,
        "chess_kenya_rank": ck_player.get("source_rank") if ck_player else None,
        "tracker_rank": tracker_player.get("contender_rank") if tracker_player else None,
        "links": _links(ck_player, tracker_player, section_id, event),
        "impacts": [],
    }


def _summary_impact(summary_row: dict[str, Any]) -> dict[str, Any]:
    return {
        "field": summary_row["field"],
        "chess_kenya": summary_row["chess_kenya"],
        "tracker": summary_row["tracker"],
        "delta": summary_row["delta"],
    }


def _name_index(players: dict[str, dict[str, Any]]) -> dict[str, list[str]]:
    index: dict[str, list[str]] = defaultdict(list)
    for key, player in players.items():
        for name_key in player.get("name_keys") or [player["norm_name"]]:
            index[name_key].append(key)
    return index


def _unique_name_match(
    index: dict[str, list[str]],
    player: dict[str, Any],
) -> Optional[str]:
    matches: set[str] = set()
    for name_key in player.get("name_keys") or [player["norm_name"]]:
        matches.update(index.get(name_key, []))
    return next(iter(matches)) if len(matches) == 1 else None


def _event_values_compatible(
    source_player: dict[str, Any],
    candidate_player: dict[str, Any],
) -> bool:
    exact_matches = 0
    conflicts = 0
    candidate_events = candidate_player.get("events", {})
    candidate_excluded_events = candidate_player.get("excluded_events", {})

    for event_id, value in source_player.get("events", {}).items():
        if event_id in candidate_events:
            if candidate_events[event_id] == value:
                exact_matches += 1
            else:
                conflicts += 1
        elif event_id in candidate_excluded_events and candidate_excluded_events[event_id] != value:
            conflicts += 1

    return exact_matches > 0 and conflicts == 0


def _edit_distance_at_most_one(left: str, right: str) -> bool:
    if left == right:
        return True
    if abs(len(left) - len(right)) > 1:
        return False

    i = j = edits = 0
    while i < len(left) and j < len(right):
        if left[i] == right[j]:
            i += 1
            j += 1
            continue

        edits += 1
        if edits > 1:
            return False
        if len(left) == len(right):
            i += 1
            j += 1
        elif len(left) > len(right):
            i += 1
        else:
            j += 1

    return True


def _tokens_contained_with_minor_spelling(
    source_tokens: set[str],
    candidate_tokens: set[str],
) -> bool:
    if len(source_tokens) < 2 or len(candidate_tokens) < 2:
        return False

    shorter, longer = (
        (source_tokens, candidate_tokens)
        if len(source_tokens) <= len(candidate_tokens)
        else (candidate_tokens, source_tokens)
    )
    unused = set(longer)
    for source_token in shorter:
        match = next(
            (
                candidate_token
                for candidate_token in unused
                if _edit_distance_at_most_one(source_token, candidate_token)
            ),
            None,
        )
        if not match:
            return False
        unused.remove(match)
    return True


def _unique_event_backed_partial_name_match(
    tracker: dict[str, dict[str, Any]],
    ck_player: dict[str, Any],
) -> Optional[str]:
    ck_tokens = set(ck_player["norm_name"].split())
    if len(ck_tokens) < 2:
        return None

    matches: set[str] = set()
    for key, tracker_player in tracker.items():
        tracker_tokens = set(tracker_player["norm_name"].split())
        if len(tracker_tokens) < 2:
            continue
        if not (
            ck_tokens.issubset(tracker_tokens)
            or tracker_tokens.issubset(ck_tokens)
            or _tokens_contained_with_minor_spelling(ck_tokens, tracker_tokens)
        ):
            continue
        if _event_values_compatible(ck_player, tracker_player):
            matches.add(key)

    return next(iter(matches)) if len(matches) == 1 else None


def match_players(
    chess_kenya: dict[str, dict[str, Any]],
    tracker: dict[str, dict[str, Any]],
    section_id: str,
) -> tuple[list[tuple[Optional[str], Optional[str]]], list[dict[str, Any]]]:
    tracker_by_fide = {
        player["fide_id"]: key
        for key, player in tracker.items()
        if player.get("fide_id")
    }
    tracker_names = _name_index(tracker)
    chess_kenya_names = _name_index(chess_kenya)

    pairs: list[tuple[Optional[str], Optional[str]]] = []
    identity_rows: list[dict[str, Any]] = []
    matched_tracker: set[str] = set()

    for ck_key, ck_player in chess_kenya.items():
        tr_key: Optional[str] = None
        fide_match = tracker_by_fide.get(ck_player.get("fide_id"))
        unique_name_match = _unique_name_match(tracker_names, ck_player)
        unique_name_player = tracker.get(unique_name_match) if unique_name_match else None
        unique_name_variant_match = (
            bool(unique_name_player)
            and ck_player["norm_name"] in unique_name_player.get("name_keys", [])
        )
        partial_name_match = (
            None
            if fide_match or unique_name_match
            else _unique_event_backed_partial_name_match(tracker, ck_player)
        )

        if unique_name_match and (
            not fide_match
            or (
                unique_name_variant_match
                and unique_name_player.get("fide_id") != ck_player.get("fide_id")
            )
        ):
            tr_key = unique_name_match
        elif fide_match:
            tr_key = fide_match
        elif unique_name_match:
            tr_key = unique_name_match
        elif partial_name_match:
            tr_key = partial_name_match

        tracker_player = tracker.get(tr_key) if tr_key else None

        if ck_player.get("duplicate_fide"):
            duplicate_rows = ", ".join(str(row) for row in ck_player.get("duplicate_source_rows", []))
            duplicate_names = "; ".join(ck_player.get("duplicate_names", []))
            detail = (
                f"The Chess Kenya CSV uses this FIDE ID on rows {duplicate_rows}. "
                "Those rows were merged for TPR comparison."
            )
            if duplicate_names:
                detail += f" Names: {duplicate_names}."
            if ck_player.get("duplicate_conflicts"):
                detail += " At least one duplicate row has a conflicting event TPR."
            identity_rows.append(
                _row(
                    "identity_issue",
                    ck_player,
                    tracker_player,
                    "Chess Kenya FIDE ID",
                    ck_player.get("fide_id") or "",
                    tracker_player.get("fide_id") if tracker_player else "",
                    section_id=section_id,
                    detail=detail,
                )
            )

        if tracker_player and ck_player.get("fide_id") and tracker_player.get("fide_id") != ck_player.get("fide_id"):
            identity_rows.append(
                _row(
                    "identity_issue",
                    ck_player,
                    tracker_player,
                    "FIDE ID",
                    ck_player.get("fide_id") or "",
                    tracker_player.get("fide_id") or "",
                    section_id=section_id,
                    detail="Matched by unique player name because the Chess Kenya FIDE ID points elsewhere or is stale.",
                )
            )
        elif tracker_player and ck_player["norm_name"] != tracker_player["norm_name"]:
            detail = "Matched by FIDE ID but the names differ."
            if ck_player.get("fide_id") != tracker_player.get("fide_id"):
                detail = (
                    "Matched by unique name variant and event TPRs. Chess Kenya may be missing "
                    "the FIDE ID, using given-name surname order, or omitting part of the name."
                )
            identity_rows.append(
                _row(
                    "identity_issue",
                    ck_player,
                    tracker_player,
                    "Player name",
                    ck_player.get("name") or "",
                    tracker_player.get("name") or "",
                    section_id=section_id,
                    detail=detail,
                )
            )

        pairs.append((ck_key, tr_key))
        if tr_key:
            matched_tracker.add(tr_key)

    for tr_key, tr_player in tracker.items():
        if tr_key in matched_tracker:
            continue
        if _unique_name_match(chess_kenya_names, tr_player):
            continue
        pairs.append((None, tr_key))

    return pairs, identity_rows


def discrepancy_rows(
    chess_kenya: dict[str, dict[str, Any]],
    tracker: dict[str, dict[str, Any]],
    section_id: str,
    section_label: str,
    events: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    pairs, rows = match_players(chess_kenya, tracker, section_id)

    for ck_key, tr_key in pairs:
        ck_player = chess_kenya.get(ck_key) if ck_key else None
        tracker_player = tracker.get(tr_key) if tr_key else None

        if ck_player and not tracker_player:
            if ck_player["events"]:
                rows.append(
                    _row(
                        "missing_in_tracker",
                        ck_player,
                        None,
                        "Player",
                        "present",
                        "missing",
                        section_id=section_id,
                        detail=(
                            f"Chess Kenya has at least one TPR, but the tracker has no eligible "
                            f"valid {section_label} result for this player."
                        ),
                    )
                )
            continue

        if tracker_player and not ck_player:
            if not tracker_player["events"]:
                continue
            if section_id == "open" and tracker_player.get("gender") == "F":
                continue
            rows.append(
                _row(
                    "missing_in_chess_kenya",
                    None,
                    tracker_player,
                    "Player",
                    "missing",
                    "present",
                    section_id=section_id,
                    detail=(
                        f"Tracker has eligible valid {section_label} result(s), and this player "
                        f"was not found in the Chess Kenya {section_label} CSV."
                    ),
                )
            )
            continue

        if not ck_player or not tracker_player:
            continue

        event_issue_rows: list[dict[str, Any]] = []
        summary_rows: list[dict[str, Any]] = []

        for event in events:
            event_id = event["id"]
            ck_value = ck_player["events"].get(event_id)
            tracker_value = tracker_player["events"].get(event_id)
            excluded_detail = tracker_player.get("excluded_event_details", {}).get(event_id)
            if ck_value == tracker_value:
                continue
            if ck_value is None and tracker_value is None:
                continue
            if ck_value is not None and tracker_value is None and excluded_detail:
                status = excluded_detail.get("result_status") or "invalid"
                event_issue_rows.append(
                    _row(
                        "chess_kenya_includes_invalid_result",
                        ck_player,
                        tracker_player,
                        event["name"],
                        ck_value,
                        f"{excluded_detail.get('tpr')} ({status})",
                        section_id=section_id,
                        event=event,
                        detail=(
                            f"The tracker has this result stored with result_status={status}, "
                            "so it is excluded from rankings. Chess Kenya appears to count the TPR."
                        ),
                    )
                )
                continue
            event_issue_rows.append(
                _row(
                    "event_tpr_mismatch",
                    ck_player,
                    tracker_player,
                    event["name"],
                    ck_value,
                    tracker_value,
                    section_id=section_id,
                    event=event,
                    delta=(tracker_value - ck_value) if ck_value is not None and tracker_value is not None else None,
                )
            )

        for key, label in SUMMARY_LABELS.items():
            ck_value = ck_player["summary"].get(key)
            tracker_value = tracker_player["summary"].get(key)
            if ck_value == tracker_value:
                continue
            if ck_value is None and tracker_value is None:
                continue
            summary_rows.append(
                _row(
                    "summary_mismatch",
                    ck_player,
                    tracker_player,
                    label,
                    ck_value,
                    tracker_value,
                    section_id=section_id,
                    delta=(
                        tracker_value - ck_value
                        if isinstance(ck_value, int) and isinstance(tracker_value, int)
                        else None
                    ),
                )
            )

        if event_issue_rows and summary_rows:
            impacts = [_summary_impact(row) for row in summary_rows]
            for row in event_issue_rows:
                row["impacts"] = impacts
            rows.extend(event_issue_rows)
        else:
            rows.extend(event_issue_rows)
            rows.extend(summary_rows)

    def sort_key(row: dict[str, Any]) -> tuple[int, int, bool, int, str]:
        rank = row["priority_rank"] if row["priority_rank"] is not None else 999999
        delta = abs(row["delta"]) if isinstance(row.get("delta"), int) else 0
        return (
            rank,
            KIND_ORDER[row["kind"]],
            row.get("event_id") is None,
            -delta,
            row["player_name"],
        )

    return sorted(rows, key=sort_key)


def build_section(
    db_path: Path,
    section: dict[str, Any],
    csv_path: Path,
) -> dict[str, Any]:
    section_id = section["id"]
    section_label = section["label"]
    source_label = section["source_label"]
    events = section["events"]

    if not csv_path.exists():
        return {
            "id": section_id,
            "label": section_label,
            "category": section_id,
            "source": {"label": source_label, "path": str(csv_path), "loaded": False},
            "events": event_metadata(events),
            "kinds": [
                {"id": kind, "label": KIND_LABELS[kind], "count": 0}
                for kind in sorted(KIND_LABELS, key=lambda value: KIND_ORDER[value])
            ],
            "notes": [f"Chess Kenya {section_label} CSV was not found at {csv_path}."],
            "summary": {
                "chess_kenya_players": 0,
                "tracker_players": 0,
                "discrepancy_rows": 0,
            },
            "rows": [],
        }

    chess_kenya, notes = read_chess_kenya(csv_path, section_id, source_label, events)
    tracker = read_tracker(db_path, section_id, events)
    rows = discrepancy_rows(chess_kenya, tracker, section_id, section_label, events)
    counts = Counter(row["kind"] for row in rows)

    return {
        "id": section_id,
        "label": section_label,
        "category": section_id,
        "source": {"label": source_label, "path": str(csv_path), "loaded": True},
        "events": event_metadata(events),
        "kinds": [
            {"id": kind, "label": KIND_LABELS[kind], "count": counts.get(kind, 0)}
            for kind in sorted(KIND_LABELS, key=lambda value: KIND_ORDER[value])
        ],
        "notes": notes,
        "summary": {
            "chess_kenya_players": len(chess_kenya),
            "tracker_players": sum(1 for player in tracker.values() if player["events"]),
            "discrepancy_rows": len(rows),
        },
        "rows": rows,
    }


def build_chess_kenya_open_2026_audit(
    db_path: Path,
    csv_path: Path,
    ladies_csv_path: Optional[Path] = None,
) -> dict[str, Any]:
    paths = {
        "open": csv_path,
        "ladies": ladies_csv_path or DEFAULT_CHESS_KENYA_LADIES_2026_CSV,
    }

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "season": SEASON,
        "sections": [
            build_section(db_path, section, paths[section["id"]])
            for section in AUDIT_SECTIONS
        ],
    }
