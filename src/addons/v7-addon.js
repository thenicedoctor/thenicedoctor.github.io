// V7: historical start eras, richer dispatches, more sandbox rules, and a phone-usable layout.
// Era figures are rough scenario scalars in the right order of magnitude, not historical data.
const ERAS={
 e1970:{year:1970,month:0,name:'1970',tag:'The postwar order',
  blurb:'Fixed exchange rates are about to break, capital controls are normal, tariffs are high and central banks answer to governments. Inflation is coming.',
  gdpScale:.19,popScale:.46,inflation:3.5,rate:6.5,tradeScale:.55,
  policy:{trade:.55,research:.4,climate:.1,institutions:.86,liberties:.80,antiCorruption:.75,
   digitalGov:3,cbIndependence:25,inflationTarget:4,capitalControls:70,tariff:18,macroprudential:20,
   vocational:.8,activeLabor:.5,competition:.7,business:.75},
  state:{infra:.72,human:.68,clean:.55,capacity:.82},fx:'peg'},
 e1985:{year:1985,month:0,name:'1985',tag:'Disinflation & debt',
  blurb:'Volcker-era interest rates, a Latin American debt crisis, floating currencies and the first serious wave of liberalisation.',
  gdpScale:.33,popScale:.60,inflation:2.2,rate:9,tradeScale:.68,
  policy:{trade:.7,research:.55,climate:.2,institutions:.9,liberties:.88,antiCorruption:.85,
   digitalGov:8,cbIndependence:45,inflationTarget:3,capitalControls:50,tariff:12,macroprudential:30,
   vocational:.9,activeLabor:.7,competition:.85,business:.85},
  state:{infra:.82,human:.79,clean:.66,capacity:.9},fx:'managed'},
 e2000:{year:2000,month:0,name:'2000',tag:'Peak globalisation',
  blurb:'Open trade, independent central banks with explicit targets, low inflation and a great deal of confidence that this arrangement is permanent.',
  gdpScale:.56,popScale:.77,inflation:-.2,rate:5,tradeScale:.88,
  policy:{trade:.9,research:.8,climate:.5,institutions:.96,liberties:.96,antiCorruption:.94,
   digitalGov:25,cbIndependence:70,inflationTarget:2,capitalControls:30,tariff:7,macroprudential:35,
   vocational:.95,activeLabor:.88,competition:.95,business:.95},
  state:{infra:.91,human:.9,clean:.8,capacity:.96},fx:null},
 e2026:{year:2026,month:8,name:'2026',tag:'Present day',
  blurb:'The world as the simulation seeds it: the default scenario, with today’s policy settings and today’s output.',
  gdpScale:1,popScale:1,inflation:0,rate:0,tradeScale:1,policy:{},state:{},fx:null}};
const ERA_KEYS=['e1970','e1985','e2000','e2026'];
function eraOf(){return ERAS[S?.options?.era]?S.options.era:'e2026';}
function era(){return ERAS[eraOf()];}
// The productivity frontier is expressed in output per person, so it moves with the era.
function worldFrontier(){const e=era();return 105*(e.gdpScale/e.popScale);}
function startYear(){return S?.startYear??2026;}
function startMonth(){return S?.startMonth??8;}
function gameDate(monthIndex){return new Date(Date.UTC(startYear(),startMonth()+monthIndex,1));}
function applyEra(key){
 const e=ERAS[key];if(!e)return false;
 S.options.era=key;S.startYear=e.year;S.startMonth=e.month;
 const scaleP=(n,k,f)=>{if(typeof f!=='number')return;
  const v=f<=1&&f>0&&n.policies[k]>1?n.policies[k]*f:f;
  const spec=POLICY.find(x=>x.key===k);
  n.policies[k]=n.targets[k]=spec?clamp(v,spec.min,spec.max):v;};
 for(const n of S.nations){
  n.pop=Math.max(.001,n.pop*e.popScale);
  n.gdp=Math.max(.02,n.gdp*e.gdpScale);
  n.debt=n.debt*e.gdpScale;
  n.inflation=clamp(n.inflation+e.inflation,-2,90);
  if(e.rate)n.policies.rate=n.targets.rate=clamp(e.rate+(n.inflation-4)*.35,0,20);
  for(const[k,f]of Object.entries(e.policy))scaleP(n,k,f);
  for(const[k,f]of Object.entries(e.state))n[k]=clamp(n[k]*f,0,100);
  if(e.fx)n.fxRegime=e.fx;
  econSeed(n);upgradeNationEconV5(n);
  n.mon.rate=n.policies.rate;n.mon.expected=n.inflation;
  n.mon.credibility=clamp(n.mon.credibility*(key==='e1970'?.55:key==='e1985'?.75:key==='e2000'?.95:1),5,97);
 }
 refreshWorld();
 return true;}

// ---------- more sandbox rules ----------
const V7_OPTIONS={era:'e2026',instantBuild:false,noElections:false,noWar:false,
 fastReforms:false,stableWorld:false,cityAutonomy:false};
