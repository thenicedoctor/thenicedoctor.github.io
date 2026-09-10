// V12: collapsible sections survive the monthly re-render, debt can be frozen rather than removed,
// city queues can be unlimited, ideology presets are fitted to the budget, the map follows history
// as time passes, rival nations fight their own wars, and offensives can be aimed at a named city.

// ---------- the monthly re-render no longer closes what you opened ----------
// renderTick() rebuilds the whole panel every month. Any <details> the player had opened — the
// city development picker above all — snapped shut the moment time was running.
const sectionState=new Map();
function sectionKeyV12(d){const s=d.querySelector('summary');return s?s.textContent.trim().slice(0,60):null;}
const v11RenderPanelV12=renderPanel;
renderPanel=function(){
 const box=$('panel');
 if(box)for(const d of box.querySelectorAll('details')){const k=sectionKeyV12(d);if(k)sectionState.set(k,d.open);}
 v11RenderPanelV12();
 if(box)for(const d of box.querySelectorAll('details')){
  const k=sectionKeyV12(d);if(!k)continue;
  // A section seen before keeps the player's choice; a new one keeps its authored default.
  if(sectionState.has(k))d.open=sectionState.get(k);else sectionState.set(k,d.open);}
};

// ---------- debt can be frozen instead of removed ----------
// noDebt erases the stock. debtPaused keeps it, stops it growing, and charges no interest.
function debtFrozen(){return S?.options?.debtPaused===true&&!debtDisabled();}
const v11AccrueDebtV12=accrueDebtV6;
accrueDebtV6=function(n,budget,oldGDP){
 if(debtFrozen()){n.crisisMonths=0;n.debtWarned=0;return;}
 return v11AccrueDebtV12(n,budget,oldGDP);};
const v11HandleDebtV12=handleDebtV4;
handleDebtV4=function(n){if(debtFrozen()){n.crisisMonths=0;n.crisisGrace=0;n.debtWarned=0;return;}return v11HandleDebtV12(n);};
const v11FiscalV12=fiscal;
fiscal=function(n,p=n.policies){
 const b=v11FiscalV12(n,p);
 if(!debtFrozen())return b;
 b.interest=0;b.debtService=0;
 b.balance=b.revenue-b.spending;
 return b;};

// ---------- city queues can be unlimited ----------
function queueLimitV12(){return S?.options?.unlimitedQueue?Infinity:3;}
const v11StartCityProjectV12=startCityProject;
startCityProject=function(nid,cid,type,ai=false){
 if(!S.options.unlimitedQueue)return v11StartCityProjectV12(nid,cid,type,ai);
 const n=nation(nid),c=n?.cities.find(x=>x.id===cid),p=PROJECTS[type];
 if(!n||!c||!p||(!ai&&n.id!==S.player))return false;
 if(c.levels[type]+c.queue.filter(q=>q.type===type).length>=5){
  if(!ai)toast('This development has reached its five-level limit.');return false;}
 if(!canSpend(n,6)){if(!ai)toast('This project requires 6 political capital.');return false;}
 spendCapital(n,6);
 const duration=instantBuild()?1:projectMonths(n,c,p);
 c.queue.push({type,duration,remaining:duration,cost:n.gdp*c.share*p.cost/100,paused:false});
 if(!ai){addEvent('City development approved',c.name+' queued '+p.name.toLowerCase()+'.','development');renderPanel();renderStats();toast('Project added to the city queue.');}
 return true;};

// ---------- ideology presets are fitted to the budget ----------
const DISCRETIONARY=['services','welfare','investment','defense','climate','transit','childcare',
 'housing','rentAid','urbanization','industrial','slumUpgrade','ruralInvest','research','pension',
 'foodSecurity','publicEmployment','smeCredit','regionalFunds','familyBenefit','vocational',
 'activeLabor','justice','digitalGov','sovereignFund'];
// Trims discretionary spending until the projected balance clears the floor. Taxes, institutions
// and civil liberties are never touched: the ideology's character is kept, its bill is not.
function fitToBudgetV12(values,n,floor=-4){
 let out={...values};
 for(let pass=0;pass<40;pass++){
  const b=fiscal(n,out);
  if(b.balance>=floor)break;
  let moved=false;
  for(const k of DISCRETIONARY){
   const spec=POLICY.find(x=>x.key===k);if(!spec)continue;
   const next=clamp(out[k]-(out[k]-spec.min)*.07,spec.min,spec.max);
   if(Math.abs(next-out[k])>1e-6){out[k]=next;moved=true;}}
  if(!moved)break;}
 return out;}
function budgetFitEnabled(){return S?.options?.budgetFitPresets!==false;}

