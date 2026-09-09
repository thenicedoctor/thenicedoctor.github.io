// Engine invariants for Sovereign V5: catalogue coverage, the macro model, the central bank,
// trade, city management and save compatibility. Run from the project root:
//   ELECTRON_RUN_AS_NODE=1 "/Applications/Visual Studio Code.app/Contents/MacOS/Code" tests/check-v5.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
function makeGame(file){const html=fs.readFileSync(file,'utf8');
 const embedded=id=>{const m=html.match(new RegExp('<script type="application/json" id="'+id+'">([\\s\\S]*?)<\\/script>'));return m?m[1]:'';};
 const data={'world-data':html.match(/<script id="world-data" type="application\/json">([\s\S]*?)<\/script>/)[1],
  'city-catalog':embedded('city-catalog'),'added-countries':embedded('added-countries')};
 const code=html.match(/<script>([\s\S]*?)<\/script>/)[1],els=new Map(),registry=new Map();
 const ctx2d=new Proxy({isPointInPath:()=>false},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
 function el(id=''){if(els.has(id))return els.get(id);const e={id,innerHTML:'',textContent:data[id]||'',value:id==='mapmode'?'political':'',hidden:id==='overlay',style:{},dataset:{},classList:{toggle(){}},tagName:'DIV',scrollTop:0,addEventListener(){},setAttribute(){},querySelectorAll(){return[]},getBoundingClientRect(){return{width:1100,height:650,left:0,top:0}},getContext(){return ctx2d},insertAdjacentHTML(_,s){this.innerHTML=s+this.innerHTML},focus(){},click(){},scrollIntoView(){},setPointerCapture(){}};els.set(id,e);return e;}
 const scope={console,performance,structuredClone,TextEncoder,Blob,URL,innerWidth:1440,devicePixelRatio:1,Path2D:class{moveTo(){}lineTo(){}closePath(){}},ResizeObserver:class{observe(){}},requestAnimationFrame:()=>1,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},AbortController,localStorage:{getItem:()=>null,setItem(){}},document:{hidden:false,modelContext:{registerTool(t){registry.set(t.name,t)}},activeElement:el('body'),getElementById:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el('created')},window:{addEventListener(){}}};
 vm.createContext(scope);vm.runInContext(code,scope);return{run:c=>vm.runInContext(c,scope),scope,registry,els,html};}

const v5=makeGame('build/v5.html'),{run}=v5;
run('renderTick=()=>{}');

// ---- coverage: every country in the catalogue has named locations and a seat in the world.
assert.equal(run('S.version'),5);
const nations=run('S.nations.length'),cities=run('S.nations.reduce((a,n)=>a+n.cities.length,0)');
assert.equal(nations,204);assert.equal(cities,1198);
assert(run('S.nations.every(n=>n.cities.length>=1&&n.cities.every(c=>c.name&&/^[^<>&]+$/.test(c.name)))'),'city names present and inert');
assert(run('S.nations.every(n=>new Set(n.cities.map(c=>c.name)).size===n.cities.length)'),'names unique per country');
assert(run('S.nations.every(n=>Math.abs(n.cities.reduce((a,c)=>a+c.share,0)-(n.cities.length===1?1:.75))<1e-9)'),'city shares sum to the modelled coverage');
assert(run('S.nations.every(n=>n.cities.every(c=>c.crime>=10&&c.crime<=75))'),'crime ratings seeded in range');
assert(run("['Low pressure','Moderate pressure','High pressure','Severe pressure'].every((l,i)=>crimeLabel([20,35,55,70][i])===l)"),'crime bands');
assert.equal(run('new Set(S.nations.map(n=>n.id)).size'),nations);

// ---- every panel, subview and program renders for an owned and a foreign nation.
for(const view of ['overview','cities','parties','policies','economy','growth','monetary','trade','diplomacy','military','history','settings'])
 run(`setView('${view}');renderPanel();renderHead()`);
run("view='policies';for(const t of ['reforms','programs','taxation','ideologies','economicControls','monetaryControls','domesticControls']){subview=t;draft=null;renderPanel()}");
run("for(const pr of PROGRAMS){activeProgram=pr.key;subview='program';renderPanel()}showGuide();closeModal();");
run("selected='ARG';for(const v of ['overview','cities','economy','growth','monetary','trade','military']){setView(v);renderPanel()}selected=S.player;setView('overview')");