function instantBuild(){return S?.options?.instantBuild===true;}
// Skipping construction time finishes anything already queued and makes future projects immediate.
function flushConstruction(){
 for(const n of S.nations)for(const c of n.cities){
  for(const q of [...c.queue]){c.levels[q.type]=Math.min(5,c.levels[q.type]+1);}
  c.queue=[];}}
const v6StartCityProjectV7=startCityProject;
startCityProject=function(nid,cid,type,ai=false){
 const ok=v6StartCityProjectV7(nid,cid,type,ai);
 if(ok&&instantBuild()){const n=nation(nid),c=n.cities.find(x=>x.id===cid),q=c.queue[c.queue.length-1];
  if(q){q.remaining=1;q.duration=1;}}
 return ok;};
const v6TickCitiesV7=tickCities;
tickCities=function(n){
 if(instantBuild())for(const c of n.cities)for(const q of c.queue){q.remaining=Math.min(q.remaining,1);q.paused=false;}
 return v6TickCitiesV7(n);};

// ---------- dispatches ----------
// The V6 feed repeated a handful of fixed strings. This builds each dispatch from the state that
// actually triggered it, so the wording, the numbers and the places named all vary.
const DESK={economy:'Economy',politics:'Politics',world:'World',security:'Security',
 society:'Society',cities:'Cities',markets:'Markets',trade:'Trade',model:'Model',
 development:'Development',diplomacy:'Diplomacy',dispatch:'Dispatch',warning:'Alert'};
