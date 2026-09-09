// V8: the world map follows the era. Countries that had not yet become independent are absent,
// states that later broke up appear whole, and places that have since been renamed use the name
// they held at the time.
//
// This is a gameplay scenario, not a historical atlas. Territory is approximated by grouping
// present-day polygons, so internal borders of the period are not drawn and partitioned states
// (the two Germanys, the two Vietnams, the two Yemens) are left unified because the polygon data
// cannot be split. Naming a state is not a comment on its legitimacy or on any border dispute.
const HISTORY={
 e1970:{
  merge:{
   SUN:{pop:242,gdp:2400,name:'Soviet Union',short:'USSR',lon:58,lat:57,preset:'State capitalist',
    members:['RUS','UKR','BLR','KAZ','UZB','GEO','AZE','LTU','LVA','EST','MDA','KGZ','TJK','ARM','TKM']},
   YUG:{pop:20.4,gdp:150,name:'Yugoslavia',short:'Yugoslavia',lon:20,lat:44,preset:'Democratic socialist',
    members:['SRB','HRV','BIH','SVN','MKD','MNE','XKX']},
   CSK:{pop:14.3,gdp:160,name:'Czechoslovakia',short:'Czechoslovakia',lon:17,lat:49.5,preset:'State capitalist',
    members:['CZE','SVK']}},
  // Not yet independent in January 1970.
  absent:['BGD','ARE','QAT','BHR','ZWE','NAM','ERI','SSD','TLS','BRN','AGO','MOZ','GNB','CPV','STP',
   'COM','DJI','PNG','SLB','VUT','KIR','TUV','FSM','MHL','PLW','ATG','DMA','VCT','KNA','LCA','BLZ',
   'BHS','GRD','SUR','SYC','PSE','SOL'],
  rename:{LKA:'Ceylon',MMR:'Burma',BFA:'Upper Volta',BEN:'Dahomey',CIV:'Ivory Coast',SWZ:'Swaziland',
   TUR:'Turkey',COG:'Congo-Brazzaville',COD:'Democratic Republic of the Congo',DEU:'Germany · FRG and GDR',
   VNM:'Vietnam · North and South',YEM:'Yemen · North and South',KHM:'Cambodia',THA:'Thailand'}},
 e1985:{
  merge:{
   SUN:{pop:277,gdp:3200,name:'Soviet Union',short:'USSR',lon:58,lat:57,preset:'State capitalist',
    members:['RUS','UKR','BLR','KAZ','UZB','GEO','AZE','LTU','LVA','EST','MDA','KGZ','TJK','ARM','TKM']},
   YUG:{pop:23,gdp:230,name:'Yugoslavia',short:'Yugoslavia',lon:20,lat:44,preset:'Democratic socialist',
    members:['SRB','HRV','BIH','SVN','MKD','MNE','XKX']},
   CSK:{pop:15.5,gdp:210,name:'Czechoslovakia',short:'Czechoslovakia',lon:17,lat:49.5,preset:'State capitalist',
    members:['CZE','SVK']}},
  absent:['NAM','ERI','SSD','TLS','PLW','FSM','MHL','PSE'],
  rename:{MMR:'Burma',COD:'Zaire',SWZ:'Swaziland',CIV:'Ivory Coast',TUR:'Turkey',CPV:'Cape Verde',
   DEU:'Germany · FRG and GDR',YEM:'Yemen · North and South'}},
 e2000:{
  merge:{
   SCG:{pop:10.6,gdp:40,name:'Serbia and Montenegro',short:'Serbia & Montenegro',lon:20.5,lat:43.5,preset:'State capitalist',
    members:['SRB','MNE','XKX']}},
  absent:['SSD','TLS'],
  rename:{MKD:'Macedonia',SWZ:'Swaziland',TUR:'Turkey',CPV:'Cape Verde',CZE:'Czech Republic'}},
 e2026:{merge:{},absent:[],rename:{}}};

// Which present-day polygon each historical entity controls. Built when an era is applied.
function territoryOwner(polyId){return S?.territory?.[polyId]??polyId;}
function isHistorical(id){return !!S?.historical?.[id];}

function buildTerritory(){
 S.territory={};
 const live=new Set(S.nations.map(n=>n.id));
 for(const[id,info]of Object.entries(S.historical||{}))
  for(const m of info.members)S.territory[m]=id;
 // A polygon whose country is absent this era belongs to nobody and renders as open land.
 for(const g of GEO)if(!S.territory[g.id]&&!live.has(g.id))S.territory[g.id]='';
}

