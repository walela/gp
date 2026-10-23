"""Monte Carlo model of GP qualification, Open and Ladies.

Each simulated season plays the remaining events: a player enters each with a
probability from their attendance so far, their result is void (walkover) at
the observed rate, and otherwise their TPR is drawn from a normal distribution
around their projected rating (rating on the latest FIDE list plus rating changes
from events since), with offsets by section and age and a season-wide late lift.
The spread is the group spread nudged toward the player's own history and
scaled by event format. Each event carries an El Nino cancellation and turnout
risk, and the national junior champion is drawn each season. Ladies rankings
count female players' results from any section, so each woman picks the
Ladies or Open section at events that have one. Final standings use the
site's cascading best-N rule, and the top 9 non-special players qualify
(Kenya #1 and the junior champion qualify separately; if one player is both, the
10th standings place qualifies). Until the FIDE list that decides Kenya #1 is out,
each season also draws Kenya #1 from the leading active players' projected ratings,
moved by their simulated GP results and rated games elsewhere.

The published forecast is written by scripts/update_forecast.py.
"""

import collections
import csv
import datetime as dt
import hashlib
import json
import math
import os
import random
import re
import sqlite3
import statistics

from db import Database
from player_eligibility import is_gp_eligible_player

ROOT = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(ROOT, "gp_tracker.db")
FIDE_BIO = os.path.join(ROOT, "data", "fide_bio_ken.csv")
FIDE_LIST = os.path.join(ROOT, "data", "fide_list.json")
QUALIFIERS = os.path.join(ROOT, "client", "lib", "qualifiers.json")
ACTIVE_TOURNAMENTS = os.path.join(ROOT, "client", "lib", "active-tournaments.ts")

# Only for dates before the stored FIDE list (backtests): events within this many days before a
# rating was seen, at that rating, are assumed not to be on the list it came from.
PENDING_DAYS = 40
# Strength = projected rating blended with the median section-adjusted TPR this season.
# Predicting later-season TPRs (148 results, cutoffs Oct 2025, Jun and Aug 2026), 75/25 beat
# the projected rating alone at every cutoff; median alone was slightly worse than rating and
# peak TPR was worst by far (overshoots by ~150).
MEDIAN_WEIGHT = 0.25
SPOTS = 9
SIMS = 20000

# TPR minus projected rating: (offset, sd) by section and age, 2025-26 results.
# Open: all 1700+ players. Ladies sections run well above rating; women in Open
# sections sit slightly below it with narrower swings.
GROUP = {
    ("open", False): (-9, 140), ("open", True): (4, 165),
    ("ladies", False): (65, 147), ("ladies", True): (23, 158),
}
FEMALE_OPEN = {False: (-4, 113), True: (-12, 108)}
# Walkover share: Open 1800+ results; Ladies sections and women in Open sections (1500+).
P_VOID = {"open": 0.087, "ladies": 0.098, "female_open": 0.03}
# Walkovers cluster by player (10% of regulars account for half of them). Rolling predictions
# over 682 results were best with the player's own record shrunk toward the group rate by
# this many pseudo-results (own record alone did far worse than the flat rate).
VOID_PRIOR = 10

# Late-season lift: 2025 contenders beat projected ratings by +16 (se 18). One season is
# noisy, so take half, and draw it per simulated season so its uncertainty carries through.
LATE_LIFT_MEAN, LATE_LIFT_SD = 8, 12
# Late-season attendance is handled per event (the draw column in REMAINING), not as a flat boost.
ATTEND_BOOST = 1.0
# TPR spread by format relative to the pooled spread: 8 rounds sd 108 vs 132 pooled (clear);
# 3-day 6-rounders 155 vs 137 (not significant, so half of it).
SPREAD = {"6": 1.04, "6x3": 1.10, "8": 0.82}
# Between-player differences in spread relative to the group spread: heterogeneity
# suggests ~30/140, split halves ~0.
PLAYER_SPREAD_REL = 20 / 140
OUTLIER_Z = 2.5

# Remaining events are events: (name, format, chance it doesn't happen this season, weather
# attendance multiplier, chance of a Ladies section, draw).
# Draw: share of strong players (Open 1850+, women 1700+) who entered, vs the 2025 average of ~36%.
# KCB 64%, Nakuru (Nov) 49%, Mombasa (Oct) 38%, Bungoma and CTC 35%; no history for Kisii and Karen.
# The 2025 backtest replays the events left after 2025-09-28.
REMAINING_2025 = [
    ("Mombasa Chess Festival", "6x3", 0, 1, 1, 1.05), ("KCB Chess Open", "8", 0, 1, 1, 1.78),
    ("Bungoma Open", "6", 0, 1, 1, 0.97), ("Nakuru Open (Nov)", "6", 0, 1, 1, 1.36),
    ("Chess Through Challenges", "8", 0, 1, 0, 0.97),
]
# Upcoming events come from client/lib/active-tournaments.ts; these override the defaults below,
# keyed by that file's id: (format, cancel, weather, ladies, draw).
# OND 2026: KMD forecasts above-average short rains over ~80% of Kenya, onset 2nd-3rd week of
# October, peaking in November; NOAA gives a 75% chance of a record El Nino. Chess is indoors,
# so the risk is mostly travel and turnout, rising with date and for upcountry travel.
# Ladies sections: Mombasa and KCB always have one, CTC didn't in 2025, and Kisii and Karen
# have no history (9 of 13 events this season had one). CTC assumed 8 rounds as in 2025.
EVENT_PARAMS = {
    "mombasa-open-2026": ("6x3", 0.03, 0.95, 0.95, 1.05),
    "kenya-open-2026": ("8", 0.03, 0.95, 0.95, 1.78),
    "kisii-open-2026": ("8", 0.10, 0.85, 0.7, 0.97),
    "ctc-classical-2026": ("8", 0.08, 0.90, 0.2, 0.97),
    "karen-open-2026": ("6", 0.08, 0.90, 0.7, 1.0),
}
# Events without an entry: format from rounds and length, typical risk, 9 of 13 with Ladies.
DEFAULT_EVENT = (0.08, 0.90, 0.7, 1.0)

# Attendance clusters by region (home base): rolling predictions over 2025-26 improved from
# log-loss 0.628 to 0.606 (Open) / 0.599 (Ladies) with a per-region rate shrunk toward the
# player's overall rate by this many events. School terms showed no signal (even for juniors).
REGION = {
    "Mombasa Chess Festival": "coast", "Coast Open": "coast", "Mombasa Open": "coast",
    "Eldoret Open": "west", "Kisumu Open": "west", "Kakamega Open": "west", "Bungoma Open": "west",
    "Kitale Open": "west", "Kisii Open": "west",
    "Nakuru Open": "rift", "Nakuru Open (Nov)": "rift", "Quo Vadis Nyeri Open": "rift",
}
REGION_PRIOR = 4