// ---------- history happens as you play ----------
// Play from 1970 and the world changes around you: colonies gain independence, the two Germanys
// reunify, the Soviet Union dissolves. Dates are the widely recorded ones; everything the events
// do to output, population and policy is a scenario assumption.
const TIMELINE=[
 // Independence: a state that was absent joins the map.
 {y:1971,m:2,kind:'appear',ids:['BHR','QAT','ARE'],title:'The Gulf states become independent',
  body:'Bahrain, Qatar and the United Arab Emirates take up their own affairs as Britain withdraws from east of Suez.'},
 {y:1971,m:11,kind:'appear',ids:['BGD'],title:'Bangladesh is founded',
  body:'East Pakistan becomes Bangladesh after a war of independence.'},
 {y:1975,m:5,kind:'appear',ids:['MOZ','CPV','STP','GNB'],title:'The Portuguese empire ends in Africa',
  body:'Mozambique, Cabo Verde, São Tomé and Príncipe and Guinea-Bissau become independent.'},
 {y:1975,m:10,kind:'appear',ids:['AGO','PNG','SUR','COM'],title:'A year of new states',
  body:'Angola, Papua New Guinea, Suriname and the Comoros take their independence.'},
 {y:1976,m:6,kind:'unify',parent:'VNM',halves:['VNN','VNS'],title:'Vietnam is reunified',
  body:'North and South Vietnam become one country.'},
 {y:1977,m:5,kind:'appear',ids:['DJI','SYC'],title:'Djibouti and the Seychelles',
  body:'Two more territories become sovereign states.'},
 {y:1978,m:6,kind:'appear',ids:['SLB','DMA','TUV'],title:'Independence in the Pacific and Caribbean',
  body:'The Solomon Islands, Dominica and Tuvalu become independent.'},
 {y:1979,m:1,kind:'appear',ids:['KIR','LCA','VCT'],title:'Kiribati, Saint Lucia and Saint Vincent',
  body:'Three more small states take their own seat.'},
 {y:1980,m:3,kind:'appear',ids:['ZWE','VUT'],title:'Zimbabwe and Vanuatu',
  body:'Rhodesia becomes Zimbabwe under majority rule, and the New Hebrides become Vanuatu.'},
 {y:1981,m:8,kind:'appear',ids:['ATG','BLZ'],title:'Antigua and Barbuda, and Belize',
  body:'Two more Commonwealth territories become independent.'},
 {y:1983,m:8,kind:'appear',ids:['KNA'],title:'Saint Kitts and Nevis',
  body:'The last of the Caribbean states to take independence.'},
 {y:1984,m:0,kind:'appear',ids:['BRN'],title:'Brunei becomes fully sovereign',
  body:'The sultanate takes full responsibility for its own foreign affairs.'},
 {y:1973,m:6,kind:'appear',ids:['BHS'],title:'The Bahamas',body:'The islands become independent.'},
 {y:1974,m:1,kind:'appear',ids:['GRD'],title:'Grenada',body:'Grenada becomes independent.'},
 {y:1990,m:2,kind:'appear',ids:['NAM'],title:'Namibia becomes independent',
  body:'South West Africa becomes Namibia.'},
 {y:1990,m:4,kind:'unify',parent:'YEM',halves:['YEN','YES'],title:'Yemen is unified',
  body:'North and South Yemen merge into a single republic.'},
 {y:1990,m:9,kind:'unify',parent:'DEU',halves:['DEW','DEE'],title:'Germany is reunified',
  body:'East and West Germany become one country a year after the Wall opened.'},
 {y:1991,m:11,kind:'dissolve',id:'SUN',title:'The Soviet Union dissolves',
  body:'Fifteen republics become independent states. The map of northern Eurasia is redrawn.'},
 {y:1992,m:3,kind:'dissolve',id:'YUG',title:'Yugoslavia breaks up',
  body:'The federation dissolves into its constituent republics.'},
 {y:1993,m:0,kind:'dissolve',id:'CSK',title:'Czechoslovakia separates',
  body:'The Czech Republic and Slovakia part company by agreement.'},
 {y:1993,m:4,kind:'appear',ids:['ERI'],title:'Eritrea becomes independent',
  body:'Eritrea separates from Ethiopia after a referendum.'},
 {y:1994,m:9,kind:'appear',ids:['PLW'],title:'Palau',body:'Palau becomes independent.'},
 {y:1986,m:9,kind:'appear',ids:['MHL','FSM'],title:'The Marshall Islands and Micronesia',
  body:'Two Pacific states enter free association and take their own seat.'},
 {y:2002,m:4,kind:'appear',ids:['TLS'],title:'Timor-Leste becomes independent',
  body:'The first new sovereign state of the century.'},
 {y:2006,m:5,kind:'dissolve',id:'SCG',title:'Montenegro leaves the union',
  body:'Serbia and Montenegro separate after a referendum.'},
 {y:2011,m:6,kind:'appear',ids:['SSD'],title:'South Sudan becomes independent',
  body:'The newest member of the United Nations.'},
];

