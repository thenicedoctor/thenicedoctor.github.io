# Modelling limits

This document exists because the game displays numbers that look like statistics and are not.

## What the numbers are

Every figure Sovereign shows — a growth rate, an inflation rate, a crime index, a city budget, a
fertility rate, an output gap — is produced by the game's own equations from the game's own
starting values. None of it is measured, estimated from data, or calibrated against any real
country.

**Coefficients are chosen for playability.** They were tuned until the simulation behaved in a way
that was interesting to play and did not diverge, not until it matched history.

## What the model borrows

The engine uses recognisable textbook relationships, each simplified to roughly one line:

| Concept | In the game | The simplification |
|---|---|---|
| Cobb-Douglas production | `Y = A · K^0.33 · L^0.67` | A fixed capital share for every country and era |
| Conditional convergence | catch-up scaled by institutions, schooling, openness | One quality index standing in for a large literature |
| Taylor rule | `i = r* + π + 0.5(π − π*) + 0.5·gap` | A fixed reaction function, no forecasting, no judgement |
| Okun's law | `u = NAIRU − 0.45 · gap` | A single coefficient for every country |
| Phillips curve | expectations + gap term + pass-through | Expectations anchored by a single credibility scalar |
| Net Material Product | GDP × material share × (1 − depreciation) | Not how NMP was actually compiled |

Using these names is a description of the *shape* of the mechanism, not a claim to have
implemented the literature.

## Starting conditions

Country starting values — output, population, debt, institutions, civil liberties, policy settings
— are hand-authored scenario assumptions in roughly the right order of magnitude. They are not
current official statistics and were not taken from any dataset.

The ideology labels attached to countries are gameplay presets, not an assessment of any real
government.

## Eras

Choosing 1970, 1985 or 2000 rescales world output and population and shifts policy settings by
fixed multipliers. World population lands close to the historical figure because that was the
easiest quantity to anchor; nothing else should be read as historical.

Since v8 the **country list follows the era**: the Soviet Union, Yugoslavia and Czechoslovakia
appear as single states in 1970 and 1985, Serbia and Montenegro in 2000, states that had not yet
become independent are absent, and countries and cities carry the names they held at the time.

This is still a scenario, not a historical atlas, and three limits matter:

- **Territory is approximated** by grouping present-day polygons. The internal borders of the
  period are not drawn, and where a modern border differs from the historical one, the modern one
  is shown.
- **Partitioned states are cut along a fitted line.** Since v9 the two Germanys, the two Vietnams
  and the two Yemens are separate countries with separate shapes. The cut lines are hand-fitted
  from well-known geography, not surveyed boundary data, and the underlying outlines are simplified
  — Germany is 58 points. Each piece is checked against its historical land area at build time
  (Germany within 4%, Vietnam within 3%, Yemen within 17%), which catches a badly placed line but
  does not make the border accurate at any particular point.
- **Figures for merged states are scenario assumptions.** The recognisable blocs carry hand-set
  population and output roughly matching the historical order of magnitude; everything else is the
  uniform era scaling applied to present-day values, which under-counts economies that grew more
  slowly than the world average.

Including a state, drawing a border or choosing a name is not a comment on its legitimacy, its
recognition, or any territorial dispute, historical or current.

## Cities

City and settlement **names are real places**, compiled from established geography and spot-checked
against GeoNames; see [`src/data/city-catalog-v5-notes.md`](../src/data/city-catalog-v5-notes.md)
for sourcing. Everything the game attaches to those names — population share, local output,
budgets, development levels, satisfaction and the crime-pressure index — is invented.

**The crime index in particular is not crime data.** It is a gameplay number driven by the model's
own unemployment, inequality and local-spending variables.

## Borders, sovereignty and recognition

The map is a scenario simplification. Including an entity, drawing a border, or attaching a flag
is **not** a statement about sovereignty, diplomatic recognition, territorial control or
habitability. Western Sahara, Somaliland, Kosovo, Cyprus, Palestine and Moldova/Transnistria are
specifically flagged in the catalogue notes.

## What this is not

Not a forecast. Not a policy tool. Not economic or political advice. Not a description of real
events. If you want to know what a real policy would do to a real country, this will not tell you —
it will tell you what this model does, which is a different and much smaller question.