const pick=list=>list[Math.floor(random()*list.length)];
const pctText=v=>(v>0?'+':'')+v.toFixed(1)+'%';
function anyCity(n){return n.cities.length?pick(n.cities).name:n.name;}
function biggestCity(n){return n.cities.reduce((a,c)=>c.share>a.share?c:a,n.cities[0])?.name||n.name;}
function partyName(n){return PARTY_DEFS[n.politics?.leader]?.name||'the governing party';}
// A dispatch fires only when its condition holds and its cooldown has expired, so the feed does
// not repeat the same story every month.
const STORIES=[
{key:'inflationBite',desk:'economy',cool:14,when:n=>n.inflation>6.5,
 make:n=>[pick(['Prices outrun wages','Cost of living dominates the agenda','Inflation refuses to settle']),
  'Consumer prices in '+n.name+' are running at '+n.inflation.toFixed(1)+'%, against a target of '+n.policies.inflationTarget.toFixed(1)+'%. '
  +(n.mon.credibility<45?'Households have stopped believing the target, which makes it dearer to restore.'
   :'The bank still has credibility to spend, but not indefinitely.')
  +' Shoppers in '+anyCity(n)+' report the sharpest increases in food and energy.']},
{key:'deflation',desk:'economy',cool:18,when:n=>n.inflation<.4&&n.outputGap<-1.5,
 make:n=>['Demand drains out of the economy',
  'Prices in '+n.name+' are barely moving at '+n.inflation.toFixed(1)+'%, with output '+Math.abs(n.outputGap).toFixed(1)+'% below what the country could produce. '
  +'Firms are discounting rather than hiring, and the real burden of existing debts is rising.']},
{key:'boom',desk:'economy',cool:16,when:n=>n.outputGap>2.6,
 make:n=>[pick(['The economy runs hot','Capacity is running out','Order books are full']),
  n.name+' is producing '+n.outputGap.toFixed(1)+'% above its estimated potential. Unemployment has fallen to '
  +n.unemployment.toFixed(1)+'%, below the '+n.nairu.toFixed(1)+'% the model treats as sustainable. '
  +'Wage pressure usually follows within the year.']},
{key:'recession',desk:'economy',cool:14,when:n=>n.growth<-.6,
 make:n=>[pick(['Output contracts','The downturn deepens','A year of lost ground']),
  'Activity in '+n.name+' is shrinking at an annualised '+Math.abs(n.growth).toFixed(1)+'%. '
  +'Unemployment stands at '+n.unemployment.toFixed(1)+'% and the output gap has widened to '+pctText(n.outputGap)+'. '
  +(n.policies.publicEmployment>1?'Public job schemes are absorbing part of the shock.':'There is no automatic stabiliser of any size in place.')]},
{key:'convergence',desk:'economy',cool:36,when:n=>n.potentialGrowth>3.6&&n.gdp/n.pop<12,
 make:n=>['A decade of catching up',
  n.name+' is growing at a potential rate of '+n.potentialGrowth.toFixed(1)+'%, with productivity contributing '
  +n.decomposition.tfp.toFixed(1)+' points and capital '+n.decomposition.capital.toFixed(1)+'. '
  +'Output per person has reached $'+(n.gdp/n.pop*1000).toFixed(0)+'. Sustaining this depends on schooling and institutions, not on the investment rate alone.']},
{key:'stagnation',desk:'economy',cool:40,when:n=>n.potentialGrowth<.35&&n.gdp/n.pop>18,
 make:n=>['The frontier stops moving',
  'Potential growth in '+n.name+' has fallen to '+n.potentialGrowth.toFixed(1)+'%. Productivity is adding just '
  +n.decomposition.tfp.toFixed(1)+' points a year and the labour force contributes '+n.decomposition.labour.toFixed(1)+'. '
  +'An older population and a mature capital stock leave little room for the usual remedies.']},
{key:'ratesUp',desk:'markets',cool:10,when:(n,prev)=>n.mon.rate-prev.rate>.8,
 make:n=>[pick(['Central bank tightens','Rates rise again','The bank moves against prices']),
  'The policy rate in '+n.name+' has been raised to '+n.mon.rate.toFixed(2)+'%, against inflation of '+n.inflation.toFixed(1)+'%. '
  +(n.policies.cbIndependence>65?'The decision was the bank’s own; the government was not consulted.'
   :'The decision followed the government’s instruction, which markets have noticed.')
  +' Borrowers face a lending spread of '+n.mon.spread.toFixed(2)+' points on top.']},
{key:'ratesDown',desk:'markets',cool:10,when:(n,prev)=>prev.rate-n.mon.rate>.8,
 make:n=>['Borrowing costs are cut',
  n.name+' has lowered its policy rate to '+n.mon.rate.toFixed(2)+'%. With expectations at '
  +n.mon.expected.toFixed(1)+'%, the real rate is now '+(n.mon.rate-n.mon.expected).toFixed(2)+'%, '
  +(n.mon.rate-n.mon.expected<n.mon.neutral?'below neutral and therefore stimulative.':'still above the neutral rate.')]},
{key:'credibility',desk:'markets',cool:30,when:n=>n.mon.credibility<28,
 make:n=>['Nobody believes the target',
  'Credibility in '+n.name+'’s monetary framework has fallen to '+n.mon.credibility.toFixed(0)+' out of 100. '
  +'Expected inflation of '+n.mon.expected.toFixed(1)+'% has detached from the '+n.policies.inflationTarget.toFixed(1)+'% target, '
  +'and lenders are charging '+n.mon.spread.toFixed(2)+' points for the doubt.']},
{key:'currency',desk:'markets',cool:24,when:n=>Math.abs(n.reer-100)>22,
 make:n=>[n.reer>100?'The currency is overvalued':'A cheaper currency, and a bill for it',
  'The real exchange rate in '+n.name+' sits at '+n.reer.toFixed(0)+' against a neutral 100'
  +(n.fxRegime==='peg'?', and the peg is preventing the correction that would normally follow. ':'. ')
  +(n.reer>100?'Exporters say they are being priced out of their markets.'
   :'Imported goods have become expensive; exporters are not complaining.')]},
{key:'unemployment',desk:'society',cool:16,when:n=>n.unemployment>n.nairu+3.5,
 make:n=>[pick(['Joblessness climbs','Work is hard to find','The labour market loosens']),
  'Unemployment in '+n.name+' has reached '+n.unemployment.toFixed(1)+'%, well above the '+n.nairu.toFixed(1)+'% structural floor. '
  +'Employment offices in '+anyCity(n)+' report the longest queues in years. '
  +(n.policies.activeLabor<40?'Placement and retraining programmes are thinly funded.':'Retraining schemes are absorbing some of it.')]},
{key:'inequality',desk:'society',cool:34,when:n=>n.inequality>58,
 make:n=>['The gap widens',
  'Measured inequality in '+n.name+' has risen to '+n.inequality.toFixed(0)+' on the game’s index. '
  +'Rent takes '+n.rentBurden.toFixed(0)+'% of a typical household budget, and '+n.slums.toFixed(0)+'% of the urban population lives in informal housing.']},
{key:'crime',desk:'cities',cool:20,when:n=>n.crime>62,
 make:n=>[pick(['Cities under strain','Public safety dominates local politics','A hard year in the neighbourhoods']),
  'The national crime-pressure index has reached '+n.crime.toFixed(0)+' out of 100, with '+biggestCity(n)+' among the worst affected. '
  +'The model links this to unemployment at '+n.unemployment.toFixed(1)+'% and inequality at '+n.inequality.toFixed(0)+'. '
  +'This is a gameplay index, not a measured crime rate.']},
{key:'safeCities',desk:'cities',cool:36,when:n=>n.crime<24,
 make:n=>['Safer streets, and a bill to match',
  'Crime pressure in '+n.name+' has fallen to '+n.crime.toFixed(0)+' out of 100. Local satisfaction stands at '
  +n.citySatisfaction.toFixed(0)+'. Municipal operating spending is running at '+(n.cityOperating||0).toFixed(2)+'% of national output.']},
{key:'approvalLow',desk:'politics',cool:12,when:n=>n.approval<26,
 make:n=>[pick(['The government loses the country','Approval collapses','A crisis of confidence']),
  partyName(n)+' governs '+n.name+' with approval at '+n.approval.toFixed(0)+'%. '
  +'Stability has fallen to '+n.stability.toFixed(0)+' and political capital to '+n.capital.toFixed(0)+' out of 100. '
  +(n.election<13?'An election is due within the year.':'The next election is '+Math.round(n.election/12)+' years away.')]},
{key:'approvalHigh',desk:'politics',cool:30,when:n=>n.approval>78,
 make:n=>['A government with room to move',
  'Approval for '+partyName(n)+' in '+n.name+' stands at '+n.approval.toFixed(0)+'%, on growth of '+pctText(n.growth)
  +' and inflation of '+n.inflation.toFixed(1)+'%. Political capital has rebuilt to '+n.capital.toFixed(0)+' out of 100.']},
{key:'debtStress',desk:'economy',cool:20,when:n=>!S.options.noDebt&&n.debt/n.gdp>1.7,
 make:n=>['Creditors ask harder questions',
  'Government debt in '+n.name+' has reached '+(n.debt/n.gdp*100).toFixed(0)+'% of output, carrying interest at '
  +fiscal(n).interest.toFixed(2)+'%. Debt service alone now costs '+fiscal(n).debtService.toFixed(1)+'% of output each year.']},
{key:'tradeGrowth',desk:'trade',cool:22,when:n=>n.tradeGrowth>.55,
 make:n=>['Ports at capacity',
  'Trade flows through '+n.name+' have risen sharply: exports of '+money(n.exports)+' and imports of '+money(n.imports)
  +' last month, with customs revenue of '+money(n.customs)+'. '+biggestCity(n)+'’s freight handlers are working through a backlog.']},
{key:'sanctioned',desk:'diplomacy',cool:18,when:n=>S.sanctions.some(t=>t.split(':').includes(n.id)),
 make:n=>['Trade restrictions bite',
  n.name+' is under '+S.sanctions.filter(t=>t.split(':').includes(n.id)).length+' active sanction regime(s). '
  +'Deliveries on affected routes are suspended and the productivity penalty is compounding.']},
{key:'coldWorld',desk:'world',cool:44,when:()=>worldInflation>7,
 make:n=>['A global inflation',
  'Prices are rising across the world economy, averaging '+worldInflation.toFixed(1)+'% weighted by output. '
  +'The average policy rate stands at '+worldRate.toFixed(2)+'%, and world growth at '+worldGrowth.toFixed(1)+'%. '
  +'No country is managing this in isolation.']},
{key:'worldBoom',desk:'world',cool:44,when:()=>worldGrowth>3.6,
 make:n=>['The world economy accelerates',
  'Global growth has reached '+worldGrowth.toFixed(1)+'% with inflation at '+worldInflation.toFixed(1)+'%. '
  +'Convergence is doing most of the work: the poorest economies are growing fastest.']}];