def region(event_name):
    return REGION.get(event_name, "nairobi")


# National junior championships (boys' and girls', under 20). In 2025 only 7 of 17 male juniors
# with a 1900+ GP TPR played; the reigning Kenya #1 (McLigeyo) and Jadon both skipped. Base
# chance (7+1)/(17+2), moved toward last year's choice with the base counting as 2 editions,
# and near zero for a Kenya #1 who is already qualified.
JUNIOR_TITLE_ATTEND = 0.42
JUNIOR_TITLE_PRIOR = 2
JUNIOR_TITLE_KENYA1 = 0.05
# 2025 entrants: full boys' list (tnr, Clarion Hotel, 27-28 Sep); girls' list unavailable, so
# only the podium (Cassidy, Zuri, Bella) is known and other girls get the base chance.
JUNIOR_2025_BOYS = {
    "10814582", "10831533", "10801529", "10814078", "10836012", "10802746", "10814418", "10818251",
    "10842853", "10857630", "10836586", "10841466", "10846573", "10833382", "10866078", "10856420",
    "10842870", "10841636", "10833340", "554000017", "10852832", "10846840", "10821872", "554003296",
    "10836721", "554005132", "554007305", "10854444", "10850180", "10852700", "10854215", "554001544",
    "10856102", "10896015", "10836659", "554001765", "10846590", "10865497", "554001897", "10885153",
}
JUNIOR_2025_GIRLS_KNOWN = {"10822755", "10814507", "10843981"}
# Chance a near-locked player (see near_lock_attendance) enters the remaining events they need:
# one more for a player on 3 results, or the lower multi rate for two or more.
NEAR_LOCK_ENTRY = 0.95
NEAR_LOCK_ENTRY_MULTI = 0.75
# Late 2025 (last 6 events), players on 4+ results within 50 of the current 9th place entered
# at 1.42x (Open) / 1.32x (Ladies) their season rate, vs ~1.09x for everyone else late (already
# in the event draw factors), so ~1.25x on top. The extra turnout fades with distance (Open: ~1.55x
# within 30, 1.19x at 30-45, 0.75x at 45-75), so the boost falls linearly from BUBBLE_PEAK at the
# line to none at BUBBLE_GAP, averaging 1.25x within it. Safe players and distant chasers entered
# less, but that isn't applied.
BUBBLE_GAP = 50
BUBBLE_PEAK = 1.5
# Kenya #1 is the top active Kenyan (the top active Kenyan woman for Ladies) on the FIDE list named
# by kenyaNumber1List in qualifiers.json. Until that list is out, it's drawn each season from the
# active players within KENYA1_WINDOW of the leader: their projected ratings plus the simulated
# GP events that end before the list, plus rated games elsewhere. Jadon, McLigeyo and Yashmith
# Chaikam averaged ~6 rated games a month outside the GP over Nov 2025-Oct 2026.
KENYA1_WINDOW = 150
OUTSIDE_GAMES_PER_MONTH = 6
OUTSIDE_EVENT_ROUNDS = 8
FORMAT_ROUNDS = {"6": 6, "6x3": 6, "8": 8}

CATEGORIES = {
    "open": {"contender_mu": 1750, "contender_best": 2000, "thresholds": range(2000, 2061, 10)},
    "ladies": {"contender_mu": 1450, "contender_best": 1700, "thresholds": range(1720, 1861, 10)},
}


def load_fide_bio():
    """Names, birth years, women, standard ratings, K-factors and active players from the Kenyan extract
    of the FIDE list (scripts/update_fide_bio.py), the list's month and the latest event end date it covers."""
    names, years, female, ratings, k_factors, active = {}, {}, set(), {}, {}, set()
    with open(FIDE_BIO, newline="") as f:
        for row in csv.DictReader(f):
            if row.get("name"):
                names[row["fide_id"]] = row["name"]
            if row["birth_year"]:
                years[row["fide_id"]] = int(row["birth_year"])
            if row["sex"] == "F":
                female.add(row["fide_id"])
            if row["rating"]:
                ratings[row["fide_id"]] = int(row["rating"])
                if row.get("inactive") == "0":
                    active.add(row["fide_id"])
            if row.get("k"):
                k_factors[row["fide_id"]] = int(row["k"])
    with open(FIDE_LIST) as f:
        info = json.load(f)
    return names, years, female, ratings, k_factors, active, info["month"], dt.date.fromisoformat(info["rated_through"])


FIDE_NAMES, BIRTH_YEARS, FEMALE, FIDE_RATINGS, FIDE_K, FIDE_ACTIVE, FIDE_MONTH, FIDE_RATED_THROUGH = load_fide_bio()


def is_junior(fide_id, year):
    born = BIRTH_YEARS.get(fide_id or "")
    return born is not None and year - born <= 18


def rating_gain(fide_id, rating, tpr, rounds, year, points=None, k=None):
    """Approximate FIDE rating change for one event.

    With points, uses the Elo formula against the opponents' average rating
    (backed out of the TPR). A perfect score's TPR is just average + 800, so the
    TPR alone overstates the gain.
    """
    k = k or (40 if is_junior(fide_id, year) and rating < 2300 else 20 if rating < 2400 else 10)
    if points is None:
        return k * rounds * 0.00144 * max(-400, min(400, tpr - rating))
    rounds = max(rounds, math.ceil(points))
    score = points / rounds
    dp = 800 if score >= 1 else -800 if score <= 0 else max(-677, min(677, 400 * math.log10(score / (1 - score))))
    opponents = tpr - dp
    expected = 1 / (1 + 10 ** (-max(-400, min(400, rating - opponents)) / 400))
    return k * rounds * (score - expected)


def known_or_estimated_gain(fide_id, rating, tpr, rounds, year, points, known):
    """Chess-Results' own rating change when scraped: unlike the estimate, it skips games against unrated players."""
    return known if known is not None else rating_gain(fide_id, rating, tpr, rounds, year, points)


def group_params(section, junior, female):
    if section == "open" and female:
        return FEMALE_OPEN[junior]
    return GROUP[(section, junior)]


def void_rate(section, female):
    return P_VOID["female_open"] if section == "open" and female else P_VOID[section]


