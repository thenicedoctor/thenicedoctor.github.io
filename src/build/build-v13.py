"""Build Sovereign V13 from the V12 build.

Fixes the crash that left every war half-built, and makes captured cities contestable.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'build'; BUILD.mkdir(exist_ok=True)
SRC = ROOT / 'src'

s = (BUILD / 'v12.html').read_text()

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:110])
    s = s.replace(a, b)

rep('<title>Sovereign V12 — A World That Moves</title>',
    '<title>Sovereign V13 — Cities Change Hands</title>')
rep('Political sandbox · V12</div>', 'Political sandbox · V13</div>')
rep("s.version!==12", "s.version!==13")

# The root cause: the base function built a bare record and then rendered it. It now builds a
# complete one, so nothing downstream can be handed a half-built war.
# Both sites: the player's declaration and the AI's.
rep("a.war={target:b.id,months:0,progress:0};b.war={target:a.id,months:0,progress:0};",
    "beginWarV13(a,b);", 2)

# Copy that promised borders never move is no longer true.
rep("Wars with a neighbour are fought on the land border the two countries actually share, and the front moves with the fighting. Settlements create reparations; borders never move and no country is annexed.",
    "Wars with a neighbour are fought on the land border the two countries actually share, and the front moves with the fighting. Beat an army decisively and you may impose terms or annex the country outright.")

css = '''
/* V13: how a city stands on the front. */
.objectivebtn.front-held{border-color:var(--green)}
.objectivebtn.front-contested{border-color:#e07a5f;background:#2a2320}
'''
rep('</style>', css + '\n</style>')

addon = (SRC / 'addons' / 'v13-addon.js').read_text()
rep('newGame();initPaths();render();installMobileMap();startScreen();',
    addon + '\nnewGame();initPaths();render();installMobileMap();startScreen();')

(BUILD / 'v13.html').write_text(s)
(BUILD / 'v13-engine.js').write_text(re.findall(r'<script>([\s\S]*?)</script>', s)[-1])
(ROOT / 'dist' / 'sovereign-v13.html').write_text(s)
print('Built V13:', len(s.encode()), 'bytes')
