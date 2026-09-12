"""Build Sovereign V5 from the V4 build.

Convention (see memory + build-v4.py): never hand-edit the shipped HTML. This script does
exact-string replacements against build/v4.html and asserts every anchor is found exactly once.
Re-run it from scratch to reproduce build/v5.html byte for byte.
"""
from pathlib import Path
import json, re

# Paths are relative to the repository root so the chain runs the same locally and in CI.
ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'build'; BUILD.mkdir(exist_ok=True)
SRC = ROOT / 'src'


s = (BUILD / 'v4.html').read_text()

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:110])
    s = s.replace(a, b)

# ---------------------------------------------------------------- 1. identity
rep('<title>Sovereign V4 — Cities, Parties & Diplomacy</title>',
    '<title>Sovereign V5 — Cities, Trade & Central Banking</title>')
rep('Political sandbox · V4</div>', 'Political sandbox · V5</div>')
rep('s.version!==4', 's.version!==5')

# ------------------------------------------------- 2. embedded data documents
catalog = json.loads((SRC / 'data' / 'city-catalog-v5.json').read_text())
added = json.loads((SRC / 'data' / 'missing-countries-v5.json').read_text())
def data_tag(tag_id, payload):
    # </script> can never appear inside JSON produced by json.dumps with ensure_ascii,
    # but escape defensively so the document can never be broken out of.
    text = json.dumps(payload, ensure_ascii=True, separators=(',', ':')).replace('</', '<\\/')
    return '<script type="application/json" id="' + tag_id + '">' + text + '</script>'
rep("<script>", data_tag('city-catalog', catalog) + '\n' + data_tag('added-countries', added) + '\n<script>')

# --------------------------------------------------- 3. panel + tab routing
rep("view==='cities'?citiesPanel(n):view==='parties'",
    "view==='cities'?citiesV5Panel(n):view==='trade'?tradePanel():view==='monetary'?monetaryPanel(n):view==='growth'?growthPanel(n):view==='parties'")
rep("[['overview','Overview'],['cities','Cities'],['parties','Parties'],['policies','Policies'],['economy','Economy'],['diplomacy','Diplomacy'],['military','Military'],['history','Dispatch']]",
    "[['overview','Overview'],['cities','Cities'],['parties','Parties'],['policies','Policies'],['economy','Economy'],['growth','Growth'],['monetary','Central bank'],['trade','Trade'],['diplomacy','Diplomacy'],['military','Military'],['history','Dispatch']]")

# ------------------------------------------------------- 4. the macro engine
# The v4 growth/inflation line is replaced wholesale by the production-function model.
rep(" n.growth+=(potential-n.growth)/8;n.gdp=Math.max(.2,n.gdp*Math.pow(1+n.growth/100,1/12));n.inflation+=(clamp(2.5+(n.growth-2)*.45-Math.max(0,realRate)*.28+Math.max(0,-budget.balance-4)*.13+(100-p.trade)*.012-shock*.65+warCost*.45,.1,80)-n.inflation)/12;",
    " macroV5(n,budget,potential,realRate,shock,warCost,sanctionCount,tradeCount);")
# Real rates now use the effective policy rate and expected, not realised, inflation.
rep("const realRate=p.rate-n.inflation,", "const realRate=effectiveRate(n)-expectedInflation(n),")
# v4's unemployment rule is superseded by Okun's law around the NAIRU (see unemploymentV5).
rep("n.unemployment+=(clamp(8-n.growth*.7+Math.max(0,p.labor-75)*.025-p.childcare*.18,2,28)-n.unemployment)/12;", "")
# Population is modelled per country from fertility, ageing and migration.
rep("n.pop*=1.00035;", "")

# ----------------------------------------------------------- 5. simulation speed
# 1x is now eight seconds a month (v4 ran 1.6s), and the pace is a saved option.
rep("Math.max(100,1600/speed)", "Math.max(100,(S?.options?.monthSeconds??8)*1000/speed)")

# V4's save validator hard-codes three generated districts; V5 cities come from the catalogue.
rep("const defaults=v4Cities(n);if(!Array.isArray(n.cities)||n.cities.length!==3)throw Error('Invalid cities.');for(let i=0;i<3;i++){const c=n.cities[i],d=defaults[i];if(c.id!==d.id||c.name!==d.name||c.share!==d.share||",
    "const defaults=cityDefaultsV5(n);if(!Array.isArray(n.cities)||n.cities.length!==defaults.length)throw Error('Invalid cities.');for(let i=0;i<defaults.length;i++){const c=n.cities[i],d=defaults[i];if(c.id!==d.id||c.name!==d.name||Math.abs(c.share-d.share)>1e-9||")

# V5's city queue holds three projects, so the save validator must accept three.
rep("!Array.isArray(c.queue)||c.queue.length>2)throw Error('Invalid city.')",
    "!Array.isArray(c.queue)||c.queue.length>3)throw Error('Invalid city.')")

# ------------------------------------------------------------------- 6. styles
css = '''
/* V5: wider tab strip, local management cards, trade rows and central-bank readouts. */
.tabs{overflow-x:auto;scrollbar-width:none}.tabs::-webkit-scrollbar{display:none}
.citycard{border:1px solid var(--line);background:#1e282c;border-radius:8px;padding:14px;margin:12px 0}
.crimechip{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;border:1px solid var(--line)}
.crime-low{background:#1d3226;color:#8ed6a5}.crime-mid{background:#33301c;color:#ddc879}.crime-high{background:#3a2222;color:#e79a9a}
.traderow{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;border-bottom:1px solid var(--line);padding:9px 0}
.traderow .muted{font-size:12px}
.flagpreview{width:54px;height:36px;border:1px solid var(--line);border-radius:4px;display:inline-block;vertical-align:middle;margin-right:10px}
select.full{width:100%;padding:9px;background:#1b2427;color:inherit;border:1px solid var(--line);border-radius:6px;margin-bottom:12px;font:inherit}
.policygroup{margin-top:18px}
@media(max-width:800px){.traderow{grid-template-columns:1fr}}
'''
rep('</style>', css + '\n</style>')

# ------------------------------------------------------------------ 7. addons
addon = (SRC / 'addons' / 'v5-addon.js').read_text() + '\n' + (SRC / 'addons' / 'v5-econ-addon.js').read_text()
icons = ("ICONS.trade='<path d=\"M3 7h13l-3-3M21 17H8l3 3\"/><path d=\"M3 7v4M21 17v-4\"/>';\n")
rep('newGame();initPaths();render();', icons + addon + '\nnewGame();initPaths();render();')

Path(BUILD / 'v5.html').write_text(s)
Path(BUILD / 'v5-engine.js').write_text(re.search(r'<script>([\s\S]*?)</script>\s*$', s).group(1)
                                      if re.search(r'<script>([\s\S]*?)</script>\s*$', s)
                                      else re.findall(r'<script>([\s\S]*?)</script>', s)[-1])
(ROOT / 'dist' / 'sovereign-v5.html').write_text(s)
print('Built V5:', len(s.encode()), 'bytes;', len(catalog), 'catalogue entities,', len(added), 'added countries')
print('Shipped to dist/sovereign-v5.html')
