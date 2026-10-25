# Forecast model ideas

Refinements to try in `qualification_model.py`. Check each against the 2025–26 data before adopting it, and ship
it with the next event update (see the forecast workflow in `AGENTS.md`).

## Tested and rejected (Oct 2026)

`tmp/attendance_refinements.py` replays every 2025–26 event (through KCB 2026) and predicts each contender's entry
from their history before it with the production attendance rule: season-plus-stretch rate, regional multiplier,
bubble boost, and the event's turnout as its draw factor. Scored by log-loss over 1,000 Open and 760 Ladies
player-events (production: 0.5605 Open, 0.5156 Ladies). For scale, dropping the regional rates costs +0.027 /
+0.024 and dropping the bubble boost +0.005 / +0.003, so effects of that size show up clearly.

### Surprise skips

Idea: a missed event counts the same however likely the player was to enter it, so skipping an event the model
strongly expected (e.g. Steve Okeyo and Kisii 2026, ~91%) should lower later entry chances more.

- Direct check: after a skip the model gave 70%+, Open players entered 47 later events against 52.9 predicted
  (0.89x, about one standard error); Ladies players entered 25 against 22.8 (1.10x). No consistent effect.
- Weighting each miss by how expected it was (1 + w(q - 0.5)): worse at every weight tried (w = 0.5 to 2: +0.001
  to +0.013 Open, +0.002 to +0.015 Ladies).
- Shifting later entry chances by recent surprise (last 3/6/12 events, skips only or all residuals): nothing
  better than -0.0004 on either category, and most settings clearly worse.

### Bubble boost only at home

Idea: bubble players entered more often in late 2025 but didn't travel more, so apply the boost only to
home-region events.

- Bubble players beat their no-boost predictions away from home too: Open 39 entries vs 34.0 predicted away
  (1.15x) and 27 vs 21.4 at home (1.26x); Ladies 13 vs 9.7 away (1.34x) and 11 vs 8.5 at home (1.30x).
- Home-only boost: 0.5620 Open, 0.5159 Ladies, both worse than the boost everywhere. Boosting only regions the
  player over-attends was worse too.

### Lighter regional prior for long histories

Idea: `REGION_PRIOR` (4 events) keeps long histories from counting fully (Okeyo: 1 of 15 Nairobi-area events,
modelled as about 13%), so lighten it as history grows.

- Prior K·h/(h + events since first entry), K = 2 to 8, h = 10 to 40: lightening it with history made things
  worse (K = 4, h = 10: +0.006 Open, +0.005 Ladies). The best settings (K = 6 to 8 with h = 20 to 40) were within
  0.0002 of production, i.e. no better. Shrinking long histories still pays: one-off patterns persist less than
  they look.
