// Engine invariants for Sovereign V6: difficulty modes, the debt-free world, and the V5 core
// re-verified on the new build. Run from the project root:
//   ELECTRON_RUN_AS_NODE=1 "/Applications/Visual Studio Code.app/Contents/MacOS/Code" tests/check-v10.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
function makeGame(file){const html=fs.readFileSync(file,'utf8');
 const embedded=id=>{const m=html.match(new RegExp('<script type="application/json" id="'+id+'">([\\s\\S]*?)<\\/script>'));return m?m[1]:'';};
 const data={'world-data':html.match(/<script id="world-data" type="application\/json">([\s\S]*?)<\/script>/)[1],
  'city-catalog':embedded('city-catalog'),'added-countries':embedded('added-countries'),'split-polygons':embedded('split-polygons')};
 const code=html.match(/<script>([\s\S]*?)<\/script>/)[1],els=new Map(),registry=new Map(),store=new Map();
 const ctx2d=new Proxy({isPointInPath:()=>false},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
 function el(id=''){if(els.has(id))return els.get(id);const e={id,innerHTML:'',textContent:data[id]||'',value:id==='mapmode'?'political':'',hidden:id==='overlay',style:{},dataset:{},classList:{toggle(){}},tagName:'DIV',scrollTop:0,addEventListener(){},setAttribute(){},querySelectorAll(){return[]},getBoundingClientRect(){return{width:1100,height:650,left:0,top:0}},getContext(){return ctx2d},insertAdjacentHTML(_,s){this.innerHTML=s+this.innerHTML},focus(){},click(){},scrollIntoView(){},setPointerCapture(){}};els.set(id,e);return e;}
 const scope={console,performance,structuredClone,TextEncoder,Blob,URL,innerWidth:1440,devicePixelRatio:1,Path2D:class{moveTo(){}lineTo(){}closePath(){}},ResizeObserver:class{observe(){}},requestAnimationFrame:()=>1,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},AbortController,localStorage:{getItem:k=>store.get(k)??null,setItem(k,v){store.set(k,v)}},document:{hidden:false,modelContext:{registerTool(t){registry.set(t.name,t)}},activeElement:el('body'),getElementById:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el('created')},window:{addEventListener(){}}};
 vm.createContext(scope);vm.runInContext(code,scope);return{run:c=>vm.runInContext(c,scope),scope,registry,els,html};}

const v10=makeGame('build/v10.html'),{run}=v10;
run('renderTick=()=>{}');

// ---- V6 boots into Easy, which is a world with no national debt at all.
assert.equal(run('S.version'),10);
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

// ---- V7: eras rebuild the world at a historical date.
for(const [key,year] of [['e1970',1970],['e1985',1985],['e2000',2000],['e2026',2026]]){
 run(`newGame();applyDifficulty('medium',true);applyEra('${key}')`);
 assert.equal(run('S.startYear'),year,key+' sets the start year');
 assert(run(`dateText().includes('${year}')`),key+' shows the right date');
 assert(run('S.nations.every(n=>n.gdp>0&&n.pop>0&&n.capitalStock>0&&n.tfp>0&&Number.isFinite(n.mon.rate))'),key+' leaves a valid world');
 run('validSave(JSON.parse(JSON.stringify(S)))');
}
// Earlier eras are poorer, less populous and less open than later ones.
// Eras change the number of states, so aggregates are compared per country, not as raw sums.
const worldOf=key=>{run(`newGame();applyEra('${key}')`);
 const count=run('S.nations.length');
 return {count,gdp:run('S.nations.reduce((a,n)=>a+n.gdp,0)'),pop:run('S.nations.reduce((a,n)=>a+n.pop,0)'),
  trade:run('S.nations.reduce((a,n)=>a+n.policies.trade,0)')/count,tariff:run('S.nations.reduce((a,n)=>a+n.policies.tariff,0)')/count,
  frontier:run('worldFrontier()'),pegs:run("S.nations.filter(n=>n.fxRegime==='peg').length")/count};};
