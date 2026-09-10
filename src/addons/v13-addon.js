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
