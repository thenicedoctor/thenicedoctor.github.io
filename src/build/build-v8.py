"""Build Sovereign V8 from the V7 build.

Makes the map follow the era: merged historical states (USSR, Yugoslavia, Czechoslovakia,
Serbia and Montenegro), countries that were not yet independent removed, and period names.

Same convention: exact-string replacements against build/v7.html, every anchor asserted.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'build'; BUILD.mkdir(exist_ok=True)
SRC = ROOT / 'src'

s = (BUILD / 'v7.html').read_text()

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:110])
    s = s.replace(a, b)

# ---------------------------------------------------------------- 1. identity
rep('<title>Sovereign V7 — Eras, Dispatches & Mobile</title>',
    '<title>Sovereign V8 — Historical States &amp; Eras</title>')
rep('Political sandbox · V7</div>', 'Political sandbox · V8</div>')
rep("s.version!==7", "s.version!==8")

# ------------------------------------ 2. polygons are painted by who holds them, not by id
# A merged state owns its members' polygons; an absent country's polygon belongs to nobody.
rep("for(const item of paths){const n=nation(item.id);ctx.fillStyle=nationColor(n);ctx.fill(item.path,'evenodd');ctx.strokeStyle='#18262b';ctx.lineWidth=.7/t.scale;ctx.stroke(item.path);}",
    "for(const item of paths){const n=nation(territoryOwner(item.id));ctx.fillStyle=n?nationColor(n):'#1a262b';ctx.fill(item.path,'evenodd');ctx.strokeStyle='#18262b';ctx.lineWidth=.7/t.scale;ctx.stroke(item.path);}")
# Selection outlines must trace every polygon a state holds, not just one.
rep("for(const id of [S.player,selected,hoverId]){const p=paths.find(x=>x.id===id);if(p){ctx.strokeStyle=id===S.player?'#e6c987':id===hoverId?'#ced9d2':'#a9c4c6';ctx.lineWidth=(id===S.player?1.7:1.2)/t.scale;ctx.stroke(p.path)}}",
    "for(const id of [S.player,selected,hoverId]){if(!id)continue;ctx.strokeStyle=id===S.player?'#e6c987':id===hoverId?'#ced9d2':'#a9c4c6';ctx.lineWidth=(id===S.player?1.7:1.2)/t.scale;for(const p of paths)if(territoryOwner(p.id)===id)ctx.stroke(p.path);}")
# Clicking a member's territory selects the state that holds it.
rep("for(let i=paths.length-1;i>=0;i--){if(nation(paths[i].id)&&ctx.isPointInPath(paths[i].path,mx,my,'evenodd')){ctx.restore();return paths[i].id}}",
    "for(let i=paths.length-1;i>=0;i--){const owner=territoryOwner(paths[i].id);if(nation(owner)&&ctx.isPointInPath(paths[i].path,mx,my,'evenodd')){ctx.restore();return owner}}")

# ------------------------------------------- 3. the nation list is no longer a fixed length
# An era removes states that did not yet exist, so a save legitimately holds fewer than the
# current world. Identity is still checked: every id must be one the game knows.
rep("||!Array.isArray(s.nations)||s.nations.length!==S.nations.length)throw Error('This is not a compatible Sovereign save.');const existing=new Set(S.nations.map(n=>n.id)),seen=new Set();",
    "||!Array.isArray(s.nations)||!s.nations.length||s.nations.length>320)throw Error('This is not a compatible Sovereign save.');const existing=new Set([...S.nations.map(n=>n.id),...Object.keys(CITY_CATALOG)]),seen=new Set();")

# Names, flags and positions are still pinned, but to what the era tables can produce.
rep("const canonical=S.nations.find(c=>c.id===n.id);if(n.name!==canonical.name||n.flag!==canonical.flag||n.lon!==canonical.lon||n.lat!==canonical.lat)throw Error('Nation metadata does not match this scenario.');",
    "if(!validNationMetaV8(n))throw Error('Nation metadata does not match this scenario.');")

# City names are era-dependent; compare what they reduce to, not the literal string.
rep("if(c.id!==d.id||c.name!==d.name||Math.abs(c.share-d.share)>1e-9||",
    "if(c.id!==d.id||!cityNameOkV8(c.name,d.name)||Math.abs(c.share-d.share)>1e-9||")

# ------------------------------------------------------------------- 4. styles
css = '''
/* V8: historical-state note. */
.histnote{border-left:2px solid var(--accent)}
.histnote h3{color:var(--accent)}
'''
rep('</style>', css + '\n</style>')

# ------------------------------------------------------------------ 5. the addon
addon = (SRC / 'addons' / 'v8-addon.js').read_text()
rep('newGame();initPaths();render();installMobileMap();startScreen();',
    addon + '\nnewGame();initPaths();render();installMobileMap();startScreen();')

(BUILD / 'v8.html').write_text(s)
(BUILD / 'v8-engine.js').write_text(re.findall(r'<script>([\s\S]*?)</script>', s)[-1])
(ROOT / 'dist' / 'sovereign-v8.html').write_text(s)
print('Built V8:', len(s.encode()), 'bytes')
