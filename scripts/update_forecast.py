"""Regenerate or verify the published qualification forecast.

Run after every results update (scrape, validation fix, rankings recalculation), after changing
upcoming events in client/lib/active-tournaments.ts or client/lib/qualifiers.json, and after
editing qualification_model.py:

    python3 scripts/update_forecast.py            # rewrite client/lib/qualification-forecast.json
    python3 scripts/update_forecast.py --check    # exit 1 if the published forecast is stale

The deploy workflow runs --check, so stale odds can't reach production.
"""
import argparse
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import qualification_model as model  # noqa: E402

OUTPUT = os.path.join(ROOT, "client", "lib", "qualification-forecast.json")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="verify instead of regenerating")
    args = parser.parse_args()

    if args.check:
        try:
            with open(OUTPUT) as f:
                published = json.load(f)
        except FileNotFoundError:
            problems = [f"{os.path.relpath(OUTPUT, ROOT)} is missing"]
        else:
            problems = model.check_forecast(published)
        if problems:
            print("Qualification forecast is stale:", file=sys.stderr)
            for problem in problems:
                print(f"  - {problem}", file=sys.stderr)
            print("Run: python3 scripts/update_forecast.py", file=sys.stderr)
            sys.exit(1)
        print("Qualification forecast is current.")
        return

    try:
        forecast = model.build_forecast()
    except model.StaleInputs as e:
        sys.exit(f"Can't build the forecast: {e}")
    with open(OUTPUT, "w") as f:
        json.dump(forecast, f, indent=1, sort_keys=True)
        f.write("\n")
    summary = ", ".join(
        f"{category} {len(c['players'])} players, line {c['cutoff'][1]}" for category, c in forecast["categories"].items()
    )
    print(f"Wrote {os.path.relpath(OUTPUT, ROOT)}: after {forecast['after']['name']}, "
          f"{len(forecast['remaining'])} events left; {summary}")


if __name__ == "__main__":
    main()