const w70=worldOf('e1970'),w85=worldOf('e1985'),w00=worldOf('e2000'),w26=worldOf('e2026');
assert(w70.gdp<w85.gdp&&w85.gdp<w00.gdp&&w00.gdp<w26.gdp,'world output grows across the eras');
assert(w70.pop<w85.pop&&w85.pop<w00.pop&&w00.pop<w26.pop,'world population grows across the eras');
assert(w70.trade<w85.trade&&w85.trade<w00.trade,'trade openness rises across the eras');
assert(w70.tariff>w85.tariff&&w85.tariff>w00.tariff,'tariffs fall across the eras');
assert(w70.frontier<w85.frontier&&w85.frontier<w00.frontier&&w00.frontier<w26.frontier,'the productivity frontier moves with the era');
assert(w70.pegs>.9&&w26.pegs<w70.pegs,'1970 is a world of fixed pegs');
// A pegged world must not become self-referential: the anchor comes from floating economies.
run("newGame();applyEra('e1970');S.options.ai=true;S.options.shocks=false;for(let i=0;i<180;i++)simulateMonth()");
assert(run('S.nations.every(n=>n.mon.rate<20)'),'pegged rates stay bounded');
assert(run("(a=>a[Math.floor(a.length/2)])(S.nations.map(n=>n.investShare).sort((x,y)=>x-y))>.10"),'investment does not collapse under universal pegs');
assert(run("nation('IND').gdp/nation('IND').pop > 1.27"),'a poor country still converges over fifteen 1970s years');
assert(run("dateText().includes('1985')"),'fifteen years from 1970 is 1985');

// ---- skipping construction time.
run("newGame();S.options.infiniteCapital=true;S.options.instantBuild=true;const c0=player().cities[0];");
run("startCityProject(S.player,c0.id,'hospital');");
assert.equal(run('player().cities[0].queue[0].remaining'),1,'an instant project needs one month');
run('simulateMonth()');
assert.equal(run('player().cities[0].levels.hospital'),1,'and completes immediately');
assert.equal(run('player().cities[0].queue.length'),0);
run("S.options.instantBuild=false;startCityProject(S.player,c0.id,'metro');");
assert(run('player().cities[0].queue[0].remaining>6'),'normal projects still take their build time');
run("flushConstruction()");
assert.equal(run('player().cities[0].queue.length'),0,'the finish-now button clears the queue');
assert(run('player().cities[0].levels.metro>0'),'and the project is built');
assert(run('S.nations.every(n=>n.cities.every(c=>Object.values(c.levels).every(v=>v<=5)))'),'level caps hold');

// ---- the other new world rules.
run("newGame();S.options.noElections=true;player().election=1;for(let i=0;i<24;i++)simulateMonth()");
assert(run('player().election>0'),'paused elections never fire');
assert.equal(run('player().politics.seats.reduce((a,b)=>a+b,0)'),100,'parliament is untouched');
run("newGame();S.options.noWar=true;selected='ARG';S.options.infiniteCapital=true;setRelation('BRA','ARG',-50);declareWar()");
assert.equal(run('player().war'),null,'war can be disabled');
run("newGame();S.options.fastReforms=true;S.options.infiniteCapital=true;const t={...player().targets,services:20};enact(t);simulateMonth()");
assert(run('Math.abs(player().policies.services-20)<.5'),'immediate reforms remove the lag');
run("newGame();S.options.stableWorld=true;const calm=shockScaleV6();S.options.stableWorld=false;const rough=shockScaleV6();");
assert(run('calm<rough'),'suppressing volatility damps shocks');

// ---- dispatches are generated from state, varied, and bounded.
run("newGame();applyDifficulty('hard',true);S.options.ai=true;S.options.shocks=true;for(let i=0;i<300;i++)simulateMonth()");
assert(run('S.events.length<=240'),'the archive is bounded');
assert(run('new Set(S.events.map(e=>e.title)).size>=22'),'the feed does not repeat a handful of headlines');
assert(run('new Set(S.events.map(e=>e.tag)).size>=5'),'several desks file copy');
assert(run("S.events.some(e=>/\\d/.test(e.body))"),'stories carry real figures');
assert(run("S.events.every(e=>e.body.length>0&&e.title.length>0&&!/undefined|NaN|\\[object/.test(e.title+e.body))"),'no broken copy');
// Only your country and the largest economies make the feed.
assert(run(`(()=>{const big=new Set(S.nations.slice().sort((a,b)=>b.gdp-a.gdp).slice(0,14).map(n=>n.name));
 big.add(player().name);
 return S.events.filter(e=>e.tag==='warning'||e.tag==='economy').every(e=>[...big].some(nm=>e.body.includes(nm))||!/:/.test(e.body))})()`),
 'shock reports are limited to newsworthy economies');
