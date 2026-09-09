// Engine invariants for Sovereign V6: difficulty modes, the debt-free world, and the V5 core
// re-verified on the new build. Run from the project root:
//   ELECTRON_RUN_AS_NODE=1 "/Applications/Visual Studio Code.app/Contents/MacOS/Code" tests/check-v6.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
function makeGame(file){const html=fs.readFileSync(file,'utf8');
 const embedded=id=>{const m=html.match(new RegExp('<script type="application/json" id="'+id+'">([\\s\\S]*?)<\\/script>'));return m?m[1]:'';};
 const data={'world-data':html.match(/<script id="world-data" type="application\/json">([\s\S]*?)<\/script>/)[1],
  'city-catalog':embedded('city-catalog'),'added-countries':embedded('added-countries')};
 const code=html.match(/<script>([\s\S]*?)<\/script>/)[1],els=new Map(),registry=new Map(),store=new Map();
 const ctx2d=new Proxy({isPointInPath:()=>false},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
 function el(id=''){if(els.has(id))return els.get(id);const e={id,innerHTML:'',textContent:data[id]||'',value:id==='mapmode'?'political':'',hidden:id==='overlay',style:{},dataset:{},classList:{toggle(){}},tagName:'DIV',scrollTop:0,addEventListener(){},setAttribute(){},querySelectorAll(){return[]},getBoundingClientRect(){return{width:1100,height:650,left:0,top:0}},getContext(){return ctx2d},insertAdjacentHTML(_,s){this.innerHTML=s+this.innerHTML},focus(){},click(){},scrollIntoView(){},setPointerCapture(){}};els.set(id,e);return e;}
 const scope={console,performance,structuredClone,TextEncoder,Blob,URL,innerWidth:1440,devicePixelRatio:1,Path2D:class{moveTo(){}lineTo(){}closePath(){}},ResizeObserver:class{observe(){}},requestAnimationFrame:()=>1,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},AbortController,localStorage:{getItem:k=>store.get(k)??null,setItem(k,v){store.set(k,v)}},document:{hidden:false,modelContext:{registerTool(t){registry.set(t.name,t)}},activeElement:el('body'),getElementById:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el('created')},window:{addEventListener(){}}};
 vm.createContext(scope);vm.runInContext(code,scope);return{run:c=>vm.runInContext(c,scope),scope,registry,els,html};}

const v6=makeGame('build/v6.html'),{run}=v6;
run('renderTick=()=>{}');

// ---- V6 boots into Easy, which is a world with no national debt at all.
assert.equal(run('S.version'),6);
assert.equal(run('S.nations.length'),204);
assert.equal(run('S.options.difficulty'),'easy');
assert.equal(run('S.options.noDebt'),true,'debt removal is the default');
assert(run('S.nations.every(n=>n.debt===0)'),'no nation starts with debt on Easy');
assert(run("['easy','medium','hard'].every(k=>!!DIFFICULTY[k])"),'three modes exist');

// ---- the modes are strictly ordered from forgiving to demanding.
assert(run(`(()=>{const r=k=>DIFFICULTY[k].rules,[e,m,h]=['easy','medium','hard'].map(r);
 return e.noDebt&&!m.noDebt&&!h.noDebt
  && e.forgivingDebt&&m.forgivingDebt&&!h.forgivingDebt
  && !e.shocks&&m.shocks&&h.shocks
  && e.shockScale<m.shockScale&&m.shockScale<h.shockScale
  && e.shockEvery>m.shockEvery&&m.shockEvery>h.shockEvery
  && e.capitalRate>m.capitalRate&&m.capitalRate>h.capitalRate
  && e.reformScale<m.reformScale&&m.reformScale<h.reformScale
  && e.aiAggression<m.aiAggression&&m.aiAggression<h.aiAggression})()`),'each mode is harder than the last');

