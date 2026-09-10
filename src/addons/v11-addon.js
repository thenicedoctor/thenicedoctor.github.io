// V11: wars are fought on the border. Declaring war on a neighbour opens a front along the land
// border the two countries actually share, and the front moves each month with the fighting.
// A war against a country you do not border is a limited war — blockade and strikes, no front.
//
// This is a simple abstraction: no unit positions, no terrain, no supply network. Borders never
// move; a war ends in capitulation and reparations, not annexation.
const BORDERS=JSON.parse($('borders').textContent);
const DOCTRINE_WAR={
 balanced:{attack:1,defend:1,attrition:1},
 defensive:{attack:.82,defend:1.28,attrition:.85},
 expeditionary:{attack:1.24,defend:.86,attrition:1.15},
 deterrence:{attack:.95,defend:1.12,attrition:.8}};

// The land border between two states, resolved through territory so that merged states such as
// the Soviet Union inherit their members' borders and lose the ones that became internal.
function frontSector(aId,bId){
 const points=[];
 for(const[key,pts]of Object.entries(BORDERS)){
  const[p,q]=key.split(':');
  const op=territoryOwner(p),oq=territoryOwner(q);
  if((op===aId&&oq===bId)||(op===bId&&oq===aId))points.push(...pts);}
 return points;}
function shareBorder(aId,bId){return frontSector(aId,bId).length>=2;}

function committedForce(n,attacking){
 const p=n.policies,w=n.war;
 const doctrine=DOCTRINE_WAR[n.doctrine]||DOCTRINE_WAR.balanced;
 const share=w?w.commitment:.6;
 const quality=.55+p.training*.0035+p.logistics*.002;
 const posture=attacking?doctrine.attack:doctrine.defend;
 return Math.max(.01,n.forces.army*share*(n.readiness/100)*quality*posture*(w?w.supply:1));}

// Supply degrades the further a front is pushed beyond its own border, so an advance culminates.
function supplyFor(n,line){
 const beyond=Math.max(0,line);
 return clamp(1-beyond*(.85-n.policies.logistics*.004),.25,1);}

function openFrontV11(a,b){
 const sector=frontSector(a.id,b.id),land=sector.length>=2;
 for(const[self,other,attacking]of [[a,b,true],[b,a,false]]){
  self.war={target:other.id,months:0,progress:0,
   land,attacker:attacking,line:0,commitment:.6,supply:1,
   casualties:0,intensity:0,sector:attacking?sector:[]};}
 return land;}

function battleV11(a,b){
 // a is always the attacker's record holder for the shared front position.
 const land=a.war.land;
 a.war.supply=supplyFor(a,a.war.line);
 b.war.supply=supplyFor(b,-a.war.line);
 const pa=committedForce(a,true),pb=committedForce(b,false);
 const odds=pa/(pa+pb);
 const intensity=clamp((a.war.commitment+b.war.commitment)/2,.1,1);
 if(land){
  const push=(odds-.5)*2*intensity*.09+(random()-.5)*.03;
  a.war.line=clamp(a.war.line+push,-1,1);
  b.war.line=-a.war.line;}
 else{
  // A limited war grinds both sides down without a front to move.
  a.war.line=clamp(a.war.line+(odds-.5)*.02,-.4,.4);
  b.war.line=-a.war.line;}
 a.war.progress=a.war.line*100;b.war.progress=-a.war.progress;
 a.war.intensity=b.war.intensity=intensity;
 // Losses fall on the committed army first, then on the wider force.
 for(const[self,power,enemy]of [[a,pa,pb],[b,pb,pa]]){
  const doctrine=DOCTRINE_WAR[self.doctrine]||DOCTRINE_WAR.balanced;
  const rate=clamp(.012*intensity*doctrine.attrition*(enemy/Math.max(.01,power))*(land?1:.55),0,.09);
  const lost=self.forces.army*rate;
  self.forces.army=Math.max(.01,self.forces.army-lost);
  self.forces.navy=Math.max(.01,self.forces.navy*(1-rate*.35));
  self.forces.air=Math.max(.01,self.forces.air*(1-rate*.55));
  self.military=self.forces.army+self.forces.navy+self.forces.air;
  self.war.casualties+=lost;
  self.readiness=clamp(self.readiness-intensity*1.6+self.policies.logistics*.02,15,95);
  self.stability=clamp(self.stability-intensity*.5,3,97);}
}

