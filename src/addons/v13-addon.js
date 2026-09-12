// V13: fixes a crash that made every war unusable, and lets captured cities be fought back.
//
// The bug: the base declareWar created a bare war record and then called render() before the V11
// layer could add the front fields. warPanelV11 read w.supply.toFixed() on undefined and threw,
// the throw escaped through the modal's click listener, and openFrontV11 never ran — leaving a
// permanently half-built war that showed NaN everywhere and had no front. Two defences now: the
// record is created complete, and the panel tolerates one that is not.

// Every field the war model needs, with sane values, applied wherever a record is created.
function normaliseWarV13(n){
 const w=n.war;if(!w)return w;
 if(typeof w.land!=='boolean')w.land=false;
 if(typeof w.attacker!=='boolean')w.attacker=false;
 for(const[k,v]of [['months',0],['progress',0],['line',0],['commitment',.6],['supply',1],
                   ['casualties',0],['intensity',0]])
  if(!Number.isFinite(w[k]))w[k]=v;
 if(!Array.isArray(w.sector))w.sector=[];
 if(!Array.isArray(w.taken))w.taken=[];
 if(w.objective===undefined)w.objective=null;
 return w;}
// Creates a complete record for both sides. Called from declareWar itself, so nothing can render
// a half-built war.
function beginWarV13(a,b){
 const sector=frontSector(a.id,b.id),land=sector.length>=2;
 for(const[self,attacking]of [[a,true],[b,false]]){
  self.war={target:(self===a?b:a).id,months:0,progress:0,land,attacker:attacking,
   line:0,commitment:.6,supply:1,casualties:0,intensity:0,
   sector:attacking?sector:[],objective:null,taken:[]};}
 return land;}
// The panel must never be the thing that breaks a war.
const v12WarPanelV13=warPanelV11;
warPanelV11=function(n){normaliseWarV13(n);const foe=n.war&&nation(n.war.target);if(foe)normaliseWarV13(foe);
 try{return v12WarPanelV13(n);}catch(e){return '<div class="block warroom"><h3>The front</h3>'
  +'<p class="note">This conflict could not be drawn. It will resolve normally as time advances.</p></div>';}};

// ---------- cities are contested, not simply collected ----------
// A city taken can be taken back. When the front recedes past a city that changed hands, its
// original owner recovers it, and the fighting leaves a mark either way.
function contestCitiesV13(a,b){
 for(const[att,def]of [[a,b],[b,a]]){
  const line=att===a?a.war.line:-a.war.line;
  att.war.taken=att.war.taken||[];
  for(const city of def.cities){
   const depth=cityDepthV12(def,city);
   const held=att.war.taken.includes(city.id);
   // Recovered once the front falls back clearly behind the city, with hysteresis so a city on
   // the line does not change hands every month.
   if(held&&line<depth-.08){
    att.war.taken=att.war.taken.filter(id=>id!==city.id);
    def.stability=clamp(def.stability+city.share*10,3,97);
    def.approval=clamp(def.approval+city.share*8,3,97);
    att.approval=clamp(att.approval-city.share*7,3,97);
    city.crime=clamp(city.crime+6,0,100);
    if([att.id,def.id].includes(S.player)||city.share>.2)
     addEvent(city.name+' is retaken',def.name+'’s forces push '+att.name+' back out of '+city.name
      +'. The city has changed hands twice and shows it.','security');}}}
}
// How a city stands right now, for the interface.
function cityFrontStateV13(viewer,city,owner){
 const w=viewer.war;if(!w||!w.land)return'rear';
 const line=w.attacker?w.line:-w.line;
 const depth=cityDepthV12(owner,city);
 if((w.taken||[]).includes(city.id))return'held';
 if(line>=depth-.12)return'contested';
 return'rear';}