// Most countries have a hand-authored SEEDS row, but a good number are seeded from the map data
// at the start of a game and have none. Both paths need the same fallback newGame uses.
function seedRowV12(id){
 const row=SEEDS.find(r=>r[0]===id);
 if(row)return [...row];
 const g=GEO.find(x=>x.id===id);
 if(!g)return null;
 return [g.id,g.name,g.pop?g.pop/1e6:12,g.gdp?g.gdp/1000:70,55,2.5,4,60,55,'Social liberal',g.lon||0,g.lat||0,'🌐'];}
// Territory left pointing at a state that no longer exists would fail validation.
function reassignTerritoryV12(fromId,resolve){
 for(const[poly,owner]of Object.entries(S.territory))
  if(owner===fromId)S.territory[poly]=resolve(poly);}

// A state joining the map is seeded from its present-day row, scaled to the era it appears in.
function appearStateV12(id){
 if(nation(id))return false;
 const row=seedRowV12(id);if(!row||!CITY_CATALOG[id])return false;
 const e=era();
 const scaled=[...row];
 scaled[2]=Math.max(.001,row[2]*e.popScale);
 scaled[3]=Math.max(.02,row[3]*e.gdpScale);
 const n=seedNation(scaled);
 ensureV4(n);upgradeNationV5(n);upgradeNationEconV5(n);
 n.inflation=clamp(n.inflation+e.inflation,-2,90);
 if(e.rate)n.policies.rate=n.targets.rate=clamp(e.rate,0,20);
 if(e.fx)n.fxRegime=e.fx;
 econSeed(n);n.mon.rate=n.policies.rate;n.mon.expected=n.inflation;
 n.redenominations=0;
 S.nations.push(n);
 S.territory[id]=id;
 return true;}

// A merged state dissolving hands its output and people back to its members by their present-day
// weight, and each successor keeps the merged state's policy settings as its starting point.
function dissolveStateV12(id){
 const bloc=nation(id),info=S.historical?.[id];
 if(!bloc||!info)return false;
 const rows=info.members.map(seedRowV12).filter(Boolean);
 const totalGdp=rows.reduce((a,r)=>a+r[3],0)||1,totalPop=rows.reduce((a,r)=>a+r[2],0)||1;
 for(const row of rows){
  const share=row[3]/totalGdp,popShare=row[2]/totalPop;
  const scaled=[...row];
  scaled[2]=Math.max(.001,bloc.pop*popShare);
  scaled[3]=Math.max(.02,bloc.gdp*share);
  scaled[4]=bloc.debt/Math.max(.001,bloc.gdp)*100;
  const n=seedNation(scaled);
  ensureV4(n);upgradeNationV5(n);upgradeNationEconV5(n);
  for(const k of ['policies','targets'])n[k]={...bloc[k]};
  for(const k of ['capacity','human','infra','clean','inflation','unemployment','inequality'])n[k]=bloc[k];
  n.fxRegime=bloc.fxRegime;
  n.forces={army:bloc.forces.army*share,navy:bloc.forces.navy*share,air:bloc.forces.air*share};
  n.military=n.forces.army+n.forces.navy+n.forces.air;
  econSeed(n);n.mon.rate=n.policies.rate;n.mon.expected=n.inflation;
  n.redenominations=0;
  S.nations.push(n);S.territory[row[0]]=row[0];}
 S.nations=S.nations.filter(x=>x.id!==id);
 delete S.historical[id];
 delete S.territory[id];
 // Any polygon still attributed to the dissolved state reverts to its own country.
 reassignTerritoryV12(id,poly=>S.nations.some(n=>n.id===poly)?poly:'');
 if(S.player===id)S.player=rows[0][0];
 if(selected===id)selected=S.player;
 return true;}

// Two halves becoming one country again.
function unifyStateV12(parentId,halves){
 const parts=halves.map(h=>nation(h)).filter(Boolean);
 if(parts.length<2)return false;
 const row=seedRowV12(parentId);if(!row)return false;
 const gdp=parts.reduce((a,n)=>a+n.gdp,0),pop=parts.reduce((a,n)=>a+n.pop,0);
 const lead=parts.reduce((a,b)=>b.gdp>a.gdp?b:a);
 const scaled=[...row];scaled[2]=pop;scaled[3]=gdp;
 scaled[4]=parts.reduce((a,n)=>a+n.debt,0)/Math.max(.001,gdp)*100;
 const n=seedNation(scaled);
 ensureV4(n);upgradeNationV5(n);upgradeNationEconV5(n);
 for(const k of ['policies','targets'])n[k]={...lead[k]};
 for(const k of ['capacity','human','infra','clean','inflation','unemployment','inequality'])n[k]=lead[k];
 n.fxRegime=lead.fxRegime;
 n.forces={army:parts.reduce((a,x)=>a+x.forces.army,0),navy:parts.reduce((a,x)=>a+x.forces.navy,0),air:parts.reduce((a,x)=>a+x.forces.air,0)};
 n.military=n.forces.army+n.forces.navy+n.forces.air;
 econSeed(n);n.mon.rate=n.policies.rate;n.mon.expected=n.inflation;
 const gone=new Set(halves);
 n.redenominations=0;
 S.nations=S.nations.filter(x=>!gone.has(x.id));
 S.nations.push(n);
 for(const h of halves){delete S.partitioned[h];delete SPLIT_PATHS[h];delete S.territory[h];}
 S.territory[parentId]=parentId;
 if(gone.has(S.player))S.player=parentId;
 if(gone.has(selected))selected=S.player;
 return true;}

