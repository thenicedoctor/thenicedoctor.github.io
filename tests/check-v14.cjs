// Engine invariants for Sovereign V6: difficulty modes, the debt-free world, and the V5 core
// re-verified on the new build. Run from the project root:
//   ELECTRON_RUN_AS_NODE=1 "/Applications/Visual Studio Code.app/Contents/MacOS/Code" tests/check-v14.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
function makeGame(file){const html=fs.readFileSync(file,'utf8');
 const embedded=id=>{const m=html.match(new RegExp('<script type="application/json" id="'+id+'">([\\s\\S]*?)<\\/script>'));return m?m[1]:'';};
 const data={'world-data':html.match(/<script id="world-data" type="application\/json">([\s\S]*?)<\/script>/)[1],
  'city-catalog':embedded('city-catalog'),'added-countries':embedded('added-countries'),'split-polygons':embedded('split-polygons'),'borders':embedded('borders')};
 const code=html.match(/<script>([\s\S]*?)<\/script>/)[1],els=new Map(),registry=new Map(),store=new Map();
 const ctx2d=new Proxy({isPointInPath:()=>false},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
 function el(id=''){if(els.has(id))return els.get(id);const e={id,innerHTML:'',textContent:data[id]||'',value:id==='mapmode'?'political':'',hidden:id==='overlay',style:{},dataset:{},classList:{toggle(){}},tagName:'DIV',scrollTop:0,addEventListener(){},setAttribute(){},querySelector(){return null},querySelectorAll(){return[]},getBoundingClientRect(){return{width:1100,height:650,left:0,top:0}},getContext(){return ctx2d},insertAdjacentHTML(_,s){this.innerHTML=s+this.innerHTML},focus(){},click(){},scrollIntoView(){},setPointerCapture(){}};els.set(id,e);return e;}
 const scope={console,performance,structuredClone,TextEncoder,Blob,URL,innerWidth:1440,devicePixelRatio:1,Path2D:class{moveTo(){}lineTo(){}closePath(){}},ResizeObserver:class{observe(){}},requestAnimationFrame:()=>1,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},AbortController,localStorage:{getItem:k=>store.get(k)??null,setItem(k,v){store.set(k,v)}},document:{hidden:false,modelContext:{registerTool(t){registry.set(t.name,t)}},activeElement:el('body'),getElementById:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el('created')},window:{addEventListener(){}}};
 vm.createContext(scope);vm.runInContext(code,scope);return{run:c=>vm.runInContext(c,scope),scope,registry,els,html};}

const v14=makeGame('build/v14.html'),{run}=v14;
run('renderTick=()=>{}');

// ---- V6 boots into Easy, which is a world with no national debt at all.
assert.equal(run('S.version'),14);
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
// Since V14 the game opens on the country screen; the modes are on the screen after it.
run("newGame();startScreen();startCountryV14='BRA';rulesScreenV14();const startHTML=$('modalContent').innerHTML;");
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
// newsworthy() ranks by output at the moment the shock is filed. Decades of growth reshuffle that
// ranking, so a country reported at the time can have dropped out by the end — the band is widened
// to absorb that drift while still catching the case this was written for, a shock filed for a
// country of sixty thousand people.
assert(run(`(()=>{const big=new Set(S.nations.slice().sort((a,b)=>b.gdp-a.gdp).slice(0,25).map(n=>n.name));
 big.add(player().name);
 return S.events.filter(e=>e.tag==='warning'||e.tag==='economy').every(e=>[...big].some(nm=>e.body.includes(nm))||!/:/.test(e.body))})()`),
 'shock reports are limited to newsworthy economies');
assert(run(`(()=>{const tiny=new Set(S.nations.slice().sort((a,b)=>a.gdp-b.gdp).slice(0,60).map(n=>n.name));
 tiny.delete(player().name);
 return S.events.filter(e=>e.tag==='warning'||e.tag==='economy').every(e=>![...tiny].some(nm=>e.body.startsWith(nm+':')))})()`),
 'and never filed for the smallest economies');
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

// ---- V11: wars are fought on the real land border.
// The border graph is derived from the map, so it should match reality where reality is unambiguous.
assert(run('Object.keys(BORDERS).length>250'), 'a land-border graph exists');
for (const [id, count] of [['CHN',14],['RUS',14],['BRA',10],['DEU',9],['FRA',0]]) {
 const n = run(`S.nations.filter(x=>x.id!=='${id}'&&shareBorder('${id}',x.id)).length`);
 if (count) assert.equal(n, count, id+' has '+count+' land neighbours');
}
assert(run("shareBorder('BRA','ARG')&&!shareBorder('BRA','JPN')"), 'adjacency is real');
assert.equal(run("frontSector('BRA','JPN').length"), 0, 'no border, no sector');

