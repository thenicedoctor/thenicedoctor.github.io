// V6: difficulty modes and an optional world without national debt.
// Difficulty is a bundle of sandbox rules, not a hidden multiplier on the economy.
// Every setting a mode applies stays visible and individually editable in Sandbox.
const DIFFICULTY={
 easy:{name:'Easy',tag:'Debt-free world',
  blurb:'National debt is switched off entirely, supply shocks are rare and mild, political capital rebuilds quickly and reforms are cheap. Build without a fiscal ceiling.',
  rules:{noDebt:true,forgivingDebt:true,shocks:false,shockScale:.6,shockEvery:7,ai:true,aiAggression:.5,capitalRate:1.5,reformScale:.7}},
 medium:{name:'Medium',tag:'Balanced',
  blurb:'Debt returns under the forgiving carrying rules, shocks arrive on the normal cycle, and political capital and reform costs are unmodified. The V5 experience.',
  rules:{noDebt:false,forgivingDebt:true,shocks:true,shockScale:1,shockEvery:5,ai:true,aiAggression:1,capitalRate:1,reformScale:1}},
 hard:{name:'Hard',tag:'Standard carrying costs',
  blurb:'Full debt interest with V3 carrying costs, frequent and severe shocks, assertive rivals, slow political capital and expensive reforms. Every choice has to be paid for.',
  rules:{noDebt:false,forgivingDebt:false,shocks:true,shockScale:1.5,shockEvery:3,ai:true,aiAggression:1.6,capitalRate:.7,reformScale:1.35}}};
const V6_DEFAULTS={difficulty:'easy',...DIFFICULTY.easy.rules};
function difficultyOf(){return DIFFICULTY[S?.options?.difficulty]?S.options.difficulty:'easy';}
// A save whose rules have been edited by hand no longer matches the mode that created it.
function rulesMatch(key){const d=DIFFICULTY[key];return !!d&&Object.entries(d.rules).every(([k,v])=>S.options[k]===v);}
function difficultyLabel(){const key=difficultyOf();return DIFFICULTY[key].name+(rulesMatch(key)?'':' · customised');}
function applyDifficulty(key,quiet=false){
 if(!DIFFICULTY[key])return false;
 S.options.difficulty=key;Object.assign(S.options,DIFFICULTY[key].rules);
 if(S.options.noDebt)for(const n of S.nations){n.debt=0;n.crisisMonths=0;n.crisisGrace=0;n.debtWarned=0;}
 if(!quiet){addEvent('Difficulty set',DIFFICULTY[key].name+' rules are in force. '+DIFFICULTY[key].blurb,'model');renderStats();renderPanel();}
 return true;}
const numericOption=(k,fallback)=>Number.isFinite(S?.options?.[k])?S.options[k]:fallback;

// ---------- a world without national debt ----------
function debtDisabled(){return S?.options?.noDebt===true;}
// Replaces the V5 debt accumulation line. With debt off, deficits are simply not financed by
// borrowing: no stock builds up, so nothing later charges interest or triggers a restructuring.
function accrueDebtV6(n,budget,oldGDP){
 if(debtDisabled()){n.debt=0;n.crisisMonths=0;n.debtWarned=0;return;}
 n.debt=Math.max(0,(n.debt*(1+budget.interest/1200)+(budget.spending-budget.revenue)*oldGDP/1200)/(1+n.inflation/1200));}
const v5HandleDebtV6=handleDebtV4;
handleDebtV4=function(n){if(debtDisabled()){n.crisisMonths=0;n.crisisGrace=0;n.debtWarned=0;return;}return v5HandleDebtV6(n);};
const v5FiscalV6=fiscal;
fiscal=function(n,p=n.policies){
 const b=v5FiscalV6(n,p);
 if(!debtDisabled())return b;
 b.interest=0;b.debtService=0;b.debtRatio=0;
 b.balance=b.revenue-b.spending;
 return b;};
const v5ReliefV6=typeof debtRelief==='function'?debtRelief:null;
if(v5ReliefV6)debtRelief=function(){if(debtDisabled()){toast('National debt is switched off in this world. There is nothing to restructure.');return;}return v5ReliefV6.apply(this,arguments);};

