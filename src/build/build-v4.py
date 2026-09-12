from pathlib import Path
import re

# Paths are relative to the repository root so the chain runs the same locally and in CI.
ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'build'; BUILD.mkdir(exist_ok=True)
SRC = ROOT / 'src'
s=(SRC/'base'/'sovereign-v3.html').read_text()
addon=(SRC/'addons'/'v4-addon.js').read_text()
def rep(a,b):
 global s
 assert a in s,a[:120]
 s=s.replace(a,b)
rep('<title>Sovereign — Political Sandbox</title>','<title>Sovereign V4 — Cities, Parties & Diplomacy</title>')
rep('Political sandbox</div>','Political sandbox · V4</div>')
rep("S.month++;for(const n of S.nations)","S.month++;prepareV4Month();for(const n of S.nations)")
rep("+n.agglomeration", "+n.agglomeration+n.cityGrowth+n.policies.research*.025+(n.policies.business-50)*.002")
rep("shock=n.shockMonths>0?n.shock*(1-n.clean*.004):0", "shock=n.shockMonths>0?n.shock*(1-n.clean*.004)/(1+n.policies.foodSecurity*.12):0")
start=s.index(' if(n.debt/n.gdp>2.2');end=s.index(' if(n.reliefCooldown>0)',start)
s=s[:start]+' handleDebtV4(n);\n'+s[end:]
start=s.index(' if(p.institutions>=60){n.election--');end=s.index(' if(S.options.ai',start)
s=s[:start]+' tickV4Nation(n);\n'+s[end:]
rep(' perf=performance.now()-started;renderTick();}', ' tickDiplomacy();perf=performance.now()-started;renderTick();}')
rep("view==='overview'?overview(n):view==='policies'", "view==='cities'?citiesPanel(n):view==='parties'?partiesPanel(n):view==='overview'?overview(n):view==='policies'")
rep("[['overview','Overview'],['policies','Policies'],['economy','Economy'],['diplomacy','Diplomacy'],['military','Military'],['history','Dispatch']]", "[['overview','Overview'],['cities','Cities'],['parties','Parties'],['policies','Policies'],['economy','Economy'],['diplomacy','Diplomacy'],['military','Military'],['history','Dispatch']]")
rep("s.version!==3", "s.version!==4")
rep("['debtRatio','Debt · % of GDP',n.debt/n.gdp*100,0,350]", "['debtRatio','Debt · % of GDP',n.debt/n.gdp*100,0,1200]")
rep("})[ideology(n.policies).label];", "})[ideology(n.policies).label]||'hsl('+(Object.keys(PRESETS).indexOf(ideology(n.policies).label)*37%360)+',25%,45%)';")
# Prevent old manual text from contradicting the new debt and election systems.
s=re.sub(r'<p>Debt is deliberately forgiving in this version\..*?</p>', '<p>V4 debt rules are described at the top of this guide and in the Debt relief program. The legacy monthly forced-default loop has been replaced by a sustained-stress review and a protection period.</p>',s)
rep('Elections renew political capital or bring a coalition that moderates policy.', 'Elections allocate seats between the fictional parties. Coalition platforms can be staged from the Parties view.')
rep("This costs 25 political capital, reduces public support and damages both economies.","This costs 25 political capital, reduces public support and reputation, and damages both economies. Active non-aggression or defense pacts must be withdrawn first.")
rep('holds five clickable packages:', 'includes these original packages plus governance, research, and household-security reforms:')
css='''
/* V4 extensions keep the original map-centered interface. */
nav{overflow-y:auto;scrollbar-width:none}nav .spacer{min-height:12px}.projectcard{padding:16px;border:1px solid var(--line);background:#202a2e;border-radius:8px;margin:14px 0}.projectcard strong{font-weight:550;font-size:14px}.projectcard p{font-size:13px}.projectcard .sectionhead{gap:8px;margin-bottom:4px}.citypicker{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}.citypicker button{flex:1;font-size:13px}.seatbar{display:flex;height:18px;gap:2px;border-radius:5px;overflow:hidden;margin:20px 0}.seatbar div{height:100%}.projectcard .metricrow strong{font-size:13px}@media(min-width:1450px){.app{grid-template-columns:76px minmax(0,1fr) 410px}}@media(max-width:800px){nav button{min-height:49px}nav{gap:3px}.projectcard{padding:12px}}
'''
rep('</style>',css+'\n</style>')
addon="ICONS.cities='<path d=\"M3 21h18M5 21V9h6v12m0-17h8v17M7 12h2m-2 4h2m5-9h2m-2 4h2m-2 4h2\"/>';\nICONS.parties='<path d=\"M3 21h18M4 8l8-5 8 5H4zm2 3v7m6-7v7m6-7v7\"/>';\n"+addon
rep('newGame();initPaths();render();',addon+'\nnewGame();initPaths();render();')
(BUILD/'v4.html').write_text(s)
(BUILD/'v4-engine.js').write_text(re.search(r'<script>([\s\S]*?)</script>',s)[1])
print('Built V4:',len(s.encode()),'bytes')