// Merged states inherit their members' real cities, weighted by how large each member was.
function mergeCities(members){
 const pool=[];
 for(const m of members){const entry=CITY_CATALOG[m];if(!entry)continue;
  const weight=SEEDS.find(r=>r[0]===m)?.[3]||1;
  entry.cities.forEach((name,i)=>pool.push({name,score:weight/Math.pow(i+2,.7)}));}
 pool.sort((a,b)=>b.score-a.score);
 const seen=new Set(),out=[];
 for(const c of pool){const k=cityKey(c.name);if(seen.has(k))continue;seen.add(k);out.push(c.name);if(out.length>=8)break;}
 return out;
}

function applyHistoryV8(eraKey){
 const h=HISTORY[eraKey]||HISTORY.e2026;
 S.historical={};
 // 1. Merge. The successor states are removed and replaced by the state of the period.
 for(const[id,spec]of Object.entries(h.merge)){
  const parts=spec.members.map(m=>nation(m)).filter(Boolean);
  if(!parts.length)continue;
  const lead=parts.reduce((a,b)=>b.gdp>a.gdp?b:a);
  const pop=parts.reduce((a,n)=>a+n.pop,0),gdp=parts.reduce((a,n)=>a+n.gdp,0),debt=parts.reduce((a,n)=>a+n.debt,0);
  const w=k=>parts.reduce((a,n)=>a+n[k]*n.gdp,0)/Math.max(.001,gdp);
  // liberties and institutions live on policies, not on the nation itself.
  const wp=k=>parts.reduce((a,n)=>a+n.policies[k]*n.gdp,0)/Math.max(.001,gdp);
  // Register a catalogue entry so cities, validation and rendering work unchanged downstream.
  CITY_CATALOG[id]={name:spec.name,cities:mergeCities(spec.members),kind:'city',iso2:null,flag:'🌐'};
  // A spec may state the bloc's own figures where uniform era scaling misrepresents it badly.
  const usePop=spec.pop??pop,useGdp=spec.gdp??gdp;
  const row=[id,spec.name,usePop,useGdp,debt/Math.max(.001,gdp)*100,w('growth'),w('inflation'),
   Math.round(wp('liberties')),Math.round(wp('institutions')),spec.preset,spec.lon,spec.lat,'🌐'];
  const merged=seedNation(row);
  ensureV4(merged);upgradeNationV5(merged);upgradeNationEconV5(merged);
  merged.capacity=w('capacity');merged.human=w('human');merged.infra=w('infra');merged.clean=w('clean');
  merged.unemployment=w('unemployment');merged.inequality=w('inequality');
  merged.military=parts.reduce((a,n)=>a+n.military,0);
  merged.forces={army:merged.military*.5,navy:merged.military*.25,air:merged.military*.25};
  merged.fxRegime=lead.fxRegime;
  econSeed(merged);merged.mon.rate=merged.policies.rate;merged.mon.expected=merged.inflation;
  const drop=new Set(spec.members);
  S.nations=S.nations.filter(n=>!drop.has(n.id));
  S.nations.push(merged);
  S.historical[id]={members:spec.members,name:spec.name,short:spec.short};
 }
 // 2. Remove states that were not yet independent.
 const gone=new Set(h.absent);
 S.nations=S.nations.filter(n=>!gone.has(n.id));
 // 3. Period names.
 for(const[id,name]of Object.entries(h.rename)){const n=nation(id);if(n)n.name=name;}
 // 4. Keep the world's bookkeeping consistent with the new list.
 const live=new Set(S.nations.map(n=>n.id));
 S.relations=Object.fromEntries(Object.entries(S.relations||{}).filter(([k])=>k.split(':').every(x=>live.has(x))));
 S.agreements=(S.agreements||[]).filter(p=>live.has(p.a)&&live.has(p.b));
 S.embargoes=(S.embargoes||[]).filter(e=>live.has(e.from)&&live.has(e.to));
 S.treaties=(S.treaties||[]).filter(t=>t.split(':').every(x=>live.has(x)));
 S.sanctions=(S.sanctions||[]).filter(t=>t.split(':').every(x=>live.has(x)));
 S.tradeDeals=(S.tradeDeals||[]).filter(d=>live.has(d.from)&&live.has(d.to));
 S.tradeFlows=[];
 for(const n of S.nations)n.war=null;
 if(!live.has(S.player)){
  // The player's country may not exist in this era; hand them its predecessor.
  const successor=Object.entries(S.historical).find(([,v])=>v.members.includes(S.player));
  S.player=successor?successor[0]:S.nations.reduce((a,b)=>b.gdp>a.gdp?b:a).id;
 }
 if(!live.has(selected)&&!S.historical[selected])selected=S.player;
 // Cities were named for the era the world was built in; re-derive them for this one,
 // keeping every development level and queued project.
 for(const n of S.nations)refreshCitiesV8(n);
 buildTerritory();
 refreshWorld();
}
// Rebuilds a nation's city list from the current era's template without losing progress.
// The template order is stable, so mapping by position preserves what the player has built.
function refreshCitiesV8(n){
 const old=n.cities||[];
 n.cities=cityTemplate(n).map((c,i)=>{const prev=old[i];
  if(prev){Object.assign(c.levels,prev.levels);
   c.queue=prev.queue.map(q=>({...q}));
   c.crime=prev.crime;c.satisfaction=prev.satisfaction;c.management={...prev.management};}
  return c;});
}

