#!/usr/bin/env python3
"""Compare Chess Kenya's 2026 Open standings CSV with the local tracker."""

from __future__ import annotations

import csv
import html
import sqlite3
import sys
from argparse import ArgumentParser
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from player_eligibility import is_gp_eligible_player


DEFAULT_CSV_PATH = Path("/Users/austin.walela/Desktop/Grand Prix Standings 2026 - Open Section.csv")
DB_PATH = Path("gp_tracker.db")
OUTPUT_PATH = Path("client/public/audits/chess-kenya-open-2026-discrepancies.html")

EVENT_COLUMNS = [
    (2, "1339853", "Eldoret Open"),
    (3, "1363408", "Kisumu Open"),
    (4, "1374308", "Mavens Open"),
    (5, "1393501", "Sataranji Open"),
    (6, "1406639", "Kiambu Open"),
    (7, "1424627", "Kakamega Open"),
    (8, "1429665", "Quo Vadis Nyeri Open"),
    # The source CSV labels NCC in column 10, but the populated NCC TPRs are in column 9.
    (9, "1408682", "1st NCC GP"),
]


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


def player_key(fide_id: Optional[str], name: str) -> str:
    return str(fide_id).strip() if fide_id and str(fide_id).strip() else f"name:{norm_name(name)}"


def ranking_score(values: Iterable[int]) -> int:
    ranked = sorted(values, reverse=True)[:4]
    return round(sum(ranked) / len(ranked)) if ranked else 0


def average_all(values: Iterable[int]) -> int:
    values = list(values)
    return round(sum(values) / len(values)) if values else 0


def top_values(values: Iterable[int]) -> list[Optional[int]]:
    ranked = sorted(values, reverse=True)
    return [ranked[i] if i < len(ranked) else None for i in range(4)]


def read_chess_kenya(csv_path: Path) -> tuple[Dict[str, Dict[str, Any]], list[str]]:
    rows = list(csv.reader(csv_path.open(newline="")))
    players: Dict[str, Dict[str, Any]] = {}
    notes: list[str] = []

    if rows[1][10].strip() and any(row[9].strip() for row in rows[3:]):
        notes.append(
            "The CSV labels 1st Nairobi Chess Club Grand Prix - Open in column 10, "
            "but the populated NCC TPR values are in column 9. This audit maps column 9 to NCC."
        )

    for source_rank, row in enumerate(rows[3:], 1):
        if len(row) < 26:
            continue
        fide_id = row[0].strip()
        name = row[1].strip()
        if not name:
            continue

        events = {
            event_id: parse_int(row[column])
            for column, event_id, _ in EVENT_COLUMNS
            if parse_int(row[column]) is not None
        }
        summary_values = {
            "top_1": parse_int(row[18]),
            "top_2": parse_int(row[19]),
            "top_3": parse_int(row[20]),
            "top_4": parse_int(row[21]),
            "events": parse_int(row[22]) or 0,
            "ranking_score": parse_int(row[24]) or 0,
            "avg_events_played": parse_int(row[25]) or 0,
        }
        key = player_key(fide_id, name)
        players[key] = {
            "source_rank": source_rank,
            "fide_id": fide_id,
            "name": name,
            "events": events,
            "summary": summary_values,
        }

    return players, notes


