# Forecast model ideas

Refinements to try in `qualification_model.py`. Check each against the 2025–26 data before adopting it, and ship
it with the next event update (see the forecast workflow in `AGENTS.md`).

## Surprise skips

A missed event currently counts the same however likely the player was to enter it: it just adds one to the
events held. Skipping an event the model strongly expected someone to play says much more (life circumstances,
motivation, or having given up on qualifying) than skipping one they were never likely to play.

Example: Steve Okeyo skipped Kisii 2026, a Western event the model gave him about a 91% chance of entering, and
the closest thing to a home event left. Saving Kisii only moves his season entry rate from 35% to 33%.

Possible approaches:

- Weight each miss by how expected the entry was, so a 90% skip lowers later entry chances much more than a 10%
  one.
- Give players an "unavailable" state whose probability rises after surprise skips and lowers their entry chances
  for the rest of the season.

Test: did players who skipped events they were 70%+ likely to enter go on to enter fewer later events than the
model predicted? Late-2025 bubble players should give enough cases.

## Related: out-of-region attendance

- The bubble boost (players near 9th place enter more) applies equally to every region. The 2025 data shows bubble
  players entered more often, not that they travelled more. Try applying it only to home-region events.
- Regional entry rates are shrunk toward the player's overall rate by `REGION_PRIOR` (4 events). For players with
  long histories this keeps a clear pattern from counting fully (Okeyo: 1 of 15 Nairobi-area events, modelled as
  about 13%). Try a lighter prior as history grows.
