"""Build Sovereign V11 from the V10 build.

Wars are fought on the real land border between the two countries, computed by
src/build/build-borders.py from the map polygons.
"""
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'build'; BUILD.mkdir(exist_ok=True)
SRC = ROOT / 'src'

s = (BUILD / 'v10.html').read_text()

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:110])
    s = s.replace(a, b)

rep('<title>Sovereign V10 — Divided Countries</title>',
    '<title>Sovereign V11 — War on the Border</title>')
rep('Political sandbox · V10</div>', 'Political sandbox · V11</div>')
rep("s.version!==10", "s.version!==11")

borders = json.loads((SRC / 'data' / 'borders.json').read_text())
payload = json.dumps(borders, ensure_ascii=True, separators=(',', ':')).replace('</', '<\\/')
rep('<script id="world-data" type="application/json">',
    '<script type="application/json" id="borders">' + payload + '</script>\n'
    '<script id="world-data" type="application/json">')

# The front is drawn over the map, under the selection outlines.
rep("for(const id of [S.player,selected,hoverId]){if(!id)continue;",
    "drawFrontsV11(ctx,t);\n for(const id of [S.player,selected,hoverId]){if(!id)continue;")

# The old copy described an abstract model.
rep("Conflict is an abstract strategic model, with conventional forces only. Settlements create reparations rather than instant annexation.",
    "Wars with a neighbour are fought on the land border the two countries actually share, and the front moves with the fighting. Settlements create reparations; borders never move and no country is annexed.")

css = '''
/* V11: the front. */
.warroom{border-left:2px solid #e07a5f}
.warroom h3{color:#e07a5f}
.frontbar{position:relative;height:12px;border-radius:6px;background:var(--raised);
 border:1px solid var(--line);margin:14px 0 6px;overflow:hidden}
.frontfill{position:absolute;top:0;bottom:0;background:rgba(224,122,95,.35)}
.frontmark{position:absolute;top:-3px;bottom:-3px;width:3px;background:#e07a5f;
 border-radius:2px;transform:translateX(-1.5px)}
'''
rep('</style>', css + '\n</style>')

addon = (SRC / 'addons' / 'v11-addon.js').read_text()
rep('newGame();initPaths();render();installMobileMap();startScreen();',
    addon + '\nnewGame();initPaths();render();installMobileMap();startScreen();')

(BUILD / 'v11.html').write_text(s)
(BUILD / 'v11-engine.js').write_text(re.findall(r'<script>([\s\S]*?)</script>', s)[-1])
(ROOT / 'dist' / 'sovereign-v11.html').write_text(s)
print('Built V11:', len(s.encode()), 'bytes;', len(borders), 'land borders')