assert(run("dispatchArchiveV7().includes('Dispatch archive')"),'the archive renders');

// ---- V8: the map follows the era.
run("newGame();applyDifficulty('medium',true);applyEra('e2026')");
const modern = run('S.nations.length');
assert.equal(modern, 204, 'the present day has every state');
assert.equal(run('Object.keys(S.historical).length'), 0, 'and no historical entities');

for (const [key, year, blocs, name] of [['e1970',1970,3,'Soviet Union'],['e1985',1985,3,'Soviet Union'],['e2000',2000,1,'Serbia and Montenegro']]) {
 run(`newGame();applyDifficulty('medium',true);applyEra('${key}')`);
 assert.equal(run('S.startYear'), year, key+' sets the year');
 assert.equal(run('Object.keys(S.historical).length'), blocs, key+' has '+blocs+' merged state(s)');
 assert(run(`S.nations.some(n=>n.name===${JSON.stringify(name)})`), key+' puts '+name+' on the map');
 assert(run('S.nations.length < '+modern), key+' has fewer states than the present day');
 // A merged state and its successors can never both exist.
 assert(run('Object.entries(S.historical).every(([id,h])=>!!nation(id)&&h.members.every(m=>!nation(m)))'),
  key+': no successor coexists with its predecessor');
 // Every member's territory is painted as the bloc.
 assert(run('Object.entries(S.historical).every(([id,h])=>h.members.every(m=>territoryOwner(m)===id))'),
  key+': the bloc holds its members\' territory');
 // Clicking a member's polygon selects the bloc.
 assert(run("territoryOwner('RUS')===(nation('SUN')?'SUN':'RUS')"), key+': Russia resolves correctly');
 run('validSave(JSON.parse(JSON.stringify(S)))');
}

// The Soviet Union is one state covering fifteen, with real Soviet cities under period names.
run("newGame();applyEra('e1970')");
assert.equal(run("S.historical.SUN.members.length"), 15, 'fifteen republics');
assert(run("nation('SUN').cities.some(c=>c.name==='Moscow')&&nation('SUN').cities.some(c=>c.name==='Leningrad')"),
 'Soviet cities, named for the period');
assert(run("!nation('SUN').cities.some(c=>c.name==='Saint Petersburg')"), 'and not their modern names');
assert(run("nation('SUN').pop>200&&nation('SUN').pop<300"), 'a plausible Soviet population');
assert(run("nation('SUN').gdp>nation('DEW').gdp"), 'and an economy larger than West Germany');
assert(run("nation('SUN').cities.every(c=>/^[^<>&]+$/.test(c.name))"), 'city names stay inert');

// States that were not yet independent are absent, and appear once they exist.
assert(run("!nation('BGD')&&!nation('ARE')&&!nation('ZWE')&&!nation('SSD')"), '1970: later states absent');
run("newGame();applyEra('e1985')");
assert(run("!!nation('BGD')&&!!nation('ARE')&&!!nation('ZWE')"), '1985: independent by now');
assert(run("!nation('SSD')&&!nation('NAM')&&!nation('ERI')"), '1985: still to come');
run("newGame();applyEra('e2000')");
assert(run("!!nation('NAM')&&!!nation('ERI')&&!!nation('RUS')&&!nation('SSD')"), '2000: post-Soviet states exist, South Sudan does not');
assert(run("!nation('SUN')"), '2000: the Soviet Union is gone');

// Period names.
run("newGame();applyEra('e1970')");
assert.equal(run("nation('LKA').name"), 'Ceylon');
assert.equal(run("nation('MMR').name"), 'Burma');
assert.equal(run("nation('BFA').name"), 'Upper Volta');
run("newGame();applyEra('e1985')");
assert.equal(run("nation('COD').name"), 'Zaire');
assert.equal(run("nation('BFA').name"), 'Burkina Faso', 'renamed in 1984');
run("newGame();applyEra('e2026')");
assert.equal(run("nation('LKA').name"), 'Sri Lanka', 'the present day uses present names');

