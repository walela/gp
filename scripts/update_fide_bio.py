"""Extract Kenyan players' birth year, sex and standard rating from the FIDE rating list.

The qualification forecast needs all three (junior status, women in Open sections, current
rating), and the full FIDE list is too large to commit, so only Kenyan rows are kept.

Run when FIDE publishes a new monthly list. data/fide_list.json records the latest event end
date the list covers; the forecast adds Chess-Results rating changes for events after it.
Events ending in the previous month are normally on the list; if FIDE rated one late or not
yet, pass --rated-through or edit the file.

Usage:
    python3 scripts/update_fide_bio.py                          # download the current FIDE list
    python3 scripts/update_fide_bio.py --list FILE              # use an extracted players_list_foa.txt
    python3 scripts/update_fide_bio.py --month 2026-10 --rated-through 2026-09-30
"""
import argparse
import csv
import datetime as dt
import io
import json
import os
import sys
import urllib.request
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT = os.path.join(ROOT, "data", "fide_bio_ken.csv")
LIST_INFO = os.path.join(ROOT, "data", "fide_list.json")
FIDE_ZIP_URL = "https://ratings.fide.com/download/players_list.zip"


def read_lines(path):
    if path:
        with open(path, encoding="latin-1") as f:
            yield from f
        return
    with urllib.request.urlopen(FIDE_ZIP_URL, timeout=120) as response:
        archive = zipfile.ZipFile(io.BytesIO(response.read()))
    name = next(n for n in archive.namelist() if n.endswith(".txt"))
    with archive.open(name) as f:
        yield from io.TextIOWrapper(f, encoding="latin-1")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--list", help="path to an extracted players_list_foa.txt")
    parser.add_argument("--month", default=dt.date.today().strftime("%Y-%m"), help="list month, YYYY-MM (default: this month)")
    parser.add_argument("--rated-through", help="latest event end date on the list (default: end of the previous month)")
    args = parser.parse_args()
    month_start = dt.date.fromisoformat(f"{args.month}-01")
    rated_through = args.rated_through or (month_start - dt.timedelta(days=1)).isoformat()

    lines = read_lines(args.list)
    header = next(lines)
    birth, fed, sex, rating = header.index("B-day"), header.index("Fed"), header.index("Sex"), header.index("SRtng")
    rows = []
    for line in lines:
        if line[fed:fed + 3] != "KEN":
            continue
        year = line[birth:birth + 4].strip()
        std = line[rating:rating + 5].strip()
        rows.append((
            line[:15].strip(),
            int(year) if year.isdigit() and year != "0" else "",
            line[sex].strip(),
            int(std) if std.isdigit() and std != "0" else "",
        ))
    rows.sort(key=lambda r: int(r[0]) if r[0].isdigit() else 0)

    with open(OUTPUT, "w", newline="") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow(["fide_id", "birth_year", "sex", "rating"])
        writer.writerows(rows)
    with open(LIST_INFO, "w") as f:
        json.dump({"month": args.month, "rated_through": rated_through}, f, indent=1)
        f.write("\n")
    print(f"Wrote {len(rows)} Kenyan players to {os.path.relpath(OUTPUT, ROOT)}; "
          f"{args.month} list covers events ending by {rated_through}", file=sys.stderr)


if __name__ == "__main__":
    main()