// Fires any timeline event whose date the simulation has just passed.
function tickHistoryV12(){
 if(S.options.historyEvents===false)return;
 const now=gameDate(S.month),y=now.getUTCFullYear(),m=now.getUTCMonth();
 S.historyDone=S.historyDone||[];
 for(let i=0;i<TIMELINE.length;i++){
  const e=TIMELINE[i];
  if(S.historyDone.includes(i))continue;
  if(y<e.y||(y===e.y&&m<e.m))continue;
  let changed=false;
  if(e.kind==='appear')changed=e.ids.map(appearStateV12).some(Boolean);
  if(e.kind==='dissolve')changed=dissolveStateV12(e.id);
  if(e.kind==='unify')changed=unifyStateV12(e.parent,e.halves);
  S.historyDone.push(i);
  if(!changed)continue;
  // A country that no longer exists cannot be at war or hold agreements.
  const live=new Set(S.nations.map(n=>n.id));
  for(const n of S.nations)if(n.war&&!live.has(n.war.target))n.war=null;
  S.agreements=(S.agreements||[]).filter(p=>live.has(p.a)&&live.has(p.b));
  S.embargoes=(S.embargoes||[]).filter(x=>live.has(x.from)&&live.has(x.to));
  S.tradeDeals=(S.tradeDeals||[]).filter(d=>live.has(d.from)&&live.has(d.to));
  S.relations=Object.fromEntries(Object.entries(S.relations||{}).filter(([k])=>k.split(':').every(x=>live.has(x))));
  syncDiplomacy();ensureV12FieldsV12();rebuildNeighboursV12();
  addEvent(e.title,e.body,'world');
  initPaths();requestDraw();refreshWorld();}
}

// ---------- rival nations fight their own wars ----------
// Nothing in the model used to push relations down, so neighbours never fell below about -4 and a
// rival could never find a reason to fight. Friction now grows between neighbours who differ
// sharply in how they are governed, or where one dwarfs the other; agreements keep it warm.
function rivalryDriftV12(){
 if(!S.options.ai||S.month%2!==0)return;
 const aggression=numericOption('aiAggression',1);
 // Easy is documented as a cooperative world, so no friction is generated there at all —
 // the warmth in the difficulty layer is left to do its work.
 if(aggression<1)return;
 for(let i=0;i<12;i++){
  const a=S.nations[Math.floor(random()*S.nations.length)];
  const ids=[...neighboursOfV12(a.id)];
  if(!ids.length)continue;
  const b=nation(ids[Math.floor(random()*ids.length)]);
  if(!b)continue;
  if(agreement(a.id,b.id,'nonaggression')||agreement(a.id,b.id,'defense')||agreement(a.id,b.id,'embassy')){
   setRelation(a.id,b.id,relation(a.id,b.id)+.5);continue;}
  const strong=Math.max(a.military,b.military),weak=Math.max(.01,Math.min(a.military,b.military));
  const friction=Math.abs(a.policies.institutions-b.policies.institutions)*.022
   +Math.abs(a.policies.liberties-b.policies.liberties)*.014
   +(strong/weak>2.5?1.1:0)
   +(S.sanctions.includes(pair(a.id,b.id))?2:0);
  setRelation(a.id,b.id,relation(a.id,b.id)-(friction-1.0)*.8*aggression+(random()-.5)*1.1);}}

// A neighbour index, rebuilt whenever the map changes. Scanning 310 borders for every candidate
// pair was far too slow to do inside a monthly tick.
let NEIGHBOURS=new Map();
function rebuildNeighboursV12(){
 NEIGHBOURS=new Map();
 for(const key of Object.keys(BORDERS)){
  const[p,q]=key.split(':');
  const op=territoryOwner(p),oq=territoryOwner(q);
  if(!op||!oq||op===oq)continue;
  if(!NEIGHBOURS.has(op))NEIGHBOURS.set(op,new Set());
  if(!NEIGHBOURS.has(oq))NEIGHBOURS.set(oq,new Set());
  NEIGHBOURS.get(op).add(oq);NEIGHBOURS.get(oq).add(op);}}
