"""Build Sovereign V14 from the V13 build.

Adds federal agencies for the larger economies, and a country chooser on the start screen.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'build'; BUILD.mkdir(exist_ok=True)
SRC = ROOT / 'src'

s = (BUILD / 'v13.html').read_text()

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:110])
    s = s.replace(a, b)

rep('<title>Sovereign V13 — Cities Change Hands</title>',
    '<title>Sovereign V14 — Agencies &amp; Choose Your Country</title>')
rep('Political sandbox · V13</div>', 'Political sandbox · V14</div>')
rep("s.version!==13", "s.version!==14")

# The Agencies view sits with the other national views.
rep("[['overview','Overview'],['cities','Cities'],['parties','Parties'],['policies','Policies'],['economy','Economy'],['growth','Growth'],['monetary','Central bank'],['trade','Trade'],['diplomacy','Diplomacy'],['military','Military'],['history','Dispatch']]",
    "[['overview','Overview'],['cities','Cities'],['parties','Parties'],['policies','Policies'],['agencies','Agencies'],['economy','Economy'],['growth','Growth'],['monetary','Central bank'],['trade','Trade'],['diplomacy','Diplomacy'],['military','Military'],['history','Dispatch']]")

css = '''
/* V14: agencies, and the country screen that now opens the game. */
.countrylist{max-height:46vh;overflow-y:auto;border:1px solid var(--line);border-radius:var(--radius);
 margin:14px 0;background:var(--panel)}
.countryrow{display:grid;grid-template-columns:30px 1fr auto auto 96px;gap:10px;align-items:center;
 width:100%;padding:11px 14px;background:none;border:0;border-bottom:1px solid var(--line);
 color:inherit;font:inherit;text-align:left;cursor:pointer;min-height:46px}
.countryrow:last-child{border-bottom:0}
.countryrow:hover,.countryrow:focus-visible{background:var(--raised)}
.countryrow .cflag{font-size:18px}
.countryrow .cname{font-weight:550}
.countryrow .cstat{font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}
.countryrow .cbadge{font-size:11.5px;color:var(--accent);text-align:right}
#countrySearch{padding:11px 13px;background:#1b2427;color:inherit;border:1px solid var(--line);
 border-radius:var(--radius);font:inherit;font-size:15px}
.chosen .sectionhead{display:flex;align-items:center;justify-content:space-between;gap:12px}
.chosen strong{font-size:17px}
@media(max-width:800px){
 .countryrow{grid-template-columns:26px 1fr auto;row-gap:2px}
 .countryrow .cbadge{display:none}
 .countrylist{max-height:52vh}
}
/* The speed controls overflowed a 375px viewport by a few pixels. */
@media(max-width:430px){
 .timecontrol{gap:4px}
 .timecontrol button{padding-left:9px;padding-right:9px}
}
'''
rep('</style>', css + '\n</style>')

addon = (SRC / 'addons' / 'v14-addon.js').read_text()
icon = "ICONS.agencies='<path d=\"M4 21h16M6 21V9l6-4 6 4v12M10 21v-5h4v5M9 12h.01M15 12h.01\"/>';\n"
rep('newGame();initPaths();render();installMobileMap();startScreen();',
    icon + addon + '\nnewGame();initPaths();render();installMobileMap();startScreen();')

(BUILD / 'v14.html').write_text(s)
(BUILD / 'v14-engine.js').write_text(re.findall(r'<script>([\s\S]*?)</script>', s)[-1])
(ROOT / 'dist' / 'sovereign-v14.html').write_text(s)
print('Built V14:', len(s.encode()), 'bytes')