// ---- presets stay complete policy bundles after three rounds of additions.
assert(run('Object.values(PRESETS).every(p=>POLICY.filter(x=>!["liberties","institutions"].includes(x.key)).every(x=>Number.isFinite(p[x.key])&&p[x.key]>=x.min&&p[x.key]<=x.max))'),'presets cover every policy');
assert(run('POLICY.length>=63'),'new policy controls registered');
assert(run("['inflationTarget','cbIndependence','reserveRequirement','assetPurchases','macroprudential','pensionAge','familyBenefit','vocational','activeLabor','regionalFunds','digitalGov','landTax','sovereignFund','tariff','justice','armyShare','training'].every(k=>POLICY.some(x=>x.key===k))"),'named controls exist');
assert(run('new Set(POLICY.map(x=>x.key)).size===POLICY.length'),'no duplicate policy keys');

// ---- production function: the reported potential is exactly the stated identity.
run("newGame();S.options.shocks=false;S.options.ai=false;simulateMonth()");
assert(run(`S.nations.every(n=>{const L=n.pop*n.participation*(1-n.nairu/100);
 return Math.abs(n.potentialGdp-n.tfp*Math.pow(n.capitalStock,ALPHA)*Math.pow(Math.max(.005,L),1-ALPHA))<1e-6*Math.max(1,n.potentialGdp)})`),'Y* = A K^a L^(1-a)');
assert(run('S.nations.every(n=>n.capitalStock>0&&n.capitalRatio>=1.19&&n.capitalRatio<=6.01)'),'capital/output ratio stays in band');
assert(run('S.nations.every(n=>Math.abs(n.decomposition.capital+n.decomposition.labour+n.decomposition.tfp-n.potentialGrowth)<1e-6)'),'growth accounting adds up');
// The political-capital field is v4's and must never be confused with the capital stock.
assert(run('S.nations.every(n=>n.capital>=0&&n.capital<=100&&n.capital!==n.capitalStock)'),'political capital untouched');

// ---- higher investment builds a larger capital stock and more potential output.
run("newGame();S.options.shocks=false;S.options.ai=false;S.options.infiniteCapital=true;const lowK=[];");
run("player().targets.investment=0;enact({...player().targets});for(let i=0;i<120;i++)simulateMonth();const lazy=player().capitalStock/player().gdp;");
run("newGame();S.options.shocks=false;S.options.ai=false;S.options.infiniteCapital=true;player().targets.investment=10;enact({...player().targets});for(let i=0;i<120;i++)simulateMonth();const busy=player().capitalStock/player().gdp;");
assert(run('busy>lazy'),'sustained public investment deepens capital');

// ---- central bank: the reaction function responds to inflation, independence blends it in.
run("newGame();S.options.shocks=false;S.options.ai=false;const n0=player();n0.inflation=2;n0.policies.inflationTarget=2;n0.outputGap=0;const calm=taylorRate(n0);n0.inflation=8;const hot=taylorRate(n0);");
assert(run('hot-calm>6'),'the Taylor rule raises real rates when inflation overshoots');
run("const n1=player();n1.fxRegime='float';n1.policies.rate=1;n1.policies.cbIndependence=0;n1.mon.rate=1;for(let i=0;i<40;i++)tickMonetary(n1);const dependent=n1.mon.rate;");
run("n1.policies.cbIndependence=100;for(let i=0;i<40;i++)tickMonetary(n1);const independent=n1.mon.rate;");
assert(run('Math.abs(dependent-1)<.3'),'a dependent bank follows the instructed rate');
assert(run('independent>dependent'),'an independent bank sets its own rate against high inflation');
run("const n2=player();n2.fxRegime='peg';n2.policies.cbIndependence=100;n2.policies.rate=0;for(let i=0;i<60;i++)tickMonetary(n2);");
assert(run('Math.abs(n2.mon.rate-worldRate)<Math.abs(dependent-worldRate)+3'),'a peg is pulled toward the world rate');
// Credibility anchors expectations on the target; losing it un-anchors them.
run("newGame();S.options.shocks=false;S.options.ai=false;const a=player();a.policies.inflationTarget=2;a.inflation=9;a.mon.credibility=95;a.mon.expected=9;for(let i=0;i<24;i++)tickMonetary(a);const anchored=a.mon.expected;");
run("const b=nation('ARG');b.policies.inflationTarget=2;b.inflation=9;b.mon.credibility=8;b.mon.expected=9;for(let i=0;i<24;i++)tickMonetary(b);const loose=b.mon.expected;");
assert(run('anchored<loose'),'credible targets pull expectations down faster');
assert(run('S.nations.every(n=>n.mon.credibility>=5&&n.mon.credibility<=97)'),'credibility bounded');