def player_residuals(con, as_of):
    """Standardised TPR residuals (vs projected rating and group) for every valid rated result before as_of."""
    rows = con.execute(
        """
        SELECT r.player_id, p.fide_id, p.gender, r.rating, r.tpr, r.points, t.start_date, COALESCE(t.rounds, 6), t.section,
               r.rating_change
        FROM results r
        JOIN players p ON p.id = r.player_id
        JOIN tournaments t ON t.id = r.tournament_id
        WHERE COALESCE(r.result_status, 'valid') = 'valid' AND r.tpr > 0 AND r.rating > 0 AND t.start_date < ?
        ORDER BY t.start_date
        """,
        (as_of,),
    ).fetchall()
    history = collections.defaultdict(list)
    residuals = collections.defaultdict(list)
    for pid, fide_id, gender, rating, tpr, points, start_date, rounds, section, change in rows:
        date = dt.date.fromisoformat(start_date)
        pending = sum(
            known_or_estimated_gain(fide_id, r, t, n, date.year, pts, c)
            for d, r, t, n, pts, c in history[pid]
            if r == rating and (date - d).days <= PENDING_DAYS
        )
        history[pid].append((date, rating, tpr, rounds, points, change))
        female = gender == "F" or section == "ladies" or fide_id in FEMALE
        offset, sd = group_params(section, is_junior(fide_id, date.year), female)
        residuals[pid].append((tpr - rating - pending - offset) / sd)
    return residuals


def spread_factor(z):
    """Player's own spread relative to the group, pulled toward 1 by how noisy it is.

    Residuals are capped at 2.5 sd so one freak event (e.g. a perfect score, whose
    TPR is just opponents' average + 800) can't make a player look spiky.
    """
    n = len(z)
    if n < 3:
        return 1.0
    z = [max(-OUTLIER_Z, min(OUTLIER_Z, x)) for x in z]
    weight = PLAYER_SPREAD_REL ** 2 / (PLAYER_SPREAD_REL ** 2 + 1 / (2 * (n - 1)))
    return 1 + weight * (statistics.stdev(z) - 1)


def load_players(season, as_of, category="open"):
    con = sqlite3.connect(DB_FILE)
    as_of_date = dt.date.fromisoformat(as_of)
    residuals = player_residuals(con, as_of)
    # Some women are only marked female in the FIDE list, not in the players table.
    con.execute("CREATE TEMP TABLE fide_female (fide_id TEXT PRIMARY KEY)")
    con.executemany("INSERT INTO fide_female VALUES (?)", [(f,) for f in FEMALE])
    where = ("t.section = 'open'" if category == "open" else
             "(p.gender = 'F' OR t.section = 'ladies' OR p.fide_id IN (SELECT fide_id FROM fide_female))")
    rows = con.execute(
        f"""
        SELECT p.id, p.name, p.fide_id, p.gender, r.rating, r.tpr, r.points, COALESCE(r.result_status, 'valid'),
               t.start_date, COALESCE(t.rounds, 6), t.section, t.short_name, r.rating_change
        FROM results r
        JOIN players p ON p.id = r.player_id
        JOIN tournaments t ON t.id = r.tournament_id
        WHERE {where} AND p.federation = 'KEN'
          AND substr(t.start_date, 1, 4) = ? AND t.start_date < ?
        ORDER BY t.start_date
        """,
        (str(season), as_of),
    ).fetchall()
    held = con.execute(
        "SELECT count(*) FROM tournaments WHERE section = 'open' AND substr(start_date, 1, 4) = ? AND start_date < ?",
        (str(season), as_of),
    ).fetchone()[0]
    with_ladies = {
        (name, start) for name, start in con.execute("SELECT short_name, start_date FROM tournaments WHERE section = 'ladies'")
    }
    # Attendance is seasonal (school terms, travel), so pool this season's entries with
    # the same remaining stretch of last season.
    stretch_start = as_of_date.replace(year=season - 1).isoformat()
    stretch_held = con.execute(
        "SELECT count(*) FROM tournaments WHERE section = 'open' AND substr(start_date, 1, 4) = ? AND start_date >= ?",
        (str(season - 1), stretch_start),
    ).fetchone()[0]
    all_events = con.execute(
        "SELECT short_name, start_date FROM tournaments WHERE section = 'open' AND start_date < ? ORDER BY start_date",
        (as_of,),
    ).fetchall()
    entered = collections.defaultdict(set)
    for pid, short_name, start_date in con.execute(
        f"""SELECT DISTINCT p.id, t.short_name, t.start_date FROM results r
            JOIN players p ON p.id = r.player_id JOIN tournaments t ON t.id = r.tournament_id
            WHERE {where} AND t.start_date < ?""",
        (as_of,),
    ):
        entered[pid].add((short_name, start_date))
    void_history = {
        pid: (n, wo) for pid, n, wo in con.execute(
            """SELECT r.player_id, count(*), sum(COALESCE(r.result_status, 'valid') = 'walkover')
               FROM results r JOIN tournaments t ON t.id = r.tournament_id
               WHERE t.start_date < ? GROUP BY r.player_id""",
            (as_of,),
        )
    }
    stretch_apps = collections.Counter(
        pid for pid, _, _ in con.execute(
            f"""SELECT DISTINCT p.id, t.short_name, t.start_date FROM results r
                JOIN players p ON p.id = r.player_id JOIN tournaments t ON t.id = r.tournament_id
                WHERE {where} AND substr(t.start_date, 1, 4) = ? AND t.start_date >= ?""",
            (str(season - 1), stretch_start),
        )
    )

    players = {}
    # Rating changes since the FIDE list from every section, since a Ladies event moves an Open
    # rating too. Without a Chess-Results change, only a completed result can be estimated.
    since_list = collections.defaultdict(list)
    for pid, rating, tpr, rounds, points, change, status in con.execute(
        """SELECT r.player_id, r.rating, r.tpr, COALESCE(t.rounds, 6), r.points, r.rating_change,
                  COALESCE(r.result_status, 'valid')
           FROM results r JOIN tournaments t ON t.id = r.tournament_id
           WHERE r.rating > 0 AND COALESCE(t.end_date, t.start_date) > ? AND t.start_date < ?""",
        (FIDE_RATED_THROUGH.isoformat(), as_of),
    ):
        if change is not None or (status == "valid" and tpr):
            since_list[pid].append((rating, tpr, rounds, points, change))

    for pid, name, fide_id, gender, rating, tpr, points, status, start_date, rounds, section, short_name, change in rows:
        if not is_gp_eligible_player(fide_id, name):
            continue
        p = players.setdefault(pid, {
            "id": pid, "name": name, "fide_id": fide_id or f"player:{pid}", "apps": 0, "tprs": [], "form_tprs": [],
            "rating": 0, "rated": [],
            "female": gender == "F" or fide_id in FEMALE, "ladies_apps": 0, "apps_with_ladies": 0,
        })
        p["apps"] += 1
        if section == "ladies":
            p["female"] = True
            p["ladies_apps"] += 1
        if (short_name, start_date) in with_ladies:
            p["apps_with_ladies"] += 1
        if rating:
            p["rating"], p["rating_seen"] = rating, dt.date.fromisoformat(start_date)
        # Form also counts events that ended in a walkover: players who drop out tend to do so
        # when an event is going badly, so completed events alone flatter them.
        if tpr:
            p["form_tprs"].append((tpr, section))
        if status == "valid" and tpr:
            p["tprs"].append(tpr)
            if rating:
                p["rated"].append((dt.date.fromisoformat(start_date), rating, tpr, rounds, points, change))

    config = CATEGORIES[category]
    contenders = []
    for p in players.values():
        junior = is_junior(p["fide_id"], season)
        listed = FIDE_RATINGS.get(p["fide_id"]) if as_of_date > FIDE_RATED_THROUGH else None
        if listed:
            p["rating"] = listed
            pending = sum(
                known_or_estimated_gain(p["fide_id"], r, tpr, rounds, season, pts, c)
                for r, tpr, rounds, pts, c in since_list[p["id"]]
            )
        elif p["rating"]:
            # The stored rating only refreshes when the player plays again, so count from when it was seen.
            pending = sum(
                known_or_estimated_gain(p["fide_id"], r, tpr, rounds, season, pts, c)
                for d, r, tpr, rounds, pts, c in p["rated"]
                if r == p["rating"] and (p["rating_seen"] - d).days <= PENDING_DAYS
            )
        if p["rating"]:
            p["projected"] = round(p["rating"] + pending)
            base = p["projected"]
            if p["form_tprs"]:
                adjusted = [t - group_params(s, junior, p["female"])[0] for t, s in p["form_tprs"]]
                p["form"] = statistics.median(adjusted)
                base = (1 - MEDIAN_WEIGHT) * base + MEDIAN_WEIGHT * p["form"]
            p["strength"] = round(base)
        elif p["tprs"]:
            p["projected"] = 0
            base = statistics.mean(p["tprs"]) - (GROUP[("ladies", junior)][0] if category == "ladies" else 0)
            p["strength"] = round(base)
        else:
            continue
        factor = spread_factor(residuals.get(p["id"], []))
        p["section_params"] = {}
        for section in ("open", "ladies"):
            offset, sd = group_params(section, junior, p["female"])
            n, wo = void_history.get(p["id"], (0, 0))
            void = (wo + VOID_PRIOR * void_rate(section, p["female"])) / (n + VOID_PRIOR)
            p["section_params"][section] = (base + offset, sd * factor, void)
        # Chance of choosing the Ladies section at an event that has one.
        p["p_ladies"] = (p["ladies_apps"] + 1) / (p["apps_with_ladies"] + 2) if category == "ladies" else 0.0
        main = "ladies" if p["p_ladies"] >= 0.5 else "open"
        p["mu"], p["sigma"] = p["section_params"][main][:2]
        p["entered"] = (p["apps"] + stretch_apps[p["id"]], held + stretch_held)
        p["p_attend"] = min(0.95, ATTEND_BOOST * (p["entered"][0] + 1) / (p["entered"][1] + 2))
        mine = entered[p["id"]]
        first = min(d for _, d in mine)
        window = [e for e in all_events if e[1] >= first]
        overall = (sum(e in mine for e in window) + 1) / (len(window) + 2)
        p["region_mult"] = {}
        for r in ("nairobi", "rift", "west", "coast"):
            held_r = [e for e in window if region(e[0]) == r]
            apps_r = sum(e in mine for e in held_r)
            p["region_mult"][r] = (apps_r + REGION_PRIOR * overall) / (len(held_r) + REGION_PRIOR) / overall
        if p["mu"] >= config["contender_mu"] or (p["tprs"] and max(p["tprs"]) >= config["contender_best"]):
            contenders.append(p)
    return contenders, held