function neighboursOfV12(id){return NEIGHBOURS.get(id)||new Set();}

function aiWarV12(){
 if(!S.options.ai||S.options.noWar||S.month%6!==0)return;
 const aggression=numericOption('aiAggression',1);
 // Every pair with a real grievance, then one is chosen — rather than hoping a random pick has one.
 const candidates=[];
 for(const a of S.nations){
  if(a.id===S.player||a.war)continue;
  for(const id of neighboursOfV12(a.id)){
   if(id===S.player)continue;
   const b=nation(id);
   if(!b||b.war)continue;
   if(relation(a.id,b.id)>=-30)continue;
   if(a.military<=b.military*1.4)continue;
   if(agreement(a.id,b.id,'nonaggression')||agreement(a.id,b.id,'defense'))continue;
   candidates.push([a,b]);}}
 if(!candidates.length||random()>.30*aggression)return;
 const[a,b]=candidates[Math.floor(random()*candidates.length)];
 a.war={target:b.id,months:0,progress:0};b.war={target:a.id,months:0,progress:0};
 openFrontV12(a,b);
 a.approval=clamp(a.approval-8,3,97);
 setRelation(a.id,b.id,-95);
 S.treaties=S.treaties.filter(t=>t!==pair(a.id,b.id));
 addEvent('War breaks out',a.name+' has attacked '+b.name+'. The two share a land border and both armies are moving to it.','security');
 requestDraw();}

// ---------- offensives can be aimed at a named city ----------
// A city's depth is how far past the border an army must get to take it: the largest cities are
// the best defended and the furthest in.
function cityDepthV12(target,city){
 const ranked=[...target.cities].sort((x,y)=>y.share-x.share);
 const rank=Math.max(0,ranked.indexOf(city));
 return clamp(.30+rank*.11+city.share*.55,.25,.96);}
function objectiveCityV12(n){
 const w=n.war;if(!w||!w.objective)return null;
 const foe=nation(w.target);
 return foe?foe.cities.find(c=>c.id===w.objective)||null:null;}
function setObjectiveV12(cityId){
 const n=player();if(!n.war||!n.war.land)return;
 const foe=nation(n.war.target);if(!foe)return;
 const city=foe.cities.find(c=>c.id===cityId);if(!city)return;
 n.war.objective=cityId;
 const other=foe.war;if(other)other.objective=null;
 addEvent('A new objective',n.name+' directs the offensive at '+city.name+'. Its defences deepen the further in it sits.','security');
 renderPanel();}
// Cities fall when the front passes their depth, and the loss is felt.
function captureCitiesV12(a,b){
 for(const[att,def]of [[a,b],[b,a]]){
  const line=att===a?a.war.line:-a.war.line;
  if(line<=0)continue;
  att.war.taken=att.war.taken||[];
  for(const city of def.cities){
   if(att.war.taken.includes(city.id))continue;
   const depth=cityDepthV12(def,city);
   const aimed=att.war.objective===city.id;
   if(line<depth*(aimed?.86:1))continue;
   att.war.taken.push(city.id);
   def.gdp=Math.max(.02,def.gdp*(1-city.share*.32));
   def.stability=clamp(def.stability-city.share*26,3,97);
   def.approval=clamp(def.approval-city.share*20,3,97);
   city.crime=clamp(city.crime+22,0,100);
   city.satisfaction=clamp(city.satisfaction-30,0,100);
   att.approval=clamp(att.approval+3,3,97);
   if([att.id,def.id].includes(S.player)||city.share>.2)
    addEvent(city.name+' falls',att.name+'’s forces enter '+city.name+'. '+def.name+' loses the output and the confidence that went with it.','security');
   if(aimed)att.war.objective=null;}}
}

function openFrontV12(a,b){
 const land=openFrontV11(a,b);
 for(const n of [a,b]){n.war.objective=null;n.war.taken=[];}
 return land;}
const v11DeclareWarV12=declareWar;
declareWar=function(){
 v11DeclareWarV12();
 const n=player();
 if(n.war){n.war.objective=n.war.objective??null;n.war.taken=n.war.taken??[];
  const foe=nation(n.war.target);if(foe&&foe.war){foe.war.objective=foe.war.objective??null;foe.war.taken=foe.war.taken??[];}}};
const v11ResolveWarsV12=resolveWars;
resolveWars=function(){
 const pairs=[],seen=new Set();
 for(const n of S.nations){
  if(!n.war||seen.has(n.id))continue;
  const o=nation(n.war.target);if(!o||!o.war)continue;
  seen.add(n.id);seen.add(o.id);
  const a=n.war.attacker?n:o,b=a===n?o:n;
  if(a.war.land)pairs.push([a,b]);}
 v11ResolveWarsV12();
 for(const[a,b]of pairs)if(a.war&&b.war)captureCitiesV12(a,b);};