function tickNewsV7(){
 const n=player();if(!n||!n.mon)return;
 S.newsCooldowns=S.newsCooldowns||{};
 const prev=S.newsPrev||{rate:n.mon.rate};
 const eligible=STORIES.filter(s=>{
  if((S.newsCooldowns[s.key]||0)>S.month)return false;
  try{return s.when(n,prev)}catch(e){return false}});
 // At most one dispatch a month, so the feed reads like a newspaper rather than a log.
 if(eligible.length){
  const story=pick(eligible),[title,body]=story.make(n);
  S.newsCooldowns[story.key]=S.month+story.cool;
  addEvent(title,body,story.desk);}
 S.newsPrev={rate:n.mon.rate};
 // Anniversary pieces give the feed a rhythm even in a quiet decade.
 if(S.month>0&&S.month%60===0)
  addEvent('Five years under review',
   n.name+' has recorded average growth of '+pctText(n.growth)+' and inflation of '+n.inflation.toFixed(1)+'% this year. '
   +'Output per person stands at $'+(n.gdp/n.pop*1000).toFixed(0)+', unemployment at '+n.unemployment.toFixed(1)+'%, '
   +'and approval for '+partyName(n)+' at '+n.approval.toFixed(0)+'%.','dispatch');}

// ---------- phone layout ----------
const isPhone=()=>innerWidth<=800;
// The map canvas set touch-action:none, so a one-finger drag panned the map and never scrolled
// the page — on a phone the map filled half the screen and the reader was simply stuck.
// Vertical scrolling is given back to the page; the map is explored in a full-screen mode instead.
let mapFocus=false;
function setMapFocus(on){
 mapFocus=!!on;
 document.body.classList.toggle('mapfocus',mapFocus);
 const c=$('map');if(c)c.style.touchAction=mapFocus?'none':'pan-y';
 const b=$('mapFocusBtn');if(b)b.textContent=mapFocus?'Done':'Explore map';
 requestDraw();}
function installMobileMap(){
 const c=$('map');if(!c)return;
 c.style.touchAction=isPhone()&&!mapFocus?'pan-y':'none';
 if(!$('mapFocusBtn')){
  const host=document.querySelector('.maparea')||c.parentElement;
  const b=document.createElement('button');
  b.id='mapFocusBtn';b.className='mapfocusbtn';b.type='button';b.textContent='Explore map';
  b.onclick=()=>setMapFocus(!mapFocus);
  host.appendChild(b);}}
window.addEventListener?.('resize',()=>{if(!isPhone()&&mapFocus)setMapFocus(false);
 const c=$('map');if(c)c.style.touchAction=isPhone()&&!mapFocus?'pan-y':'none';});