// ---------- war resolution ----------
resolveWars=function(){
 const done=new Set();
 for(const first of S.nations){
  if(!first.war||done.has(first.id))continue;
  const other=nation(first.war.target);
  if(!other||!other.war){first.war=null;continue;}
  done.add(first.id);done.add(other.id);
  const a=first.war.attacker?first:other,b=a===first?other:first;
  a.war.months++;b.war.months++;
  battleV11(a,b);
  // Fighting damages the economy where the front is, in proportion to the intensity.
  for(const[self,exposure]of [[a,Math.max(0,-a.war.line)],[b,Math.max(0,a.war.line)]]){
   const harm=a.war.intensity*(.35+exposure*1.6);
   self.gdp=Math.max(.02,self.gdp*(1-harm*.0016));
   self.approval=clamp(self.approval-harm*.35,3,97);
   for(const c of self.cities)c.crime=clamp(c.crime+harm*.25,0,100);}
  const overrun=Math.abs(a.war.line)>=.995,exhausted=a.war.months>=48,
   collapsed=a.forces.army<.02||b.forces.army<.02;
  if(overrun||exhausted||collapsed){
   const winner=a.war.line>0?a:a.war.line<0?b:(a.military>=b.military?a:b),loser=winner===a?b:a;
   const decisive=overrun||collapsed;
   const reparations=Math.min(loser.gdp*(decisive?.06:.03),winner.gdp*(decisive?.03:.015));
   if(!S.options.noDebt){loser.debt+=reparations;winner.debt=Math.max(0,winner.debt-reparations);}
   loser.stability=clamp(loser.stability-(decisive?16:8),3,97);
   loser.approval=clamp(loser.approval-(decisive?14:6),3,97);
   winner.approval=clamp(winner.approval+(decisive?6:1),3,97);
   setRelation(a.id,b.id,-45);
   const casualties=(a.war.casualties+b.war.casualties);
   addEvent(decisive?'The front collapses':'Ceasefire agreed',
    decisive
     ?loser.name+'’s line gave way after '+a.war.months+' months. '+winner.name+' takes the terms it asks for: reparations, a ceasefire, and no change to the border on the map.'
     :'After '+a.war.months+' months neither army could break the other. '+winner.name+' holds the better position and secures reparations. Borders are unchanged.',
    'security');
   if([a.id,b.id].includes(S.player))
    addEvent('The cost of the war','Between them the two armies lost the equivalent of '+casualties.toFixed(1)+' index points of strength. Readiness and stability will take years to rebuild.','warning');
   a.war=null;b.war=null;}
 }};

const v10DeclareWarV11=declareWar;
declareWar=function(){
 const a=player(),b=current();
 const before=a.war;
 v10DeclareWarV11();
 if(!a.war||a.war===before)return;
 const land=openFrontV11(a,b);
 addEvent(land?'A front opens':'A war without a front',
  land
   ?a.name+' and '+b.name+' share a land border, and both armies are moving to it. The front will shift each month with the fighting.'
   :a.name+' and '+b.name+' share no land border. The war will be fought at sea and in the air, and ground will not change hands.',
  'security');
 requestDraw();};

// ---------- the front on the map ----------
// Drawn as the shared border, displaced toward whichever side is losing ground.
function frontLineV11(){
 const out=[];
 const seen=new Set();
 for(const n of S.nations){
  if(!n.war||!n.war.attacker||!n.war.land||seen.has(n.id))continue;
  const b=nation(n.war.target);if(!b)continue;
  seen.add(n.id);seen.add(b.id);
  const sector=n.war.sector&&n.war.sector.length?n.war.sector:frontSector(n.id,b.id);
  if(sector.length<2)continue;
  let dx=b.lon-n.lon,dy=b.lat-n.lat;
  const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
  const depth=n.war.line*Math.min(6,len*.35);
  out.push({points:sector.map(([lon,lat])=>[lon+dx*depth,lat+dy*depth]),
   line:n.war.line,intensity:n.war.intensity,player:[n.id,b.id].includes(S.player)});}
 return out;}
