# Sovereign — Political Sandbox

A free, single-file geopolitical strategy game that runs entirely in the browser.
**Play: <https://thenicedoctor.github.io/>**

204 playable countries, 1,198 named cities, 63 policy controls. Fiscal and monetary policy,
a modelled central bank, local city management, bilateral commodity trade, parties and elections,
diplomacy and defence — simulated month by month.

## How it is built

The game is one HTML file. It is never hand-edited: each version is a Python build script that does
exact-string replacements against the previous version and asserts every anchor, plus an addon JS
file that layers new behaviour by wrapping existing functions. This site is assembled the same way
by `build-site.py`.

Engine invariants are covered by Node test suites (`check-game`, `check-v3`, `check-v4`,
`check-v5`, `check-v6`) that run the game in a `vm` sandbox against a fake DOM.

## Modelling limits

The simulation uses recognisable textbook relationships — a Cobb-Douglas production function, a
Taylor-type policy rule, Okun's law, an expectations-augmented Phillips curve — but every
coefficient is chosen for playability. Nothing is estimated from data or calibrated to a real
country, and no figure the game displays is a statistic about a real place. Starting conditions are
rough scenario values. City names are real; the indices attached to them are invented.

Borders are a scenario simplification and are not a statement about sovereignty or recognition.

## Credits

Map outlines from [Natural Earth](https://www.naturalearthdata.com/) (public domain).
Place names spot-checked with [GeoNames](https://www.geonames.org/) (CC BY 4.0), curated and
simplified for gameplay.