// ---------- more detail in the panels ----------
const v6OverviewV7=overview;
overview=function(n){
 const b=fiscal(n),d=n.decomposition||{capital:0,labour:0,tfp:0};
 return v6OverviewV7(n)
 +'<div class="block"><h3>The month in numbers</h3>'
 +metric('Output per person','$'+(n.gdp/n.pop*1000).toFixed(0))
 +metric('Output gap',pct(n.outputGap)+' · '+gapLabel(n.outputGap))
 +metric('Unemployment',n.unemployment.toFixed(1)+'% vs '+n.nairu.toFixed(1)+'% floor')
 +metric('Policy rate',n.mon.rate.toFixed(2)+'% · real '+(n.mon.rate-n.mon.expected).toFixed(2)+'%')
 +metric('Fiscal balance',pct(b.balance)+' of GDP',b.balance<-6?'negative':'')
 +metric('Crime pressure',n.crime.toFixed(0)+' / 100 · '+crimeLabel(n.crime))
 +metric('Trade balance',money(n.exports-n.imports)+' last month')
 +metric('Productivity contribution',pct(d.tfp))
 +'<p>Every figure here is a modelled gameplay statistic, not a measurement of any real country.</p></div>';};
function dispatchArchiveV7(){
 const rows=S.events.slice(0,60).map(e=>
  '<article class="dispatchrow"><div class="dispatchmeta"><span class="tag">'+escapeHTML(DESK[e.tag]||e.tag)+'</span>'
  +'<time>'+gameDate(e.month).toLocaleDateString('en',{month:'long',year:'numeric',timeZone:'UTC'})+'</time></div>'
  +'<h4>'+escapeHTML(e.title)+'</h4><p>'+escapeHTML(e.body)+'</p></article>').join('');
 return '<h3>Dispatch archive</h3><p>The last '+Math.min(60,S.events.length)+' reports, most recent first. '
 +'Each story is written from the state of your country in the month it was filed.</p>'
 +'<div class="dispatchfeed">'+(rows||'<p class="muted">Nothing has happened yet. Advance time.</p>')+'</div>';}

// ---------- settings ----------
const v6SettingsV7=settingsPanel;
settingsPanel=function(){
 return '<h3>Starting era</h3><p>Current: <b>'+era().name+' — '+era().tag+'</b>. '
 +'Choosing an era rebuilds the world at that date with period-appropriate output, prices, trade and institutions. It starts a new game.</p>'
 +'<div class="buttonrow modeswitch">'+ERA_KEYS.map(k=>'<button class="'+(k===eraOf()?'primary':'')+'" data-era="'+k+'">'+ERAS[k].name+'</button>').join('')+'</div>'
 +'<p class="muted">'+escapeHTML(era().blurb)+'</p>'
 +'<div class="block"></div><h3>Construction & building</h3>'
 +'<label class="toggleline">Skip construction times<input type="checkbox" data-option="instantBuild" '+(instantBuild()?'checked':'')+'></label>'
 +'<p>'+(instantBuild()
   ?'City projects complete the month they are approved. They still cost money and political capital.'
   :'City projects take their full build time, financed month by month.')+'</p>'
 +'<button class="full" data-action="flushBuild">Finish everything under construction now</button>'
 +'<div class="block"></div><h3>World rules</h3>'
 +'<label class="toggleline">Pause elections<input type="checkbox" data-option="noElections" '+(S.options.noElections?'checked':'')+'></label>'
 +'<label class="toggleline">Disable war entirely<input type="checkbox" data-option="noWar" '+(S.options.noWar?'checked':'')+'></label>'
 +'<label class="toggleline">Reforms take effect immediately<input type="checkbox" data-option="fastReforms" '+(S.options.fastReforms?'checked':'')+'></label>'
 +'<label class="toggleline">Suppress economic volatility<input type="checkbox" data-option="stableWorld" '+(S.options.stableWorld?'checked':'')+'></label>'
 +'<p>Pausing elections freezes the electoral clock without changing parliament. Immediate reforms remove the multi-year policy lag. '
 +'Suppressing volatility damps shocks and the output gap without switching either off.</p>'
 +'<div class="block"></div>'+v6SettingsV7();};
const v6BindV7=bindPanel;
bindPanel=function(){
 v6BindV7();
 for(const b of $('panel').querySelectorAll('[data-era]'))
  b.onclick=()=>{const k=b.dataset.era;
   modal('Start in '+ERAS[k].name+'?','<p>'+escapeHTML(ERAS[k].blurb)+'</p>'
    +'<p>This starts a new world in '+ERAS[k].year+'. Your current game will be lost unless you have saved it.</p>'
    +'<button class="primary full" id="confirmEra">Start a new world in '+ERAS[k].year+'</button>');
   $('confirmEra').onclick=()=>{const mode=difficultyOf();newGame();applyDifficulty(mode,true);applyEra(k);
    closeModal();render();requestDraw();toast('New world: '+ERAS[k].year+'.');};};};
Object.assign(actions,{flushBuild:()=>{flushConstruction();toast('All queued projects completed.');render();}});

// ---------- new world rules ----------
const v6TickPoliticsV7=tickPolitics;
tickPolitics=function(n){
 // Pausing elections freezes the clock without dissolving or rewriting parliament.
 if(S.options.noElections){const held=n.election;const r=v6TickPoliticsV7(n);n.election=Math.max(1,held);return r;}
 return v6TickPoliticsV7(n);};