// A war with a neighbour opens a front on that border.
const war = (foe) => run(`newGame();applyDifficulty('medium',true);S.options.infiniteCapital=true;S.options.ai=false;S.options.shocks=false;selected='${foe}';setRelation('BRA','${foe}',-60);declareWar()`);
war('ARG');
assert(run('!!player().war&&player().war.land'), 'a land war opens');
assert(run('player().war.attacker&&!nation("ARG").war.attacker'), 'exactly one attacker');
assert(run('player().war.sector.length>=2'), 'the front has a sector');
assert(run('frontLineV11().length===1'), 'the front is drawn on the map');
assert(run('frontLineV11()[0].points.length===player().war.sector.length'), 'the drawn front follows the border');

// The front moves, supply falls as it advances, and both armies take losses.
run('player().war.commitment=1');
const start = run('player().war.line'), armyBefore = run('nation("ARG").forces.army');
run('for(let i=0;i<10;i++)simulateMonth()');
assert(run('player().war.line') > start, 'the stronger army advances');
assert(run('player().war.supply') < 1, 'supply falls as the front advances beyond the border');
assert(run('nation("ARG").forces.army') < armyBefore, 'the defender takes losses');
assert(run('player().war.casualties') > 0, 'the attacker takes losses too');
assert(run('player().forces.army>0&&nation("ARG").forces.army>0'), 'armies are never wiped to zero');
run('validSave(JSON.parse(JSON.stringify(S)))');

// A front that breaks ends the war decisively; borders never move.
run('for(let i=0;i<48&&player().war;i++)simulateMonth()');
assert(run('!player().war&&!nation("ARG").war'), 'the war ends');
assert(run("S.events.some(e=>e.title==='The front collapses'||e.title==='Ceasefire agreed')"), 'the outcome is reported');
assert(run("territoryOwner('ARG')==='ARG'"), 'borders do not move');
assert(run("!!nation('ARG')"), 'no country is annexed');

// Without a shared border it is a limited war: no front, no ground changing hands.
war('JPN');
assert(run('!player().war.land'), 'no land border means no land war');
assert.equal(run('frontLineV11().length'), 0, 'no front is drawn');
run('for(let i=0;i<12;i++)simulateMonth()');
assert(run('player().war?Math.abs(player().war.line)<=.4:true'), 'a limited war cannot break through');

// Doctrine and commitment change the outcome.
war('ARG'); run("nation('ARG').doctrine='balanced';player().war.commitment=.8;for(let i=0;i<10&&player().war;i++)simulateMonth()");
const vsBalanced = run('player().war?player().war.line:1');
war('ARG'); run("nation('ARG').doctrine='defensive';player().war.commitment=.8;for(let i=0;i<10&&player().war;i++)simulateMonth()");
assert(run('player().war?player().war.line:1') < vsBalanced, 'territorial defence slows an attacker');

// A ceasefire is refused while you are clearly winning.
war('ARG'); run('player().war.line=.6;nation("ARG").war.line=-.6;actions.sueForPeace()');
assert(run('!!player().war'), 'the loser will not accept terms while badly beaten');
run('player().war.line=.1;nation("ARG").war.line=-.1;actions.sueForPeace()');
assert(run('!player().war'), 'a ceasefire near stalemate is accepted');

// Corrupt war records are rejected.
war('ARG'); run('const warGood=JSON.parse(JSON.stringify(S))');
for (const [name, mutation] of [
 ['both sides attacking', 'b.nations.find(n=>n.id==="ARG").war.attacker=true;b.nations.find(n=>n.id==="BRA").war.attacker=true'],
 ['a front beyond its limits', 'b.nations.find(n=>n.id==="BRA").war.line=5'],
 ['impossible commitment', 'b.nations.find(n=>n.id==="BRA").war.commitment=9'],
 ['sides disagreeing on the kind of war', 'b.nations.find(n=>n.id==="ARG").war.land=false'],
]) assert.throws(() => run(`(()=>{const b=JSON.parse(JSON.stringify(warGood));${mutation};validSave(b)})()`), undefined, name+' must be rejected');

