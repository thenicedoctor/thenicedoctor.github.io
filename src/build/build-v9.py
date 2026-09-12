"""Build Sovereign V9 from the V8 build.

Splits the countries that were partitioned during the Cold War — Germany, Vietnam and Yemen — into
the two states of the period, using polygon halves cut by src/build/split-polygons.py.
"""
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'build'; BUILD.mkdir(exist_ok=True)
SRC = ROOT / 'src'

s = (BUILD / 'v8.html').read_text()

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:110])
    s = s.replace(a, b)

rep('<title>Sovereign V8 — Historical States &amp; Eras</title>',
    '<title>Sovereign V9 — Divided Countries</title>')
rep('Political sandbox · V8</div>', 'Political sandbox · V9</div>')
rep("s.version!==8", "s.version!==9")

# The split geometry travels with the page.
splits = json.loads((SRC / 'data' / 'split-polygons.json').read_text())
payload = json.dumps(splits, ensure_ascii=True, separators=(',', ':')).replace('</', '<\\/')
rep('<script id="world-data" type="application/json">',
    '<script type="application/json" id="split-polygons">' + payload + '</script>\n'
    '<script id="world-data" type="application/json">')

# The stand-in labels are no longer needed now the map can actually show the division.
rep("DEU:'Germany · FRG and GDR',\n   VNM:'Vietnam · North and South',YEM:'Yemen · North and South',KHM:'Cambodia',THA:'Thailand'}}",
    "KHM:'Cambodia',THA:'Thailand'}}")
rep("DEU:'Germany · FRG and GDR',YEM:'Yemen · North and South'}}",
    "MMR:'Burma'}}")

addon = (SRC / 'addons' / 'v9-addon.js').read_text()
rep('newGame();initPaths();render();installMobileMap();startScreen();',
    addon + '\nnewGame();initPaths();render();installMobileMap();startScreen();')

(BUILD / 'v9.html').write_text(s)
(BUILD / 'v9-engine.js').write_text(re.findall(r'<script>([\s\S]*?)</script>', s)[-1])
(ROOT / 'dist' / 'sovereign-v9.html').write_text(s)
print('Built V9:', len(s.encode()), 'bytes')