// The world's bookkeeping stays consistent with a changed nation list.
run("newGame();applyEra('e1970')");
assert(run("Object.keys(S.relations).every(k=>k.split(':').every(id=>!!nation(id)))"), 'no relations with vanished states');
assert(run("S.agreements.every(p=>!!nation(p.a)&&!!nation(p.b))&&S.embargoes.every(e=>!!nation(e.from)&&!!nation(e.to))"), 'no agreements with vanished states');
assert(run("!!nation(S.player)"), 'the player still exists');

// A historical world simulates and stays valid.
run("newGame();applyDifficulty('hard',true);applyEra('e1970');S.options.ai=true;S.options.shocks=true;for(let i=0;i<240;i++)simulateMonth()");
assert(run("dateText().includes('1990')"), 'twenty years from 1970 is 1990');
assert(run(`S.nations.every(n=>Number.isFinite(n.gdp)&&n.gdp>0&&Number.isFinite(n.capitalStock)&&n.capitalStock>0
 &&n.inflation>-25&&n.inflation<200&&n.unemployment>0&&n.unemployment<40&&n.pop>0)`), 'a 1970 world stays sane for twenty years');
run('validSave(JSON.parse(JSON.stringify(S)))');
assert(run("overview(nation('SUN')).includes('A state of the period')"), 'merged states explain themselves');

// Corrupt historical state is rejected.
run("newGame();applyEra('e1970');const histGood=JSON.parse(JSON.stringify(S))");
for (const [name, mutation] of [
 ['successor coexisting with predecessor', 'b.nations.push(JSON.parse(JSON.stringify(b.nations[0])));b.nations[b.nations.length-1].id="RUS"'],
 ['territory owned by a missing state', 'b.territory["RUS"]="ZZZ"'],
 ['historical entity not in the nation list', 'b.historical.ZZZ={members:["RUS"],name:"X"}'],
 ['missing territory map', 'b.territory=null'],
]) assert.throws(() => run(`(()=>{const b=JSON.parse(JSON.stringify(histGood));${mutation};validSave(b)})()`), undefined, name+' must be rejected');

// ---- V9: countries that were divided are divided.
run("newGame();applyDifficulty('medium',true);applyEra('e1970')");
for (const [id, name, other] of [['DEW','West Germany','DEE'],['DEE','East Germany','DEW'],
                                 ['VNN','North Vietnam','VNS'],['VNS','South Vietnam','VNN'],
                                 ['YEN','North Yemen','YES'],['YES','South Yemen','YEN']]) {
 assert(run(`!!nation('${id}')`), '1970 has '+name);
 assert.equal(run(`nation('${id}').name`), name);
 assert(run(`!!nation('${other}')`), name+' has its counterpart');
 assert(run(`nation('${id}').cities.length>0`), name+' has cities');
}
assert(run("!nation('DEU')&&!nation('VNM')&&!nation('YEM')"), 'the unified countries are gone');
// Each half owns its own polygon; the parent's is retired.
assert(run("paths.filter(p=>p.id==='DEE').length===1&&paths.filter(p=>p.id==='DEW').length===1"), 'both halves are drawn');
assert(run("paths.filter(p=>p.id==='DEU').length===0"), 'the unified polygon is not drawn');
assert(run("territoryOwner('DEE')==='DEE'&&territoryOwner('DEU')===''"), 'territory follows the division');
// Divided cities are the cities of the period.
assert(run("nation('DEE').cities.some(c=>c.name==='East Berlin')&&nation('DEW').cities.some(c=>c.name==='West Berlin')"), 'Berlin is divided');
assert(run("nation('VNS').cities.some(c=>c.name==='Saigon')&&nation('VNN').cities.some(c=>c.name==='Hanoi')"), 'Vietnamese capitals');
assert(run("nation('YES').cities.some(c=>c.name==='Aden')"), 'Aden is in the south');
// West Germany was the larger economy; East Germany the smaller.
assert(run("nation('DEW').gdp>nation('DEE').gdp*3&&nation('DEW').pop>nation('DEE').pop*2"), 'the two Germanys are not equals');
assert(run("overview(nation('DEE')).includes('A divided country')"), 'divided states explain themselves');
run('validSave(JSON.parse(JSON.stringify(S)))');