def read_tracker(db_path: Path = DB_PATH) -> Dict[str, Dict[str, Any]]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT p.fide_id, p.name, p.federation, t.id AS tournament_id, r.tpr, r.result_status
        FROM results r
        JOIN players p ON p.id = r.player_id
        JOIN tournaments t ON t.id = r.tournament_id
        WHERE t.start_date LIKE '2026%'
        AND t.section = 'open'
        """
    ).fetchall()
    conn.close()

    players: Dict[str, Dict[str, Any]] = {}
    event_ids = {event_id for _, event_id, _ in EVENT_COLUMNS}
    for row in rows:
        if row["tournament_id"] not in event_ids:
            continue
        if row["federation"] != "KEN":
            continue
        if row["result_status"] not in (None, "valid"):
            continue
        if row["tpr"] is None:
            continue
        if not is_gp_eligible_player(row["fide_id"], row["name"]):
            continue

        key = player_key(row["fide_id"], row["name"])
        player = players.setdefault(
            key,
            {
                "fide_id": row["fide_id"] or "",
                "name": row["name"],
                "events": {},
            },
        )
        player["events"][row["tournament_id"]] = int(row["tpr"])

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

    return players


def discrepancy_rows(
    chess_kenya: Dict[str, Dict[str, Any]],
    tracker: Dict[str, Dict[str, Any]],
) -> list[Dict[str, Any]]:
    rows: list[Dict[str, Any]] = []
    tracker_names: Dict[str, list[str]] = defaultdict(list)
    chess_kenya_names: Dict[str, list[str]] = defaultdict(list)
    for key, player in tracker.items():
        tracker_names[norm_name(player.get("name"))].append(key)
    for key, player in chess_kenya.items():
        chess_kenya_names[norm_name(player.get("name"))].append(key)

    pairs: list[tuple[Optional[str], Optional[str]]] = []
    matched_tracker: set[str] = set()
    for ck_key, ck_player in chess_kenya.items():
        tr_key: Optional[str] = None
        if ck_key in tracker:
            tr_key = ck_key
        else:
            candidates = tracker_names.get(norm_name(ck_player.get("name")), [])
            if len(candidates) == 1:
                tr_key = candidates[0]

        pairs.append((ck_key, tr_key))
        if tr_key:
            matched_tracker.add(tr_key)

    for tr_key, tr_player in tracker.items():
        if tr_key in matched_tracker:
            continue
        candidates = chess_kenya_names.get(norm_name(tr_player.get("name")), [])
        if candidates:
            continue
        pairs.append((None, tr_key))

    summary_labels = {
        "top_1": "Best TPR",
        "top_2": "2nd Best TPR",
        "top_3": "3rd Best TPR",
        "top_4": "4th Best TPR",
        "events": "Number of Events",
        "ranking_score": "Ranking score",
        "avg_events_played": "Average of Events Played",
    }

    def add(kind: str, player: Dict[str, Any], field: str, ck: Any, tr: Any, detail: str = ""):
        rows.append(
            {
                "kind": kind,
                "player": player.get("name", ""),
                "fide_id": player.get("fide_id", ""),
                "field": field,
                "chess_kenya": ck,
                "tracker": tr,
                "detail": detail,
            }
        )

    def pair_sort_key(pair: tuple[Optional[str], Optional[str]]) -> str:
        ck_key, tr_key = pair
        return (chess_kenya.get(ck_key or "") or tracker.get(tr_key or "") or {}).get("name", "")

    for ck_key, tr_key in sorted(pairs, key=pair_sort_key):
        ck = chess_kenya.get(ck_key or "")
        tr = tracker.get(tr_key or "")
        player = {
            "name": (ck or tr or {}).get("name", ""),
            "fide_id": (ck or {}).get("fide_id") or (tr or {}).get("fide_id") or "",
        }
        ck_event_count = len(ck["events"]) if ck else 0
        tr_event_count = len(tr["events"]) if tr else 0

        if ck_event_count > 0 and tr is None:
            detail = "Chess Kenya has at least one TPR, but the tracker has no eligible valid Open result for this player."
            if not is_gp_eligible_player((ck or {}).get("fide_id"), (ck or {}).get("name")):
                detail = "Known non-citizen exclusion in tracker eligibility rules."
            add("Missing in tracker", player, "Player", "present", "missing", detail)
            continue
        if tr_event_count > 0 and (ck is None or ck_event_count == 0):
            add("Missing in Chess Kenya CSV", player, "Player", "missing", "present", "Tracker has eligible valid Open result(s).")
            continue
        if ck_event_count == 0 and tr_event_count == 0:
            continue

        for _, event_id, label in EVENT_COLUMNS:
            ck_value = ck["events"].get(event_id)
            tr_value = tr["events"].get(event_id)
            if ck_value != tr_value:
                add("Event TPR mismatch", player, label, ck_value, tr_value)

        for field, label in summary_labels.items():
            ck_value = ck["summary"].get(field)
            tr_value = tr["summary"].get(field)
            if ck_value in (None, 0) and tr_value in (None, 0):
                continue
            if ck_value != tr_value:
                add("Summary mismatch", player, label, ck_value, tr_value)

    rows.sort(key=lambda r: (r["kind"], r["player"], r["field"]))
    return rows


def html_table(rows: list[Dict[str, Any]]) -> str:
    body = []
    for row in rows:
        body.append(
            "<tr>"
            f"<td>{html.escape(str(row['kind']))}</td>"
            f"<td>{html.escape(str(row['player']))}</td>"
            f"<td>{html.escape(str(row['fide_id']))}</td>"
            f"<td>{html.escape(str(row['field']))}</td>"
            f"<td>{html.escape('' if row['chess_kenya'] is None else str(row['chess_kenya']))}</td>"
            f"<td>{html.escape('' if row['tracker'] is None else str(row['tracker']))}</td>"
            f"<td>{html.escape(str(row['detail']))}</td>"
            "</tr>"
        )
    return "\n".join(body)


def render_report(rows: list[Dict[str, Any]], notes: list[str], csv_path: Path) -> str:
    counts = defaultdict(int)
    for row in rows:
        counts[row["kind"]] += 1
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M %Z")
    count_cards = "\n".join(
        f"<div class=\"card\"><span>{html.escape(kind)}</span><strong>{count}</strong></div>"
        for kind, count in sorted(counts.items())
    )
    notes_html = "\n".join(f"<li>{html.escape(note)}</li>" for note in notes)

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Chess Kenya 2026 Open CSV Audit</title>
  <style>
    :root {{ color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }}
    body {{ margin: 0; background: #f6f7f9; color: #111827; }}
    main {{ max-width: 1180px; margin: 0 auto; padding: 32px 20px 48px; }}
    h1 {{ font-size: 28px; margin: 0 0 8px; letter-spacing: 0; }}
    p {{ color: #4b5563; line-height: 1.55; }}
    .meta {{ display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }}
    .pill {{ background: white; border: 1px solid #d1d5db; border-radius: 999px; padding: 6px 10px; font-size: 13px; }}
    .cards {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin: 22px 0; }}
    .card {{ background: white; border: 1px solid #d1d5db; border-radius: 8px; padding: 14px 16px; }}
    .card span {{ display: block; color: #6b7280; font-size: 13px; }}
    .card strong {{ display: block; margin-top: 6px; font-size: 26px; }}
    .notes {{ background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 16px; }}
    table {{ width: 100%; border-collapse: collapse; background: white; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }}
    th, td {{ padding: 9px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; font-size: 13px; }}
    th {{ background: #111827; color: white; position: sticky; top: 0; z-index: 1; }}
    tbody tr:nth-child(even) {{ background: #f9fafb; }}
    .table-wrap {{ overflow-x: auto; border-radius: 8px; margin-top: 20px; }}
    .num {{ font-variant-numeric: tabular-nums; }}
  </style>
</head>
<body>
<main>
  <h1>Chess Kenya 2026 Open CSV Audit</h1>
  <p>Comparison between the Chess Kenya CSV and the 1700 Chess tracker database for the 2026 Open Grand Prix standings. The tracker side uses eligible, valid Open-section results only.</p>
  <div class="meta">
    <span class="pill">Generated: {html.escape(generated_at)}</span>
    <span class="pill">Source CSV: {html.escape(csv_path.name)}</span>
    <span class="pill">Discrepancy rows: {len(rows)}</span>
  </div>
  <div class="cards">{count_cards}</div>
  <div class="notes">
    <strong>Notes</strong>
    <ul>{notes_html}</ul>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Player</th>
          <th>FIDE ID</th>
          <th>Field</th>
          <th>Chess Kenya CSV</th>
          <th>Tracker</th>
          <th>Detail</th>
        </tr>
      </thead>
      <tbody>
        {html_table(rows)}
      </tbody>
    </table>
  </div>
</main>
</body>
</html>"""


def parse_args() -> Any:
    parser = ArgumentParser(
        description="Compare Chess Kenya's 2026 Open standings CSV with the local tracker."
    )
    parser.add_argument(
        "csv_path",
        nargs="?",
        type=Path,
        default=DEFAULT_CSV_PATH,
        help=f"Chess Kenya CSV path. Defaults to {DEFAULT_CSV_PATH}",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DB_PATH,
        help=f"SQLite DB path. Defaults to {DB_PATH}",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_PATH,
        help=f"HTML report path. Defaults to {OUTPUT_PATH}",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    csv_path = args.csv_path
    chess_kenya, notes = read_chess_kenya(csv_path)
    tracker = read_tracker(args.db)
    rows = discrepancy_rows(chess_kenya, tracker)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(render_report(rows, notes, csv_path))

    counts = defaultdict(int)
    for row in rows:
        counts[row["kind"]] += 1
    print(f"Wrote {args.output}")
    print(f"Compared Chess Kenya players: {len(chess_kenya)}")
    print(f"Compared tracker players: {len(tracker)}")
    print(f"Discrepancy rows: {len(rows)}")
    for kind, count in sorted(counts.items()):
        print(f"{kind}: {count}")


if __name__ == "__main__":
    main()