// ---------- difficulty levers on the existing rules ----------
function capitalRateV6(){return numericOption('capitalRate',1);}
const v5ReformCostV6=reformCost;
reformCost=function(n,values){const raw=v5ReformCostV6(n,values);return raw?Math.max(1,Math.ceil(raw*numericOption('reformScale',1))):0;};
// Shock cadence and severity both scale with the mode.
function shockDueV6(){return S.options.shocks&&S.month%Math.max(1,Math.round(numericOption('shockEvery',5)))===0;}
function shockScaleV6(){return numericOption('shockScale',1);}
const v5TickDiplomacyV6=tickDiplomacy;
tickDiplomacy=function(){
 v5TickDiplomacyV6();
 if(!S.options.ai)return;
 const aggression=numericOption('aiAggression',1);
 // Below 1 the world is friendlier: rivals actively court each other and the player.
 if(aggression<1&&S.month%3===0){
  const warmth=(1-aggression)*.6;
  for(const p of S.agreements)setRelation(p.a,p.b,relation(p.a,p.b)+warmth);
  const pool=S.nations.filter(n=>!n.war);
  if(pool.length>1){const a=pool[Math.floor(random()*pool.length)],b=pool[Math.floor(random()*pool.length)];
   if(a.id!==b.id&&!S.sanctions.includes(pair(a.id,b.id)))setRelation(a.id,b.id,relation(a.id,b.id)+warmth*4);}
  return;}
 // Above 1 rivals turn on each other, and on a player they already dislike. Relations gate this,
 // so diplomacy can still prevent it, and no AI nation declares war unprompted in any mode.
 if(aggression<=1||S.month%9!==0)return;
 const pool=S.nations.filter(n=>n.id!==S.player&&!n.war);
 if(pool.length<2)return;
 const a=pool[Math.floor(random()*pool.length)];
 const targets=S.nations.filter(n=>n.id!==a.id&&!n.war);
 const b=targets[Math.floor(random()*targets.length)];
 if(!b||random()>(aggression-1)*.45)return;
 if(relation(a.id,b.id)<-15&&!S.embargoes.some(e=>e.from===a.id&&e.to===b.id)){
  S.embargoes.push({from:a.id,to:b.id});
  setRelation(a.id,b.id,relation(a.id,b.id)-10);syncDiplomacy();
  addEvent('Sanctions imposed',a.name+' restricts trade with '+b.name+'.',b.id===S.player?'warning':'diplomacy');}};

// ---------- the start screen ----------
let startScreenShown=false;
function difficultyCard(key){const d=DIFFICULTY[key],rules=d.rules;
 return '<div class="modecard" data-mode="'+key+'"><div class="sectionhead"><strong>'+d.name+'</strong><span class="eyebrow">'+d.tag+'</span></div>'
 +'<p>'+d.blurb+'</p><ul class="modelist">'
 +'<li>National debt: <b>'+(rules.noDebt?'switched off':rules.forgivingDebt?'forgiving carrying costs':'standard carrying costs')+'</b></li>'
 +'<li>Supply shocks: <b>'+(rules.shocks?'every '+rules.shockEvery+' months, ×'+rules.shockScale+' severity':'none')+'</b></li>'
 +'<li>Political capital: <b>×'+rules.capitalRate+'</b> · Reform cost: <b>×'+rules.reformScale+'</b></li>'
 +'<li>Rival nations: <b>'+(rules.aiAggression>1.2?'assertive · they sanction each other and you':rules.aiAggression<1?'cooperative · relations improve on their own':'normal')+'</b></li></ul>'
 +'<button class="primary full" data-start="'+key+'">Start on '+d.name+'</button></div>';}
function startScreen(){
 const saved=(()=>{try{return !!localStorage.getItem('sovereign-save-v1')}catch(e){return false}})();
 modal('Choose how demanding this world should be',
  '<p>Each mode is a bundle of sandbox rules. Nothing is hidden: every setting below stays visible in <b>Sandbox</b>, and you can change any of it at any time without starting again.</p>'
  +'<div class="modegrid">'+['easy','medium','hard'].map(difficultyCard).join('')+'</div>'
  +(saved?'<button class="full" id="startLoad">Continue your saved world instead</button>':'')
  +'<p class="muted">Easy is preselected. Closing this dialog keeps Easy rules, which have national debt switched off.</p>');
 for(const b of $('modalContent').querySelectorAll('[data-start]'))
  b.onclick=()=>{const key=b.dataset.start;newGame();applyDifficulty(key,true);
   addEvent('A new world begins',DIFFICULTY[key].name+' rules. '+DIFFICULTY[key].blurb,'dispatch');
   closeModal();render();requestDraw();toast(DIFFICULTY[key].name+' mode: '+(S.options.noDebt?'no national debt.':'national debt is active.'));};
 if($('startLoad'))$('startLoad').onclick=()=>{closeModal();actions.load();};}

