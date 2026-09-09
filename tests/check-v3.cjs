const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('src/base/sovereign-v3.html','utf8');
const geo=html.match(/<script id="world-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements=new Map();
const ctx2d=new Proxy({isPointInPath:()=>false},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
function element(id=''){if(elements.has(id))return elements.get(id);const e={id,innerHTML:'',textContent:id==='world-data'?geo:'',value:id==='mapmode'?'political':'',hidden:id==='overlay',style:{},dataset:{},classList:{toggle(){}},tagName:'DIV',scrollTop:0,addEventListener(){},setAttribute(){},querySelectorAll(){return[]},getBoundingClientRect(){return{width:1100,height:650,left:0,top:0}},getContext(){return ctx2d},focus(){},click(){},scrollIntoView(){},setPointerCapture(){}};elements.set(id,e);return e;}
const registry=new Map();let nextTimer=1;
const sandbox={console,performance,structuredClone,TextEncoder,Blob,URL,innerWidth:1440,devicePixelRatio:1,Path2D:class{moveTo(){}lineTo(){}closePath(){}},ResizeObserver:class{constructor(cb){this.cb=cb}observe(){}},requestAnimationFrame:()=>1,setTimeout:()=>nextTimer++,clearTimeout(){},setInterval:()=>nextTimer++,clearInterval(){},AbortController,localStorage:{getItem:()=>null,setItem(){}},document:{hidden:false,modelContext:{registerTool(t){registry.set(t.name,t)}},activeElement:element('body'),getElementById:element,querySelectorAll:()=>[],addEventListener(){},createElement:()=>element('created')},window:{addEventListener(){}}};
vm.createContext(sandbox);vm.runInContext(code,sandbox);const run=c=>vm.runInContext(c,sandbox);
const out=[];const ok=(name,cond)=>{assert(cond,'FAILED: '+name);out.push(name)};

// Every program screen renders, for the player and for a foreign nation.
run("newGame();renderTick=()=>{};S.options.shocks=false;S.options.ai=false;setView('policies')");
run("subview='programs';renderPanel()");
ok('program list renders',run("$('panel').innerHTML").includes('Mass urbanization'));
for(const key of ['urban','housing','debt','human','green']){
 run(`subview='program';activeProgram='${key}';renderPanel()`);
 const h=run("$('panel').innerHTML");
 ok('program page renders: '+key,h.length>400&&!h.includes('undefined')&&!h.includes('NaN'));
}
run("selected='USA';subview='program';activeProgram='urban';renderPanel();selected=S.player");
ok('foreign program page renders',run("$('panel').innerHTML").includes('Urban population'));

// Urbanization: a funded push must urbanise faster than the do-nothing baseline.
run(`newGame();S.options.shocks=false;S.options.ai=false;const seed=JSON.stringify(S);
for(let i=0;i<180;i++)simulateMonth();const baseUrban=player().urban,baseSlums=player().slums;
S=JSON.parse(seed);Object.assign(player().policies,{urbanization:6,industrial:5,ruralInvest:0});Object.assign(player().targets,{urbanization:6,industrial:5,ruralInvest:0});
for(let i=0;i<180;i++)simulateMonth();const pushUrban=player().urban,pushSlums=player().slums;`);
ok('city program raises the urban share',run('pushUrban>baseUrban+1'));
ok('unbalanced push grows informal settlement',run('pushSlums>baseSlums'));

// Upgrading and housing must absorb that same push instead.
run(`S=JSON.parse(seed);Object.assign(player().policies,{urbanization:6,industrial:5,ruralInvest:0,slumUpgrade:3,housing:6,transit:3});Object.assign(player().targets,{urbanization:6,industrial:5,ruralInvest:0,slumUpgrade:3,housing:6,transit:3});
for(let i=0;i<180;i++)simulateMonth();const absorbedSlums=player().slums,absorbedUrban=player().urban;`);
ok('absorption capacity contains informal growth',run('absorbedSlums<pushSlums'));
ok('absorbed push still urbanises',run('absorbedUrban>baseUrban+1'));
ok('a well-run city program pays a growth dividend',run('player().agglomeration>0'));

// Rural development slows the pull.
run(`S=JSON.parse(seed);Object.assign(player().policies,{urbanization:6,industrial:5,ruralInvest:4});Object.assign(player().targets,{urbanization:6,industrial:5,ruralInvest:4});
for(let i=0;i<180;i++)simulateMonth();`);
ok('rural development slows migration',run('player().urban<pushUrban'));

// Debt: carrying costs are lighter than the previous model at every level.
run(`newGame();S.options.shocks=false;S.options.ai=false;const n=player();
const oldInterest=r=>Math.max(1,Math.min(25,n.policies.rate+1+Math.max(0,r-80)*.035-n.capacity*.015));
const newInterest=r=>{const saved=n.debt;n.debt=n.gdp*r/100;const i=fiscal(n).interest;n.debt=saved;return i};
const lighter=[40,80,120,200,300].every(r=>newInterest(r)<oldInterest(r));`);
ok('interest is lower than the old model at every debt level',run('lighter'));

// Debt management must buy the rate down.
run(`newGame();const q=player();q.debt=q.gdp*1.8;q.policies.borrowing=0;const highRate=fiscal(q).interest;q.policies.borrowing=100;const lowRate=fiscal(q).interest;`);
ok('debt management lowers the carried rate',run('lowRate<highRate-0.5'));

// Relief operations: cost capital, cut debt, and enforce a cooldown.
run(`newGame();S.options.shocks=false;S.options.ai=false;selected=S.player;renderTick=()=>{};
const r=player();r.debt=r.gdp*2.4;r.capital=100;const debtBefore=r.debt,capBefore=r.capital;debtRelief('restructure');`);
ok('restructuring writes down the stock',run('player().debt<debtBefore*.75'));
ok('restructuring costs political capital',run('player().capital<capBefore'));
ok('restructuring sets a cooldown',run('player().reliefCooldown>0'));
run(`const debtAfter=player().debt;debtRelief('refinance');`);
ok('cooldown blocks a second operation',run('player().debt===debtAfter'));
run(`newGame();S.options.shocks=false;S.options.ai=false;selected=S.player;const t=player();t.capital=100;const b0=t.targets.borrowing;debtRelief('terms');`);
ok('maturity renegotiation improves the posture',run('player().targets.borrowing>b0'));

// Forced restructuring now waits until 450% of GDP and warns first.
run(`newGame();S.options.shocks=false;S.options.ai=false;const w=player();w.debt=w.gdp*2.4;w.debtWarned=0;simulateMonth();`);
ok('a warning dispatch precedes any crisis',run("S.events.some(e=>e.title.includes('Debt sustainability warning'))"));
run(`newGame();S.options.shocks=false;S.options.ai=false;const c=player();c.debt=c.gdp*3.9;const held=c.debt;simulateMonth();`);
ok('no forced write-down at 390% of GDP',run('player().debt>held*.95'));

// Saves: round-trip at version 3, and migrate a version 2 save forward.
run('newGame();for(let i=0;i<120;i++)simulateMonth();validSave(JSON.parse(JSON.stringify(S)))');
ok('version 3 saves validate',true);
run(`newGame();const legacy=JSON.parse(JSON.stringify(S));legacy.version=2;
for(const nn of legacy.nations){delete nn.urban;delete nn.slums;delete nn.urbanCapacity;delete nn.urbanOpened;delete nn.urbanPipeline;delete nn.agglomeration;delete nn.reliefCooldown;delete nn.debtWarned;
 for(const k of ['policies','targets'])for(const key of ['urbanization','industrial','slumUpgrade','ruralInvest','borrowing'])delete nn[k][key];}
loadSave(JSON.stringify(legacy));`);
ok('version 2 saves migrate forward',run('S.version===3&&Number.isFinite(player().urban)&&Number.isFinite(player().policies.borrowing)'));
ok('migrated urban shares vary by development level',run("Math.abs(nation('USA').urban-nation('IND').urban)>5||Math.abs(nation('USA').slums-nation('IND').slums)>5"));

// Corrupt urbanization data must be rejected.
assert.throws(()=>run('const bad=JSON.parse(JSON.stringify(S));bad.nations[0].urbanPipeline=[1,2];validSave(bad)'));
assert.throws(()=>run('const bad2=JSON.parse(JSON.stringify(S));bad2.nations[0].slums=500;validSave(bad2)'));
out.push('corrupt urbanization data is rejected');

// Long-run stability with every new system running hot.
run(`newGame();for(const n of S.nations){Object.assign(n.targets,{urbanization:8,industrial:6,slumUpgrade:3,ruralInvest:4,borrowing:100,housing:8});Object.assign(n.policies,n.targets);}
for(let i=0;i<600;i++)simulateMonth();`);
ok('600 months stay finite with all programs at maximum',
 run('S.nations.every(n=>[n.gdp,n.debt,n.urban,n.slums,n.urbanCapacity,n.agglomeration,n.growth].every(Number.isFinite)&&n.urban>=0&&n.urban<=100&&n.slums>=0&&n.slums<=100)'));
run('validSave(JSON.parse(JSON.stringify(S)))');
out.push('hot-run world still validates');

// The tendency matcher must ignore delivery programs.
run(`newGame();const before=ideology(player().policies).label;Object.assign(player().policies,{urbanization:8,housing:8,industrial:6});const after=ideology(player().policies);`);
ok('programs do not distort the ideology match',run('after.label===before&&after.mixed===false'));

console.log(JSON.stringify({status:'PASS',checks:out.length,tests:out},null,2));