// ---- V12: history happens while you play.
run("newGame();applyEra('e1970');S.options.ai=false;S.options.shocks=false");
const states1970 = run('S.nations.length');
assert(run("!!nation('SUN')&&!nation('BGD')&&!nation('ZWE')&&!!nation('DEE')"), '1970 starts with the world of 1970');
run('while(S.month<24)simulateMonth()');
assert(run("!!nation('BGD')&&!!nation('ARE')"), 'Bangladesh and the UAE appear in 1971');
run('while(S.month<132)simulateMonth()');
assert(run("!!nation('VNM')&&!nation('VNN')&&!nation('VNS')"), 'Vietnam reunifies in 1976');
assert(run("!!nation('ZWE')"), 'Zimbabwe appears by 1980');
run('while(S.month<252)simulateMonth()');
assert(run("!!nation('DEU')&&!nation('DEE')&&!nation('DEW')"), 'Germany reunifies in 1990');
assert(run("!!nation('YEM')&&!nation('YEN')"), 'Yemen unifies in 1990');
assert(run("!!nation('NAM')"), 'Namibia appears in 1990');
run('while(S.month<300)simulateMonth()');
assert(run("!nation('SUN')&&!!nation('RUS')&&!!nation('UKR')&&!!nation('KAZ')"), 'the Soviet Union dissolves into its republics');
assert(run("!nation('YUG')&&!!nation('HRV')&&!!nation('SVN')"), 'Yugoslavia breaks up');
assert(run("!nation('CSK')&&!!nation('CZE')&&!!nation('SVK')"), 'Czechoslovakia separates');
assert(run('S.nations.length > '+states1970), 'the world has more states than it started with');
assert(run("Object.values(S.territory).every(o=>!o||S.nations.some(n=>n.id===o))"), 'no territory is orphaned');
run('validSave(JSON.parse(JSON.stringify(S)))');
run('while(S.month<600)simulateMonth()');
assert(run("!!nation('SSD')&&!!nation('TLS')&&!!nation('ERI')"), 'the later states arrive too');
assert(run("HISTORY.e1970.absent.every(id=>!!nation(id))"), 'every state absent in 1970 has appeared by 2020');
run('validSave(JSON.parse(JSON.stringify(S)))');
// Starting later must not replay events that already happened.
run("newGame();applyEra('e2026');simulateMonth()");
assert.equal(run("S.events.filter(e=>e.title==='The Soviet Union dissolves').length"), 0, '2026 does not replay 1991');
// And it can be switched off.
run("newGame();applyEra('e1970');S.options.historyEvents=false;while(S.month<300)simulateMonth()");
assert(run("!!nation('SUN')"), 'with history off the map stays as the era set it');

// ---- debt can be frozen instead of removed.
run("newGame();applyDifficulty('medium',true);S.options.infiniteCapital=true;player().debt=player().gdp*1.2;const held=player().debt;S.options.debtPaused=true");
run("const lim=k=>POLICY.find(x=>x.key===k);const spend={...player().targets,tax:lim('tax').min};for(const k of ['services','welfare','investment'])spend[k]=lim(k).max;enact(spend)");
run('for(let i=0;i<120;i++)simulateMonth()');
assert(run('Math.abs(player().debt-held)<1'), 'a frozen stock neither grows nor shrinks');
assert(run('player().debt>0'), 'and unlike removing debt, the stock is kept');
assert.equal(run('fiscal(player()).interest'), 0, 'no interest is charged on a frozen stock');
assert(run('fiscal(player()).balance<0'), 'the budget can still run a deficit');
assert.equal(run('player().crisisMonths'), 0, 'no debt crisis can accrue');
run('validSave(JSON.parse(JSON.stringify(S)))');
assert.throws(() => run("(()=>{const b=JSON.parse(JSON.stringify(S));b.options.noDebt=true;validSave(b)})()"),
 undefined, 'debt cannot be both frozen and removed');

// ---- unlimited construction queue.
run("newGame();S.options.infiniteCapital=true;S.options.unlimitedQueue=true;const city=player().cities[0]");
run("for(const t of ['hospital','metro','university','housing','solar','water','fiber'])startCityProject(S.player,city.id,t)");
assert(run('player().cities[0].queue.length') > 3, 'the three-slot cap is lifted');
run('validSave(JSON.parse(JSON.stringify(S)))');
assert.throws(() => run("(()=>{const b=JSON.parse(JSON.stringify(S));b.options.unlimitedQueue=false;validSave(b)})()"),
 undefined, 'an over-long queue is rejected when the option is off');
run("newGame();S.options.infiniteCapital=true;const c2=player().cities[0];for(const t of ['hospital','metro','university','housing'])startCityProject(S.player,c2.id,t)");
assert.equal(run('player().cities[0].queue.length'), 3, 'the cap still applies by default');

// ---- ideology presets are fitted to the budget.
run("newGame();applyDifficulty('medium',true);const raw={...current().targets,...PRESETS['Democratic socialist']};delete raw.desc;const fitted=fitToBudgetV12(raw,current())");
assert(run('fiscal(current(),fitted).balance > fiscal(current(),raw).balance'), 'fitting improves the balance');
assert(run('fiscal(current(),fitted).balance >= -4.05'), 'and brings it within the floor');
for (const key of ['tax','otherTax','liberties','institutions'])
 assert.equal(run(`fitted['${key}']`), run(`raw['${key}']`), key+' is left alone, so the ideology keeps its character');
