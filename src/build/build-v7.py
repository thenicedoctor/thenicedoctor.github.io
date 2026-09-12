"""Build Sovereign V7 from the V6 build.

Adds historical start eras, a generated dispatch feed, more sandbox rules including skippable
construction, extra detail in the panels, and a phone layout that does not trap the reader on the
map. Same convention throughout: exact-string replacements against build/v6.html, every anchor
asserted, nothing hand-edited in the shipped file.
"""
from pathlib import Path
import re

# Paths are relative to the repository root so the chain runs the same locally and in CI.
ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'build'; BUILD.mkdir(exist_ok=True)
SRC = ROOT / 'src'

s = (BUILD / 'v6.html').read_text()

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:110])
    s = s.replace(a, b)

# ---------------------------------------------------------------- 1. identity
rep('<title>Sovereign V6 — Difficulty Modes & Debt-Free Play</title>',
    '<title>Sovereign V7 — Eras, Dispatches & Mobile</title>')
rep('Political sandbox · V6</div>', 'Political sandbox · V7</div>')
rep('s.version!==6', 's.version!==7')

# --------------------------------------------------- 2. the calendar is not fixed to 2026
rep("dateText=()=>new Date(Date.UTC(2026,8+S.month,1)).toLocaleDateString('en',{month:'long',year:'numeric',timeZone:'UTC'})",
    "dateText=()=>gameDate(S.month).toLocaleDateString('en',{month:'long',year:'numeric',timeZone:'UTC'})")
rep("'</p><time>'+new Date(Date.UTC(2026,8+e.month,1)).toLocaleDateString('en',{month:'short',year:'numeric',timeZone:'UTC'})+'</time>",
    "'</p><time>'+gameDate(e.month).toLocaleDateString('en',{month:'short',year:'numeric',timeZone:'UTC'})+'</time>")

# ------------------------------------- 3. the productivity frontier moves with the era
rep("const gap=clamp(Math.log(WORLD_FRONTIER/Math.max(.4,perCapita)),0,3.2);",
    "const gap=clamp(Math.log(worldFrontier()/Math.max(.4,perCapita)),0,3.2);")

# ------------------------------------------------------- 4. the dispatch archive
rep("""view==='history'?'<h3>World dispatch archive</h3>'+S.events.map(e=>'<div class="logentry"><time>MONTH '+e.month+' · '+escapeHTML(e.tag).toUpperCase()+'</time><p><strong>'+escapeHTML(e.title)+'</strong><br>'+escapeHTML(e.body)+'</p></div>').join(''):settingsPanel();""",
    "view==='history'?dispatchArchiveV7():settingsPanel();")

# ------------------------------------------------- 5. generated news, once a month
rep("tickDiplomacy();perf=performance.now()-started;renderTick();}",
    "tickDiplomacy();tickNewsV7();perf=performance.now()-started;renderTick();}")

# ----------------------------------------- 6. the policy-implementation lag is optional
rep("const lag=['institutions','liberties','ownership'].includes(x.key)?30:['rate','tax',...TAX_KEYS].includes(x.key)?6:18;",
    "const lag=S.options.fastReforms?1:['institutions','liberties','ownership'].includes(x.key)?30:['rate','tax',...TAX_KEYS].includes(x.key)?6:18;")

# Shock reporting is replaced by the varied generator; the mechanical effect is unchanged.
rep("const e=options[Math.floor(random()*options.length)];n.shock=e[2]*shockScaleV6();n.shockMonths=9;addEvent(e[0],n.name+': '+e[1],good?'economy':'warning');",
    "const e=options[Math.floor(random()*options.length)];n.shock=e[2]*shockScaleV6();n.shockMonths=9;shockEventV7(n,good);")

# Map labels thin out on a narrow canvas instead of overlapping.
rep("if(!(important||n.gdp>2000||zoom>1.7&&n.gdp>350))continue;",
    "if(!(important||n.gdp>labelFloorV7()||zoom>1.7&&n.gdp>350))continue;")
rep("ctx.fillText(n.name.toUpperCase()+(n.id==='CAN'?' · MARKER ONLY':''),x,y+17/t.scale);",
    "ctx.fillText(n.name.toUpperCase()+(n.id==='CAN'&&showOceanLabelsV7()?' · MARKER ONLY':''),x,y+17/t.scale);")
rep("for(const[text,lon,lat]of [['PACIFIC OCEAN',-139,0],['ATLANTIC OCEAN',-35,20],['INDIAN OCEAN',78,-27]]){const[x,y]=project(lon,lat);ctx.fillText(text,x,y)}",
    "if(showOceanLabelsV7())for(const[text,lon,lat]of [['PACIFIC OCEAN',-139,0],['ATLANTIC OCEAN',-35,20],['INDIAN OCEAN',78,-27]]){const[x,y]=project(lon,lat);ctx.fillText(text,x,y)}")