def bubble_attendance(contenders, excluded):
    pool = [p for p in contenders if p["fide_id"] not in excluded]
    keys = sorted((ranking_key(p["tprs"]) for p in pool), reverse=True)
    line = keys[SPOTS - 1][1]
    for p in pool:
        n, best = ranking_key(p["tprs"])
        if n == 4 and abs(best - line) < BUBBLE_GAP:
            p["bubble"] = 1 + (BUBBLE_PEAK - 1) * (1 - abs(best - line) / BUBBLE_GAP)
            p["p_attend"] *= p["bubble"]


def near_lock_attendance(contenders, events, category):
    """Raise attendance for players whose missing results would lock them even well below par.

    2025 showed no extra turnout for players needing a 4th result, but none of them were
    this safe, and nobody in 2025 was this safe while two or more short, so both entry
    rates are judgement defaults rather than measured ones.
    """
    line = max(CATEGORIES[category]["thresholds"])

    def p_entries(p, rate, needed):
        dist = [1.0]
        for name, _, cancel, attend, _, draw in events:
            q = (1 - cancel) * min(0.95, rate * attend * draw * p["region_mult"][region(name)])
            dist = [a * (1 - q) + b * q for a, b in zip(dist + [0.0], [0.0] + dist)]
        return sum(dist[needed:])

    for p in contenders:
        needed = 4 - len(p["tprs"])
        if not 1 <= needed <= len(events) or (4 * line - sum(p["tprs"])) / needed > p["mu"] - 2 * p["sigma"]:
            continue
        target = NEAR_LOCK_ENTRY if needed == 1 else NEAR_LOCK_ENTRY_MULTI
        if p_entries(p, p["p_attend"], needed) >= target:
            continue
        lo, hi = p["p_attend"], 5.0
        for _ in range(40):
            mid = (lo + hi) / 2
            lo, hi = (mid, hi) if p_entries(p, mid, needed) < target else (lo, mid)
        p["p_attend"], p["near_lock"] = hi, (needed, target)


def ranking_key(tprs):
    tprs = sorted(tprs, reverse=True)
    for n in (4, 3, 2, 1):
        if len(tprs) >= n:
            return (n, sum(tprs[:n]) / n)
    return (0, 0)


def junior_title_pool(contenders, season, category, dead=(), kenya1=()):
    pool = [
        p for p in contenders
        if p["fide_id"] not in dead and (p["female"] == (category == "ladies"))
        and BIRTH_YEARS.get(p["fide_id"] or "", 0) >= season - 20
    ]
    for p in pool:
        fid = p["fide_id"]
        eligible_last_year = BIRTH_YEARS.get(fid, 0) >= season - 21
        if fid in kenya1:
            chance = JUNIOR_TITLE_KENYA1
        elif category == "open" and eligible_last_year:
            played = fid in JUNIOR_2025_BOYS
            chance = (played + JUNIOR_TITLE_PRIOR * JUNIOR_TITLE_ATTEND) / (1 + JUNIOR_TITLE_PRIOR)
        elif fid in JUNIOR_2025_GIRLS_KNOWN:
            chance = (1 + JUNIOR_TITLE_PRIOR * JUNIOR_TITLE_ATTEND) / (1 + JUNIOR_TITLE_PRIOR)
        else:
            chance = JUNIOR_TITLE_ATTEND
        p["p_title_attend"] = chance
    return pool