// ---------- lifecycle ----------
const v7ApplyEraV8=applyEra;
applyEra=function(key){
 const ok=v7ApplyEraV8(key);
 if(ok)applyHistoryV8(key);
 return ok;};
const v7NewGameV8=newGame;
newGame=function(){
 v7NewGameV8();S.version=8;
 S.territory={};S.historical={};
 buildTerritory();
 addEvent('The map follows the era','Start in 1970 or 1985 and the Soviet Union, Yugoslavia and Czechoslovakia are on the map, while states that gained independence later are not. Names are those used at the time.','model');};
const v7MigrateV8=migrateSave;
migrateSave=function(s){
 s=v7MigrateV8(s);if(s?.version!==7)return s;
 s.territory=s.territory||{};s.historical=s.historical||{};
 s.version=8;return s;};
const v7ValidSaveV8=validSave;
validSave=function(s){
 v7ValidSaveV8(s);
 if(!s.historical||typeof s.historical!=='object')throw Error('Invalid historical state.');
 if(!s.territory||typeof s.territory!=='object')throw Error('Invalid territory map.');
 const live=new Set(s.nations.map(n=>n.id));
 for(const[id,info]of Object.entries(s.historical)){
  if(!live.has(id))throw Error('A historical state is missing from the nation list.');
  if(!Array.isArray(info.members)||!info.members.length)throw Error('Invalid historical membership.');
  // A merged state and its members can never both be on the map.
  if(info.members.some(m=>live.has(m)))throw Error('A successor state coexists with its predecessor.');}
 for(const[poly,owner]of Object.entries(s.territory))
  if(owner&&!live.has(owner))throw Error('Territory assigned to a state that does not exist.');
 return s;};

// ---------- presentation ----------
const v7RenderStatsV8=renderStats;
renderStats=function(){
 v7RenderStatsV8();
 const el=$('mapcaption');
 if(el&&era().year!==2026)el.textContent=el.textContent+' · '+era().year+' scenario';};
const v7OverviewV8=overview;
overview=function(n){
 const base=v7OverviewV8(n);
 if(!isHistorical(n.id))return base;
 const h=S.historical[n.id];
 return '<div class="block histnote"><h3>A state of the period</h3>'
 +'<p><b>'+escapeHTML(h.name)+'</b> appears because the scenario begins in '+era().year+'. '
 +'It covers the territory of '+h.members.length+' present-day countries: '
 +escapeHTML(h.members.map(m=>CITY_CATALOG[m]?.name||m).join(', '))+'.</p>'
 +'<p>Its output, population and armed forces are the sum of those, and its cities are drawn from '
 +'them by size. Internal borders of the period are not drawn, and this is a gameplay scenario '
 +'rather than a historical atlas.</p></div>'+base;};
const v7EraCardV8=eraCardV7;
eraCardV7=function(k){
 const html=v7EraCardV8(k),h=HISTORY[k];
 if(!h||(!Object.keys(h.merge).length&&!h.absent.length))return html;
 const names=Object.values(h.merge).map(m=>m.short).join(', ');
 const extra='<li>On the map: <b>'+(names||'present-day states')+'</b></li>'
  +'<li>Not yet independent: <b>'+h.absent.length+' countries</b></li>';
 return html.replace('</ul>',extra+'</ul>');};
