const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('src/base/sovereign-v3.html','utf8');
const geo=html.match(/<script id="world-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements=new Map();
const ctx2d=new Proxy({isPointInPath:()=>false},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
function element(id=''){if(elements.has(id))return elements.get(id);const e={id,innerHTML:'',textContent:id==='world-data'?geo:'',value:id==='mapmode'?'political':'',hidden:id==='overlay',style:{},dataset:{},classList:{toggle(){}},tagName:'DIV',scrollTop:0,addEventListener(){},setAttribute(){},querySelectorAll(){return[]},getBoundingClientRect(){return{width:1100,height:650,left:0,top:0}},getContext(){return ctx2d},focus(){},click(){},scrollIntoView(){},setPointerCapture(){}};elements.set(id,e);return e;}
const registry=new Map();let nextTimer=1;
const sandbox={console,performance,structuredClone,TextEncoder,Blob,URL,innerWidth:1440,devicePixelRatio:1,Path2D:class{moveTo(){}lineTo(){}closePath(){}},ResizeObserver:class{constructor(cb){this.cb=cb}observe(){}},requestAnimationFrame:()=>1,setTimeout:()=>nextTimer++,clearTimeout(){},setInterval:()=>nextTimer++,clearInterval(){},AbortController,localStorage:{getItem:()=>null,setItem(){}},document:{hidden:false,modelContext:{registerTool(t){registry.set(t.name,t)}},activeElement:element('body'),getElementById:element,querySelectorAll:()=>[],addEventListener(){},createElement:()=>element('created')},window:{addEventListener(){}}};
vm.createContext(sandbox);vm.runInContext(code,sandbox);const run=code=>vm.runInContext(code,sandbox);
assert(run('S.nations.length')>=175);assert(run('S.player')==='BRA');
// Every renderer must accept the scenario and every available view.
for(const view of ['overview','policies','economy','diplomacy','military','history','settings'])run(`setView('${view}'); renderPanel()`);
run("setView('policies');subview='ideologies';renderPanel()");
run("newGame();renderTick=()=>{};S.options.shocks=false;S.options.ai=false;selected=S.player;const values={...player().targets,tax:45};enact(values)");
assert(run('player().targets.tax')===45);assert(run('player().policies.tax')<45);assert(run('player().capital')<65);
run('for(let i=0;i<36;i++)simulateMonth()');assert(run('player().policies.tax')>44.5);
// A structurally larger primary deficit must produce a larger debt burden.
run("newGame();S.options.shocks=false;S.options.ai=false;const base=JSON.stringify(S);for(let i=0;i<24;i++)simulateMonth();const baseDebt=player().debt;S=JSON.parse(base);player().policies.welfare=25;player().targets.welfare=25;for(let i=0;i<24;i++)simulateMonth();");assert(run('player().debt>baseDebt'));
// Higher rates should reduce inflation and output growth, with lagged effects.
run("newGame();S.options.shocks=false;S.options.ai=false;const rateBase=JSON.stringify(S);for(let i=0;i<36;i++)simulateMonth();const normalInflation=player().inflation,normalGrowth=player().growth;S=JSON.parse(rateBase);player().policies.rate=15;player().targets.rate=15;for(let i=0;i<36;i++)simulateMonth();");assert(run('player().inflation<normalInflation'));assert(run('player().growth<normalGrowth'));
// Outcomes must remain finite over long, eventful play. Histories stay bounded.
run('newGame();for(let i=0;i<600;i++)simulateMonth()');
assert(run('S.nations.every(n=>[n.gdp,n.debt,n.growth,n.inflation,n.approval,n.stability,n.military,n.pop].every(Number.isFinite)&&n.gdp>0&&n.debt>=0&&n.history.length<=120)'));
assert(run('S.events.length<=100'));run('validSave(JSON.parse(JSON.stringify(S)))');
run("newGame();selected='ARG';declareWar()");assert(run("player().war.target==='ARG'&&nation('ARG').war.target==='BRA'"));run('peace()');assert(run("player().war===null&&nation('ARG').war===null"));
run("newGame();selected='ARG';declareWar();for(let i=0;i<32;i++)simulateMonth()");assert(run('player().war===null'));
// Save validation must reject invalid policy and invalid state without mutation.
assert.throws(()=>run('const bad=JSON.parse(JSON.stringify(S));bad.nations[0].policies.tax=999;validSave(bad)'));
assert.throws(()=>run('const bad2=JSON.parse(JSON.stringify(S));bad2.nations[0].gdp=-1;validSave(bad2)'));
assert.throws(()=>run('const bad3=JSON.parse(JSON.stringify(S));bad3.treaties=["USA:missing"];validSave(bad3)'));
// WebMCP contract checks against the registered tools, using shared app actions.
assert.deepEqual([...registry.keys()],['read_simulation','advance_simulation']);
const advance=registry.get('advance_simulation');assert(advance.annotations.readOnlyHint===false);const before=run('S.month');const result=advance.execute({months:3});assert.equal(run('S.month'),before+3);assert(typeof result.date==='string');assert.throws(()=>advance.execute({months:0}));assert.equal(run('S.month'),before+3);
console.log(JSON.stringify({status:'PASS',nations:run('S.nations.length'),mapFeatures:JSON.parse(geo).length,tests:['all view renderers','reform cost and implementation lag','deficit debt accounting','monetary transmission','600-month stability','bounded history','war and ceasefire','automatic settlement','save validation','WebMCP state contracts'],fileBytes:Buffer.byteLength(html),lastTickMs:run('perf')},null,2));