const v6DeclareWarV7=declareWar;
declareWar=function(){if(S.options.noWar){toast('War is disabled in this world. Change it in Sandbox.');return;}return v6DeclareWarV7.apply(this,arguments);};
const v6ShockScaleV7=shockScaleV6;
shockScaleV6=function(){return v6ShockScaleV7()*(S.options.stableWorld?.35:1);};

// ---------- the era start screen ----------
function eraCardV7(k){const e=ERAS[k];
 return '<div class="modecard eracard" data-era-start="'+k+'"><div class="sectionhead"><strong>'+e.year+'</strong><span class="eyebrow">'+e.tag+'</span></div>'
 +'<p>'+e.blurb+'</p><ul class="modelist">'
 +'<li>World output: <b>'+(e.gdpScale===1?'as seeded':'≈'+Math.round(e.gdpScale*100)+'% of 2026')+'</b></li>'
 +'<li>Population: <b>'+(e.popScale===1?'as seeded':'≈'+Math.round(e.popScale*100)+'% of 2026')+'</b></li>'
 +'<li>Exchange rates: <b>'+(e.fx==='peg'?'fixed pegs':e.fx==='managed'?'managed floats':'as seeded')+'</b></li>'
 +'<li>Central banks: <b>'+(e.policy.cbIndependence===undefined?'as seeded':e.policy.cbIndependence<40?'government-directed':e.policy.cbIndependence<60?'partly independent':'independent')+'</b></li>'
 +'</ul><button class="primary full" data-era-start="'+k+'">Start in '+e.year+'</button></div>';}
const v6StartScreenV7=startScreen;
startScreen=function(){
 v6StartScreenV7();
 const box=$('modalContent');if(!box)return;
 box.insertAdjacentHTML('beforeend',
  '<div class="block"></div><h3>Or start in another decade</h3>'
  +'<p>Each era rebuilds the world at that date with period-appropriate output, population, prices, trade barriers and central-bank arrangements. Difficulty applies on top.</p>'
  +'<div class="modegrid eragrid">'+ERA_KEYS.filter(k=>k!=='e2026').map(eraCardV7).join('')+'</div>');
 for(const b of box.querySelectorAll('button[data-era-start]'))
  b.onclick=()=>{const k=b.dataset.eraStart,mode=difficultyOf();
   newGame();applyDifficulty(mode,true);applyEra(k);
   addEvent('A world in '+ERAS[k].year,ERAS[k].blurb,'dispatch');
   closeModal();render();requestDraw();toast('New world: '+ERAS[k].year+' · '+DIFFICULTY[mode].name+'.');};};

// ---------- lifecycle ----------
const v6PrepareV7=prepareV4Month;
prepareV4Month=function(){v6PrepareV7();};
const v6NewGameV7=newGame;
newGame=function(){
 v6NewGameV7();S.version=7;
 Object.assign(S.options,V7_OPTIONS);
 S.startYear=2026;S.startMonth=8;S.newsCooldowns={};S.newsPrev=null;
 addEvent('A century to choose from','Start in 1970, 1985, 2000 or the present day. Each era rebuilds the world with period-appropriate output, trade barriers and monetary arrangements.','model');};
const v6MigrateV7=migrateSave;
migrateSave=function(s){
 s=v6MigrateV7(s);if(s?.version!==6)return s;
 s.options={...V7_OPTIONS,...s.options};
 s.startYear=s.startYear??2026;s.startMonth=s.startMonth??8;
 s.newsCooldowns=s.newsCooldowns||{};s.newsPrev=null;
 s.version=7;return s;};
const v6ValidSaveV7=validSave;
validSave=function(s){
 v6ValidSaveV7(s);
 if(!ERAS[s.options.era])throw Error('Invalid starting era.');
 for(const k of ['instantBuild','noElections','noWar','fastReforms','stableWorld'])
  if(typeof s.options[k]!=='boolean')throw Error('Invalid world rule.');
 if(!Number.isInteger(s.startYear)||s.startYear<1800||s.startYear>2200)throw Error('Invalid start year.');
 if(!Number.isInteger(s.startMonth)||s.startMonth<0||s.startMonth>11)throw Error('Invalid start month.');
 if(s.newsCooldowns&&typeof s.newsCooldowns!=='object')throw Error('Invalid dispatch state.');
 return s;};
const v6GuideV7=showGuide;
showGuide=function(){
 v6GuideV7();const box=$('modalContent');if(!box)return;
 box.insertAdjacentHTML('beforeend','<div class="block"><h3>V7 eras, dispatches and rules</h3>'
 +'<p><b>Eras.</b> You can begin in 1970, 1985, 2000 or 2026. An era rescales world output and population, shifts prices and policy rates, and sets period-appropriate trade barriers, capital controls, central-bank independence and exchange-rate regimes — Bretton Woods pegs in 1970, managed floats in 1985. The productivity frontier the convergence model chases moves with the era, so catching up in 1970 means catching up to 1970. These are rough scenario scalars in the right order of magnitude, not historical data, and the countries on the map are the present-day set throughout.</p>'
 +'<p><b>Dispatches.</b> Reports are written from the state that triggered them, naming your cities, your governing party and the actual figures, with cooldowns so a story does not repeat. The Dispatch view keeps the last sixty.</p>'
 +'<p><b>New rules.</b> Skip construction times finishes city projects the month they are approved, and a button completes anything already queued. You can also pause elections, disable war, remove the policy-implementation lag and damp economic volatility. All of it is in Sandbox and none of it is hidden.</p>'
 +'<p><b>On a phone.</b> A one-finger drag now scrolls the page rather than dragging the map; use <b>Explore map</b> for a full-screen map with pan and zoom.</p></div>');};