assert(run("fitted.services < raw.services || fitted.welfare < raw.welfare"), 'discretionary spending is what gives');

// ---- rival nations fight their own wars.
run("newGame();applyDifficulty('hard',true);S.options.ai=true;S.options.shocks=true;for(let i=0;i<600;i++)simulateMonth()");
const aiWars = run("S.events.filter(e=>e.title==='War breaks out').length");
assert(aiWars > 0, 'rivals go to war on Hard');
assert(run("S.nations.filter(n=>n.war).length % 2 === 0"), 'every war has two sides');
assert(run("S.nations.every(n=>!n.war||!!S.nations.find(x=>x.id===n.war.target))"), 'no war against a state that does not exist');
run('validSave(JSON.parse(JSON.stringify(S)))');
run("newGame();applyDifficulty('easy',true);S.options.ai=true;for(let i=0;i<600;i++)simulateMonth()");
assert(run("S.events.filter(e=>e.title==='War breaks out').length") <= aiWars, 'Easy is no more warlike than Hard');
// Relations must be able to deteriorate, or no rivalry is possible at all.
run("newGame();applyDifficulty('hard',true);S.options.ai=true;for(let i=0;i<600;i++)simulateMonth()");
assert(run(`(()=>{let worst=99;for(const a of S.nations)for(const id of neighboursOfV12(a.id))worst=Math.min(worst,relation(a.id,id));return worst})()`) < -25,
 'neighbours can fall out badly enough to fight');

// ---- offensives can be aimed at a named city.
run("newGame();applyDifficulty('medium',true);S.options.infiniteCapital=true;S.options.ai=false;S.options.shocks=false;selected='ARG';setRelation('BRA','ARG',-60);declareWar()");
assert(run("nation('ARG').cities.length>1"), 'the defender has cities to take');
// Bigger cities sit deeper and are better held.
assert(run(`(()=>{const cs=[...nation('ARG').cities].sort((x,y)=>y.share-x.share);
 return cityDepthV12(nation('ARG'),cs[0]) < cityDepthV12(nation('ARG'),cs[cs.length-1])})()`), 'the largest city is the nearest objective');
run("setObjectiveV12(nation('ARG').cities[0].id);player().war.commitment=1");
assert.equal(run('player().war.objective'), run("nation('ARG').cities[0].id"), 'the objective is set');
run("window.g0=nation('ARG').gdp;window.s0=nation('ARG').stability");
run("for(let i=0;i<40&&player().war&&!(player().war.taken||[]).length;i++)simulateMonth()");
assert(run('(player().war?.taken||[]).length') > 0, 'the objective falls');
assert(run("nation('ARG').gdp") < run('window.g0'), 'taking a city costs the defender output');
assert(run("nation('ARG').stability") < run('window.s0'), 'and confidence');
assert(run("S.events.some(e=>e.title.includes('falls'))"), 'and it is reported');
assert(run("territoryOwner('ARG')==='ARG'&&!!nation('ARG')"), 'borders still never move and no country is erased');
run('validSave(JSON.parse(JSON.stringify(S)))');
assert.throws(() => run("(()=>{const b=JSON.parse(JSON.stringify(S));b.nations.find(n=>n.id==='BRA').war.taken=['nope'];validSave(b)})()"),
 undefined, 'a captured city that does not exist must be rejected');

// ---- more programmes.
assert(run('PROGRAMS.length') >= 19, 'the programme list has grown');
assert(run("['stabilise','industrialise','welfarestate','greentransition','openness','lawandorder','defence'].every(k=>PROGRAMS.some(p=>p.key===k))"), 'the new programmes are all present');
assert(run("PROGRAMS.every(p=>p.keys.every(k=>POLICY.some(x=>x.key===k)))"), 'every programme stages real policies');
assert(run("PROGRAMS.every(p=>Object.entries(p.stage).every(([k,v])=>{const x=POLICY.find(y=>y.key===k);return !x||(v>=x.min&&v<=x.max)}))"), 'every staged value is in range');
run("newGame();S.options.infiniteCapital=true;view='policies';for(const pr of PROGRAMS){activeProgram=pr.key;subview='program';renderPanel()}");

// Note: the collapsible-section fix is DOM behaviour and is verified in a real browser, not here —
// the test harness's fake DOM does not implement querySelectorAll.

