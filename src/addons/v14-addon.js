// V14: federal agencies for the major economies, and a country chooser on the start screen.
//
// The agencies named below are real public institutions, listed for flavour. Their budgets and
// every effect attributed to them here are gameplay abstractions invented for this simulation —
// no figure is a real budget, and nothing here describes what any real agency does or achieves.
// Only larger economies have them, because a national space programme is not a lever every
// country has.
const AGENCY_KINDS={
 space:{label:'Space & research',blurb:'Long-horizon research. Raises productivity growth slowly and steadily.'},
 intelligence:{label:'Intelligence',blurb:'Foreign intelligence. Improves readiness and softens the damage sanctions do.'},
 security:{label:'Federal law enforcement',blurb:'Serious and organised crime. Lowers crime pressure nationally.'},
 emergency:{label:'Civil protection',blurb:'Disaster response. Reduces the damage supply shocks do to output.'},
 health:{label:'Public health',blurb:'Disease control and prevention. Raises human capital over time.'},
 environment:{label:'Environmental protection',blurb:'Emissions and land. Raises the clean-energy score.'}};
const AGENCIES={
 USA:[['nasa','NASA','space'],['fbi','FBI','security'],['cia','CIA','intelligence'],
      ['fema','FEMA','emergency'],['cdc','CDC','health'],['epa','EPA','environment']],
 CHN:[['cnsa','China National Space Administration','space'],['mee','Ministry of Ecology and Environment','environment'],
      ['chinacdc','China CDC','health'],['mem','Ministry of Emergency Management','emergency']],
 RUS:[['roscosmos','Roscosmos','space'],['fsb','Federal Security Service','intelligence'],
      ['emercom','EMERCOM','emergency']],
 GBR:[['uksa','UK Space Agency','space'],['mi6','Secret Intelligence Service','intelligence'],
      ['nca','National Crime Agency','security'],['ukhsa','UK Health Security Agency','health'],
      ['ea','Environment Agency','environment']],
 FRA:[['cnes','CNES','space'],['dgse','DGSE','intelligence'],['ademe','ADEME','environment'],
      ['sp','Santé publique France','health']],
 DEU:[['dlr','DLR','space'],['bnd','BND','intelligence'],['bka','Federal Criminal Police Office','security'],
      ['thw','Federal Agency for Technical Relief','emergency'],['rki','Robert Koch Institute','health'],
      ['uba','Federal Environment Agency','environment']],
 JPN:[['jaxa','JAXA','space'],['jma','Japan Meteorological Agency','emergency'],
      ['mhlw','National Institute of Infectious Diseases','health'],['moe','Ministry of the Environment','environment']],
 IND:[['isro','ISRO','space'],['ndma','National Disaster Management Authority','emergency'],
      ['cbi','Central Bureau of Investigation','security'],['icmr','Indian Council of Medical Research','health']],
 BRA:[['aeb','Brazilian Space Agency','space'],['pf','Federal Police','security'],
      ['ibama','IBAMA','environment'],['fiocruz','Fiocruz','health']],
 CAN:[['csa','Canadian Space Agency','space'],['csis','CSIS','intelligence'],
      ['phac','Public Health Agency of Canada','health'],['eccc','Environment and Climate Change Canada','environment']],
 ITA:[['asi','Italian Space Agency','space'],['iss','Istituto Superiore di Sanità','health'],
      ['dpc','Civil Protection Department','emergency']],
 KOR:[['kasa','Korea AeroSpace Administration','space'],['kdca','Korea Disease Control and Prevention Agency','health'],
      ['nis','National Intelligence Service','intelligence']],
 AUS:[['asa','Australian Space Agency','space'],['csiro','CSIRO','space'],
      ['asio','ASIO','intelligence'],['afp','Australian Federal Police','security']],
 ESP:[['inta','INTA','space'],['cni','CNI','intelligence'],['upsc','Civil Protection','emergency']],
 MEX:[['aem','Mexican Space Agency','space'],['cnpc','National Civil Protection','emergency'],
      ['profepa','PROFEPA','environment']],
 IDN:[['brin','BRIN','space'],['bnpb','BNPB','emergency'],['kemenkes','Ministry of Health','health']],
 TUR:[['tua','Turkish Space Agency','space'],['afad','AFAD','emergency'],['tubitak','TÜBİTAK','space']],
 SAU:[['ssa','Saudi Space Agency','space'],['sfda','Saudi Food and Drug Authority','health']],
 NLD:[['nso','Netherlands Space Office','space'],['rivm','RIVM','health']],
 POL:[['polsa','POLSA','space'],['abw','Internal Security Agency','intelligence']],
 ARG:[['conae','CONAE','space'],['pfa','Argentine Federal Police','security']],
 ZAF:[['sansa','SANSA','space'],['hawks','Directorate for Priority Crime Investigation','security']]};