// ---------- more programs ----------
PROGRAMS.push(
 {key:'stabilise',name:'Stabilisation package',tag:'Macroeconomic',
  blurb:'The orthodox response to an inflation: tighten money, close the deficit and let the output gap do the work. It is unpopular and it works slowly.',
  keys:['rate','inflationTarget','cbIndependence','tax'],
  stage:{rate:9,inflationTarget:2,cbIndependence:90,tax:38},
  stageNote:'Raises the policy rate, hands the bank its independence and closes the deficit with revenue.'},
 {key:'industrialise',name:'Industrial strategy',tag:'Cities & industry',
  blurb:'Build the capital stock deliberately: infrastructure, industry, freight and the skills to run them. Slow, expensive, and the only thing that moves potential output.',
  keys:['investment','industrial','vocational','competition','smeCredit'],
  stage:{investment:9,industrial:6,vocational:85,competition:75,smeCredit:2},
  stageNote:'Stages public investment, industrial support, training and competition enforcement.'},
 {key:'welfarestate',name:'Universal welfare state',tag:'Domestic policy',
  blurb:'Health, education, pensions, childcare and family support at Nordic levels, paid for honestly. Inequality falls; so does the budget balance unless you raise the revenue.',
  keys:['services','welfare','childcare','familyBenefit','pension','tax'],
  stage:{services:18,welfare:18,childcare:4,familyBenefit:2.5,pension:4,tax:48},
  stageNote:'Stages a full welfare state and the tax burden to fund it.'},
 {key:'greentransition',name:'Energy transition',tag:'Climate & energy',
  blurb:'Move the energy system off fossil fuels: generation, transport and the grid. It costs now and cushions the supply shocks that arrive later.',
  keys:['climate','transit','investment','research'],
  stage:{climate:85,transit:4,investment:8,research:3.5},
  stageNote:'Stages clean generation, public transport, infrastructure and research.'},
 {key:'openness',name:'Open economy',tag:'Economic management',
  blurb:'Drop the barriers: low tariffs, open capital account, competitive markets. Productivity rises with exposure, and so does vulnerability to what happens elsewhere.',
  keys:['trade','tariff','capitalControls','competition','business'],
  stage:{trade:92,tariff:2,capitalControls:10,competition:85,business:85},
  stageNote:'Stages open trade, low tariffs, free capital movement and competitive markets.'},
 {key:'lawandorder',name:'Public safety & justice',tag:'Cities & justice',
  blurb:'Courts, policing, prevention and the conditions that reduce crime in the first place. Enforcement alone moves the index slowly and costs a great deal.',
  keys:['justice','antiCorruption','activeLabor','services','minimumWage'],
  stage:{justice:88,antiCorruption:85,activeLabor:70,services:15,minimumWage:60},
  stageNote:'Stages courts, oversight, placement programmes and the services that prevent crime.'},
 {key:'defence',name:'Defence posture',tag:'Security',
  blurb:'A serious military: equipment, training, logistics and readiness. It buys you leverage on the border and costs you everything you might have spent elsewhere.',
  keys:['defense','training','logistics','conscription'],
  stage:{defense:5,training:85,logistics:80,conscription:35},
  stageNote:'Stages defence spending, training intensity, logistics and reserve commitment.'});

// ---------- interface ----------
const v11WarPanelV12=warPanelV11;
warPanelV11=function(n){
 const base=v11WarPanelV12(n);
 if(!base||!n.war||!n.war.land)return base;
 const foe=nation(n.war.target);if(!foe)return base;
 const owned=n.id===S.player,line=n.war.attacker?n.war.line:-n.war.line;
 const taken=(n.war.taken||[]).map(id=>foe.cities.find(c=>c.id===id)).filter(Boolean);
 const lost=(foe.war?.taken||[]).map(id=>n.cities.find(c=>c.id===id)).filter(Boolean);
 const objective=objectiveCityV12(n);
 const list=foe.cities.map(c=>{
  const depth=cityDepthV12(foe,c),held=(n.war.taken||[]).includes(c.id);
  return '<button class="preset objectivebtn'+(n.war.objective===c.id?' active':'')+'" data-objective="'+c.id+'" '
   +(!owned||held?'disabled':'')+'><strong>'+escapeHTML(c.name)
   +'<span style="float:right;color:var(--accent)">'+(held?'taken':(depth*100).toFixed(0)+'% in')+'</span></strong>'
   +'<small>'+(held?'Under your control.':'Needs the front '+(depth*100).toFixed(0)+'% of the way in. Currently '+(Math.max(0,line)*100).toFixed(0)+'%.')+'</small></button>';}).join('');
 return base
 +'<div class="block warroom"><h3>Objectives</h3>'
 +'<p>Name a city and the offensive is aimed at it: its defences give a little sooner than they otherwise would. Larger cities sit deeper and are better held.</p>'
 +(objective?'<p class="note">Currently advancing on <b>'+escapeHTML(objective.name)+'</b>.</p>':'')
 +list
 +(taken.length?'<p class="note">Taken: '+taken.map(c=>escapeHTML(c.name)).join(', ')+'</p>':'')
 +(lost.length?'<p class="note negative">Lost: '+lost.map(c=>escapeHTML(c.name)).join(', ')+'</p>':'')
 +'</div>';};