# V7 keeps a 240-entry dispatch archive; the validator still capped the log at 100.
rep("if(!Array.isArray(s.events)||s.events.length>100||",
    "if(!Array.isArray(s.events)||s.events.length>240||")

# ------------------------------------------------------------------- 7. styles
css = '''
/* V7 --------------------------------------------------------------------- */
/* Dispatch archive */
.dispatchfeed{display:flex;flex-direction:column;gap:2px}
.dispatchrow{border-bottom:1px solid var(--line);padding:16px 0}
.dispatchrow:last-child{border-bottom:0}
.dispatchmeta{display:flex;align-items:center;gap:10px;margin-bottom:7px}
.dispatchmeta .tag{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);
 border:1px solid var(--line);border-radius:999px;padding:2px 9px}
.dispatchmeta time{font-size:11.5px;color:var(--muted)}
.dispatchrow h4{margin:0 0 5px;font-size:15px;font-weight:550;line-height:1.3}
.dispatchrow p{margin:0;font-size:13.5px;color:var(--muted);line-height:1.55}
.eragrid .modecard strong{font-size:19px}
.eracard{padding:14px}

/* Full-screen map, so the phone layout can give vertical scrolling back to the page. */
.mapfocusbtn{position:absolute;right:12px;bottom:12px;z-index:6;display:none;
 padding:11px 16px;border-radius:8px;border:1px solid var(--line);background:var(--raised);
 color:var(--text);font:inherit;font-size:13px;font-weight:550;min-height:44px}
body.mapfocus .maparea{position:fixed;inset:0;z-index:60;background:var(--bg)}
body.mapfocus .mapfocusbtn{background:var(--accent);color:#1a1408;border-color:var(--accent)}
body.mapfocus header,body.mapfocus nav,body.mapfocus .inspector,body.mapfocus .stats,body.mapfocus .events{display:none}

@media(max-width:800px){
 .mapfocusbtn{display:block}
 /* One-finger drag scrolls the page; the map is explored deliberately instead. */
 #map{touch-action:pan-y}
 body.mapfocus #map{touch-action:none}

 /* Four unreadable 78px columns became a legible 2x2 grid. */
 .stats{display:grid!important;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);
  padding:0!important;height:auto!important}
 .stat{background:var(--panel);padding:13px 14px!important;border:0!important;display:block}
 .stat label,.stat .label{font-size:11px!important;white-space:normal!important;line-height:1.3}
 .stat .value{font-size:21px!important;margin-top:3px}
 .stat small{font-size:11px!important}

 .workspace{height:auto!important;grid-template-rows:auto 62vh auto!important}
 .maparea{min-height:62vh}
 .app{min-height:0!important}
 .inspector{max-height:none!important}

 /* Dispatch cards stacked rather than squeezed into two truncated columns. */
 .eventlist{grid-template-columns:1fr!important;gap:14px!important}
 .event p{font-size:13.5px!important}

 /* Tap targets */
 nav button{min-height:56px!important}
 .timecontrol button,.tabs button{min-height:42px;padding-left:13px;padding-right:13px}
 select,input[type=range],button{font-size:15px}
 .modal{max-height:88dvh;overflow-y:auto}
 .modegrid{gap:11px}
 .modecard{padding:13px}
 .modecard p{font-size:13px}
 .eracard{cursor:pointer}
 .eracard:active{border-color:var(--accent)}
 .modelist{margin:9px 0 12px}
 .policy label{font-size:14px}
 /* The sticky rail is shorter than the page, which left its column unpainted at the bottom. */
 .app{position:relative}
 .app::before{content:'';position:absolute;left:0;top:0;bottom:0;width:58px;
  background:var(--bg);border-right:1px solid var(--line);z-index:0}
 nav{z-index:1;background:transparent!important;border-right:0!important}

 /* The toast sat directly on the map legend and the Explore button. */
 .toast{left:12px;right:12px;bottom:auto;top:84px;max-width:none;text-align:center;z-index:70}
 body.mapfocus .toast{top:auto;bottom:78px}
}
@media(max-width:420px){
 .stats{grid-template-columns:1fr 1fr}
 .stat .value{font-size:19px!important}
 header{padding:12px!important}
 .brand strong{font-size:15px!important}
 .dispatchrow h4{font-size:14.5px}
}
'''
rep('</style>', css + '\n</style>')

# ------------------------------------------------------------------ 8. the addon
addon = (SRC / 'addons' / 'v7-addon.js').read_text()
rep('newGame();initPaths();render();startScreen();',
    addon + '\nnewGame();initPaths();render();installMobileMap();startScreen();')

(BUILD / 'v7.html').write_text(s)
(BUILD / 'v7-engine.js').write_text(re.findall(r'<script>([\s\S]*?)</script>', s)[-1])
(ROOT / 'dist' / 'sovereign-v7.html').write_text(s)
print('Built V7:', len(s.encode()), 'bytes')
