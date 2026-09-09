// V9: partitioned states. Germany, Vietnam and Yemen were single shapes in the map data, so the
// Cold War divisions could not be shown. Their polygons are cut along an approximated historical
// border by src/build/split-polygons.py, and each half becomes a country in the relevant era.
//
// The cut lines are hand-fitted from well-known geography, not surveyed boundary data. Each one is
// checked against the historical land area at build time: Germany within 4%, Vietnam within 3%,
// Yemen within 17%. Nothing here is a comment on any border, past or present.
const SPLITS=JSON.parse($('split-polygons').textContent);
// pop in millions, gdp in $bn of constant 2026 dollars — scenario figures of the right order.
const PARTITIONS={
 e1970:{
  DEU:{left:{pop:61,gdp:1600,preset:'Social democratic',cities:['West Berlin','Hamburg','Munich','Cologne','Frankfurt','Stuttgart']},
       right:{pop:17,gdp:280,preset:'State capitalist',cities:['East Berlin','Leipzig','Dresden','Karl-Marx-Stadt','Magdeburg','Rostock']}},
  VNM:{left:{pop:21,gdp:25,preset:'State capitalist',cities:['Hanoi','Haiphong','Nam Dinh','Thanh Hoa','Vinh','Ha Long']},
       right:{pop:19,gdp:30,preset:'Conservative',cities:['Saigon','Da Nang','Hue','Can Tho','Nha Trang','Bien Hoa']}},
  YEM:{left:{pop:6.2,gdp:6,preset:'Conservative',cities:["Sana'a",'Taiz','Al Hudaydah','Ibb','Dhamar','Saada']},
       right:{pop:1.4,gdp:2,preset:'State capitalist',cities:['Aden','Mukalla','Sayun','Ataq','Zinjibar','Al Ghaydah']}}},
 e1985:{
  DEU:{left:{pop:61,gdp:2300,preset:'Social democratic',cities:['West Berlin','Hamburg','Munich','Cologne','Frankfurt','Stuttgart']},
       right:{pop:16.7,gdp:400,preset:'State capitalist',cities:['East Berlin','Leipzig','Dresden','Karl-Marx-Stadt','Magdeburg','Rostock']}},
  YEM:{left:{pop:9.3,gdp:12,preset:'Conservative',cities:["Sana'a",'Taiz','Al Hudaydah','Ibb','Dhamar','Saada']},
       right:{pop:2.1,gdp:3.5,preset:'State capitalist',cities:['Aden','Mukalla','Sayun','Ataq','Zinjibar','Al Ghaydah']}}},
 e2000:{},e2026:{}};

// Extra polygons the era needs, keyed by the id the game uses for them.
let SPLIT_PATHS={};
function partitionsFor(){return PARTITIONS[eraOf()]||{};}

function applyPartitionsV9(){
 SPLIT_PATHS={};
 const table=partitionsFor();
 for(const[parentId,spec]of Object.entries(table)){
  const parent=nation(parentId);if(!parent||!SPLITS[parentId])continue;
  for(const half of ['left','right']){
   const geo=SPLITS[parentId][half],cfg=spec[half];
   CITY_CATALOG[geo.id]={name:geo.name,cities:cfg.cities,kind:'city',iso2:null,flag:'🌐'};
   const row=[geo.id,geo.name,cfg.pop,cfg.gdp,parent.debt/Math.max(.001,parent.gdp)*100,
    parent.growth,parent.inflation,parent.policies.liberties,parent.policies.institutions,
    cfg.preset,geo.lon,geo.lat,'🌐'];
   const state=seedNation(row);
   ensureV4(state);upgradeNationV5(state);upgradeNationEconV5(state);
   state.capacity=parent.capacity;state.human=parent.human;state.infra=parent.infra;
   state.clean=parent.clean;state.fxRegime=parent.fxRegime;
   econSeed(state);state.mon.rate=state.policies.rate;state.mon.expected=state.inflation;
   S.nations.push(state);
   SPLIT_PATHS[geo.id]=geo.polygons;
   S.partitioned=S.partitioned||{};
   S.partitioned[geo.id]={parent:parentId,name:geo.name};
  }
  S.nations=S.nations.filter(n=>n.id!==parentId);
  if(S.player===parentId)S.player=SPLITS[parentId].left.id;
  if(selected===parentId)selected=S.player;
 }
 // The parent's polygon is replaced by its halves.
 for(const parentId of Object.keys(table))if(SPLITS[parentId])S.territory[parentId]='';
 for(const id of Object.keys(SPLIT_PATHS))S.territory[id]=id;
}