// Contest runs with the rest of the war, after the front has moved.
const v12ResolveWarsV13=resolveWars;
resolveWars=function(){
 const pairs=[],seen=new Set();
 for(const n of S.nations){
  if(!n.war||seen.has(n.id))continue;
  normaliseWarV13(n);
  const o=nation(n.war.target);if(!o||!o.war)continue;
  normaliseWarV13(o);
  seen.add(n.id);seen.add(o.id);
  const a=n.war.attacker?n:o,b=a===n?o:n;
  if(a.war.land)pairs.push([a,b]);}
 v12ResolveWarsV13();
 for(const[a,b]of pairs)if(a.war&&b.war)contestCitiesV13(a,b);};

// AI wars build their record the same way, so nothing can render a half-built one.
const v12OpenFrontV13=openFrontV12;
openFrontV12=function(a,b){return beginWarV13(a,b);};

// ---------- the objective list shows what is happening to each city ----------
const v12WarPanelObjV13=warPanelV11;
warPanelV11=function(n){
 const html=v12WarPanelObjV13(n);
 if(!n.war||!n.war.land)return html;
 const foe=nation(n.war.target);if(!foe)return html;
 const line=n.war.attacker?n.war.line:-n.war.line;
 // Replace the flat "taken / not taken" labels with the city's actual standing.
 return html.replace(/<button class="preset objectivebtn([^"]*)" data-objective="([^"]+)"([^>]*)>[\s\S]*?<\/button>/g,
  (whole,active,id,rest)=>{
   const city=foe.cities.find(c=>c.id===id);if(!city)return whole;
   const state=cityFrontStateV13(n,city,foe),depth=cityDepthV12(foe,city);
   const label={held:'held',contested:'contested',rear:(depth*100).toFixed(0)+'% in'}[state];
   const colour={held:'var(--green)',contested:'#e07a5f',rear:'var(--accent)'}[state];
   const note={held:'Under your control. They will try to take it back if the front falls behind it.',
    contested:'Fighting on its outskirts. It falls if you push a little further.',
    rear:'Needs the front '+(depth*100).toFixed(0)+'% of the way in. Currently '+(Math.max(0,line)*100).toFixed(0)+'%.'}[state];
   return '<button class="preset objectivebtn'+active+' front-'+state+'" data-objective="'+id+'"'+rest+'>'
    +'<strong>'+escapeHTML(city.name)+'<span style="float:right;color:'+colour+'">'+label+'</span></strong>'
    +'<small>'+note+'</small></button>';});};

// ---------- lifecycle ----------
const v12NewGameV13=newGame;
newGame=function(){v12NewGameV13();S.version=13;};
const v12MigrateV13=migrateSave;
migrateSave=function(s){
 s=v12MigrateV13(s);if(s?.version!==12)return s;
 // Any war left half-built by the crash is repaired rather than discarded.
 for(const n of s.nations)if(n.war){
  const w=n.war;
  if(typeof w.land!=='boolean')w.land=false;
  if(typeof w.attacker!=='boolean')w.attacker=false;
  for(const[k,v]of [['months',0],['progress',0],['line',0],['commitment',.6],['supply',1],['casualties',0],['intensity',0]])
   if(!Number.isFinite(w[k]))w[k]=v;
  if(!Array.isArray(w.sector))w.sector=[];
  if(!Array.isArray(w.taken))w.taken=[];
  if(w.objective===undefined)w.objective=null;}
 s.version=13;return s;};
const v12ValidSaveV13=validSave;
validSave=function(s){
 v12ValidSaveV13(s);
 // Exactly one side of a war may hold a given city, and only cities that exist.
 for(const n of s.nations){
  if(!n.war)continue;
  const foe=s.nations.find(x=>x.id===n.war.target);
  if(!foe)continue;
  const mine=new Set(n.war.taken||[]),theirs=new Set(foe.war?.taken||[]);
  for(const id of mine)if(theirs.has(id))throw Error('A city cannot be held by both sides.');}
 return s;};