def poisson(rng, mean):
    limit, n, product = math.exp(-mean), 0, rng.random()
    while product > limit:
        n, product = n + 1, product * rng.random()
    return n


def simulate(contenders, events, excluded, category="open", junior_pool=(), junior_champion=None, kenya1=(), seed=1,
             ladies_team=None, kenya1_race=None):
    """Returns qualification counts, junior title counts, final best-4s, cutoffs, per-player
    [seasons, qualified] by number of new valid results (0 up to one per event), how often each
    finished inside the standings spots (whether or not they also won the junior title), and how
    often each Kenya #1 candidate topped the deciding FIDE list.

    Either junior_champion is known, or it is drawn each season from junior_pool. Likewise Kenya #1
    is either the fixed kenya1, or drawn each season from kenya1_race (see kenya1_race()); a GP
    player who tops the list qualifies outside the standings.

    ladies_team maps women to their chance of making the Ladies team. A woman who makes
    both teams plays for the Ladies team and her Open place passes down the standings.
    Her Ladies place is drawn independently of her Open season, which slightly
    understates how often the two coincide.
    """
    rng = random.Random(seed)
    team_rng = random.Random(seed + 1)
    race_rng = random.Random(seed + 2)
    pool = [p for p in contenders if p["fide_id"] not in excluded]
    title_section = "ladies" if category == "ladies" else "open"
    qualified, titles, standings = collections.Counter(), collections.Counter(), collections.Counter()
    number1 = collections.Counter()
    by_new = collections.defaultdict(lambda: [[0, 0] for _ in range(len(events) + 1)])
    final_best4 = collections.defaultdict(list)
    cutoffs = []
    for _ in range(SIMS):
        lift = rng.gauss(LATE_LIFT_MEAN, LATE_LIFT_SD)
        champion = junior_champion
        if junior_pool:
            entrants = [p for p in junior_pool if rng.random() < p["p_title_attend"]]
            if entrants:
                def title_score(p):
                    mu, sd, _ = p["section_params"][title_section]
                    return rng.gauss(mu + lift, sd * SPREAD["8"])
                champion = max(entrants, key=title_score)["fide_id"]
                titles[champion] += 1
        happening = [
            (fmt, attend * draw, rng.random() < ladies, region(name), name)
            for name, fmt, cancel, attend, ladies, draw in events
            if rng.random() >= cancel
        ]
        ratings = dict(kenya1_race["projected"]) if kenya1_race else {}
        keyed, new_counts = [], {}
        for p in pool:
            fid = p["fide_id"]
            new = []
            for fmt, attend, has_ladies, where, name in happening:
                if rng.random() >= min(0.95, p["p_attend"] * attend * p["region_mult"][where]):
                    continue
                section = "ladies" if has_ladies and rng.random() < p["p_ladies"] else "open"
                mu, sd, void = p["section_params"][section]
                if rng.random() >= void:
                    tpr = rng.gauss(mu + lift, sd * SPREAD[fmt])
                    new.append(tpr)
                    if fid in ratings and name in kenya1_race["rated_events"]:
                        ratings[fid] += rating_gain(fid, ratings[fid], tpr, FORMAT_ROUNDS[fmt], kenya1_race["year"],
                                                    k=FIDE_K.get(fid))
            new_counts[fid] = len(new)
            key = ranking_key(p["tprs"] + new)
            keyed.append((key, fid))
            final_best4[fid].append(key[1] if key[0] == 4 else None)
        if kenya1_race:
            for fid, (offset, sd) in kenya1_race["outside"].items():
                for _ in range(poisson(race_rng, kenya1_race["outside_events"])):
                    tpr = race_rng.gauss(ratings[fid] + offset, sd)
                    ratings[fid] += rating_gain(fid, ratings[fid], tpr, OUTSIDE_EVENT_ROUNDS, kenya1_race["year"],
                                                k=FIDE_K.get(fid))
            top = max(ratings, key=ratings.get)
            number1[top] += 1
            season_kenya1 = {top}
        else:
            season_kenya1 = set(kenya1)
        keyed.sort(reverse=True)
        on_ladies_team = {fid for fid, q in (ladies_team or {}).items() if team_rng.random() < q}
        keyed = [(key, fid) for key, fid in keyed if fid not in on_ladies_team]
        # The team size is fixed: a Kenya #1 who also wins the junior title passes that spot down the standings.
        spots = SPOTS + (champion is not None and champion in season_kenya1)
        order = [(key, fid) for key, fid in keyed if fid != champion and fid not in season_kenya1]
        cutoffs.append(order[spots - 1][0][1] if order[spots - 1][0][0] == 4 else None)
        season_qualified = {fid for _, fid in order[:spots]}
        standings.update(season_qualified)
        separate = {champion} if champion and champion not in excluded else set()
        if kenya1_race:
            separate |= season_kenya1 & {fid for _, fid in keyed}
        for fid in separate:
            # A separate qualifier would also have been a standings qualifier if ranked above the cutoff.
            if next(key for key, f in keyed if f == fid) > order[spots - 1][0]:
                standings[fid] += 1
            season_qualified.add(fid)
        qualified.update(season_qualified)
        for fid, n in new_counts.items():
            bucket = by_new[fid][n]
            bucket[0] += 1
            bucket[1] += fid in season_qualified
    return qualified, titles, final_best4, cutoffs, by_new, standings, number1


def pct(values, q):
    values = sorted(v for v in values if v is not None)
    return round(values[int(q * (len(values) - 1))]) if values else None


def current_standings(contenders, excluded):
    keyed = sorted(((ranking_key(p["tprs"]), p["fide_id"]) for p in contenders if p["fide_id"] not in excluded), reverse=True)
    return [fid for _, fid in keyed]


BACKTEST_2025 = {
    "open": {"10814647", "10831533"},    # Kenya #1 McCligeyo, junior champion Kuka
    "ladies": {"10802886", "10822755"},  # Kenya #1 Joyce Ndirangu, junior champion Cassidy Maina
}
BACKTEST_2025_KENYA1 = {"open": {"10814647"}, "ladies": {"10802886"}}


