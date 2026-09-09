# Changelog

Versions are the save-format version (`S.version`). Each is produced by its own build script from
the previous version's output, and each bumps `newGame`, `validSave` and `migrateSave` together so
older saves keep loading.

## v7 — Eras, dispatches and mobile

- **Start eras.** Begin in 1970, 1985, 2000 or 2026. An era rescales world output and population,
  shifts prices and policy rates, and sets period-appropriate trade barriers, capital controls,
  central-bank independence and exchange-rate regimes — Bretton Woods pegs in 1970, managed floats
  in 1985. The productivity frontier the convergence model chases moves with the era.
- **Generated dispatches.** Reports are written from the state that triggered them, naming your
  cities, your governing party and the actual figures, with per-story cooldowns. Shock reports are
  limited to your own country and the fourteen largest economies. The archive keeps 240 entries.
- **Skippable construction.** City projects can complete the month they are approved, and a button
  finishes everything already queued.
- **More world rules.** Pause elections, disable war, remove the policy-implementation lag, damp
  economic volatility.
- **Phone layout.** The map no longer swallows one-finger scrolling — the page scrolls and the map
  gets a dedicated full-screen mode. Statistics moved from four 78px columns to a legible 2×2 grid,
  dispatch cards stack, map labels thin out on narrow canvases, and the toast no longer covers the
  map controls.
- More detail in the Overview panel; a redesigned dispatch archive.

**Fixes.** A universally pegged era exposed a circular world interest rate: every bank followed an
average it was itself setting, so rates never fell and investment collapsed. The anchor now comes
from floating economies. The save validator still capped the event log at 100.

## v6 — Difficulty modes and debt-free play

- A start screen offering Easy, Medium and Hard. A mode is a bundle of the existing sandbox rules,
  all of which stay visible and editable; editing one marks the mode customised. Switching modes
  never restarts the world.
- **National debt can be removed entirely**, and is on Easy, the default. Deficits are not financed
  by borrowing, no interest is charged, and crises and restructuring cannot occur.
- Modes scale shock frequency and severity, political-capital regeneration, reform cost and how
  assertive rival nations are.

**Fixes.** The V4 save validator hard-coded three generated districts and a two-slot build queue,
which would have rejected every legitimate V5 and V6 save.

## v5 — Cities, trade and central banking

- Every country gained named cities: 1,198 locations across all 204 entities, with local budgets,
  a crime-pressure index and a three-slot construction queue.
- 29 countries added, completing every UN member state and both observer states.
- Bilateral five-year commodity contracts with capacity limits, tariffs as customs revenue, and
  suspension under war or sanctions.
- Separate army, navy and air budgets that must total 100%, plus doctrines.
- **A real macroeconomic model** replaced the ad-hoc growth line: a production function with
  capital accumulation and conditional convergence, an output gap, a central bank with a Taylor-type
  rule and a credibility score, Okun's law around a NAIRU, and per-country demographics.
- GDP or an approximate Net Material Product as the displayed measure; national and custom flags.
- 1× slowed from 1.6s to 8s per month.

**Fixes.** `n.capital` is *political* capital; the new capital stock needed its own field and had
been silently destroying both. Smoothing a desired output gap and then overwriting it with the
realised one left a permanent deflationary shortfall.

## v4 — Cities, parties and diplomacy

- Three city districts per nation with development projects.
- Eight parties, coalitions, elections and campaigns.
- Typed diplomatic agreements, directional sanctions, war and peace.
- A forgiving debt system with a sustained-stress review instead of a monthly forced default.

## v3 — Programs, urbanisation and debt relief

- Staged policy programmes, mass urbanisation, informal-settlement upgrading, debt restructuring.

## v2 — Housing and taxation

- Public housing pipelines, rent burden, and progressive, flat or custom tax modes.

## v1

- Initial release: 175 nations, policy sliders, a monthly simulation and a world map.