function agenciesFor(id){return AGENCIES[id]||null;}
function hasAgenciesV14(n){return !!n&&!!agenciesFor(n.id);}
// Budget per agency, as a share of GDP. Small individually; meaningful in aggregate.
// Roughly the scale real agencies operate at: a large space programme is a fifth of a percent of
// output, a federal police force less. Six at full funding is about 1.5% of GDP in total.
const AGENCY_MAX=.25;
function agencySpendV14(n){
 const list=agenciesFor(n.id);if(!list||!n.agencies)return 0;
 return list.reduce((a,[id])=>a+(n.agencies[id]||0),0);}
function agencyEffortV14(n,kind){
 const list=agenciesFor(n.id);if(!list||!n.agencies)return 0;
 return list.filter(([,,k])=>k===kind).reduce((a,[id])=>a+(n.agencies[id]||0),0);}
function seedAgenciesV14(n){
 const list=agenciesFor(n.id);
 if(!list){n.agencies=null;return;}
 n.agencies={};
 // A starting level scaled to how developed the country is, so nobody begins from nothing.
 const base=clamp(.035+(n.capacity-50)*.0012+Math.log10(Math.max(1,n.gdp/Math.max(.01,n.pop)))*.022,.015,.12);
 for(const[id]of list)n.agencies[id]=Math.round(base*100)/100;}

// ---------- what the money buys ----------
// Every coefficient is a gameplay assumption, and each effect is small next to the policy levers
// that already exist. Agencies sharpen a country; they do not replace governing it.
const v13FiscalV14=fiscal;
fiscal=function(n,p=n.policies){
 const b=v13FiscalV14(n,p);
 const spend=agencySpendV14(n);
 if(!spend)return b;
 b.spending+=spend;
 b.agencySpend=spend;
 b.balance=b.revenue-b.spending-b.debtService;
 return b;};
const v13TickNationV14=tickV4Nation;
tickV4Nation=function(n){
 v13TickNationV14(n);
 if(!hasAgenciesV14(n))return;
 const eff=k=>agencyEffortV14(n,k);
 // Research raises human capital and, through the growth model, productivity.
 n.human=clamp(n.human+eff('space')*.06,0,100);
 // Federal law enforcement bears on serious crime across every city.
 const crimeCut=eff('security')*1.3;
 if(crimeCut)for(const c of n.cities)c.crime=clamp(c.crime-crimeCut,0,100);
 // Public health compounds into human capital; environment into the clean score.
 n.human=clamp(n.human+eff('health')*.085,0,100);
 n.clean=clamp(n.clean+eff('environment')*.18,0,100);
 // Intelligence keeps forces sharper and blunts the productivity penalty from sanctions.
 n.readiness=clamp(n.readiness+eff('intelligence')*.85,15,95);
 // Civil protection shortens a shock and softens it.
 if(n.shockMonths>0&&n.shock<0){
  n.shock*=Math.max(.25,1-eff('emergency')*1.9);
  if(eff('emergency')>.12&&random()<eff('emergency')*.9)n.shockMonths--;}};
// A space programme feeds the productivity term the growth model already uses.
const v13TickSupplyV14=typeof tickSupply==='function'?tickSupply:null;
if(v13TickSupplyV14)tickSupply=function(n){
 // The boost must land before potential output is computed from tfp, or the reported
 // Y* = A K^a L^(1-a) identity no longer holds.
 const boost=hasAgenciesV14(n)?agencyEffortV14(n,'space')*.9:0;
 if(boost)n.tfp*=Math.pow(1+boost/100,1/12);
 v13TickSupplyV14(n);};

// ---------- the agencies panel ----------
function agencyPanelV14(n){
 const list=agenciesFor(n.id);
 if(!list)return '<h3>Federal agencies</h3><p>'+escapeHTML(n.name)+' does not run standing federal agencies of the kind modelled here. '
  +'The larger economies do — the ones with their own space programmes, disease-control bodies and federal police. '
  +'Everything those agencies do is available to you through the ordinary policy levers instead.</p>';
 const owned=n.id===S.player,b=fiscal(n),total=agencySpendV14(n);
 const byKind={};
 for(const[id,name,kind]of list)(byKind[kind]=byKind[kind]||[]).push([id,name]);
 return '<h3>Federal agencies</h3>'
 +'<p>Standing institutions funded outside the ordinary programme budget. Each is small on its own; '
 +'together they are '+total.toFixed(2)+'% of output a year, inside a fiscal balance of '+pct(b.balance)+'.</p>'
 +metric('Total agency budget',total.toFixed(2)+'% of GDP')
 +metric('Agencies funded',list.filter(([id])=>(n.agencies?.[id]||0)>.02).length+' of '+list.length)
 +Object.entries(byKind).map(([kind,items])=>
   '<div class="policygroup eyebrow">'+AGENCY_KINDS[kind].label+'</div>'
   +'<p class="note">'+AGENCY_KINDS[kind].blurb+'</p>'
   +items.map(([id,name])=>{
     const v=n.agencies?.[id]||0;
     return '<div class="policy"><label class="metricrow" for="ag-'+id+'"><span>'+escapeHTML(name)+'</span>'
      +'<output id="ago-'+id+'">'+v.toFixed(2)+'% GDP</output></label>'
      +'<input type="range" id="ag-'+id+'" data-agency="'+id+'" min="0" max="'+AGENCY_MAX+'" step="0.01" value="'+v+'"'
      +(owned?'':' disabled')+'></div>';}).join('')).join('')
 +'<p class="caveat">These are real institutions, named for flavour. Their budgets here, and every effect '
 +'attributed to them, are invented for this simulation — no figure is a real budget and nothing here '
 +'describes what any real agency does.</p>';}