const v11SettingsV12=settingsPanel;
settingsPanel=function(){
 return '<h3>Debt</h3>'
 +'<label class="toggleline">Freeze the debt stock<input type="checkbox" data-option="debtPaused" '+(S.options.debtPaused?'checked':'')+'></label>'
 +'<p>'+(S.options.debtPaused
   ?'Debt is frozen at its current level. Deficits do not add to it and no interest is charged, but the stock you already carry stays on the books.'
   :'Debt accumulates normally. Freezing it keeps the stock you have without letting it grow — unlike removing debt entirely, which erases it.')+'</p>'
 +'<div class="block"></div><h3>Cities</h3>'
 +'<label class="toggleline">Unlimited construction queue<input type="checkbox" data-option="unlimitedQueue" '+(S.options.unlimitedQueue?'checked':'')+'></label>'
 +'<p>'+(S.options.unlimitedQueue?'Queue as many projects in a city as you can pay for. The five-level cap per development still applies.'
   :'Each city holds three queued projects at a time.')+'</p>'
 +'<div class="block"></div><h3>Reforms & history</h3>'
 +'<label class="toggleline">Fit ideology presets to the budget<input type="checkbox" data-option="budgetFitPresets" '+(budgetFitEnabled()?'checked':'')+'></label>'
 +'<p>'+(budgetFitEnabled()
   ?'Staging an ideology trims its discretionary spending until the projected deficit is within about 4% of output. Taxes, institutions and civil liberties are left alone, so the ideology keeps its character.'
   :'Ideology presets are staged exactly as written, whatever they cost.')+'</p>'
 +'<label class="toggleline">Historical events as time passes<input type="checkbox" data-option="historyEvents" '+(S.options.historyEvents!==false?'checked':'')+'></label>'
 +'<p>'+(S.options.historyEvents!==false
   ?'Play from an earlier era and the map changes on schedule: colonies gain independence, Germany and Yemen reunify, the Soviet Union and Yugoslavia dissolve.'
   :'The map stays as the era set it, whatever year it becomes.')+'</p>'
 +'<div class="block"></div>'+v11SettingsV12();};
const v11BindPanelV12=bindPanel;
bindPanel=function(){
 v11BindPanelV12();
 for(const b of $('panel').querySelectorAll('[data-objective]'))
  b.onclick=()=>setObjectiveV12(b.dataset.objective);};
// Presets are staged through the budget filter.
const v11RenderV12=render;
render=function(){
 v11RenderV12();
 if(!budgetFitEnabled())return;
 for(const b of $('panel').querySelectorAll('[data-preset]')){
  const original=b.onclick;
  b.onclick=()=>{original&&original();
   if(draft){const before=fiscal(current(),draft).balance;
    draft=fitToBudgetV12(draft,current());
    const after=fiscal(current(),draft).balance;
    if(after-before>.2)toast('Preset staged and trimmed to fit the budget: '+pct(after)+' of GDP.');}
   renderPanel();updateReformPreview();};}
};

// ---------- a price index cannot compound for ever ----------
// Fifty years of very high inflation pushed the index past what the save format accepts. Countries
// facing that restate the currency; so does this. Nothing real changes.
const v11TickNationV12=tickV4Nation;
tickV4Nation=function(n){
 v11TickNationV12(n);
 if(n.priceLevel>1e9){
  n.priceLevel/=1000;
  n.redenominations=(n.redenominations||0)+1;
  if(n.id===S.player||n.gdp>1500)
   addEvent('The currency drops three zeros',
    n.name+' restates its currency after years of very high inflation. Prices and wages are '
    +'renumbered together; output, debt and the real economy are untouched.','markets');}};

// ---------- lifecycle ----------
const V12_OPTIONS={debtPaused:false,unlimitedQueue:false,budgetFitPresets:true,historyEvents:true};
const v11NewGameV12=newGame;
newGame=function(){
 v11NewGameV12();S.version=12;
 Object.assign(S.options,V12_OPTIONS);
 S.historyDone=[];sectionState.clear();rebuildNeighboursV12();ensureV12FieldsV12();
 addEvent('The world moves on its own','Rival nations now fight their own wars, and from an earlier era the map changes on schedule as states appear, unify and dissolve.','model');};