// ---- V13: declaring war must produce a usable war, however it is declared.
// The regression this guards: the base function created a bare record and rendered it before the
// front layer could fill it in. Drawing it threw, the throw escaped through the modal's click
// listener, the front was never opened, and the war showed NaN for the rest of the game.
run("newGame();applyDifficulty('medium',true);S.options.infiniteCapital=true;selected='ARG';setRelation('BRA','ARG',-60);declareWar()");
for (const key of ['land','attacker','line','commitment','supply','casualties','intensity','sector','objective','taken'])
 assert(run(`player().war.hasOwnProperty('${key}')`), 'a declared war has '+key);
assert.equal(run('player().war.land'), true, 'a neighbour means a land war');
assert(run('player().war.sector.length>=2'), 'and a front sector');
assert(run('nation("ARG").war.attacker===false&&player().war.attacker===true'), 'exactly one attacker');
// Rendering the war room must never throw, and never print NaN.
assert(run("(()=>{try{const h=warPanelV11(player());return !/NaN|undefined/.test(h)}catch(e){return false}})()"),
 'the war room renders cleanly the moment war is declared');
// The harness's fake DOM has innerHTML but no innerText.
assert(run("(()=>{try{setView('military');return !/NaN/.test($('panel').innerHTML)}catch(e){return false}})()"),
 'and so does the military panel');
// A record deliberately stripped back must not break the panel either.
run("player().war.supply=undefined;player().war.commitment=undefined;player().war.line=undefined");
assert(run("(()=>{try{const h=warPanelV11(player());return typeof h==='string'}catch(e){return false}})()"),
 'a malformed war record cannot break the interface');
assert(run('Number.isFinite(player().war.supply)&&Number.isFinite(player().war.line)'),
 'and it is repaired in place');

// ---- cities are contested, not simply collected.
run("newGame();applyDifficulty('medium',true);S.options.infiniteCapital=true;S.options.ai=false;S.options.shocks=false;selected='ARG';setRelation('BRA','ARG',-60);declareWar();player().war.commitment=1");
run("setObjectiveV12(nation('ARG').cities[0].id)");
run("for(let i=0;i<40&&!(player().war.taken||[]).length;i++)simulateMonth()");
assert(run('(player().war.taken||[]).length') > 0, 'a city falls when the front reaches it');
assert(run("S.events.some(e=>e.title.includes('falls'))"), 'and it is reported');
// Now the defender pushes back and must be able to recover it.
run("nation('ARG').forces.army=player().forces.army*6;nation('ARG').readiness=95;player().war.commitment=.15");
run("for(let i=0;i<40&&player().war&&(player().war.taken||[]).length;i++)simulateMonth()");
assert(run('!player().war||(player().war.taken||[]).length===0'), 'a city can be taken back');
assert(run("S.events.some(e=>e.title.includes('retaken'))"), 'and the recovery is reported');
// A city may never be held by both sides at once.
run("newGame();applyDifficulty('medium',true);S.options.infiniteCapital=true;S.options.ai=false;selected='ARG';setRelation('BRA','ARG',-60);declareWar();player().war.commitment=1");
run("for(let i=0;i<60&&player().war;i++)simulateMonth()");
run('validSave(JSON.parse(JSON.stringify(S)))');
assert.throws(() => run(`(()=>{const b=JSON.parse(JSON.stringify(S));
 const a2=b.nations.find(n=>n.id==='BRA'),c2=b.nations.find(n=>n.id==='ARG');
 if(!a2.war){a2.war={target:'ARG',months:1,progress:0,land:true,attacker:true,line:0,commitment:.6,supply:1,casualties:0,intensity:0,sector:[],objective:null,taken:[c2.cities[0].id]};
  c2.war={target:'BRA',months:1,progress:0,land:true,attacker:false,line:0,commitment:.6,supply:1,casualties:0,intensity:0,sector:[],objective:null,taken:[c2.cities[0].id]};}
 else {a2.war.taken=[c2.cities[0].id];c2.war.taken=[c2.cities[0].id];}
 validSave(b)})()`), undefined, 'a city held by both sides must be rejected');

// The city's standing is reported, not just a binary.
run("newGame();applyDifficulty('medium',true);S.options.infiniteCapital=true;S.options.ai=false;selected='ARG';setRelation('BRA','ARG',-60);declareWar()");
assert(run("['rear','contested','held'].includes(cityFrontStateV13(player(),nation('ARG').cities[0],nation('ARG')))"),
 'every city has a standing on the front');