const v13RenderPanelV14=renderPanel;
renderPanel=function(){
 if(view==='agencies'){
  const n=current();
  $('panel').innerHTML=agencyPanelV14(n);
  bindPanel();
  return;}
 return v13RenderPanelV14();};
const v13BindPanelV14=bindPanel;
bindPanel=function(){
 v13BindPanelV14();
 for(const el of $('panel').querySelectorAll('[data-agency]'))
  el.oninput=()=>{
   const n=player();if(current().id!==n.id||!n.agencies)return;
   n.agencies[el.dataset.agency]=clamp(Number(el.value)||0,0,AGENCY_MAX);
   const out=$('ago-'+el.dataset.agency);if(out)out.textContent=(n.agencies[el.dataset.agency]).toFixed(2)+'% GDP';
   renderStats();};};

// ---------- step one: choose your country ----------
// A screen of its own. Picking one of 204 countries from a dropdown was not a choice, it was a
// scroll; this is searchable, sorted by size, and tells you what you are taking on.
let startCountryV14=null;
function countryRowV14(n){
 const ag=agenciesFor(n.id);
 return '<button class="countryrow" data-pick="'+n.id+'">'
  +'<span class="cflag">'+escapeHTML(CITY_CATALOG[n.id]?.flag||'🌐')+'</span>'
  +'<span class="cname">'+escapeHTML(n.name)+'</span>'
  +'<span class="cstat">'+money(n.gdp)+'</span>'
  +'<span class="cstat">'+n.pop.toFixed(1)+'m</span>'
  +'<span class="cbadge">'+(ag?ag.length+' agencies':'')+'</span></button>';}
function countryListV14(filter){
 const q=(filter||'').trim().toLowerCase();
 const list=S.nations.slice().sort((a,b)=>b.gdp-a.gdp)
  .filter(n=>!q||n.name.toLowerCase().includes(q)||n.id.toLowerCase()===q);
 if(!list.length)return '<p class="note">No country matches that.</p>';
 return list.map(countryRowV14).join('');}
function countryScreenV14(){
 const saved=(()=>{try{return !!localStorage.getItem('sovereign-save-v1')}catch(e){return false}})();
 modal('Which country will you lead?',
  '<p>Any of the '+S.nations.length+' on the map. Larger economies run federal agencies you can fund; '
  +'most countries do not, and are not disadvantaged for it — the same outcomes are reachable through '
  +'ordinary policy.</p>'
  +'<input type="search" id="countrySearch" class="full" placeholder="Search 204 countries…" autocomplete="off">'
  +'<div class="countrylist" id="countryList">'+countryListV14('')+'</div>'
  +(saved?'<button class="full" id="startLoad2">Continue your saved world instead</button>':''));
 const search=$('countrySearch'),list=$('countryList');
 if(search)search.oninput=()=>{list.innerHTML=countryListV14(search.value);bindCountryRowsV14();};
 if($('startLoad2'))$('startLoad2').onclick=()=>{closeModal();actions.load();};
 bindCountryRowsV14();}
function bindCountryRowsV14(){
 for(const b of $('modalContent').querySelectorAll('[data-pick]'))
  b.onclick=()=>{startCountryV14=b.dataset.pick;rulesScreenV14();};}
function beginAsV14(id){
 if(!nation(id))return;
 S.player=id;selected=id;
 const n=nation(id);
 addEvent('You take office',
  'You now lead '+n.name+'. '+n.pop.toFixed(1)+'m people, '+money(n.gdp)+' of output, '
  +(hasAgenciesV14(n)?'and a set of federal agencies to fund.':'and no standing federal agencies of the kind modelled here.'),
  'dispatch');}