def backtest_2025(category="open"):
    excluded = BACKTEST_2025[category]
    contenders, held = load_players(2025, "2025-09-28", category)
    bubble_attendance(contenders, excluded)
    near_lock_attendance(contenders, REMAINING_2025, category)
    counts, _, _, cutoffs, _, _, _ = simulate(contenders, REMAINING_2025, excluded, category, kenya1=BACKTEST_2025_KENYA1[category])
    db = Database(DB_FILE)
    results = db.get_all_results(season=2025, section="open" if category == "open" else None)
    final = db._assign_ranks(db._calculate_rankings_from_results(results, 2025, None if category == "open" else "F"))
    actual = [r[2] for r in final if r[2] not in excluded][:SPOTS]
    now_top = current_standings(contenders, excluded)[:SPOTS]
    rows, brier, naive = [], 0.0, 0.0
    for p in contenders:
        if p["fide_id"] in excluded:
            continue
        prob = counts[p["fide_id"]] / SIMS
        y = 1.0 if p["fide_id"] in actual else 0.0
        brier += (prob - y) ** 2
        naive += ((1.0 if p["fide_id"] in now_top else 0.0) - y) ** 2
        if prob >= 0.02 or y:
            rows.append({"name": p["name"], "prob": round(prob, 3), "qualified": bool(y)})
    missing = [r[1] for r in final if r[2] in actual and r[2] not in {p["fide_id"] for p in contenders}]
    # Qualifiers the model never considered had an implied 0% (and weren't in the top 9 either).
    brier += len(missing)
    naive += len(missing)
    scored = sum(1 for p in contenders if p["fide_id"] not in excluded) + len(missing)
    rows.sort(key=lambda r: -r["prob"])
    return {
        "events_held": held,
        "players": rows,
        "qualified_not_modelled": missing,
        "brier": round(brier, 3),
        "brier_naive": round(naive, 3),
        "brier_mean": round(brier / scored, 4),
        "brier_naive_mean": round(naive / scored, 4),
        "scored": scored,
        "cutoff_p10": pct(cutoffs, 0.1), "cutoff_p50": pct(cutoffs, 0.5), "cutoff_p90": pct(cutoffs, 0.9),
        "actual_cutoff": round(next(r[9] for r in final if r[2] == actual[-1])),
    }


# Published forecast: the top PUBLISHED_RANKS of each category's current rankings, plus anyone with
# at least PUBLISHED_MIN_P (rankings put every 4-result player above every 3-result one, so a real
# contender with 3 results can sit well below 40th).
PUBLISHED_RANKS = 40
PUBLISHED_MIN_P = 0.01
# An event in active-tournaments.ts this close to a stored tournament's dates has already been scraped.
SCRAPED_WINDOW_DAYS = 3


class StaleInputs(Exception):
    """The repo's inputs disagree with each other, so no forecast can be trusted."""


def latest_season(con):
    return int(con.execute("SELECT max(substr(start_date, 1, 4)) FROM tournaments").fetchone()[0])


def season_as_of(con, season):
    """Day after the latest stored event starts, so every stored result counts."""
    latest = con.execute(
        "SELECT max(start_date) FROM tournaments WHERE substr(start_date, 1, 4) = ?", (str(season),)
    ).fetchone()[0]
    return (dt.date.fromisoformat(latest) + dt.timedelta(days=1)).isoformat()


def _ts_fields(block):
    fields = {k: v for k, _, v in re.findall(r"(\w+):\s*(['\"])(.*?)\2", block)}
    fields.update({k: int(v) for k, v in re.findall(r"(\w+):\s*(\d+)\s*[,\n]", block)})
    return fields


def upcoming_events(con, season):
    """This season's not-yet-played GP events from client/lib/active-tournaments.ts, as simulate() events."""
    with open(ACTIVE_TOURNAMENTS) as f:
        blocks = [_ts_fields(b) for b in re.findall(r"\{([^{}]*)\}", f.read())]
    stored = [
        (name, dt.date.fromisoformat(start), dt.date.fromisoformat(end or start))
        for name, start, end in con.execute(
            "SELECT short_name, start_date, end_date FROM tournaments WHERE section = 'open' AND substr(start_date, 1, 4) = ?",
            (str(season),),
        )
    ]
    events, problems = [], []
    for b in blocks:
        if "id" not in b or not b.get("startDate", "").startswith(str(season)) or b.get("status") == "Completed":
            continue
        start = dt.date.fromisoformat(b["startDate"])
        end = dt.date.fromisoformat(b.get("endDate", b["startDate"]))
        window = dt.timedelta(days=SCRAPED_WINDOW_DAYS)
        clash = next((n for n, s, e in stored if s - window <= start and end <= e + window), None)
        if clash:
            problems.append(f"{b['id']} is still listed in active-tournaments.ts but '{clash}' is already stored; remove it")
            continue
        name = b.get("short_name") or b.get("name")
        if b["id"] in EVENT_PARAMS:
            fmt, cancel, weather, ladies, draw = EVENT_PARAMS[b["id"]]
        else:
            rounds = b.get("rounds") or b.get("tentativeRounds") or 6
            fmt = "8" if rounds >= 8 else "6x3" if (end - start).days >= 2 else "6"
            cancel, weather, ladies, draw = DEFAULT_EVENT
        events.append({"id": b["id"], "name": name, "start_date": b["startDate"], "end_date": end.isoformat(),
                       "params": (name, fmt, cancel, weather, ladies, draw)})
    if problems:
        raise StaleInputs("; ".join(problems))
    return sorted(events, key=lambda e: e["start_date"])


def load_qualifiers(season):
    with open(QUALIFIERS) as f:
        config = json.load(f).get(str(season), {})
    out = {}
    for category in ("open", "ladies"):
        c = config.get(category, {})
        out[category] = {
            # Until kenya1_list (YYYY-MM) is out, kenya1 is only the current leader.
            "kenya1": {c["kenyaNumber1"]} if c.get("kenyaNumber1") else set(),
            "kenya1_list": c.get("kenyaNumber1List"),
            "champion": c.get("juniorChampion"),
            "dead": set(c.get("excluded", [])),
        }
    return out