// ---- Okun's law: a positive output gap lowers unemployment toward and below the floor.
run("newGame();S.options.shocks=false;S.options.ai=false;const u=player();u.outputGap=4;for(let i=0;i<40;i++)unemploymentV5(u);const boom=u.unemployment;u.outputGap=-6;for(let i=0;i<40;i++)unemploymentV5(u);const bust=u.unemployment;");
assert(run('boom<u.nairu&&bust>u.nairu&&bust>boom'),'unemployment moves against the gap');
// Training and placement lower the structural floor rather than the cycle.
run("newGame();S.options.shocks=false;S.options.ai=false;S.options.infiniteCapital=true;const base=player().nairu;player().targets.activeLabor=100;player().targets.vocational=100;enact({...player().targets});for(let i=0;i<180;i++)simulateMonth();");
assert(run('player().nairu<base'),'active labour policy lowers the structural floor');

// ---- accounting displays never move the fiscal base.
run("newGame();const before=JSON.stringify(S.nations.map(n=>[n.gdp,n.debt]));changeOutput('nmp');");
assert.equal(run('S.options.outputMeasure'),'nmp');
assert.equal(run('JSON.stringify(S.nations.map(n=>[n.gdp,n.debt]))'),run('before'));
assert(run('S.nations.every(n=>outputValue(n,"nmp")<n.gdp&&outputValue(n,"gdp")===n.gdp)'),'NMP is a strict subset of GDP');
run("changeOutput('gdp');changeOutput('nonsense')");assert.equal(run('S.options.outputMeasure'),'gdp');

// ---- trade contracts create matched flows, customs revenue and nothing from thin air.
run("newGame();S.options.shocks=false;S.options.ai=false;S.options.infiniteCapital=true;selected='ARG';setRelation('BRA','ARG',60);");
assert.equal(run("signTrade('ARG','export','food',1)"),true);
assert.equal(run("signTrade('BRA','export','food',1)"),false,'cannot trade with yourself');
assert.equal(run("signTrade('ARG','export','food',99)"),false,'share limits enforced');
run("prepareV4Month()");
assert(run("Math.abs(player().exports-nation('ARG').imports)<1e-9&&player().exports>0"),'exports equal the partner imports');
// Customs are collected by the importer, so the player takes delivery of a second commodity.
assert.equal(run("signTrade('ARG','import','energy',1)"),true);
run("player().policies.tariff=0;player().targets.tariff=0;prepareV4Month();const noDuty=player().customs;");
assert.equal(run('noDuty'),0,'a zero tariff collects nothing');
run("player().policies.tariff=20;player().targets.tariff=20;prepareV4Month();");
assert(run('player().imports>0&&player().customs>0'),'tariffs raise customs revenue on delivered imports');
assert(run('Math.abs(player().customs-player().imports*.2)<1e-9'),'the duty is the tariff on the delivered value');
run("diplomacy('sanction');prepareV4Month()");
assert.equal(run('player().exports'),0,'sanctions suspend deliveries');

// ---- city management is bounded, costs capital and moves local crime.
run("newGame();S.options.shocks=false;S.options.ai=false;S.options.infiniteCapital=true;activeCity=0;const city=player().cities[0];const crime0=city.crime;");
run("cityDraft={...city.management,police:100,prevention:100,services:100};cityDraftId=city.id;applyCityManagement();for(let i=0;i<120;i++)simulateMonth();");
assert(run('player().cities[0].crime<crime0'),'funded prevention and policing reduce crime pressure');
assert(run('S.nations.every(n=>n.cities.every(c=>c.crime>=0&&c.crime<=100&&Number.isFinite(c.satisfaction)))'),'local metrics bounded');
run("cityDraft={...player().cities[0].management,police:9999};cityDraftId=player().cities[0].id;applyCityManagement();");
assert.notEqual(run('player().cities[0].management.police'),9999,'out-of-range local settings are refused');

// ---- military allocations must total 100% before a reform can be enacted.
run("newGame();S.options.infiniteCapital=true;draft={...player().targets,armyShare:50,navyShare:50,airShare:50};");
assert(run("!!taxProblem(draft)"),'inconsistent force shares are rejected');
run("draft={...player().targets,armyShare:60,navyShare:20,airShare:20};");
assert(run("!taxProblem(draft)"),'consistent force shares pass');
run("enact(draft);for(let i=0;i<60;i++)simulateMonth()");
assert(run('player().forces.army>player().forces.navy'),'budget shares steer the services');
assert(run('S.nations.every(n=>Math.abs(n.military-(n.forces.army+n.forces.navy+n.forces.air))<1e-6)'),'total strength is the sum of services');