// ---------- step two: choose the rules ----------
const v13StartScreenV14=startScreen;
function rulesScreenV14(){
 v13StartScreenV14();
 const box=$('modalContent');if(!box)return;
 const n=nation(startCountryV14);
 const title=$('modalTitle');
 if(title&&n)title.textContent='Playing as '+n.name+' — how demanding should the world be?';
 if(n)box.insertAdjacentHTML('afterbegin',
  '<div class="block chosen"><div class="sectionhead">'
  +'<strong>'+escapeHTML((CITY_CATALOG[n.id]?.flag||'')+' '+n.name)+'</strong>'
  +'<button class="ghost" id="changeCountry">Change country</button></div>'
  +'<p class="note">'+money(n.gdp)+' · '+n.pop.toFixed(1)+'m people · output per person $'
  +(n.gdp/n.pop*1000).toFixed(0)+' · '
  +(agenciesFor(n.id)?agenciesFor(n.id).length+' federal agencies':'no federal agencies')+'</p></div>');
 if($('changeCountry'))$('changeCountry').onclick=()=>countryScreenV14();
 // Whichever way the world is started, the chosen country is the one you lead.
 for(const b of box.querySelectorAll('[data-start],[data-era-start]')){
  const original=b.onclick;
  b.onclick=()=>{const pick=startCountryV14;original&&original();
   if(pick&&nation(pick)){beginAsV14(pick);render();requestDraw();}};}}
// The game opens on the country screen; the rules screen follows it.
startScreen=function(){startCountryV14=S.player;countryScreenV14();};

// ---------- lifecycle ----------
const v13NewGameV14=newGame;
newGame=function(){
 v13NewGameV14();S.version=14;
 for(const n of S.nations)seedAgenciesV14(n);};
// States created by an era, a partition or a historical event need agencies too.
const v13ApplyHistoryV14=applyHistoryV8;
applyHistoryV8=function(key){
 v13ApplyHistoryV14(key);
 for(const n of S.nations)if(n.agencies===undefined||(hasAgenciesV14(n)&&!n.agencies))seedAgenciesV14(n);};
const v13TickHistoryV14=tickHistoryV12;
tickHistoryV12=function(){
 v13TickHistoryV14();
 for(const n of S.nations)if(n.agencies===undefined||(hasAgenciesV14(n)&&!n.agencies))seedAgenciesV14(n);};
const v13MigrateV14=migrateSave;
migrateSave=function(s){
 s=v13MigrateV14(s);
 if(!s||typeof s!=='object')return s;
 if(s.version===13){
  for(const n of s.nations||[]){
   const list=AGENCIES[n.id];
   if(!list){n.agencies=null;continue;}
   n.agencies=n.agencies||{};
   for(const[id]of list)if(!Number.isFinite(n.agencies[id]))n.agencies[id]=.1;}
  s.version=14;}
 return s;};
const v13ValidSaveV14=validSave;
validSave=function(s){
 v13ValidSaveV14(s);
 for(const n of s.nations){
  const list=AGENCIES[n.id];
  if(!list){if(n.agencies)throw Error('A country without agencies is carrying some.');continue;}
  if(!n.agencies||typeof n.agencies!=='object')throw Error('Missing agency budgets.');
  if(Object.keys(n.agencies).some(k=>!list.some(([id])=>id===k)))throw Error('An agency that does not exist.');
  for(const[id]of list){const v=n.agencies[id];
   if(!Number.isFinite(v)||v<0||v>AGENCY_MAX+1e-9)throw Error('Invalid agency budget.');}}
 return s;};
const v13GuideV14=showGuide;
showGuide=function(){
 v13GuideV14();const box=$('modalContent');if(!box)return;
 box.insertAdjacentHTML('beforeend','<div class="block"><h3>Choosing a country, and federal agencies</h3>'
 +'<p>The start screen now begins with a <b>country chooser</b> — any of the countries on the map, with its '
 +'output and population shown so you know what you are taking on. The choice applies however you start: any '
 +'difficulty, any era.</p>'
 +'<p><b>Federal agencies</b> are standing institutions that only the larger economies run: a space programme, '
 +'a disease-control body, a federal police force, a civil-protection agency. Each has its own budget, funded '
 +'outside the ordinary programme spending, and each does one small thing well — research raises productivity, '
 +'law enforcement lowers crime in every city, civil protection shortens and softens supply shocks, '
 +'intelligence keeps forces ready and blunts sanctions, public health raises human capital, environmental '
 +'protection raises the clean-energy score. Together they are worth a fraction of a percent of output a year, '
 +'and they sharpen a country rather than replacing the work of governing it.</p>'
 +'<p>The agencies are real institutions, named for flavour. <b>Their budgets here, and every effect attributed '
 +'to them, are invented for this simulation.</b> No figure is a real budget, and nothing in the game describes '
 +'what any real agency actually does, decides or achieves. Countries without them are not disadvantaged: the '
 +'same outcomes are reachable through the ordinary policy levers.</p></div>');};