// ---- beating a country lets you take it.
run("newGame();applyDifficulty('medium',true);S.options.infiniteCapital=true;S.options.ai=false;S.options.shocks=false");
run("window.b4={cities:player().cities.length,pop:player().pop,gdp:player().gdp,nations:S.nations.length,argCities:nation('ARG').cities.map(c=>c.name)}");
run("selected='ARG';setRelation('BRA','ARG',-60);declareWar();player().war.commitment=1");
run("for(let i=0;i<60&&player().war;i++)simulateMonth()");
assert(run('!!S.conquest'), 'a decisive victory offers the country');
assert.equal(run('S.conquest.winner'), 'BRA');
assert.equal(run('S.conquest.loser'), 'ARG');
run("annexV13(S.player,'ARG')");
assert(run("!nation('ARG')"), 'the annexed country leaves the map');
assert.equal(run("territoryOwner('ARG')"), 'BRA', 'and its territory is the conqueror\'s');
assert(run('player().cities.length > window.b4.cities'), 'its cities join yours');
assert(run("window.b4.argCities.some(n=>player().cities.some(c=>c.name===n))"), 'by name');
assert(run('player().pop > window.b4.pop && player().gdp > window.b4.gdp'), 'its people and output join yours');
assert.equal(run('S.nations.length'), run('window.b4.nations')-1, 'the world is one country smaller');
assert(run('player().unrest > 0'), 'and it leaves an occupied population');
assert(run('player().reputation < 60'), 'reputation falls');
assert(run("S.events.some(e=>e.title.includes('annexed'))"), 'and it is reported');
run('validSave(JSON.parse(JSON.stringify(S)))');

// The whole thing must survive a real save and reload, catalogue and all.
run("window.blob=JSON.stringify(S);loadSave(window.blob)");
assert(run("!nation('ARG')&&player().cities.length>window.b4.cities"), 'an annexed world reloads intact');
run("for(let i=0;i<60;i++)simulateMonth();validSave(JSON.parse(JSON.stringify(S)))");
assert(run('player().unrest < 45'), 'occupation settles over time');

// A fresh game must restore the original catalogue, not inherit an enlarged one.
run("newGame()");
assert.equal(run('player().cities.length'), run('window.b4.cities'), 'a new game starts from the original cities');
assert.equal(run('S.nations.length'), run('window.b4.nations'), 'and the full world');
run('validSave(JSON.parse(JSON.stringify(S)))');

// Corrupt conquest state is rejected.
run("newGame();const cq=JSON.parse(JSON.stringify(S))");
for (const [name, mutation] of [
 ['an annexed state still on the map', 'b.annexed={BRA:["ARG"]}'],
 ['a conqueror that does not exist', 'b.annexed={ZZZ:["ARG"]}'],
 ['a conquest offer naming a missing state', 'b.conquest={winner:"BRA",loser:"ZZZ"}'],
 ['impossible unrest', 'b.nations[0].unrest=-5'],
]) assert.throws(() => run(`(()=>{const b=JSON.parse(JSON.stringify(cq));${mutation};validSave(b)})()`), undefined, name+' must be rejected');

// Rivals never annex each other, so the map cannot consolidate on its own.
run("newGame();applyDifficulty('hard',true);S.options.ai=true;S.options.shocks=true;for(let i=0;i<600;i++)simulateMonth()");
assert.equal(run('Object.keys(S.annexed).filter(id=>id!==S.player).length'), 0, 'no AI annexations');
run('validSave(JSON.parse(JSON.stringify(S)))');

// ---- V14: federal agencies, for the larger economies only.
run("newGame();applyDifficulty('medium',true)");
assert(run('Object.keys(AGENCIES).length>=15'), 'a set of countries run agencies');
assert(run("!!agenciesFor('USA')&&!!agenciesFor('DEU')&&!!agenciesFor('IND')"), 'the large economies have them');
assert(run("!agenciesFor('TUV')&&!agenciesFor('URY')&&!agenciesFor('NRU')"), 'small ones do not');
assert(run("S.nations.every(n=>agenciesFor(n.id)?(n.agencies&&typeof n.agencies==='object'):n.agencies===null)"),
 'every nation is seeded consistently with whether it has agencies');
assert(run("Object.values(AGENCIES).every(l=>l.every(([id,name,kind])=>!!id&&!!name&&!!AGENCY_KINDS[kind]))"),
 'every agency has a valid kind');
assert(run("Object.values(AGENCIES).every(l=>new Set(l.map(([id])=>id)).size===l.length)"),
 'no duplicate agency ids within a country');
// The panel renders for both kinds of country and never throws.
run("S.player='USA';selected='USA'");
assert(run("agencyPanelV14(player()).includes('Federal agencies')"), 'the panel renders for a country with agencies');
assert(run("agencyPanelV14(player()).includes('data-agency')"), 'with controls');
assert(run("agencyPanelV14(nation('URY')).includes('does not run standing federal agencies')"), 'and explains itself for one without');
assert(run("!/NaN|undefined/.test(agencyPanelV14(player()))"), 'no broken values');

