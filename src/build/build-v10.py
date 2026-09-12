"""Build Sovereign V10 from the V9 build.

Removes the waiting period between debt-relief operations. Creditors no longer need time to
digest one before the next is available; the operations still cost political capital.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'build'; BUILD.mkdir(exist_ok=True)
SRC = ROOT / 'src'

s = (BUILD / 'v9.html').read_text()

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:110])
    s = s.replace(a, b)

rep('<title>Sovereign V9 — Divided Countries</title>',
    '<title>Sovereign V10 — Divided Countries</title>')
rep('Political sandbox · V9</div>', 'Political sandbox · V10</div>')
rep("s.version!==9", "s.version!==10")

# The gate itself, and the notice that used to explain the wait.
rep("if(n.reliefCooldown>0){toast('Creditors need '+Math.ceil(n.reliefCooldown)+' more months.');return;}", "")
rep("""(cool>0?'<p class="note">Creditors are still digesting the last operation. '+Math.ceil(cool)+' months before another one.</p>':'<p class="keyboardhint">Voluntary operations, available at any debt level. Each costs political capital, not a crisis.</p>')""",
    """'<p class="keyboardhint">Voluntary operations, available at any debt level and repeatable. Each costs political capital, not a crisis.</p>'""")
rep("""+(!owned||cool>0?'disabled':'')+""", """+(!owned?'disabled':'')+""")

# Copy that promised a wait.
rep("blurb:'Cheapen, refinance or write down the debt stock. Operations cost political capital and creditors need time between them, but nothing here is irreversible.',",
    "blurb:'Cheapen, refinance or write down the debt stock. Operations cost political capital and can be repeated as often as you can afford them; nothing here is irreversible.',")
rep("Writes about 7% off the stock and lowers carrying costs. Creditors expect a long gap before the next request.'",
    "Writes about 7% off the stock and lowers carrying costs.'")

addon = (SRC / 'addons' / 'v10-addon.js').read_text()
rep('newGame();initPaths();render();installMobileMap();startScreen();',
    addon + '\nnewGame();initPaths();render();installMobileMap();startScreen();')

(BUILD / 'v10.html').write_text(s)
(BUILD / 'v10-engine.js').write_text(re.findall(r'<script>([\s\S]*?)</script>', s)[-1])
(ROOT / 'dist' / 'sovereign-v10.html').write_text(s)
print('Built V10:', len(s.encode()), 'bytes')