// ---------- panels ----------
const v5SettingsV6=settingsPanel;
settingsPanel=function(){
 const key=difficultyOf();
 return '<h3>Difficulty</h3><p>Current mode: <b>'+difficultyLabel()+'</b>. Choosing a mode rewrites the sandbox rules below; editing a rule by hand marks the mode as customised. Neither restarts your world.</p>'
 +'<div class="buttonrow modeswitch">'+['easy','medium','hard'].map(k=>'<button class="'+(k===key?'primary':'')+'" data-difficulty="'+k+'">'+DIFFICULTY[k].name+'</button>').join('')+'</div>'
 +'<button class="full" data-action="startScreen">Start a new world and choose a mode →</button>'
 +'<div class="block"></div><h3>National debt</h3>'
 +'<label class="toggleline">Remove national debt entirely<input type="checkbox" data-option="noDebt" '+(S.options.noDebt?'checked':'')+'></label>'
 +'<p>'+(S.options.noDebt
   ?'Debt is switched off. Deficits are not financed by borrowing, no interest is charged, and debt crises and restructuring cannot occur. Budgets, taxes and every other cost still apply.'
   :'Debt is active. Deficits accumulate, interest is charged against the budget, and sustained stress triggers a review.')+'</p>'
 +'<div class="block"></div>'+v5SettingsV6();};
const v5EconomyV6=economyPanel;
economyPanel=function(n){
 const note=debtDisabled()
  ?'<div class="block"><h3>National debt · switched off</h3>'+metric('Government debt','Not modelled')+metric('Interest charged','$0.0B')
   +'<p>This world runs without sovereign borrowing. Deficits are not financed by debt, so the debt ratio, carrying costs, restructuring and the debt-relief program are all inactive. Turn debt back on in <b>Sandbox</b> or by choosing Medium or Hard.</p></div>'
  :'';
 return note+v5EconomyV6(n);};
const v5BindV6=bindPanel;
bindPanel=function(){
 v5BindV6();
 for(const b of $('panel').querySelectorAll('[data-difficulty]'))
  b.onclick=()=>{applyDifficulty(b.dataset.difficulty);toast(DIFFICULTY[b.dataset.difficulty].name+' rules applied.');};};
Object.assign(actions,{startScreen:()=>startScreen()});
// The generic [data-option] handler stores a boolean; removing debt also has to clear the stock.
const v5RenderTickV6=renderTick;
renderTick=function(){if(debtDisabled())for(const n of S.nations)if(n.debt)n.debt=0;v5RenderTickV6();};

// ---------- lifecycle ----------
const v5NewGameV6=newGame;
newGame=function(){
 v5NewGameV6();S.version=6;
 Object.assign(S.options,V6_DEFAULTS);
 if(S.options.noDebt)for(const n of S.nations){n.debt=0;n.crisisMonths=0;n.crisisGrace=0;n.debtWarned=0;}
 addEvent('Choose your difficulty','Easy removes national debt entirely. Medium and Hard restore it with progressively harder sandbox rules. Change mode at any time in Sandbox.','model');};
const v5MigrateV6=migrateSave;
migrateSave=function(s){
 s=v5MigrateV6(s);if(s?.version!==5)return s;
 // Existing worlds keep the debt they built up, so they migrate to Medium rather than Easy.
 s.options={...V6_DEFAULTS,...s.options,difficulty:'medium',...DIFFICULTY.medium.rules};
 s.version=6;return s;};
const v5ValidSaveV6=validSave;
validSave=function(s){
 v5ValidSaveV6(s);
 if(!DIFFICULTY[s.options.difficulty])throw Error('Invalid difficulty mode.');
 if(typeof s.options.noDebt!=='boolean')throw Error('Invalid debt rule.');
 for(const[k,lo,hi]of [['shockScale',0,4],['shockEvery',1,60],['capitalRate',0,6],['reformScale',.05,6],['aiAggression',0,4]])
  if(!Number.isFinite(s.options[k])||s.options[k]<lo||s.options[k]>hi)throw Error('Invalid difficulty rule.');
 if(s.options.noDebt&&s.nations.some(n=>n.debt>0))throw Error('Debt present in a debt-free world.');
 return s;};
const v5GuideV6=showGuide;
showGuide=function(){
 v5GuideV6();const box=$('modalContent');if(!box)return;
 box.insertAdjacentHTML('beforeend','<div class="block"><h3>V6 difficulty and debt</h3>'
 +'<p><b>Modes.</b> Easy, Medium and Hard are bundles of the same sandbox rules you can already see and edit. A mode sets national debt, shock frequency and severity, political-capital regeneration, reform cost and how assertive rival nations are. Changing a rule by hand marks the mode as customised; changing modes never restarts your world or edits your policies.</p>'
 +'<p><b>A world without debt.</b> On Easy, and whenever <b>Remove national debt entirely</b> is ticked, deficits are not financed by borrowing. No stock accumulates, no interest is charged, and debt crises, restructuring and the debt-relief program are inactive. Everything else still constrains you: tax revenue, programme costs, construction time, political capital, inflation and the output gap. Turning debt back on starts from whatever stock the world currently holds, which is zero if it has always been off.</p>'
 +'<p>Difficulty changes the rules of the sandbox, not the arithmetic of the economy. The production function, the central bank and every statistic behave identically in all three modes.</p></div>');};