// Suppressing volatility damps the cycle without removing it.
const v6TickNationV7=tickV4Nation;
tickV4Nation=function(n){v6TickNationV7(n);if(S.options.stableWorld)n.outputGap*=.94;};

// A peg anchors to a reserve currency, not to the average of everyone including itself. Deriving
// the world rate from every nation made a universally pegged era (1970) self-referential: each
// bank followed an average it was itself setting, so rates never fell and investment collapsed.
// Floating economies set the anchor; pegs follow it.
refreshWorld=function(){
 let r=0,i=0,g=0,w=0,fr=0,fw=0;
 for(const n of S.nations){
  const size=Math.sqrt(n.gdp),rate=n.mon?.rate??n.policies.rate;
  r+=rate*size;i+=n.inflation*size;g+=n.growth*size;w+=size;
  if(n.fxRegime==='float'){fr+=rate*size;fw+=size;}}
 worldInflation=i/Math.max(1,w);worldGrowth=g/Math.max(1,w);
 // With no floating anchor at all, fall back to the reaction function rather than the average.
 if(fw>w*.08){worldRate=fr/fw;return;}
 let t=0,tw=0;
 for(const n of S.nations){if(!n.mon)continue;const size=Math.sqrt(n.gdp);t+=taylorRate(n)*size;tw+=size;}
 worldRate=tw?t/tw:r/Math.max(1,w);};

// Shocks reported as one of two fixed sentences read like a log. These name the country, the
// sector and the size, and vary with the era.
const SHOCK_GOOD=[
 ['Investment cycle strengthens',n=>'Firms across '+n.name+' are bringing forward capital spending. Order books in '+biggestCity(n)+' are the fullest in years.'],
 ['Export orders rise',n=>'External demand for '+n.name+'’s goods has picked up sharply, with the effect expected to run for about nine months.'],
 ['A good harvest',n=>'Favourable conditions have produced an unusually strong agricultural year in '+n.name+', easing food prices.'],
 ['Energy prices fall back',n=>'Cheaper fuel is feeding through to costs across '+n.name+'. Manufacturers in '+anyCity(n)+' report the relief first.'],
 ['A productivity surprise',n=>'Output per hour in '+n.name+' has come in above expectations, and forecasters are revising the year upward.']];
const SHOCK_BAD=[
 ['Energy costs climb',n=>'A supply shock has raised fuel and power costs across '+n.name+'. Cleaner generation softens the impact; '+n.name+' currently rates '+n.clean.toFixed(0)+' out of 100 on that measure.'],
 ['Credit conditions tighten',n=>'Lenders in '+n.name+' have turned cautious. Investment will be slower for roughly nine months, on top of a lending spread already at '+n.mon.spread.toFixed(2)+' points.'],
 ['Supply chains seize up',n=>'Freight and component shortages are disrupting production in '+n.name+'. '+biggestCity(n)+'’s industrial districts are worst affected.'],
 ['A poor harvest',n=>'Crop failures have pushed up food prices in '+n.name+'. Households at the bottom of the distribution feel it first.'],
 ['Confidence drains away',n=>'Firms and households in '+n.name+' have turned pessimistic at once, and spending decisions are being deferred.']];
function shockEventV7(n,good){
 const[title,body]=pick(good?SHOCK_GOOD:SHOCK_BAD);
 addEvent(title,body(n),good?'economy':'warning');}

// A shock in a country of 60,000 people is not world news for a reader in Brazil. Dispatches are
// filed for your own country, or for economies large enough that everyone would hear about it.
function newsworthy(n){
 if(n.id===S.player)return true;
 const ranked=S.nations.slice().sort((a,b)=>b.gdp-a.gdp).slice(0,14);
 return ranked.includes(n);}
const SHOCK_GOOD_EXTRA=[
 ['Construction picks up',n=>'Housing and infrastructure starts are rising across '+n.name+', with '+biggestCity(n)+' leading. Employment follows building with a lag of several months.'],
 ['Tourism has a record season',n=>'Visitor numbers to '+n.name+' are well above trend, supporting services employment in '+anyCity(n)+'.'],
 ['A technology upgrade lands',n=>'New equipment is coming into service across industry in '+n.name+'. Research spending currently runs at '+n.policies.research.toFixed(1)+'% of output.'],
 ['Commodity terms of trade improve',n=>n.name+' is getting more for what it sells and paying less for what it buys. The trade balance stands at '+money(n.exports-n.imports)+' a month.']];