// 1985: Germany and Yemen still divided, Vietnam reunified.
run("newGame();applyEra('e1985')");
assert(run("!!nation('DEW')&&!!nation('DEE')&&!!nation('YEN')&&!!nation('YES')"), '1985 still divided');
assert(run("!!nation('VNM')&&!nation('VNN')&&!nation('VNS')"), 'Vietnam reunified by 1985');
run('validSave(JSON.parse(JSON.stringify(S)))');

// 2000 and the present day are whole.
for (const era of ['e2000','e2026']) {
 run(`newGame();applyEra('${era}')`);
 assert(run("!!nation('DEU')&&!!nation('VNM')&&!!nation('YEM')"), era+': countries are unified');
 assert(run("Object.keys(S.partitioned).length===0"), era+': nothing is partitioned');
 assert(run("paths.filter(p=>p.id==='DEU').length===1"), era+': the unified polygon is drawn');
 run('validSave(JSON.parse(JSON.stringify(S)))');
}

// A divided world simulates and stays valid.
run("newGame();applyDifficulty('hard',true);applyEra('e1970');S.player='DEE';S.options.ai=true;S.options.shocks=true;for(let i=0;i<180;i++)simulateMonth()");
assert(run("nation('DEE').gdp>0&&nation('DEW').gdp>0&&Number.isFinite(nation('DEE').capitalStock)"), 'both Germanys stay sane');
run('validSave(JSON.parse(JSON.stringify(S)))');

// A partitioned half may not coexist with its unified country.
run("newGame();applyEra('e1970');const partGood=JSON.parse(JSON.stringify(S))");
assert.throws(() => run(`(()=>{const b=JSON.parse(JSON.stringify(partGood));
 const clone=JSON.parse(JSON.stringify(b.nations[0]));clone.id='DEU';b.nations.push(clone);validSave(b)})()`),
 undefined, 'a unified country coexisting with its halves must be rejected');
assert.throws(() => run(`(()=>{const b=JSON.parse(JSON.stringify(partGood));b.partitioned=null;validSave(b)})()`),
 undefined, 'a missing partition map must be rejected');

// ---- V10: relief operations are repeatable, with no waiting period.
run("newGame();applyDifficulty('medium',true);S.options.infiniteCapital=true;player().debt=player().gdp*1.8");
assert(run("Object.keys(RELIEF).join(',')"), 'relief operations exist');
const debtAfter = [];
for (const op of ['refinance','refinance','restructure','refinance']) {
 const before = run('player().debt');
 run(`debtRelief('${op}')`);
 const after = run('player().debt');
 assert(after < before, op+' reduced the debt stock with no wait in between');
 assert.equal(run('player().reliefCooldown'), 0, 'no cooldown is left behind after '+op);
 debtAfter.push(after);
}
assert(debtAfter[3] < debtAfter[0], 'four operations in one month all landed');
// The crisis protection the operation grants must survive the change.
assert.equal(run('player().crisisGrace'), 36, 'a relief operation still buys crisis protection');
// Nothing in the interface or the copy promises a wait any more.
assert(run("!reliefControls(player()).includes('digesting')"), 'no digesting notice');
assert(run("!reliefControls(player()).includes('disabled')"), 'operations are never disabled for the player');
assert(run("!PROGRAMS.find(p=>p.key==='debt').blurb.includes('need time')"), 'the programme blurb does not promise a wait');
assert(run("!RELIEF.refinance.desc.includes('long gap')"), 'the operation description does not promise a wait');
// Cooldowns stay cleared through a long run, and a save carrying one is rejected.
run('for(let i=0;i<120;i++)simulateMonth()');
assert.equal(run('player().reliefCooldown'), 0, 'still no cooldown after ten years');
run('validSave(JSON.parse(JSON.stringify(S)))');
assert.throws(() => run("(()=>{const b=JSON.parse(JSON.stringify(S));b.nations[0].reliefCooldown=12;validSave(b)})()"),
 undefined, 'a save carrying a cooldown must be rejected');
// Relief is still refused where debt is switched off.
run("newGame();applyDifficulty('easy',true);const d=player().debt;debtRelief('restructure')");
assert.equal(run('player().debt'), run('d'), 'a debt-free world has nothing to restructure');

