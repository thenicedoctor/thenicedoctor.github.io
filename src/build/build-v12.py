"""Build Sovereign V12 from the V11 build.

Collapsible sections survive the monthly re-render, debt can be frozen, city queues can be
unlimited, ideology presets are fitted to the budget, the map follows history as time passes,
rival nations fight their own wars, and offensives can be aimed at a named city.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'build'; BUILD.mkdir(exist_ok=True)
SRC = ROOT / 'src'

s = (BUILD / 'v11.html').read_text()

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:110])
    s = s.replace(a, b)

rep('<title>Sovereign V11 — War on the Border</title>',
    '<title>Sovereign V12 — A World That Moves</title>')
rep('Political sandbox · V11</div>', 'Political sandbox · V12</div>')
rep("s.version!==11", "s.version!==12")

# History and rival wars run with the rest of the month.
rep("tickDiplomacy();tickNewsV7();perf=performance.now()-started;renderTick();}",
    "tickDiplomacy();rivalryDriftV12();aiWarV12();tickHistoryV12();tickNewsV7();perf=performance.now()-started;renderTick();}")

# The queue cap becomes a setting rather than a constant.
rep("<h3>Construction queue · '+c.queue.length+'/3</h3>",
    "<h3>Construction queue · '+c.queue.length+(S.options.unlimitedQueue?'':'/3')+'</h3>")

# With an unlimited queue a save legitimately holds more than three projects in a city.
rep("||!Array.isArray(c.queue)||c.queue.length>3)throw Error('Invalid city.')",
    "||!Array.isArray(c.queue)||c.queue.length>(s.options.unlimitedQueue?40:3))throw Error('Invalid city.')")

css = '''
/* V12: war objectives. */
.objectivebtn.active{border-color:#e07a5f;background:#2a2320}
.objectivebtn small{color:var(--muted)}
.note.negative{color:var(--red)}
'''
rep('</style>', css + '\n</style>')

addon = (SRC / 'addons' / 'v12-addon.js').read_text()
rep('newGame();initPaths();render();installMobileMap();startScreen();',
    addon + '\nnewGame();initPaths();render();installMobileMap();startScreen();')

(BUILD / 'v12.html').write_text(s)
(BUILD / 'v12-engine.js').write_text(re.findall(r'<script>([\s\S]*?)</script>', s)[-1])
(ROOT / 'dist' / 'sovereign-v12.html').write_text(s)
print('Built V12:', len(s.encode()), 'bytes')