// ---- a debt-free world never accumulates debt, however large the deficit.
run("newGame();S.options.shocks=false;S.options.ai=false;S.options.infiniteCapital=true;");
// A deliberately unaffordable budget: minimum revenue, maximum spending on every programme.
run("const cap=k=>POLICY.find(x=>x.key===k);const spender={...player().targets,tax:cap('tax').min};for(const k of ['services','welfare','investment','defense'])spender[k]=cap(k).max;enact(spender);");
run("for(let i=0;i<360;i++)simulateMonth()");
assert(run('S.nations.every(n=>n.debt===0)'),'thirty years of deficits create no debt');
assert.equal(run('fiscal(player()).debtService'),0,'no debt service is charged');
assert.equal(run('fiscal(player()).interest'),0,'no interest rate is applied');
assert(run('fiscal(player()).balance<0'),'the budget can still run a deficit');
assert.equal(run('player().crisisMonths'),0,'no debt crisis can accrue');
assert(run('player().gdp>0&&Number.isFinite(player().inflation)'),'the rest of the economy still runs');
// Everything else still constrains the player.
assert(run('S.options.noDebt&&player().capital<=100'),'political capital still bounded');

// ---- switching to a harder mode restores debt without restarting the world.
run("const monthBefore=S.month,gdpBefore=player().gdp,taxBefore=player().policies.tax;applyDifficulty('hard',true);");
assert.equal(run('S.month'),run('monthBefore'),'changing mode does not restart the world');
assert.equal(run('player().gdp'),run('gdpBefore'),'changing mode does not touch the economy');
assert.equal(run('player().policies.tax'),run('taxBefore'),'changing mode does not touch your policies');
assert.equal(run('S.options.noDebt'),false);assert.equal(run('S.options.forgivingDebt'),false);
run('for(let i=0;i<48;i++)simulateMonth()');
assert(run('player().debt>0'),'debt accumulates once the mode restores it');
assert(run('fiscal(player()).debtService>0'),'interest is charged again');

// ---- and switching back clears the stock rather than freezing it.
run("applyDifficulty('easy',true)");
assert(run('S.nations.every(n=>n.debt===0)'),'returning to Easy clears the debt stock');
run('for(let i=0;i<24;i++)simulateMonth()');
assert(run('S.nations.every(n=>n.debt===0)'),'and it stays cleared');

// ---- a mode is a bundle of visible rules; editing one by hand marks it customised.
run("applyDifficulty('medium',true)");
assert.equal(run("rulesMatch('medium')"),true);
assert.equal(run("difficultyLabel()"),'Medium');
run("S.options.shocks=false");
assert.equal(run("rulesMatch('medium')"),false);
assert.equal(run("difficultyLabel()"),'Medium · customised');
assert.equal(run("applyDifficulty('nonsense')"),false,'unknown modes are refused');

// ---- the difficulty levers actually move the numbers they claim to.
run("newGame();applyDifficulty('easy',true);const easyCost=reformCost(player(),{...player().targets,tax:40});");
run("applyDifficulty('hard',true);const hardCost=reformCost(player(),{...player().targets,tax:40});");
assert(run('hardCost>easyCost'),'reforms cost more on Hard');
run("applyDifficulty('easy',true);const easyRate=capitalRateV6();applyDifficulty('hard',true);const hardRate=capitalRateV6();");
assert(run('easyRate>hardRate'),'political capital rebuilds faster on Easy');
run("applyDifficulty('hard',true);S.options.shocks=true;const hardDue=[...Array(24).keys()].filter(m=>{S.month=m;return shockDueV6()}).length;");
run("applyDifficulty('easy',true);S.options.shocks=true;const easyDue=[...Array(24).keys()].filter(m=>{S.month=m;return shockDueV6()}).length;");
assert(run('hardDue>easyDue'),'shocks arrive more often on Hard');
assert(run('shockScaleV6()<1'),'and are milder on Easy');