function drawFrontsV11(ctx,t){
 for(const front of frontLineV11()){
  const pts=front.points.map(([lon,lat])=>project(lon,lat));
  ctx.save();
  ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle=front.player?'#e07a5f':'#8d5f52';
  ctx.lineWidth=(front.player?3.4:2.4)/t.scale;
  ctx.setLineDash([7/t.scale,5/t.scale]);
  ctx.beginPath();
  pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.stroke();
  // A flare at the centre marks how hard the sector is being fought over.
  const mid=pts[Math.floor(pts.length/2)];
  ctx.setLineDash([]);
  ctx.fillStyle='rgba(224,122,95,'+(0.25+front.intensity*.5).toFixed(2)+')';
  ctx.beginPath();ctx.arc(mid[0],mid[1],(4+front.intensity*5)/t.scale,0,Math.PI*2);ctx.fill();
  ctx.restore();}}

// ---------- the war room ----------
function frontStatusV11(line){
 const a=Math.abs(line);
 if(a<.05)return'The line has not moved';
 const side=line>0?'advancing':'falling back';
 return(a<.2?'Slowly ':a<.5?'Steadily ':a<.85?'Rapidly ':'Decisively ')+side;}
function warPanelV11(n){
 if(!n.war)return'';
 const w=n.war,foe=nation(w.target);if(!foe)return'';
 const mine=w.attacker?w.line:-w.line;
 const owned=n.id===S.player;
 return '<div class="block warroom"><div class="sectionhead"><h3>The front</h3>'
 +'<span class="eyebrow">'+escapeHTML(n.name)+' vs '+escapeHTML(foe.name)+'</span></div>'
 +(w.land
  ?'<div class="frontbar"><div class="frontfill" style="left:'+(50+Math.min(0,mine)*50).toFixed(1)+'%;width:'+(Math.abs(mine)*50).toFixed(1)+'%"></div><div class="frontmark" style="left:'+(50+mine*50).toFixed(1)+'%"></div></div>'
   +'<p class="note">'+frontStatusV11(mine)+' · '+(Math.abs(mine)*100).toFixed(0)+'% of the way to a breakthrough</p>'
  :'<p class="note">No shared land border. This is a naval and air war; ground does not change hands.</p>')
 +metric('Months of fighting',w.months)
 +metric('Army committed',(w.commitment*100).toFixed(0)+'%')
 +metric('Supply',(w.supply*100).toFixed(0)+'%',w.supply<.6?'negative':'')
 +metric(owned?'Your army':escapeHTML(n.name)+'’s army',n.forces.army.toFixed(1)+' index')
 +metric(owned?'Their army':escapeHTML(foe.name)+'’s army',foe.forces.army.toFixed(1)+' index',foe.forces.army>n.forces.army?'negative':'positive')
 +metric('Readiness',n.readiness.toFixed(0)+'%')
 +metric(owned?'Your losses':escapeHTML(n.name)+'’s losses',w.casualties.toFixed(1)+' index points','negative')
 +(owned?'<label class="eyebrow" for="warCommit">Share of the army committed to the front</label>'
  +'<input type="range" id="warCommit" min="10" max="100" step="5" value="'+Math.round(w.commitment*100)+'" class="full">'
  +'<p class="note">Committing more pushes harder and costs more. Supply falls the further you advance beyond your own border, so an offensive runs out of strength on its own.</p>'
  +'<button class="full" data-action="sueForPeace">Seek a ceasefire</button>':'')
 +'</div>';}
const v10MilitaryPanelV11=militaryPanel;
militaryPanel=function(n){return warPanelV11(n)+v10MilitaryPanelV11(n);};
const v10BindPanelV11=bindPanel;
bindPanel=function(){
 v10BindPanelV11();
 const slider=$('warCommit');
 if(slider)slider.oninput=()=>{const n=player();if(n.war){n.war.commitment=clamp(Number(slider.value)/100,.1,1);renderPanel();}};};