const SHOCK_BAD_EXTRA=[
 ['Drought strains the interior',n=>'Water shortages are affecting agriculture and power generation in '+n.name+'. Rural incomes will take the first hit.'],
 ['A bank runs into trouble',n=>'A significant lender in '+n.name+' has come under strain. Macroprudential buffers stand at '+n.policies.macroprudential.toFixed(0)+' out of 100.'],
 ['Industrial action spreads',n=>'Disputes over pay have halted production in parts of '+n.name+'. Inflation of '+n.inflation.toFixed(1)+'% is the stated grievance.'],
 ['An export market closes',n=>'A major buyer has stopped taking '+n.name+'’s goods. Exporters in '+biggestCity(n)+' are looking for alternatives.']];
SHOCK_GOOD.push(...SHOCK_GOOD_EXTRA);SHOCK_BAD.push(...SHOCK_BAD_EXTRA);
shockEventV7=function(n,good){
 if(!newsworthy(n))return;
 const[title,body]=pick(good?SHOCK_GOOD:SHOCK_BAD);
 addEvent(title,n.id===S.player?body(n):n.name+': '+body(n).replace(new RegExp('\\\\b'+n.name+'\\\\b','g'),'the country'),
  good?'economy':'warning');};

// Quieter stories, so a well-run country still has a newspaper.
STORIES.push(
{key:'steady',desk:'economy',cool:26,when:n=>Math.abs(n.outputGap)<1.2&&n.inflation<4&&n.growth>.8,
 make:n=>[pick(['An unremarkable quarter','The economy holds its course','Steady, for now']),
  n.name+' is growing at '+pctText(n.growth)+' with inflation at '+n.inflation.toFixed(1)+'% and the output gap at '+pctText(n.outputGap)+'. '
  +'Unemployment stands at '+n.unemployment.toFixed(1)+'%. Economists describe conditions as close to balanced, which is rarer than it sounds.']},
{key:'election',desk:'politics',cool:20,when:n=>n.election<=13&&n.election>0,
 make:n=>['The campaign begins',
  'An election in '+n.name+' is '+n.election+' months away. '+partyName(n)+' goes in with approval at '+n.approval.toFixed(0)+'%, '
  +'growth at '+pctText(n.growth)+' and unemployment at '+n.unemployment.toFixed(1)+'%. '
  +'Its coalition holds '+(n.politics?.coalition||[]).reduce((a,i)=>a+(n.politics.seats[i]||0),0)+' of 100 seats.']},
{key:'cityBuild',desk:'development',cool:18,when:n=>n.cities.some(c=>c.queue.length>0),
 make:n=>{const c=n.cities.find(x=>x.queue.length)||n.cities[0],q=c.queue[0];
  return ['Ground broken in '+c.name,
   PROJECTS[q.type].name+' is under construction in '+c.name+', '+q.remaining+' of '+q.duration+' months remaining. '
   +'Local satisfaction there stands at '+c.satisfaction.toFixed(0)+' and crime pressure at '+c.crime.toFixed(0)+'.'];}},
{key:'population',desk:'society',cool:60,when:n=>Math.abs(n.popGrowth)>.018,
 make:n=>[n.popGrowth>0?'A growing country':'The population turns down',
  n.name+' has '+n.pop.toFixed(1)+' million people, changing at '+(n.popGrowth*100).toFixed(2)+'% a year. '
  +'The modelled fertility rate is '+n.fertility.toFixed(2)+' and the participation rate '+(n.participation*100).toFixed(1)+'%. '
  +(n.popGrowth>0?'Schools and housing will need to keep pace.':'The pension age is currently '+n.policies.pensionAge+'.')]},
{key:'reserves',desk:'markets',cool:48,when:n=>n.fund>n.gdp*.08,
 make:n=>['The fund passes a milestone',
  n.name+'’s sovereign fund holds '+money(n.fund)+', or '+(n.fund/n.gdp*100).toFixed(1)+'% of annual output. '
  +'Contributions run at '+n.policies.sovereignFund.toFixed(2)+'% of GDP a year.']},
{key:'era',desk:'world',cool:120,when:()=>S.month>0&&S.month%120===0,
 make:n=>['A decade on',
  'Ten years have passed since '+gameDate(S.month-120).toLocaleDateString('en',{month:'long',year:'numeric',timeZone:'UTC'})+'. '
  +n.name+'’s output per person has reached $'+(n.gdp/n.pop*1000).toFixed(0)+', with world growth at '+worldGrowth.toFixed(1)+'% '
  +'and world inflation at '+worldInflation.toFixed(1)+'%.']});
// A longer archive: the feed is now something to read back through.
const v6AddEventV7=addEvent;
addEvent=function(title,body,tag='world'){S.events.unshift({title,body,tag,month:S.month});S.events=S.events.slice(0,240);};

// On a 317px-wide canvas the old rule drew eleven country labels plus three ocean labels on top
// of each other. Narrow maps get only the largest economies, and no ocean captions.
function labelFloorV7(){const w=$('map')?.getBoundingClientRect().width||1000;
 return w<420?26000:w<620?9000:2000;}
function showOceanLabelsV7(){return ($('map')?.getBoundingClientRect().width||1000)>=560;}