const v7GuideV8=showGuide;
showGuide=function(){
 v7GuideV8();const box=$('modalContent');if(!box)return;
 box.insertAdjacentHTML('beforeend','<div class="block"><h3>V8 historical states</h3>'
 +'<p>The map now follows the era. Starting in 1970 or 1985 puts the <b>Soviet Union</b>, '
 +'<b>Yugoslavia</b> and <b>Czechoslovakia</b> on the map as single states covering their members’ '
 +'territory; 2000 has <b>Serbia and Montenegro</b>. Countries that became independent later are '
 +'absent — 37 of them in 1970 — and places that have since been renamed carry the name they held '
 +'at the time: Ceylon, Burma, Upper Volta, Dahomey, Zaire.</p>'
 +'<p>A merged state’s population, output, debt and forces are the sum of its members, its policy '
 +'indicators are their output-weighted average, and its cities are the largest drawn from across '
 +'the union.</p>'
 +'<p>This is a gameplay scenario, not a historical atlas. Territory is approximated by grouping '
 +'present-day polygons, so the internal borders of the period are not drawn. Partitioned states — '
 +'the two Germanys, the two Vietnams, the two Yemens — are left unified and labelled as such, '
 +'because the map data cannot be split. Including a state, drawing a border or choosing a name is '
 +'not a comment on its legitimacy, its recognition or any territorial dispute, historical or '
 +'current.</p></div>');};

// ---------- period place names ----------
// Cities carried different names at the time. Only well-established renamings are listed, and the
// name is applied to the template itself so saved games and validation stay consistent.
const CITY_ERA_NAMES={
 e1970:{'Saint Petersburg':'Leningrad','Almaty':'Alma-Ata','Astana':'Tselinograd',
  'Nizhny Novgorod':'Gorky','Yekaterinburg':'Sverdlovsk','Samara':'Kuybyshev','Bishkek':'Frunze',
  'Kyiv':'Kiev','Dushanbe':'Stalinabad','Mumbai':'Bombay','Chennai':'Madras','Kolkata':'Calcutta',
  'Beijing':'Peking','Guangzhou':'Canton','Ho Chi Minh City':'Saigon','Yangon':'Rangoon',
  'Harare':'Salisbury','Maputo':'Lourenço Marques','Dhaka':'Dacca','Thiruvananthapuram':'Trivandrum',
  'Kinshasa':'Kinshasa','Oslo':'Oslo'},
 e1985:{'Saint Petersburg':'Leningrad','Almaty':'Alma-Ata','Astana':'Tselinograd',
  'Nizhny Novgorod':'Gorky','Yekaterinburg':'Sverdlovsk','Samara':'Kuybyshev','Bishkek':'Frunze',
  'Kyiv':'Kiev','Mumbai':'Bombay','Chennai':'Madras','Kolkata':'Calcutta',
  'Ho Chi Minh City':'Ho Chi Minh City','Yangon':'Rangoon','Dhaka':'Dhaka'},
 e2000:{'Kolkata':'Calcutta','Astana':'Astana','Yangon':'Yangon'},
 e2026:{}};
const v7CityTemplateV8=cityTemplate;
cityTemplate=function(n){
 const cities=v7CityTemplateV8(n),map=CITY_ERA_NAMES[eraOf()];
 if(!map)return cities;
 for(const c of cities)if(map[c.name])c.name=map[c.name];
 return cities;};

// ---------- metadata validation across eras ----------
// V7 pinned every nation's name, flag and position to the live scenario. Eras legitimately rename
// states and introduce merged ones, so the check now allows any name the scenario tables can
// actually produce — and nothing else. Injected or arbitrary names are still rejected.
function canonicalSeedV8(id){
 const row=SEEDS.find(r=>r[0]===id);
 if(row)return{name:row[1],lon:row[10],lat:row[11],flag:row[12]};
 // Countries present only in the map data are seeded from it, with a generic flag.
 const g=GEO.find(x=>x.id===id);
 return g?{name:g.name,lon:g.lon||0,lat:g.lat||0,flag:'🌐'}:null;}
function historicalSpecV8(id){
 for(const h of Object.values(HISTORY))if(h.merge[id])return h.merge[id];
 return null;}
function validNationMetaV8(n){
 if(typeof n.name!=='string'||!n.name||n.name.length>60||!/^[^<>&]+$/.test(n.name))return false;
 const spec=historicalSpecV8(n.id);
 if(spec)return n.name===spec.name&&n.lon===spec.lon&&n.lat===spec.lat&&n.flag==='🌐';
 const canon=canonicalSeedV8(n.id);
 if(!canon)return false;
 if(n.lon!==canon.lon||n.lat!==canon.lat||n.flag!==canon.flag)return false;
 if(n.name===canon.name)return true;
 return Object.values(HISTORY).some(h=>h.rename[n.id]===n.name);}

// A city's name depends on the era, and a save may have been written under a different one.
// Both names are reduced to the catalogue entry they came from before comparing, so
// "Leningrad" and "Saint Petersburg" validate against each other but nothing else does.
function baseCityNameV8(name){
 for(const map of Object.values(CITY_ERA_NAMES))
  for(const[base,periodName]of Object.entries(map))if(periodName===name)return base;
 return name;}
function cityNameOkV8(a,b){return baseCityNameV8(a)===baseCityNameV8(b);}