// Budgets are the size real agencies are, not whole percents of output.
assert(run('AGENCY_MAX <= .3'), 'a single agency cannot exceed a fraction of a percent of GDP');
assert(run("agenciesFor('USA').length*AGENCY_MAX <= 2"), 'and all of them together stay under 2% of GDP');
// They cost money.
// Measured from zero, so the comparison is against no agencies at all rather than the seeded level.
run("S.options.infiniteCapital=true;for(const k in player().agencies)player().agencies[k]=0;const bare=fiscal(player()).spending;for(const k in player().agencies)player().agencies[k]=AGENCY_MAX;");
assert(run('fiscal(player()).spending > bare'), 'funding agencies costs the budget');
assert(run(`Math.abs(fiscal(player()).spending-bare-agenciesFor('USA').length*AGENCY_MAX)<1e-6`), 'by exactly what they are funded');

// And they do something measurable — measured against a control, not in absolute terms.
run(`window.trial=(lvl)=>{newGame();applyDifficulty('medium',true);S.player='USA';selected='USA';
 S.options.infiniteCapital=true;S.options.ai=false;S.options.shocks=false;
 for(const k in player().agencies)player().agencies[k]=lvl;
 const b={human:player().human,clean:player().clean,crime:player().cities[0].crime,tfp:player().tfp};
 for(let i=0;i<120;i++)simulateMonth();
 return {human:player().human-b.human,clean:player().clean-b.clean,crime:player().cities[0].crime-b.crime,tfp:player().tfp/b.tfp};}`);
run("window.none=window.trial(0);window.full=window.trial(AGENCY_MAX)");
assert(run('window.full.human > window.none.human'), 'funding raises human capital relative to not funding');
assert(run('window.full.clean > window.none.clean'), 'and the clean score');
assert(run('window.full.crime < window.none.crime'), 'and lowers crime');
assert(run('window.full.tfp > window.none.tfp'), 'and productivity');
run('validSave(JSON.parse(JSON.stringify(S)))');

// Agency state is validated.
run("newGame();const ag=JSON.parse(JSON.stringify(S))");
for (const [name, mutation] of [
 ['a budget beyond the cap', 'b.nations.find(n=>n.id==="USA").agencies.nasa=9'],
 ['a negative budget', 'b.nations.find(n=>n.id==="USA").agencies.nasa=-1'],
 ['an agency that does not exist', 'b.nations.find(n=>n.id==="USA").agencies.zzz=0.1'],
 ['agencies on a country without them', 'b.nations.find(n=>n.id==="URY").agencies={x:0.1}'],
 ['missing agency budgets', 'b.nations.find(n=>n.id==="USA").agencies=null'],
]) assert.throws(() => run(`(()=>{const b=JSON.parse(JSON.stringify(ag));${mutation};validSave(b)})()`), undefined, name+' must be rejected');

// States created by an era or by history are seeded too.
run("newGame();applyEra('e1970')");
assert(run("S.nations.every(n=>agenciesFor(n.id)?!!n.agencies:n.agencies===null)"), 'an era seeds agencies consistently');
run('validSave(JSON.parse(JSON.stringify(S)))');
run("while(S.month<300)simulateMonth()");
assert(run("S.nations.every(n=>agenciesFor(n.id)?!!n.agencies:n.agencies===null)"), 'and so do the historical events');
run('validSave(JSON.parse(JSON.stringify(S)))');

// ---- you choose the country you play.
run("newGame()");
// The game opens on a country screen of its own, then the rules screen.
assert(run("typeof countryScreenV14==='function'&&typeof rulesScreenV14==='function'"), 'there are two start screens');
run("startScreen()");
assert(run("$('modalContent').innerHTML.includes('data-pick=')"), 'the first screen lists countries to pick');
assert(run("$('modalContent').innerHTML.includes('countrySearch')"), 'and can be searched');
assert(run("(countryListV14('').match(/data-pick=/g)||[]).length===S.nations.length"), 'every country is offered');
assert(run("(countryListV14('japan').match(/data-pick=/g)||[]).length===1"), 'search narrows it');
assert(run("countryListV14('zzzzz').includes('No country matches')"), 'and says so when nothing matches');
// Picking one leads to the rules screen, which names it and offers a way back.
run("startCountryV14='JPN';rulesScreenV14()");
assert(run("$('modalContent').innerHTML.includes('Change country')"), 'the second screen can go back');
assert(run("$('modalContent').innerHTML.includes('data-start=')"), 'and offers the difficulty modes');
assert(run("$('modalContent').innerHTML.includes('data-era-start=')"), 'and the eras');
assert(run("typeof beginAsV14==='function'"), 'the chooser has a way to apply itself');
run("beginAsV14('JPN')");
assert.equal(run('S.player'), 'JPN', 'the chosen country is the one you lead');
assert.equal(run('player().name'), 'Japan');
assert(run("S.events.some(e=>e.title==='You take office')"), 'and it is announced');
assert(run("!!player().agencies"), 'Japan runs agencies');
run("beginAsV14('TUV')");
assert.equal(run('S.player'), 'TUV', 'a small country can be chosen too');
assert.equal(run('player().agencies'), null, 'and correctly has none');
run('validSave(JSON.parse(JSON.stringify(S)));simulateMonth()');
run("beginAsV14('nowhere')");
assert.equal(run('S.player'), 'TUV', 'an unknown country is refused');

