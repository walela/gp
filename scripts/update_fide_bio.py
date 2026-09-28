"""Extract Kenyan players' birth year and sex from the FIDE rating list.

The qualification forecast needs both (junior status, women in Open sections), and the
full FIDE list is too large to commit, so only Kenyan rows are kept.

Usage:
    python3 scripts/update_fide_bio.py                 # download the current FIDE list
    python3 scripts/update_fide_bio.py --list FILE     # use an extracted players_list_foa.txt
"""
import argparse
import csv
import io
import os
import sys
import urllib.request
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT = os.path.join(ROOT, "data", "fide_bio_ken.csv")
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
    args = parser.parse_args()

    lines = read_lines(args.list)
    header = next(lines)
    birth, fed, sex = header.index("B-day"), header.index("Fed"), header.index("Sex")
    rows = []
    for line in lines:
        if line[fed:fed + 3] != "KEN":
            continue
        year = line[birth:birth + 4].strip()
        rows.append((line[:15].strip(), int(year) if year.isdigit() and year != "0" else "", line[sex].strip()))
    rows.sort(key=lambda r: int(r[0]) if r[0].isdigit() else 0)

    with open(OUTPUT, "w", newline="") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow(["fide_id", "birth_year", "sex"])
        writer.writerows(rows)
    print(f"Wrote {len(rows)} Kenyan players to {os.path.relpath(OUTPUT, ROOT)}", file=sys.stderr)


if __name__ == "__main__":
    main()