def kenya1_race(season, category, contenders, events, qualifiers):
    """Kenya #1 candidates while the deciding FIDE list is still to come (None once it's out): projected
    ratings, the GP events that list rates, and the expected events elsewhere before it."""
    q = qualifiers[category]
    if not q["kenya1_list"] or FIDE_MONTH >= q["kenya1_list"]:
        return None
    list_date = dt.date.fromisoformat(f"{q['kenya1_list']}-01")
    projected = {p["fide_id"]: p["projected"] for p in contenders if p.get("projected")}
    con = sqlite3.connect(DB_FILE)
    pending = collections.defaultdict(float)
    for fid, rating, tpr, rounds, points, change, status in con.execute(
        """SELECT p.fide_id, r.rating, r.tpr, COALESCE(t.rounds, 6), r.points, r.rating_change, COALESCE(r.result_status, 'valid')
           FROM results r JOIN players p ON p.id = r.player_id JOIN tournaments t ON t.id = r.tournament_id
           WHERE r.rating > 0 AND COALESCE(t.end_date, t.start_date) > ?""",
        (FIDE_RATED_THROUGH.isoformat(),),
    ):
        if change is not None or (status == "valid" and tpr):
            pending[fid] += known_or_estimated_gain(fid, rating, tpr, rounds, season, points, change)
    # Inactive players become active again once they play a rated game.
    active = FIDE_ACTIVE | {fid for fid in pending if fid in FIDE_RATINGS}
    for fid in sorted(active):
        if fid not in projected:
            projected[fid] = round(FIDE_RATINGS[fid] + pending[fid])
    eligible = {
        fid: r for fid, r in projected.items()
        if fid in active and fid not in q["dead"] and (category == "open" or fid in FEMALE)
    }
    leader = max(eligible.values())
    candidates = {fid: r for fid, r in eligible.items() if r >= leader - KENYA1_WINDOW}
    months = (list_date - dt.timedelta(days=1) - FIDE_RATED_THROUGH).days / 30.44
    outside = {}
    for fid in candidates:
        offset, sd = group_params("open", is_junior(fid, season), fid in FEMALE)
        outside[fid] = (offset, sd * SPREAD[str(OUTSIDE_EVENT_ROUNDS)])
    return {
        "list": q["kenya1_list"],
        "year": season,
        "projected": candidates,
        "outside": outside,
        "outside_events": OUTSIDE_GAMES_PER_MONTH * months / OUTSIDE_EVENT_ROUNDS,
        "rated_events": {e["name"] for e in events if e["end_date"] < list_date.isoformat()},
    }


def _sha(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, default=str).encode()).hexdigest()[:16]


def _file_sha(path):
    # Git may check files out with different line endings, which must not make the forecast look stale.
    with open(path, "rb") as f:
        return hashlib.sha256(f.read().replace(b"\r\n", b"\n")).hexdigest()[:16]


def fingerprint(con, season, events):
    """Digests of everything the forecast depends on; any change means it must be regenerated."""
    data = {
        "tournaments": con.execute(
            "SELECT id, start_date, end_date, section, rounds, short_name FROM tournaments ORDER BY id").fetchall(),
        "results": con.execute(
            """SELECT tournament_id, player_id, rating, points, tpr, COALESCE(result_status, 'valid'), rating_change
               FROM results ORDER BY tournament_id, player_id""").fetchall(),
        "players": con.execute("SELECT id, fide_id, gender, federation FROM players ORDER BY id").fetchall(),
    }
    return {
        "season": season,
        "data": _sha(data),
        "events": _sha([e["params"] + (e["id"], e["start_date"]) for e in events]),
        "model": _file_sha(os.path.abspath(__file__)),
        "qualifiers": _file_sha(QUALIFIERS),
        "fide_bio": _file_sha(FIDE_BIO),
        "fide_list": _file_sha(FIDE_LIST),
    }


def tournament_counts(season):
    """Valid-result counts per stored tournament, exactly as /api/tournaments reports them."""
    db = Database(DB_FILE)
    counts = db.get_all_tournament_results_counts(season=season)
    return {t["id"]: counts.get(t["id"], 0) for t in db.get_all_tournaments(season=season)}


def category_ranks(con, season, category):
    """fide_id -> (rank, current Best 4 or None)."""
    gender = "F" if category == "ladies" else ""
    rows = con.execute(
        """SELECT fide_id, rank, best_4 FROM player_rankings
           WHERE season = ? AND COALESCE(gender, '') = ? AND fide_id IS NOT NULL""",
        (season, gender),
    ).fetchall()
    return {fid: (rank, round(best4) if best4 else None) for fid, rank, best4 in rows}


def player_factors(p, events, season, by_new):
    """The inputs behind one player's simulated seasons, for the player page."""
    junior = is_junior(p["fide_id"], season)
    main = "ladies" if p["p_ladies"] >= 0.5 else "open"
    group = "ladies" if main == "ladies" else "women_open" if p["female"] else "juniors_open" if junior else "adults_open"
    offset = group_params(main, junior, p["female"])[0]
    _, sigma, void = p["section_params"][main]
    rating = p["projected"] or None
    form_adj = p["strength"] - rating if rating else 0
    expected = p["strength"] + offset + LATE_LIFT_MEAN
    n, best = ranking_key(p["tprs"])
    p_improve = weakest = None
    if n == 4:
        weakest = sorted(p["tprs"], reverse=True)[3]
        z = (weakest - expected) / (sigma * SPREAD["6"])
        p_improve = (1 - void) * 0.5 * math.erfc(z / math.sqrt(2))
    entries = sum(
        (1 - cancel) * min(0.95, p["p_attend"] * attend * draw * p["region_mult"][region(name)])
        for name, _, cancel, attend, _, draw in events
    )
    return {
        "now": [n, round(best)],
        "rating": rating,
        "form": round(p["form"]) if rating and "form" in p else None,
        "form_adj": form_adj,
        "group": group,
        "group_adj": offset,
        "lift": LATE_LIFT_MEAN,
        "expected_tpr": expected,
        "swing": round(sigma),
        "weakest": weakest,
        "p_improve": round(p_improve, 3) if p_improve is not None else None,
        "entered": list(p["entered"]),
        "expected_entries": round(entries, 1),
        "events_left": len(events),
        "walkover": round(void, 3),
        "boost": "near_lock" if p.get("near_lock") else "bubble" if p.get("bubble") else None,
        "bubble_factor": round(p.get("bubble", 1.0), 2),
        "near_lock_entry": p["near_lock"][1] if p.get("near_lock") else NEAR_LOCK_ENTRY,
        "near_lock_needed": p["near_lock"][0] if p.get("near_lock") else None,
        "by_new": [[round(s / SIMS, 3), round(q / s, 3) if s else None] for s, q in by_new],
    }


def simulate_category(season, as_of, category, events, qualifiers, ladies_team=None):
    q = qualifiers[category]
    kenya1, champion, dead = q["kenya1"], q["champion"], q["dead"]
    contenders, _ = load_players(season, as_of, category)
    race = kenya1_race(season, category, contenders, events, qualifiers)
    excluded = dead | ({champion} if champion else set()) | (set() if race else kenya1)
    # The current leader stays out of the bubble line either way.
    bubble_attendance(contenders, excluded | kenya1)
    near_lock_attendance(contenders, [e["params"] for e in events], category)
    juniors = () if champion else junior_title_pool(contenders, season, category, dead, kenya1=kenya1)
    results = simulate(
        contenders, [e["params"] for e in events], excluded, category,
        junior_pool=juniors, junior_champion=champion, kenya1=() if race else kenya1, ladies_team=ladies_team,
        kenya1_race=race,
    )
    return contenders, juniors, results, race


