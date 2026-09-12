"""Build Sovereign V6 from the V5 build.

Adds difficulty modes (Easy / Medium / Hard) and an option to remove national debt entirely,
which Easy — the default mode — switches on. Same convention as the earlier scripts: exact-string
replacements against build/v5.html, every anchor asserted, no hand-editing of the shipped HTML.
"""
from pathlib import Path
import re

# Paths are relative to the repository root so the chain runs the same locally and in CI.
ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'build'; BUILD.mkdir(exist_ok=True)
SRC = ROOT / 'src'

s = (BUILD / 'v5.html').read_text()

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:110])
    s = s.replace(a, b)

# ---------------------------------------------------------------- 1. identity
rep('<title>Sovereign V5 — Cities, Trade & Central Banking</title>',
    '<title>Sovereign V6 — Difficulty Modes & Debt-Free Play</title>')
rep('Political sandbox · V5</div>', 'Political sandbox · V6</div>')
rep("s.version!==5", "s.version!==6")

# ------------------------------------------------- 2. the debt stock is optional
# accrueDebtV6 replaces the accumulation line; with debt off no stock is ever built.
rep(" n.debt=Math.max(0,(n.debt*(1+budget.interest/1200)+(budget.spending-budget.revenue)*oldGDP/1200)/(1+n.inflation/1200));",
    " accrueDebtV6(n,budget,oldGDP);")

# ---------------------------------------------- 3. difficulty levers on the rules
# Political capital regeneration.
rep("n.capital=clamp(n.capital+1.5+n.approval*.018,0,100);",
    "n.capital=clamp(n.capital+(1.5+n.approval*.018)*capitalRateV6(),0,100);")
# Shock cadence and severity.
rep("resolveWars();if(S.options.shocks&&S.month%5===0){",
    "resolveWars();if(shockDueV6()){")
rep("const e=options[Math.floor(random()*options.length)];n.shock=e[2];n.shockMonths=9;",
    "const e=options[Math.floor(random()*options.length)];n.shock=e[2]*shockScaleV6();n.shockMonths=9;")

# ------------------------------------------------------- 4. save-rule validation
rep("['ai','shocks','freeReforms','infiniteCapital'].some(k=>typeof s.options[k]!=='boolean')",
    "['ai','shocks','freeReforms','infiniteCapital','noDebt'].some(k=>typeof s.options[k]!=='boolean')")

# ------------------------------------------------------------------- 5. styles
css = '''
/* V6: the start screen's difficulty cards and the Sandbox mode switch. */
.modegrid{display:grid;gap:14px;margin:18px 0}
@media(min-width:820px){.modegrid{grid-template-columns:repeat(3,minmax(0,1fr))}}
.modecard{border:1px solid var(--line);background:#1e282c;border-radius:9px;padding:16px;display:flex;flex-direction:column}
.modecard p{font-size:13px;flex:1}
.modecard strong{font-size:15px;font-weight:550}
.modecard .sectionhead{gap:8px;margin-bottom:6px;align-items:baseline}
.modelist{list-style:none;padding:0;margin:12px 0 16px;font-size:12.5px}
.modelist li{padding:5px 0;border-bottom:1px solid var(--line)}
.modelist li:last-child{border-bottom:0}
.modelist b{font-weight:550}
.modeswitch{display:flex;gap:8px;margin-bottom:14px}
.modeswitch button{flex:1}
'''
rep('</style>', css + '\n</style>')

# ------------------------------------------------------------------ 6. the addon
addon = (SRC / 'addons' / 'v6-addon.js').read_text()
# The start screen opens over a fully built world, so the map is already drawn behind it.
rep('newGame();initPaths();render();',
    addon + '\nnewGame();initPaths();render();startScreen();')

(BUILD / 'v6.html').write_text(s)
(BUILD / 'v6-engine.js').write_text(re.findall(r'<script>([\s\S]*?)</script>', s)[-1])
(ROOT / 'dist' / 'sovereign-v6.html').write_text(s)
print('Built V6:', len(s.encode()), 'bytes')
print('Shipped to dist/sovereign-v6.html')