const v12GuideV13=showGuide;
showGuide=function(){
 v12GuideV13();const box=$('modalContent');if(!box)return;
 box.insertAdjacentHTML('beforeend','<div class="block"><h3>V13 cities change hands</h3>'
 +'<p>A city is not simply collected. Push the front to its depth and it falls; let the front fall '
 +'back behind it and its owner takes it again, with a margin either way so a city on the line does '
 +'not change hands every month. The objective list shows each city as <b>held</b>, <b>contested</b> '
 +'or how far in it still sits, and a city that has changed hands twice carries the damage.</p>'
 +'<p><b>Fixed:</b> a crash that made every war unusable. The war record was created incomplete and '
 +'the interface was drawn before it was filled in, so drawing it threw, the front was never opened, '
 +'and the war showed NaN in every field for the rest of the game. Records are now created complete, '
 +'the panel tolerates one that is not, and an affected save is repaired on load.</p></div>');};

// ---------- conquest ----------
// Beating a country decisively now lets you take it, not merely bill it. Annexation transfers its
// territory, cities, people and output; it also buys you an angry world and a restive population.
// The AI never annexes — a rival that wins imposes terms — so the map cannot quietly collapse into
// two or three blobs while you are looking elsewhere.
function annexableV13(){return S.conquest&&S.conquest.winner===S.player&&nation(S.conquest.loser)?S.conquest:null;}
// Cities of an annexed country are appended to the conqueror's catalogue entry, so everything
// downstream — the template, the panel, save validation — keeps working unchanged.
function rebuildAnnexedCatalogV13(state){
 const record=(state||S)?.annexed||{};
 for(const[winner,losers]of Object.entries(record)){
  const base=CITY_CATALOG[winner];if(!base)continue;
  const own=base.original||base.cities;
  const extra=[];
  for(const id of losers){const e=CITY_CATALOG[id];if(e)extra.push(...(e.original||e.cities));}
  const seen=new Set(),merged=[];
  for(const name of [...own,...extra]){const k=cityKey(name);if(seen.has(k))continue;seen.add(k);merged.push(name);}
  CITY_CATALOG[winner]={...base,original:own,cities:merged};}}
// Rebuild the winner's city list from the enlarged catalogue, keeping what was already built.
function recityV13(n){
 const old=n.cities||[],used=new Set();
 n.cities=cityTemplate(n).map(c=>{
  const prev=old.find(x=>!used.has(x)&&cityKey(x.name)===cityKey(c.name));
  if(prev){used.add(prev);Object.assign(c.levels,prev.levels);
   c.queue=prev.queue.map(q=>({...q}));c.crime=prev.crime;c.satisfaction=prev.satisfaction;
   c.management={...prev.management};}
  return c;});}