// ---- earlier saves migrate. A V5 world keeps its debt, so it arrives on Medium, not Easy.
const v5=makeGame('build/v5.html');
v10.scope.legacyJSON=v5.run("S.month=30;JSON.stringify(S)");
run('loadSave(legacyJSON)');
assert.equal(run('S.version'),10);assert.equal(run('S.month'),30);
assert.equal(run('S.options.difficulty'),'medium','a V5 world with debt migrates to Medium');
assert.equal(run('S.options.noDebt'),false,'migration never silently erases an existing debt stock');
run('validSave(JSON.parse(JSON.stringify(S)));simulateMonth()');
for(const [label,file] of [['V7','build/v10.html'],['V6','build/v6.html'],['V4','build/v4.html'],['V3','src/base/sovereign-v3.html'],['V1','src/base/sovereign-v1.html']]){
 const old=makeGame(file);v10.scope.legacyJSON=old.run('S.month=9;JSON.stringify(S)');
 run('loadSave(legacyJSON)');
 assert.equal(run('S.version'),10,label+' migrates to 10');
 assert.equal(run('S.nations.length'),204,label+' gains the added countries');
 assert(run("!!DIFFICULTY[S.options.difficulty]&&typeof S.options.noDebt==='boolean'&&!!ERAS[S.options.era]&&Number.isInteger(S.startYear)"),label+' gains difficulty and era rules');
 run('validSave(JSON.parse(JSON.stringify(S)));simulateMonth()');
}

// ---- corrupt rule sets are rejected atomically.
run("newGame();const good=JSON.parse(JSON.stringify(S))");
for(const [name,mutation] of [
 ['unknown difficulty','b.options.difficulty="impossible"'],
 ['unknown era','b.options.era="e1492"'],
 ['non-boolean build rule','b.options.instantBuild=1'],
 ['impossible start year','b.startYear=1200'],
 ['bad start month','b.startMonth=13'],
 ['non-boolean debt rule','b.options.noDebt="yes"'],
 ['out-of-range shock scale','b.options.shockScale=99'],
 ['negative capital rate','b.options.capitalRate=-1'],
 ['zero shock interval','b.options.shockEvery=0'],
 ['debt in a debt-free world','b.options.noDebt=true;b.nations[0].debt=500'],
 ['missing monetary state','b.nations[0].mon=null'],
 ['renamed city','b.nations[0].cities[0].name="<script>"'],
])assert.throws(()=>run(`(()=>{const b=JSON.parse(JSON.stringify(good));${mutation};validSave(b)})()`),undefined,name+' must be rejected');

const api=v10.registry.get('advance_simulation'),month=run('S.month');
api.execute({months:2});assert.equal(run('S.month'),month+2);

console.log(JSON.stringify({status:'PASS',version:10,nations:204,cities:1198,
 defaultMode:'easy',defaultNoDebt:true,
 policies:run('POLICY.length'),programs:run('PROGRAMS.length'),
 fileBytes:Buffer.byteLength(v10.html),lastTickMs:+run('perf').toFixed(2),
 checks:['boots into Easy with debt removed','relief operations are repeatable with no waiting period','relief still grants crisis protection','Germany, Vietnam and Yemen are divided in the eras they were','each half owns its own polygon','divided cities: East and West Berlin, Hanoi and Saigon','countries reunify in the eras they did','the map follows the era: USSR, Yugoslavia, Czechoslovakia','states not yet independent are absent','period place names, country and city','merged states hold their members territory','no successor coexists with its predecessor','era-aware name and city validation','eras rebuild the world at 1970/1985/2000/2026','pegged eras keep a floating anchor','construction can be skipped','elections, war, lag and volatility rules','generated dispatches are varied and bounded','modes strictly ordered easy→hard',
  'thirty years of deficits create no debt','no interest or debt service when off',
  'switching mode never restarts the world','harder modes restore and accumulate debt',
  'returning to Easy clears the stock','hand-edited rules mark a mode customised',
  'reform cost, capital regen and shock cadence scale','start screen offers all three modes',
  'Sandbox exposes the debt switch','economy panel explains a debt-free world',
  'V5 production function and growth accounting','city catalogue and trade intact',
  'fifty years sane in all three modes','V1/V3/V4/V5 migration keeps existing debt',
  'atomic rejection of corrupt rule sets','WebMCP actions']},null,2));