// ---- earlier saves migrate. A V5 world keeps its debt, so it arrives on Medium, not Easy.
const v5=makeGame('build/v5.html');
v14.scope.legacyJSON=v5.run("S.month=30;JSON.stringify(S)");
run('loadSave(legacyJSON)');
assert.equal(run('S.version'),14);assert.equal(run('S.month'),30);
assert.equal(run('S.options.difficulty'),'medium','a V5 world with debt migrates to Medium');
assert.equal(run('S.options.noDebt'),false,'migration never silently erases an existing debt stock');
run('validSave(JSON.parse(JSON.stringify(S)));simulateMonth()');
for(const [label,file] of [['V7','build/v14.html'],['V6','build/v6.html'],['V4','build/v4.html'],['V3','src/base/sovereign-v3.html'],['V1','src/base/sovereign-v1.html']]){
 const old=makeGame(file);v14.scope.legacyJSON=old.run('S.month=9;JSON.stringify(S)');
 run('loadSave(legacyJSON)');
 assert.equal(run('S.version'),14,label+' migrates to 14');
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

const api=v14.registry.get('advance_simulation'),month=run('S.month');
api.execute({months:2});assert.equal(run('S.month'),month+2);

console.log(JSON.stringify({status:'PASS',version:14,nations:204,cities:1198,
 defaultMode:'easy',defaultNoDebt:true,
 policies:run('POLICY.length'),programs:run('PROGRAMS.length'),
 fileBytes:Buffer.byteLength(v14.html),lastTickMs:+run('perf').toFixed(2),
 checks:['boots into Easy with debt removed','federal agencies only for the larger economies','agency budgets are realistically scaled and cost the budget','funding agencies measurably beats not funding them','agency state is validated and era-consistent','you choose which country you play','beating a country lets you annex it','annexed territory, cities, people and output transfer','an annexed world survives save and reload','a fresh game restores the original catalogue','rivals never annex each other','declaring war produces a usable war record','the war room never throws and never prints NaN','a malformed war record is repaired, not fatal','cities can be taken and taken back','no city is held by both sides','history happens as you play: 1971 through 2011','the map is never left with orphaned territory','debt can be frozen rather than removed','unlimited city construction queue','ideology presets fitted to the budget','rival nations fight their own wars','offensives can be aimed at a named city','seven more programmes','land borders match reality: China 14, Germany 9, Brazil 10','a war with a neighbour opens a front on that border','the front moves and supply falls as it advances','doctrine and commitment change the outcome','no shared border means a limited war','borders never move and no country is annexed','relief operations are repeatable with no waiting period','relief still grants crisis protection','Germany, Vietnam and Yemen are divided in the eras they were','each half owns its own polygon','divided cities: East and West Berlin, Hanoi and Saigon','countries reunify in the eras they did','the map follows the era: USSR, Yugoslavia, Czechoslovakia','states not yet independent are absent','period place names, country and city','merged states hold their members territory','no successor coexists with its predecessor','era-aware name and city validation','eras rebuild the world at 1970/1985/2000/2026','pegged eras keep a floating anchor','construction can be skipped','elections, war, lag and volatility rules','generated dispatches are varied and bounded','modes strictly ordered easy→hard',
  'thirty years of deficits create no debt','no interest or debt service when off',
  'switching mode never restarts the world','harder modes restore and accumulate debt',
  'returning to Easy clears the stock','hand-edited rules mark a mode customised',
  'reform cost, capital regen and shock cadence scale','start screen offers all three modes',
  'Sandbox exposes the debt switch','economy panel explains a debt-free world',
  'V5 production function and growth accounting','city catalogue and trade intact',
  'fifty years sane in all three modes','V1/V3/V4/V5 migration keeps existing debt',
  'atomic rejection of corrupt rule sets','WebMCP actions']},null,2));