function annexV13(winnerId,loserId){
 const w=nation(winnerId),l=nation(loserId);
 if(!w||!l||w===l)return false;
 // Everything the defeated state held becomes the conqueror's.
 for(const[poly,owner]of Object.entries(S.territory))if(owner===loserId)S.territory[poly]=winnerId;
 S.territory[loserId]=winnerId;
 S.annexed=S.annexed||{};
 S.annexed[winnerId]=[...(S.annexed[winnerId]||[]),loserId,...(S.annexed[loserId]||[])];
 delete S.annexed[loserId];
 rebuildAnnexedCatalogV13();
 w.pop+=l.pop;w.gdp+=l.gdp;
 if(!S.options.noDebt)w.debt+=l.debt;
 w.forces={army:w.forces.army+l.forces.army*.25,navy:w.forces.navy+l.forces.navy*.25,air:w.forces.air+l.forces.air*.25};
 w.military=w.forces.army+w.forces.navy+w.forces.air;
 // Occupation is not free: an unwilling population, a wrecked economy and a hostile world.
 w.stability=clamp(w.stability-18,3,97);
 w.approval=clamp(w.approval-10,3,97);
 w.reputation=clamp((w.reputation??60)-30,0,100);
 w.unrest=(w.unrest||0)+l.pop/Math.max(.01,w.pop)*45;
 for(const o of S.nations)if(o.id!==w.id)setRelation(w.id,o.id,relation(w.id,o.id)-22);
 recityV13(w);
 for(const c of w.cities)if(!(CITY_CATALOG[loserId]?.original||CITY_CATALOG[loserId]?.cities||[]).every(n2=>cityKey(n2)!==cityKey(c.name))){
  c.crime=clamp(c.crime+24,0,100);c.satisfaction=clamp(c.satisfaction-34,0,100);}
 // The defeated state leaves the board, and the world's bookkeeping with it.
 S.nations=S.nations.filter(n=>n.id!==loserId);
 const live=new Set(S.nations.map(n=>n.id));
 for(const n of S.nations)if(n.war&&!live.has(n.war.target))n.war=null;
 S.agreements=(S.agreements||[]).filter(p=>live.has(p.a)&&live.has(p.b));
 S.embargoes=(S.embargoes||[]).filter(x=>live.has(x.from)&&live.has(x.to));
 S.tradeDeals=(S.tradeDeals||[]).filter(d=>live.has(d.from)&&live.has(d.to));
 S.relations=Object.fromEntries(Object.entries(S.relations||{}).filter(([k])=>k.split(':').every(x=>live.has(x))));
 if(selected===loserId)selected=winnerId;
 syncDiplomacy();rebuildNeighboursV12();initPaths();requestDraw();refreshWorld();
 addEvent(l.name+' is annexed',
  w.name+' takes formal control of '+l.name+'. Its territory, cities and people are now governed from '
  +w.name+'. The world has noticed: relations have fallen everywhere and the occupied population is not reconciled.','security');
 S.conquest=null;
 return true;}

// A decisive victory opens a choice: take the country, or take terms.
function conquestPromptV13(){
 const c=annexableV13();if(!c)return;
 const l=nation(c.loser);if(!l)return;
 modal('You have beaten '+escapeHTML(l.name),
  '<p>'+escapeHTML(l.name)+'’s army has been broken. You can impose terms and leave it standing, or '
  +'annex it outright and govern its territory yourself.</p>'
  +'<p><b>Annexation</b> adds its '+l.pop.toFixed(1)+'m people, '+money(l.gdp)+' of output and '
  +l.cities.length+' cities to your own. It also costs you 30 reputation, drops relations with every '
  +'other country by 22, and leaves an occupied population that pushes crime up and stability down '
  +'for years. There is no way to undo it.</p>'
  +'<button class="danger full" id="doAnnex">Annex '+escapeHTML(l.name)+' · 40 capital</button>'
  +'<button class="full" id="doTerms">Impose terms and leave it standing</button>');
 $('doAnnex').onclick=()=>{
  const n=player();
  if(!canSpend(n,40)){toast('Annexation requires 40 political capital.');return;}
  spendCapital(n,40);annexV13(S.player,c.loser);closeModal();render();};
 $('doTerms').onclick=()=>{S.conquest=null;closeModal();render();toast('Terms imposed. '+l.name+' remains a country.');};}

// Offered when the war ends, and still available from Military until you decide.
const v13ResolveWarsConquest=resolveWars;
resolveWars=function(){
 const before=new Map(S.nations.filter(n=>n.war).map(n=>[n.id,n.war.target]));
 v13ResolveWarsConquest();
 for(const[id,target]of before){
  const w=nation(id),l=nation(target);
  if(!w||!l||w.war||l.war)continue;
  // Decisive only: an exhausted stalemate does not hand you a country.
  const beaten=l.forces.army<w.forces.army*.2||l.stability<18;
  if(id===S.player&&beaten&&!S.conquest){S.conquest={winner:S.player,loser:target};}}
 if(annexableV13()&&!playing)conquestPromptV13();};