// ---- the exchange-rate regime and the flag identity only accept known values.
assert(run("Object.keys(FX_REGIMES).length===3&&S.nations.every(n=>!!FX_REGIMES[n.fxRegime])"),'regimes valid');
assert(run("validIdentity(player().identity)&&!validIdentity({mode:'x',flagId:'BRA',pattern:'horizontal',colors:['#000000','#000000','#000000']})"),'identity validation');

// ---- pacing is a saved option and one month is now eight seconds at 1x.
assert.equal(run('S.options.monthSeconds'),8);

// ---- fifty years with AI, shocks, wars and trade stay finite, bounded and loadable.
run('newGame();S.options.shocks=true;S.options.ai=true;for(let i=0;i<600;i++)simulateMonth();');
assert(run(`S.nations.every(n=>Number.isFinite(n.gdp)&&n.gdp>0&&Number.isFinite(n.debt)&&n.debt>=0
 &&Number.isFinite(n.capitalStock)&&n.capitalStock>0&&Number.isFinite(n.tfp)&&n.tfp>0
 &&n.inflation>-25&&n.inflation<200&&n.unemployment>0&&n.unemployment<40
 &&n.participation>.2&&n.participation<.85&&n.pop>0&&Number.isFinite(n.priceLevel)&&n.priceLevel>0
 &&n.history.length<=120&&n.cities.every(c=>c.queue.length<=3)&&n.politics.seats.reduce((a,b)=>a+b,0)===100)`),'fifty-year state stays sane');
run('validSave(JSON.parse(JSON.stringify(S)))');

// ---- migration: V1 through V4 saves load and gain the new machinery.
for(const [label,file] of [['V4','build/v4.html'],['V3','src/base/sovereign-v3.html'],['V1','src/base/sovereign-v1.html']]){
 const old=makeGame(file);v5.scope.legacyJSON=old.run('S.month=9;JSON.stringify(S)');
 run('loadSave(legacyJSON)');
 assert.equal(run('S.version'),5,label+' migrates to 5');
 assert.equal(run('S.nations.length'),204,label+' gains the added countries');
 assert(run('S.nations.every(n=>!!n.mon&&n.capitalStock>0&&!!FX_REGIMES[n.fxRegime]&&n.cities.length>=1)'),label+' gains macro state');
 run('validSave(JSON.parse(JSON.stringify(S)));simulateMonth()');
}
// A named city project survives migration onto the catalogue names.
run("newGame();const keep=player().cities[0].id;startCityProject(S.player,keep,'hospital');const withProject=JSON.stringify(S);loadSave(withProject)");
assert.equal(run('player().cities[0].queue.length'),1,'queued projects survive a reload');

// ---- corrupt or hostile saves are rejected atomically.
run('newGame();const good=JSON.parse(JSON.stringify(S))');
for(const [name,mutation] of [
 ['missing monetary state','b.nations[0].mon=null'],
 ['negative capital stock','b.nations[0].capitalStock=-5'],
 ['unknown exchange regime','b.nations[0].fxRegime="gold"'],
 ['infinite productivity','b.nations[0].tfp=Infinity'],
 ['renamed city','b.nations[0].cities[0].name="<script>"'],
 ['extra city','b.nations[0].cities.push({...b.nations[0].cities[0]})'],
 ['policy out of range','b.nations[0].policies.inflationTarget=99'],
 ['tampered seats','b.nations[0].politics.seats[0]+=1'],
])assert.throws(()=>run(`(()=>{const b=JSON.parse(JSON.stringify(good));${mutation};validSave(b)})()`),undefined,name+' must be rejected');

const api=v5.registry.get('advance_simulation'),month=run('S.month');
api.execute({months:2});assert.equal(run('S.month'),month+2);
assert.throws(()=>api.execute({months:-1}));

console.log(JSON.stringify({status:'PASS',version:5,nations,cities,
 countriesWithCities:run('S.nations.filter(n=>n.cities.length>0).length'),
 policies:run('POLICY.length'),programs:run('PROGRAMS.length'),projects:run('Object.keys(PROJECTS).length'),
 fileBytes:Buffer.byteLength(v5.html),lastTickMs:+run('perf').toFixed(2),
 checks:['catalogue coverage and inert names','crime ratings and bands','every panel and subview renders',
  'preset completeness','production-function identity','growth accounting adds up',
  'political capital vs capital stock','investment deepens capital','Taylor rule and independence',
  'peg follows the world rate','credibility anchors expectations',"Okun's law and the structural floor",
  'GDP/NMP display never moves the fiscal base','matched trade flows and customs','sanctions suspend trade',
  'bounded city management','force shares total 100','regime and flag validation','slower default pacing',
  'fifty-year stability','V1/V3/V4 save migration','atomic rejection of corrupt saves','WebMCP actions']},null,2));
