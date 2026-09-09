# Architecture

## The constraint that shapes everything

Sovereign ships as **one HTML file with no runtime dependencies**. A player can save it to disk,
open it on a plane and it works: no server, no CDN, no network calls, no account. Saves go to that
browser's local storage, or to a file they export.

Every structural decision follows from that constraint.

## Why patch scripts instead of a bundler

The deliverable is a single ~490 KB file. A normal build pipeline would let source live in modules
and emit that file, but it would also mean the shipped artifact is generated output nobody reads,
and a review diff would be a diff of concatenated bundles.

Instead each version is a Python script that performs **exact-string replacements** against the
previous version's output:

```python
def rep(a, b, count=1):
    assert s.count(a) == count, (s.count(a), a[:110])
    s = s.replace(a, b)
```

Every anchor is asserted to appear exactly once. If an earlier version changes a line a later
script depends on, the build fails loudly at that line instead of silently producing a broken game.
A build either reproduces byte for byte or stops.

The trade-off is real: the scripts are coupled to the exact text of the previous version. That is
acceptable because the alternative — hand-editing a 490 KB file — is worse, and because CI rebuilds
the whole chain and compares against the committed artifact on every push.

## Layering by function wrapping

New behaviour lives in `src/addons/vN-addon.js`, concatenated into the file by the build script
just before `newGame()`. Addons extend the engine by capturing and wrapping the previous
implementation:

```js
const v5FiscalV6 = fiscal;
fiscal = function (n, p = n.policies) {
  const b = v5FiscalV6(n, p);
  if (!debtDisabled()) return b;
  b.interest = 0; b.debtService = 0;
  b.balance = b.revenue - b.spending;
  return b;
};
```

This keeps each version's changes readable as a unit and means an addon never has to understand
the whole engine — only the contract of the function it wraps.

Where wrapping is not enough — replacing a line in the middle of `simulateMonth`, for instance —
the build script patches that line to call a function the addon defines. The V7 macro engine is
installed this way:

```python
rep(" n.growth+=(potential-n.growth)/8;n.gdp=Math.max(...);n.inflation+=(...);",
    " macroV5(n,budget,potential,realRate,shock,warCost,sanctionCount,tradeCount);")
```

## Save format

`S.version` is the save-format version, currently 7. Every version bumps three things together:

- `newGame()` — sets the new fields on a fresh world
- `migrateSave()` — forward-migrates an older save, chaining through each version in turn
- `validSave()` — rejects a save whose new fields are missing, malformed or contradictory

A save from any earlier version loads. `validSave` is not a formality: it is the trust boundary
for imported files, so it checks structure, ranges, referential integrity (every nation id exists,
conflicts are reciprocal, seats total 100) and internal consistency (a world claiming to have debt
switched off may not carry debt).

## Rendering

The map is a `<canvas>` drawn from Natural Earth polygons compiled into `Path2D` objects once at
startup, redrawn on demand via `requestAnimationFrame`. Everything else is string-built HTML
assigned to panel containers, with event delegation bound after each render in `bindPanel()`.

There is no virtual DOM and no framework. The panels are small enough that rebuilding their HTML
is cheaper than diffing it, and the whole approach keeps the dependency count at zero.

## Simulation loop

`simulateMonth()` advances one month for all 204 nations:

1. `prepareV4Month()` — trade deliveries, pact effects, world aggregates
2. per nation — policy targets converge, budgets settle, the macro model runs, cities tick,
   politics tick, the military updates
3. `resolveWars()`, shocks, `tickDiplomacy()`, `tickNewsV7()`
4. `renderTick()`

A full month across 204 nations takes roughly 15 ms in the test harness.

## Testing

`tests/check-*.cjs` run the game inside a Node `vm` with a hand-written fake DOM — about thirty
lines of stubs providing `getElementById`, a canvas context proxy and `localStorage`. This runs the
real shipped file, not a test build.

The suites assert invariants rather than snapshots: the production-function identity holds, growth
accounting sums to potential growth, political capital is never confused with the capital stock,
trade flows are matched, every earlier save version migrates, and fifty simulated years in every
difficulty mode and era leave a world that still validates.
