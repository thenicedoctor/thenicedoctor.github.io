# The economic model

All of it lives in [`src/addons/v5-econ-addon.js`](../src/addons/v5-econ-addon.js), roughly 700
lines. Read [modelling-limits.md](modelling-limits.md) first: these are textbook shapes tuned for
playability, not estimated equations.

Notation: output `Y`, capital `K`, employed labour `L`, productivity `A`, all in constant 2026
dollars. One tick is one month; annual rates are divided by twelve.

## Supply

**Production.** Capital share α = 0.33.

```
Y* = A · K^α · L^(1−α)          L = pop × participation × (1 − NAIRU/100)
```

`Y*` is potential output. Actual output is separate — see Demand.

**Capital.**

```
K += (investShare · Y − δK) / 12         δ ≈ 4.5%/yr, adjusted by infrastructure
investShare → (privateInvest + publicInvest) / 100     approached at 1/9 per month
privateInvest = 17.5 − 0.7·realLendingRate + business + competition + smeCredit
                + credibility − capitalControls − macroprudential − war − debtBurden
```

`K/Y` is held inside [1.2, 6]. That band is a guardrail, not a result; if it binds the model is
being pushed somewhere it was not tuned for.

**Productivity.** Conditional convergence — the catch-up term is scaled by a quality index, so
weak states converge slowly or not at all:

```
quality = (capacity·0.42 + institutions·0.25 + human·0.15 + trade·0.18) / 100
gap     = clamp(ln(frontier / outputPerPerson), 0, 3.2)
Ȧ/A     = 0.75 + gap·0.8·quality
          + research + vocational + digitalGov + competition + openness + antiCorruption
          − sanctions − war − crime − excessive taxation
```

`frontier` is 105 (thousand dollars per person) in 2026 and scales with the era, so catching up in
1970 means catching up to 1970.

**Growth accounting** is reported and holds exactly, with labour as the residual:

```
potentialGrowth = α·capitalGrowth + labourContribution + tfpGrowth
```

## Demand

```
target = monetaryGap + fiscalImpulse + competitiveness + trade + programmes
         − shocks − war − sanctions − high-inflation drag
monetaryGap = −(i − πᵉ − r*) × 0.55        (0.75 under a peg)

gapTarget → target                         at 1/7 per month
Y = Y · (1 + potentialGrowth/1200) · (1 + (gapTarget − outputGap)/500)
outputGap = (Y / Y* − 1) × 100
```

Demand moves output around the supply path. It cannot raise `Y*`.

> An earlier version smoothed the *desired* gap and then overwrote it with the *realised* gap each
> month. That left a permanent shortfall equal to potential growth times the adjustment lag, and
> put the whole world into deflation. The two are now tracked separately.

## Money

```
r*     = 0.3 + 0.5·potentialGrowth − balanceSheet − capitalControls
taylor = r* + π + 0.5(π − π*) + 0.5·outputGap
i      → independence·taylor + (1 − independence)·instructedRate
```

Under a managed float the result is pulled 35% toward the world rate; under a peg, 80%.

**The world rate is set by floating economies only.** Deriving it from every nation made a
universally pegged era (1970) self-referential — each bank followed an average it was itself
setting, rates never fell, and investment collapsed.

**Expectations and credibility.**

```
anchor = credibility·π* + (1 − credibility)·π
πᵉ    → anchor                              at 1/9 per month
credibility += (|π − π*| < 1.2 ? +0.22 : −0.05·|π − π*|) + independence + capacity
```

A credible bank disinflates cheaply because expectations do the work. An incredible one pays in
output.

**Inflation** — expectations-augmented Phillips curve:

```
π → πᵉ + 0.42·outputGap + passThrough − shock + war + deficit + balanceSheet
passThrough = tariffs + real-exchange-rate misalignment, damped by capital controls
```

**Lending spread**, which is what investment actually responds to:

```
spread = 1.1 + reserveRequirement + macroprudential − QE
         + excessDebt + credibilityPenalty − capacity
```

Reserve requirements, buffers and asset purchases move this spread. They are not budget items.

## Labour and demographics

```
NAIRU → base + labourRules + minimumWage − activeLabor − vocational − business
               + inequality + crime
u     → NAIRU − 0.45·outputGap − publicEmployment − smeCredit      (Okun)
participation → f(human capital, services, childcare, family benefit, pension age,
                  training, liberties)
fertility → f(output per person, human capital, family benefit, childcare)
popGrowth = (fertility − 2.08)·0.006 + migration,  clamped to [−0.8%, +3.2%]/yr
```

The pension age moves participation by about 0.6pp per year of age — the single strongest
demographic lever a player has.

## Fiscal

The budget is expressed in percent of GDP. Debt accumulates in constant dollars and is deflated by
inflation, so inflation erodes the real stock:

```
debt = (debt·(1 + interest/1200) + deficit·Y/1200) / (1 + π/1200)
```

With **national debt switched off** (the default on Easy) none of this runs: no stock accumulates,
interest and debt service are zero, and restructuring cannot occur.

## Where to look in the code

| Function | Does |
|---|---|
| `tickSupply` | demographics, participation, NAIRU, investment, capital, TFP, potential output |
| `tickMonetary` | neutral rate, Taylor rule, effective rate, balance sheet, expectations, credibility, real exchange rate |
| `macroV5` | ties them together, sets the output gap, GDP, inflation, price level, current account |
| `unemploymentV5` | Okun's law around the NAIRU |
| `fiscal` | revenue, spending, interest, balance |