Object.assign(actions,{sueForPeace:()=>{
 const n=player();if(!n.war)return;
 const foe=nation(n.war.target);
 // A ceasefire is only accepted if you are not visibly winning; otherwise the other side holds out.
 const mine=n.war.attacker?n.war.line:-n.war.line;
 if(mine>.35){toast('You are winning. They will not accept a ceasefire yet.');return;}
 if(!canSpend(n,10)){toast('Opening talks costs 10 political capital.');return;}
 spendCapital(n,10);peace();}});

// ---------- lifecycle ----------
const v10NewGameV11=newGame;
newGame=function(){v10NewGameV11();S.version=11;};
const v10MigrateV11=migrateSave;
migrateSave=function(s){
 s=v10MigrateV11(s);if(s?.version!==10)return s;
 // A war saved under the abstract model becomes a front, keeping its progress.
 for(const n of s.nations)if(n.war){
  n.war.land=n.war.land??false;n.war.attacker=n.war.attacker??false;
  n.war.line=n.war.line??(n.war.progress||0)/100;
  n.war.commitment=n.war.commitment??.6;n.war.supply=n.war.supply??1;
  n.war.casualties=n.war.casualties??0;n.war.intensity=n.war.intensity??.5;
  n.war.sector=n.war.sector??[];}
 s.version=11;return s;};
const v10ValidSaveV11=validSave;
validSave=function(s){
 v10ValidSaveV11(s);
 for(const n of s.nations){
  if(!n.war)continue;
  const w=n.war;
  if(typeof w.land!=='boolean'||typeof w.attacker!=='boolean')throw Error('Invalid war record.');
  for(const[k,lo,hi]of [['line',-1,1],['commitment',.1,1],['supply',0,1],['casualties',0,1e9],['intensity',0,1]])
   if(!Number.isFinite(w[k])||w[k]<lo-1e-9||w[k]>hi+1e-9)throw Error('Invalid war record.');
  if(!Array.isArray(w.sector))throw Error('Invalid front sector.');
  if(w.sector.length>400)throw Error('Invalid front sector.');}
 // Exactly one side of a war holds the attacker's record.
 const seen=new Set();
 for(const n of s.nations){
  if(!n.war||seen.has(n.id))continue;
  const foe=s.nations.find(x=>x.id===n.war.target);
  if(!foe||!foe.war)throw Error('Conflicts must be reciprocal.');
  seen.add(n.id);seen.add(foe.id);
  if(n.war.attacker===foe.war.attacker)throw Error('A war needs exactly one attacker.');
  if(n.war.land!==foe.war.land)throw Error('Both sides must agree on the kind of war.');}
 return s;};
const v10GuideV11=showGuide;
showGuide=function(){
 v10GuideV11();const box=$('modalContent');if(!box)return;
 box.insertAdjacentHTML('beforeend','<div class="block"><h3>V11 wars on the border</h3>'
 +'<p>Declaring war on a country you share a land border with opens a <b>front along that border</b> — '
 +'the real one, computed from the map: China and Russia have fourteen neighbours each, Germany nine. '
 +'Each month the two armies fight for it, and the line moves toward whichever side is winning. '
 +'You can see it on the map as a dashed red line that shifts as the war goes.</p>'
 +'<p>What decides it: the army committed, readiness, training and logistics, and your doctrine — '
 +'territorial defence holds ground and expeditionary logistics takes it. <b>Supply falls the further '
 +'you push past your own border</b>, so an offensive culminates on its own and a deep advance is hard '
 +'to hold. Both armies take losses every month, heavier for whoever is outmatched.</p>'
 +'<p>A war against a country you do not border is a limited war: blockade and strikes, attrition on '
 +'both sides, no ground changing hands. A front that breaks ends the war decisively; forty-eight '
 +'months of stalemate ends it in exhaustion. Either way the outcome is reparations and a ceasefire.</p>'
 +'<p><b>Borders never move.</b> No territory is annexed and no country is conquered or erased. This is '
 +'a simple abstraction of a front — no unit positions, no terrain, no supply network — and nothing in '
 +'it is a claim about any real conflict or any real border.</p></div>');};