// Merged and partitioned states are created by the era layers, which run before this one, so the
// fields V12 adds are normalised in a single sweep after anything that can create a state.
function ensureV12FieldsV12(){
 for(const n of S.nations){
  if(!Number.isInteger(n.redenominations))n.redenominations=0;
  if(n.war){n.war.objective=n.war.objective??null;n.war.taken=n.war.taken??[];}}}
const v11ApplyHistoryV12=applyHistoryV8;
applyHistoryV8=function(eraKey){
 v11ApplyHistoryV12(eraKey);
 ensureV12FieldsV12();
 rebuildNeighboursV12();
 // Anything the era has already passed counts as done, so 2000 does not replay 1971.
 S.historyDone=[];
 const start=gameDate(0),y=start.getUTCFullYear(),m=start.getUTCMonth();
 TIMELINE.forEach((e,i)=>{if(y>e.y||(y===e.y&&m>=e.m))S.historyDone.push(i);});};
const v11MigrateV12=migrateSave;
migrateSave=function(s){
 s=v11MigrateV12(s);if(s?.version!==11)return s;
 s.options={...V12_OPTIONS,...s.options};
 s.historyDone=s.historyDone||[];
 for(const n of s.nations)n.redenominations=n.redenominations??0;
 for(const n of s.nations)if(n.war){n.war.objective=n.war.objective??null;n.war.taken=n.war.taken??[];}
 s.version=12;return s;};
const v11ValidSaveV12=validSave;
validSave=function(s){
 v11ValidSaveV12(s);
 for(const k of ['debtPaused','unlimitedQueue','budgetFitPresets','historyEvents'])
  if(typeof s.options[k]!=='boolean')throw Error('Invalid world rule.');
 if(!Array.isArray(s.historyDone)||s.historyDone.some(i=>!Number.isInteger(i)||i<0||i>=TIMELINE.length))
  throw Error('Invalid history log.');
 for(const n of s.nations)if(!Number.isInteger(n.redenominations)||n.redenominations<0||n.redenominations>200)throw Error('Invalid currency history.');
 if(s.options.debtPaused&&s.options.noDebt)throw Error('Debt cannot be both frozen and removed.');
 const live=new Set(s.nations.map(n=>n.id));
 for(const n of s.nations){
  if(!n.war)continue;
  if(n.war.objective!==null&&typeof n.war.objective!=='string')throw Error('Invalid war objective.');
  if(!Array.isArray(n.war.taken)||n.war.taken.length>60)throw Error('Invalid captured-city list.');
  const foe=s.nations.find(x=>x.id===n.war.target);
  if(foe&&n.war.taken.some(id=>!foe.cities.some(c=>c.id===id)))throw Error('A captured city does not exist.');
  if(n.war.objective&&foe&&!foe.cities.some(c=>c.id===n.war.objective))throw Error('Invalid war objective.');}
 return s;};
const v11GuideV12=showGuide;
showGuide=function(){
 v11GuideV12();const box=$('modalContent');if(!box)return;
 box.insertAdjacentHTML('beforeend','<div class="block"><h3>V12 a world that moves</h3>'
 +'<p><b>History as you play.</b> Start in 1970 and the map changes on schedule around you: the Gulf states and Bangladesh in 1971, the Portuguese colonies in 1975, Vietnam reunified in 1976, Zimbabwe in 1980, Germany and Yemen in 1990, the Soviet Union in December 1991, Yugoslavia in 1992, Czechoslovakia in 1993, and on to South Sudan in 2011. A dissolving state hands its output and people to its successors; a unification pools them. The dates are the widely recorded ones; what the events do to the numbers is a scenario assumption. Turn it off in Sandbox.</p>'
 +'<p><b>Other people’s wars.</b> Rival nations now attack neighbours they dislike and clearly outmatch, fought on the same front model as your own — you will see the line on the map. They will not start a war against a country holding a non-aggression or defence agreement with them.</p>'
 +'<p><b>Objectives.</b> In a land war you can aim the offensive at a named city — Buenos Aires, Rosario, whichever. Every enemy city has a depth: how far past the border the front must reach before it falls, deeper for the largest and best-held. Aiming at one brings it down a little sooner. Taking a city costs the defender the output and the confidence that went with it; borders still never move.</p>'
 +'<p><b>Also:</b> debt can be frozen rather than removed, so the stock you carry stays without growing; city construction queues can be unlimited; ideology presets are trimmed to fit the budget without touching their taxes or institutions; and seven more programmes — stabilisation, industrial strategy, a universal welfare state, the energy transition, an open economy, public safety, and defence posture.</p>'
 +'<p><b>Fixed:</b> the city development picker no longer closes every month while time is running. Any section you open now stays open through the monthly re-render.</p></div>');};