const v13MilitaryConquest=militaryPanel;
militaryPanel=function(n){
 const c=annexableV13();
 const banner=c&&n.id===S.player
  ?'<div class="block warroom"><h3>'+escapeHTML(nation(c.loser).name)+' is beaten</h3>'
   +'<p>Its army is broken. Annex it and its territory, cities and people become yours — at the cost of '
   +'your standing everywhere and an occupied population that will not settle for years.</p>'
   +'<button class="danger full" data-action="conquest">Decide what to do with '+escapeHTML(nation(c.loser).name)+'</button></div>'
  :'';
 return banner+v13MilitaryConquest(n);};
Object.assign(actions,{conquest:()=>conquestPromptV13()});

// Occupied territory settles slowly, and drags on the state that holds it.
const v13TickNationConquest=tickV4Nation;
tickV4Nation=function(n){
 v13TickNationConquest(n);
 if(!n.unrest)return;
 n.unrest=Math.max(0,n.unrest-.35-n.policies.justice*.004-n.capacity*.003);
 n.stability=clamp(n.stability-n.unrest*.02,3,97);
 n.approval=clamp(n.approval-n.unrest*.012,3,97);
 for(const c of n.cities)c.crime=clamp(c.crime+n.unrest*.006,0,100);};

// ---------- persistence ----------
const v13NewGameConquest=newGame;
newGame=function(){
 // Catalogue entries enlarged by a previous game must be restored before the world is rebuilt.
 for(const[id,e]of Object.entries(CITY_CATALOG))if(e.original)CITY_CATALOG[id]={...e,cities:e.original,original:undefined};
 v13NewGameConquest();
 S.annexed={};S.conquest=null;
 for(const n of S.nations)n.unrest=0;};
const v13MigrateConquest=migrateSave;
migrateSave=function(s){
 s=v13MigrateConquest(s);
 if(!s||typeof s!=='object')return s;
 s.annexed=s.annexed||{};
 if(s.conquest===undefined)s.conquest=null;
 for(const n of s.nations||[])if(!Number.isFinite(n.unrest))n.unrest=0;
 return s;};
const v13ValidSaveConquest=validSave;
validSave=function(s){
 // The catalogue has to match the save being checked, or its city lists will not line up.
 if(s&&typeof s==='object'){
  s.annexed=s.annexed||{};
  if(s.conquest===undefined)s.conquest=null;
  for(const n of s.nations||[])if(!Number.isFinite(n.unrest))n.unrest=0;
  rebuildAnnexedCatalogV13(s);}
 v13ValidSaveConquest(s);
 const live=new Set(s.nations.map(n=>n.id));
 for(const[winner,losers]of Object.entries(s.annexed)){
  if(!live.has(winner))throw Error('A conqueror that does not exist.');
  if(!Array.isArray(losers)||losers.some(id=>live.has(id)))throw Error('An annexed state is still on the map.');}
 if(s.conquest&&(!live.has(s.conquest.winner)||!live.has(s.conquest.loser)))throw Error('Invalid conquest offer.');
 for(const n of s.nations)if(!Number.isFinite(n.unrest)||n.unrest<0||n.unrest>500)throw Error('Invalid occupation state.');
 return s;};
const v13GuideConquest=showGuide;
showGuide=function(){
 v13GuideConquest();const box=$('modalContent');if(!box)return;
 box.insertAdjacentHTML('beforeend','<div class="block"><h3>Taking a country</h3>'
 +'<p>Break an enemy army decisively and you are offered a choice: impose terms and leave the country '
 +'standing, or <b>annex it</b>. Annexation transfers its territory, cities, people and output to you — '
 +'the map redraws, and its cities appear in your own list.</p>'
 +'<p>It costs 40 political capital, 30 reputation, and 22 points of relations with <em>every</em> other '
 +'country. The occupied population is not reconciled: unrest pushes crime up and stability and approval '
 +'down for years afterwards, easing faster if you have courts and state capacity to spend on it. It '
 +'cannot be undone.</p>'
 +'<p>Rival nations never annex each other. They win wars and impose terms, so the map does not quietly '
 +'consolidate into a handful of empires while you are looking the other way.</p></div>');};