// ---- rival behaviour is symmetric: friendlier on Easy, hostile on Hard.
run("newGame();applyDifficulty('easy',true);S.options.ai=true;const warmBefore=relation('BRA','ARG');for(let i=0;i<60;i++)simulateMonth();const warmAfter=relation('BRA','ARG');");
assert(run('warmAfter>=warmBefore'),'Easy rivals do not turn hostile on their own');
run("newGame();applyDifficulty('hard',true);S.options.ai=true;for(const a of S.nations)for(const b of S.nations)if(a.id<b.id)setRelation(a.id,b.id,-60);const before=S.embargoes.length;for(let i=0;i<240;i++)simulateMonth();");
assert(run('S.embargoes.length>before'),'Hard rivals impose sanctions when relations are bad');
run("newGame();applyDifficulty('hard',true);S.options.ai=true;for(let i=0;i<240;i++)simulateMonth();");
assert(run('S.nations.every(n=>!n.war||n.war.target===S.player&&player().war)'),'no AI nation starts a war unprompted');

// ---- the start screen offers all three modes and a way in.
run("newGame();startScreen();const startHTML=$('modalContent').innerHTML;");
assert(run("['easy','medium','hard'].every(k=>startHTML.includes('data-start=\"'+k+'\"'))"),'every mode is offered');
assert(run("startHTML.includes('Easy')&&startHTML.includes('Medium')&&startHTML.includes('Hard')"),'modes are named');
assert(run("startHTML.includes('switched off')"),'the debt rule is stated up front');
run("closeModal()");

// ---- Sandbox exposes the debt switch and the mode buttons.
run("newGame();setView('settings');const settings=$('panel').innerHTML;");
assert(run("settings.includes('data-option=\"noDebt\"')"),'the debt toggle is in Sandbox');
assert(run("['easy','medium','hard'].every(k=>settings.includes('data-difficulty=\"'+k+'\"'))"),'mode buttons are in Sandbox');
run("setView('economy');const econ=$('panel').innerHTML;");
assert(run("econ.includes('switched off')"),'the economy panel explains a debt-free world');
run("applyDifficulty('medium',true);setView('economy');");
assert(run("!$('panel').innerHTML.includes('National debt · switched off')"),'and drops the notice when debt is on');

// ---- the V5 core still holds on this build.
run("newGame();applyDifficulty('medium',true);S.options.shocks=false;S.options.ai=false;simulateMonth();");
assert(run(`S.nations.every(n=>{const L=n.pop*n.participation*(1-n.nairu/100);
 return Math.abs(n.potentialGdp-n.tfp*Math.pow(n.capitalStock,ALPHA)*Math.pow(Math.max(.005,L),1-ALPHA))<1e-6*Math.max(1,n.potentialGdp)})`),'Y* = A K^a L^(1-a)');
assert(run('S.nations.every(n=>Math.abs(n.decomposition.capital+n.decomposition.labour+n.decomposition.tfp-n.potentialGrowth)<1e-6)'),'growth accounting adds up');
assert(run('S.nations.every(n=>n.capital>=0&&n.capital<=100&&n.capital!==n.capitalStock)'),'political capital is not the capital stock');
assert.equal(run('S.nations.reduce((a,n)=>a+n.cities.length,0)'),1198,'the city catalogue survives');
run("S.options.infiniteCapital=true;selected='ARG';setRelation('BRA','ARG',60);");
assert.equal(run("signTrade('ARG','import','energy',1)"),true,'trade still works');
run("prepareV4Month()");assert(run('player().imports>0'),'deliveries still arrive');

// ---- fifty years in each mode stays finite, bounded and loadable.
for(const mode of ['easy','medium','hard']){
 run(`newGame();applyDifficulty('${mode}',true);S.options.shocks=${mode!=='easy'};S.options.ai=true;for(let i=0;i<600;i++)simulateMonth();`);
 assert(run(`S.nations.every(n=>Number.isFinite(n.gdp)&&n.gdp>0&&Number.isFinite(n.debt)&&n.debt>=0
  &&Number.isFinite(n.capitalStock)&&n.capitalStock>0&&Number.isFinite(n.tfp)&&n.tfp>0
  &&n.inflation>-25&&n.inflation<200&&n.unemployment>0&&n.unemployment<40
  &&n.participation>.2&&n.participation<.85&&n.pop>0&&n.capital>=0&&n.capital<=100
  &&n.history.length<=120&&n.cities.every(c=>c.queue.length<=3)&&n.politics.seats.reduce((a,b)=>a+b,0)===100)`),mode+' stays sane for fifty years');
 if(mode==='easy')assert(run('S.nations.every(n=>n.debt===0)'),'Easy stays debt-free for fifty years');
 else assert(run('S.nations.some(n=>n.debt>0)'),mode+' actually carries debt');
 run('validSave(JSON.parse(JSON.stringify(S)))');
}

