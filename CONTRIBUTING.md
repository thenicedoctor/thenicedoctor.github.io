# Contributing

## The one rule

**Never hand-edit a shipped HTML file.** `dist/sovereign-v7.html` and `web/play/index.html` are
build outputs. Editing them directly means the next build silently discards your change, and the
CI reproducibility check will fail.

## Making a change

For a fix to the current version, edit the relevant addon in `src/addons/` or the patch in the
matching `src/build/build-vN.py`, then rebuild:

```bash
python3 src/build/build-v4.py && python3 src/build/build-v5.py \
  && python3 src/build/build-v6.py && python3 src/build/build-v7.py \
  && python3 src/build/build-site.py
```

For a substantial new feature, add a new version: `src/addons/v8-addon.js` plus
`src/build/build-v8.py` that patches `build/v7.html`. Do not edit an old script — earlier versions
must keep reproducing exactly, because the test suites load them to check save migration.

## Save-format changes

If you add state to a nation or to `S`, bump `S.version` and update **all three** together:

- `newGame()` — set it on a fresh world
- `migrateSave()` — supply it for older saves
- `validSave()` — reject a save where it is missing or malformed

`validSave` is the trust boundary for imported files. Check ranges and internal consistency, not
just presence. A save asserting a rule (`noDebt`) must not contradict it (`debt > 0`).

## Watch for field-name collisions

The engine is one flat scope with a long history. Before adding a field to a nation, check it does
not already exist:

```bash
grep -o "\bn\.yourFieldName\b" build/v7-engine.js | head
```

`n.capital` is **political** capital, 0–100. The productive capital stock is `n.capitalStock`.
Getting this wrong once silently destroyed both.

## Tests

```bash
for f in tests/check-*.cjs; do node "$f" || exit 1; done
```

All six must pass. They run the real shipped file in a `vm` sandbox with a fake DOM.

Prefer invariants to snapshots. Good assertions look like "potential output equals A·K^α·L^(1−α)",
"growth accounting sums to potential growth", "fifty years leaves a world that still validates" —
not "GDP equals 2.31 after twelve months", which breaks on every tuning change without catching
anything.

Add a `check-vN.cjs` for a new version, covering the new behaviour and re-verifying the invariants
you might have disturbed.

## Coefficients

Tuning is expected; silent tuning is not. If you change a coefficient in the economic model, say in
the commit message what behaviour it fixes and roughly what the numbers looked like before and
after across a fifty-year run. `docs/economic-model.md` should stay accurate.

## Claims about reality

The game shows numbers that look like statistics. Do not add copy implying any of them describe a
real country, and do not add a real dataset without recording its licence and provenance in
`src/data/`. See [docs/modelling-limits.md](docs/modelling-limits.md).