// ---------- rendering ----------
// initPaths builds one Path2D per map polygon. Partitioned countries contribute their halves
// instead of the whole, so it has to be rebuilt whenever the era changes.
const v8InitPathsV9=initPaths;
initPaths=function(){
 v8InitPathsV9();
 const replaced=new Set(Object.keys(partitionsFor()));
 paths=paths.filter(p=>!replaced.has(p.id));
 for(const[id,polys]of Object.entries(SPLIT_PATHS)){
  const path=new Path2D();
  for(const ring of polys){
   ring.forEach(([lon,lat],i)=>{const[x,y]=project(lon,lat);i?path.lineTo(x,y):path.moveTo(x,y);});
   path.closePath();}
  paths.push({id,path});}
};

// ---------- lifecycle ----------
const v8ApplyHistoryV9=applyHistoryV8;
applyHistoryV8=function(eraKey){
 S.partitioned={};
 v8ApplyHistoryV9(eraKey);
 applyPartitionsV9();
 // Names like "Germany · FRG and GDR" were a stand-in for a map that could not be split.
 for(const n of S.nations)if(S.partitioned[n.id])n.name=S.partitioned[n.id].name;
 initPaths();requestDraw();
};
const v8NewGameV9=newGame;
newGame=function(){v8NewGameV9();S.version=9;S.partitioned={};SPLIT_PATHS={};initPaths();};
const v8MigrateV9=migrateSave;
migrateSave=function(s){s=v8MigrateV9(s);if(s?.version!==8)return s;s.partitioned=s.partitioned||{};s.version=9;return s;};
const v8ValidSaveV9=validSave;
validSave=function(s){
 v8ValidSaveV9(s);
 if(!s.partitioned||typeof s.partitioned!=='object')throw Error('Invalid partition state.');
 const live=new Set(s.nations.map(n=>n.id));
 for(const[id,info]of Object.entries(s.partitioned)){
  if(!live.has(id))throw Error('A partitioned state is missing from the nation list.');
  // A divided country and its unified self can never both exist.
  if(live.has(info.parent))throw Error('A partitioned state coexists with its unified country.');}
 return s;};
// Partitioned halves are legitimate names and positions the era tables can produce.
const v8ValidMetaV9=validNationMetaV8;
validNationMetaV8=function(n){
 for(const country of Object.values(SPLITS))
  for(const half of ['left','right']){
   const g=country[half];
   if(g.id===n.id)return n.name===g.name&&n.lon===g.lon&&n.lat===g.lat&&n.flag==='🌐';}
 return v8ValidMetaV9(n);};

// ---------- presentation ----------
const v8OverviewV9=overview;
overview=function(n){
 const base=v8OverviewV9(n);
 const info=S.partitioned&&S.partitioned[n.id];
 if(!info)return base;
 const other=Object.entries(S.partitioned).find(([id,v])=>v.parent===info.parent&&id!==n.id);
 return '<div class="block histnote"><h3>A divided country</h3>'
 +'<p><b>'+escapeHTML(info.name)+'</b> is one half of a country partitioned in '+era().year+'.'
 +(other?' The other half is <b>'+escapeHTML(other[1].name)+'</b>.':'')+'</p>'
 +'<p>The border is approximated from well-known geography and checked against the historical land '
 +'area at build time; it is not surveyed boundary data, and it is not a comment on any border.</p></div>'
 +base;};
const v8EraCardV9=eraCardV7;
eraCardV7=function(k){
 const html=v8EraCardV9(k),table=PARTITIONS[k];
 if(!table||!Object.keys(table).length)return html;
 const names=Object.values(table).map(t=>t.left.cities&&'').filter(Boolean);
 const divided=Object.keys(table).map(id=>SPLITS[id]?SPLITS[id].left.name.replace(/^(West|North) /,''):id);
 return html.replace('</ul>','<li>Divided: <b>'+divided.join(', ')+'</b></li></ul>');};
const v8GuideV9=showGuide;
showGuide=function(){
 v8GuideV9();const box=$('modalContent');if(!box)return;
 box.insertAdjacentHTML('beforeend','<div class="block"><h3>V9 divided countries</h3>'
 +'<p>Germany, Vietnam and Yemen are now split where they were divided. In 1970 you can lead '
 +'<b>West Germany</b> or <b>East Germany</b>, <b>North</b> or <b>South Vietnam</b>, and <b>North</b> '
 +'or <b>South Yemen</b>; in 1985 Germany and Yemen are still divided and Vietnam is not.</p>'
 +'<p>Their borders are cut from the map polygons along lines fitted to well-known geography, then '
 +'checked against the historical land areas so a bad line fails the build: West and East Germany '
 +'come out within 4% of their real areas, the two Vietnams within 3%, the two Yemens within 17%. '
 +'Vietnam is divided at the 17th parallel, the demarcation line agreed at Geneva in 1954.</p>'
 +'<p>Populations, output and cities are scenario figures of roughly the right order — East Berlin, '
 +'Leipzig and Karl-Marx-Stadt in the east; Hanoi and Haiphong in the north; Aden and Mukalla in the '
 +'south. None of this is surveyed data, and no border or name here is a comment on any territorial '
 +'dispute, historical or current.</p></div>');};