// ---- earlier saves migrate. A V5 world keeps its debt, so it arrives on Medium, not Easy.
const v5=makeGame('build/v5.html');
v6.scope.legacyJSON=v5.run("S.month=30;JSON.stringify(S)");
run('loadSave(legacyJSON)');
assert.equal(run('S.version'),6);assert.equal(run('S.month'),30);
assert.equal(run('S.options.difficulty'),'medium','a V5 world with debt migrates to Medium');
assert.equal(run('S.options.noDebt'),false,'migration never silently erases an existing debt stock');
run('validSave(JSON.parse(JSON.stringify(S)));simulateMonth()');
for(const [label,file] of [['V4','build/v4.html'],['V3','src/base/sovereign-v3.html'],['V1','src/base/sovereign-v1.html']]){
 const old=makeGame(file);v6.scope.legacyJSON=old.run('S.month=9;JSON.stringify(S)');
 run('loadSave(legacyJSON)');
 assert.equal(run('S.version'),6,label+' migrates to 6');
 assert.equal(run('S.nations.length'),204,label+' gains the added countries');
 assert(run("!!DIFFICULTY[S.options.difficulty]&&typeof S.options.noDebt==='boolean'"),label+' gains difficulty rules');
 run('validSave(JSON.parse(JSON.stringify(S)));simulateMonth()');
}

// ---- corrupt rule sets are rejected atomically.
run("newGame();const good=JSON.parse(JSON.stringify(S))");
for(const [name,mutation] of [
 ['unknown difficulty','b.options.difficulty="impossible"'],
 ['non-boolean debt rule','b.options.noDebt="yes"'],
 ['out-of-range shock scale','b.options.shockScale=99'],
 ['negative capital rate','b.options.capitalRate=-1'],
 ['zero shock interval','b.options.shockEvery=0'],
 ['debt in a debt-free world','b.options.noDebt=true;b.nations[0].debt=500'],
 ['missing monetary state','b.nations[0].mon=null'],
 ['renamed city','b.nations[0].cities[0].name="<script>"'],
])assert.throws(()=>run(`(()=>{const b=JSON.parse(JSON.stringify(good));${mutation};validSave(b)})()`),undefined,name+' must be rejected');

const api=v6.registry.get('advance_simulation'),month=run('S.month');
api.execute({months:2});assert.equal(run('S.month'),month+2);

console.log(JSON.stringify({status:'PASS',version:6,nations:204,cities:1198,
 defaultMode:'easy',defaultNoDebt:true,
 policies:run('POLICY.length'),programs:run('PROGRAMS.length'),
 fileBytes:Buffer.byteLength(v6.html),lastTickMs:+run('perf').toFixed(2),
 checks:['boots into Easy with debt removed','modes strictly ordered easy→hard',
  'thirty years of deficits create no debt','no interest or debt service when off',
  'switching mode never restarts the world','harder modes restore and accumulate debt',
  'returning to Easy clears the stock','hand-edited rules mark a mode customised',
  'reform cost, capital regen and shock cadence scale','start screen offers all three modes',
  'Sandbox exposes the debt switch','economy panel explains a debt-free world',
  'V5 production function and growth accounting','city catalogue and trade intact',
  'fifty years sane in all three modes','V1/V3/V4/V5 migration keeps existing debt',
  'atomic rejection of corrupt rule sets','WebMCP actions']},null,2));