def forecast_category(con, season, as_of, category, events, qualifiers, ladies_team=None):
    q = qualifiers[category]
    champion, dead = q["champion"], q["dead"]
    contenders, juniors, results, race = simulate_category(season, as_of, category, events, qualifiers, ladies_team)
    counts, titles, final_best4, cutoffs, by_new, standings, number1 = results
    # While the deciding list is still to come, the leader gets a forecast like everyone else.
    kenya1 = set() if race else q["kenya1"]
    modelled = {p["fide_id"]: p for p in contenders}
    title_entry = {p["fide_id"]: p["p_title_attend"] for p in juniors}
    ranking = category_ranks(con, season, category)
    ranks = {fid: rank for fid, (rank, _) in ranking.items()}
    published = {fid for fid, rank in ranks.items() if rank <= PUBLISHED_RANKS}
    published |= {fid for fid in modelled if fid in ranks and counts[fid] / SIMS >= PUBLISHED_MIN_P}
    published |= {fid for fid in q["kenya1"] | {champion} if fid in ranks}
    players = {}
    for fide_id in sorted(published, key=ranks.get):
        rank, best4_now = ranking[fide_id]
        if fide_id in dead:
            continue
        if fide_id in kenya1:
            players[fide_id] = {"rank": rank, "status": "kenya1"}
            continue
        if fide_id == champion:
            players[fide_id] = {"rank": rank, "status": "junior_champion"}
            continue
        entry = {"rank": rank, "status": "forecast", "p": round(counts[fide_id] / SIMS, 3)}
        if fide_id in modelled:
            finals = final_best4[fide_id]
            entry.update({
                "p_play": round(1 - by_new[fide_id][0][0] / SIMS, 3),
                # best4 percentiles are among simulated seasons that reach four valid results.
                "p_four": round(sum(v is not None for v in finals) / SIMS, 3),
                "best4": [pct(finals, 0.1), pct(finals, 0.5), pct(finals, 0.9)],
                "p_junior_title": round(titles[fide_id] / SIMS, 3),
                "p_standings": round(standings[fide_id] / SIMS, 3),
                "factors": player_factors(modelled[fide_id], [e["params"] for e in events], season, by_new[fide_id]),
            })
            if fide_id in title_entry:
                entry["p_title_entry"] = round(title_entry[fide_id], 3)
            if race and fide_id in race["projected"]:
                entry["p_kenya1"] = round(number1[fide_id] / SIMS, 3)
        else:
            # Too far off the pace to simulate; the page shows how far.
            entry["best4_now"] = best4_now
        players[fide_id] = entry
    out = {"cutoff": [pct(cutoffs, 0.1), pct(cutoffs, 0.5), pct(cutoffs, 0.9)], "players": players}
    if race:
        names = dict(con.execute("SELECT fide_id, name FROM players WHERE fide_id IS NOT NULL"))
        out["kenya1"] = {
            "list": race["list"],
            "candidates": [
                {"fide_id": fid, "name": names.get(fid) or FIDE_NAMES.get(fid), "rating": rating,
                 "p": round(number1[fid] / SIMS, 3)}
                for fid, rating in sorted(race["projected"].items(), key=lambda kv: -number1[kv[0]])
                if number1[fid] / SIMS >= 0.001
            ],
        }
    return out


def ladies_team(ladies, qualifiers):
    """Each woman's chance of a Ladies team place, from the Ladies forecast."""
    team = {fid: e["p"] for fid, e in ladies["players"].items() if e["status"] == "forecast"}
    q = qualifiers["ladies"]
    fixed = set() if "kenya1" in ladies else q["kenya1"]
    team.update({fid: 1.0 for fid in sorted(fixed | ({q["champion"]} if q["champion"] else set()))})
    return team


def apply_baseline(forecast, previous):
    """Set each player's p_before to the odds published before the latest event, so the change matches
    what players saw. Regenerating after the same event keeps the earlier baseline."""
    same_event = previous["after"]["id"] == forecast["after"]["id"]
    for category, c in forecast["categories"].items():
        old = previous["categories"].get(category, {}).get("players", {})
        for fide_id, entry in c["players"].items():
            if entry["status"] == "forecast":
                prev = old.get(fide_id, {})
                if prev.get("status", "forecast") != "forecast":
                    entry["p_before"] = 1.0
                else:
                    entry["p_before"] = prev.get("p_before", 0.0) if same_event else prev.get("p", 0.0)


def build_forecast(season=None, previous=None):
    """previous is the published forecast the changes are measured from; without it there are none."""
    con = sqlite3.connect(DB_FILE)
    season = season or latest_season(con)
    as_of = season_as_of(con, season)
    events = upcoming_events(con, season)
    qualifiers = load_qualifiers(season)
    ladies = forecast_category(con, season, as_of, "ladies", events, qualifiers)
    latest = con.execute(
        """SELECT id, short_name, name FROM tournaments WHERE section = 'open' AND substr(start_date, 1, 4) = ?
           ORDER BY start_date DESC LIMIT 1""",
        (str(season),),
    ).fetchone()
    forecast = {
        "season": season,
        "as_of": as_of,
        "after": {"id": latest[0], "name": latest[1] or latest[2]},
        "sims": SIMS,
        "spots": SPOTS,
        "remaining": [{"id": e["id"], "name": e["name"], "start_date": e["start_date"]} for e in events],
        "tournaments": tournament_counts(season),
        "fingerprint": fingerprint(con, season, events),
        "categories": {
            "open": forecast_category(con, season, as_of, "open", events, qualifiers, ladies_team(ladies, qualifiers)),
            "ladies": ladies,
        },
    }
    if previous:
        apply_baseline(forecast, previous)
    return forecast


def check_forecast(forecast):
    """Problems that make a published forecast stale; empty when it matches the repo."""
    con = sqlite3.connect(DB_FILE)
    season = latest_season(con)
    try:
        events = upcoming_events(con, season)
    except StaleInputs as e:
        return [str(e)]
    current = fingerprint(con, season, events)
    stored = forecast.get("fingerprint", {})
    labels = {
        "season": "the season changed",
        "data": "tournaments, results or players in gp_tracker.db changed",
        "events": "upcoming events in client/lib/active-tournaments.ts (or their EVENT_PARAMS) changed",
        "model": "qualification_model.py changed",
        "qualifiers": "client/lib/qualifiers.json changed",
        "fide_bio": "data/fide_bio_ken.csv changed",
        "fide_list": "data/fide_list.json changed",
    }
    return [labels[k] for k in labels if stored.get(k) != current[k]]
