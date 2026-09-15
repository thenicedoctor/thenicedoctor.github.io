// V15: budgets that start sustainable, ideology presets that pay for themselves, ten new reforms,
// and national development programmes that build in every city at once.

// ---------- starting budgets a country can live with ----------
// Each version from V4 on added programmes that carry a cost and no revenue, so the median country
// opened the game near a 9% deficit before the player had touched anything. The AI already closes
// that gap with taxes, raising its broad rate a point every six months while its deficit exceeds 5%.
// A new world is now seeded where that rule was heading, and to a sustainable level rather than 5%.
// Revenue, not spending, closes the gap: in twenty-year runs of the whole world, trimming spending
// to the same balance cost 0.7 points of growth a year and five points of human development, while
// raising revenue left both unchanged and halved the debt built up.
const START_BALANCE_V15={easy:-.5,medium:-1.5,hard:-3};
function startBalanceV15(){return START_BALANCE_V15[S?.options?.difficulty]??-1.5;}
function revenueLeverV15(p){return p.taxMode==='simple'?'tax':'otherTax';}
function leverNameV15(key){return key==='tax'?'total tax burden':'other taxes & contributions';}

// The balance rises with the broad tax rate, so the rate that meets a target can be solved for.
// The result sits on the slider's step — whichever neighbouring step lands closer to the target, so a
// whole-point tax slider misses by at most half a point rather than always overshooting.
function solveLeverV15(n,values,target,lo,hi){
 const key=revenueLeverV15(values),spec=POLICY.find(x=>x.key===key);
 const at=v=>fiscal(n,{...values,[key]:v}).balance;
 lo=clamp(lo,spec.min,spec.max);hi=clamp(hi,spec.min,spec.max);
 if(at(hi)<target)return {...values,[key]:hi};
 if(at(lo)>=target)return {...values,[key]:lo};
 for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(at(mid)>=target)hi=mid;else lo=mid;}
 const snap=v=>clamp(Math.round(v/spec.step)*spec.step,spec.min,spec.max);
 const down=snap(Math.floor(hi/spec.step+1e-9)*spec.step),up=snap(Math.ceil(hi/spec.step-1e-9)*spec.step);
 return {...values,[key]:Math.abs(at(down)-target)<Math.abs(at(up)-target)?down:up};}
// Where revenue alone cannot get there, discretionary programmes are trimmed evenly toward their floors.
function trimToV15(n,values,target,skip=[]){
 if(fiscal(n,values).balance>=target)return values;
 const specs=DISCRETIONARY.filter(k=>!skip.includes(k)).map(k=>POLICY.find(x=>x.key===k)).filter(Boolean);
 const at=f=>{const v={...values};for(const s of specs)v[s.key]=s.min+(values[s.key]-s.min)*(1-f);return v;};
 if(fiscal(n,at(1)).balance<target)return at(1);
 let lo=0,hi=1;
 for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(fiscal(n,at(mid)).balance>=target)hi=mid;else lo=mid;}
 return at(hi);}

// What seeding changed is remembered (not saved), so choosing a different difficulty or era before
// the first month undoes it and seeds again, instead of stacking one adjustment on another.
const budgetSeedV15=new WeakMap();
function unseedBudgetV15(n){
 const changed=budgetSeedV15.get(n);if(!changed)return;
 for(const[k,v]of Object.entries(changed))n.policies[k]=n.targets[k]=v;
 budgetSeedV15.delete(n);}
function seedBudgetV15(n){
 unseedBudgetV15(n);neutralReformsV15(n);
 const target=startBalanceV15(),before={...n.policies};
 let p={...n.policies};
 if(fiscal(n,p).balance<target){
  const key=revenueLeverV15(p);
  p=solveLeverV15(n,p,target,p[key],POLICY.find(x=>x.key===key).max);
  // Only when revenue is exhausted are programmes trimmed. Defence is left alone: trimming it at the
  // start would quietly rearrange every military balance.
  if(p[key]>=POLICY.find(x=>x.key===key).max&&fiscal(n,p).balance<target)p=trimToV15(n,p,target,['defense']);}
 const changed={};
 for(const x of POLICY)if(p[x.key]!==before[x.key]){changed[x.key]=before[x.key];n.policies[x.key]=n.targets[x.key]=p[x.key];}
 budgetSeedV15.set(n,changed);
 n.budgetSeededV15=true;}
function worldAtStartV15(){return S&&S.month===0;}

// ---------- ideology presets that pay for themselves ----------
// A preset used to stage its spending and keep your taxes, so any ideology with a larger state
// opened a deficit the moment it was chosen. It now arrives with the broad tax rate that funds it:
// the balance stays where it was, or recovers to the sustainable level if it was already worse.
// Smaller-state presets work the same way in reverse, and cut the rate. Tax structure, brackets,
// institutions and civil liberties are still never touched.
// `before` is the policy set on screen before the preset was clicked: its balance is the one to hold,
// and its tax rate is the one the player should see the change measured from.
function fundPresetV15(values,n,before,name){
 const key=revenueLeverV15(values),spec=POLICY.find(x=>x.key===key);
 const target=Math.max(fiscal(n,before).balance,startBalanceV15());
 let out=solveLeverV15(n,values,target,spec.min,spec.max);
 if(out[key]>=spec.max&&fiscal(n,out).balance<target)out=trimToV15(n,out,target);
 const after=fiscal(n,out).balance,from=before[key],to=out[key],dp=spec.step<1?1:0;
 const label=name?name+' staged':'Preset staged';
 toast(!Number.isFinite(from)||Math.abs(to-from)<1e-9
  ?label+'. It pays for itself at your current tax rate: balance '+pct(after)+' of GDP.'
  :label+' and funded: '+leverNameV15(key)+' '+from.toFixed(dp)+' → '+to.toFixed(dp)
   +'% of GDP, balance '+pct(after)+'.');
 return out;}

// ---------- ten new reforms ----------
// Every coefficient below is a gameplay assumption. Each reform starts at a setting with no cost and
// no effect, so existing worlds, the AI and the start of a new game are unchanged until a government
// moves it.
const V15_REFORMS=[
 {key:'basicIncome',name:'Universal basic income',min:0,max:8,step:.25,unit:'% GDP',group:'Welfare & work',
  desc:'An unconditional payment to every adult, on top of existing welfare. Cuts inequality and is popular, at a large recurring cost; somewhat fewer people take paid work.'},
 {key:'paidLeave',name:'Paid parental leave',min:0,max:52,step:2,unit:'weeks',
  desc:'Publicly paid leave after a birth. Keeps parents attached to work, lifts fertility slightly and is popular. About 0.02% of GDP per week.'},
 {key:'freeTuition',name:'Tuition-free higher education',min:0,max:100,step:5,unit:'/ 100',
  desc:'Public funding in place of university fees. Builds human capital over many years and narrows inequality. Costs up to 0.8% of GDP.'},
 {key:'carbonTax',name:'Carbon price',min:0,max:150,step:5,unit:'$/t CO₂',group:'Tax system',
  desc:'A price on emissions. Revenue shrinks as the economy cleans up; raises the clean-energy score and weighs a little on productivity and approval.'},
 {key:'wealthTax',name:'Annual net wealth tax',min:0,max:3,step:.1,unit:'%',
  desc:'A levy on large fortunes. Reduces inequality, but private investment falls and much of the revenue leaks abroad where capital controls are loose.'},
 {key:'taxEnforcement',name:'Revenue administration',min:0,max:100,step:5,unit:'/ 100',
  desc:'Audits, digital filing and pursuit of evasion. Above 45 every tax collects more, for a small running cost and some unpopularity; below 45 revenue leaks away.'},
 {key:'fuelSubsidy',name:'Fuel & energy subsidies',min:0,max:4,step:.25,unit:'% GDP',group:'Markets & prices',
  desc:'Holds down pump and power prices. Popular and expensive; mostly benefits the better-off and slows the clean-energy transition. Withdrawing it costs approval.'},
 {key:'rentControl',name:'Rent regulation',min:0,max:100,step:5,unit:'/ 100',
  desc:'Caps on rent rises. Lowers rent burdens within a year; over several years it discourages new housing supply.'},
 {key:'drugPolicy',name:'Drug policy · prohibition to regulation',min:0,max:100,step:5,unit:'/ 100',
  desc:'0 is strict prohibition, 100 a legal and regulated market. Regulation takes trade away from organised crime and raises excise revenue; tighter prohibition feeds crime.'},
 {key:'deficitCeiling',name:'Fiscal rule: deficit ceiling',min:0,max:10,step:.5,unit:'% GDP',group:'Fiscal rules',
  desc:'While the budget at target policies runs a deficit above the ceiling, the treasury raises the broad tax rate by a quarter-point a month. 10 means no binding rule.'}];
const V15_DEFAULTS={basicIncome:0,paidLeave:0,freeTuition:0,carbonTax:0,wealthTax:0,taxEnforcement:45,
 fuelSubsidy:0,rentControl:0,drugPolicy:20,deficitCeiling:10};
POLICY.push(...V15_REFORMS);Object.assign(EXTRA_DEFAULTS,V15_DEFAULTS);
// The ideology label is still measured on the long-standing core, so no country's label shifts because
// reforms it has never touched were added. Presets still carry them, and stage them when chosen.
IDEOLOGY_EXEMPT.push(...V15_REFORMS.map(x=>x.key));
const V15_PRESET_REFORMS={
 //                        UBI  leave tuition carbon wealth subsidy rent drugs
 'Social liberal':        [.5,  26,   50,     60,    .3,    0,      15,  70],
 'Social democratic':     [0,   40,   70,     60,    .8,    0,      35,  45],
 'Conservative':          [0,   12,   20,     10,    0,     .5,     0,   10],
 'Market liberal':        [0,   6,    10,     40,    0,     0,      0,   60],
 'Democratic socialist':  [2,   52,   90,     50,    2,     .5,     70,  60],
 'State capitalist':      [0,   16,   60,     10,    0,     2,      30,  5],
 'Green politics':        [1.5, 40,   70,     120,   .8,    0,      40,  70],
 'Libertarian':           [0,   0,    0,      0,     0,     0,      0,   100],
 'National conservative': [0,   26,   30,     0,     0,     1.5,    10,  0],
 'Christian democratic':  [0,   36,   40,     40,    0,     .5,     15,  15],
 'Market socialist':      [1,   40,   80,     40,    1.5,   1,      60,  45],
 'Technocratic centrist': [0,   20,   50,     80,    0,     0,      0,   55],
 'Agrarian':              [0,   16,   30,     0,     0,     2,      10,  10],
 'Communist':             [0,   52,   100,    0,     3,     2.5,    100, 10]};
const V15_PRESET_KEYS=['basicIncome','paidLeave','freeTuition','carbonTax','wealthTax','fuelSubsidy','rentControl','drugPolicy'];
for(const[name,p]of Object.entries(PRESETS)){
 const row=V15_PRESET_REFORMS[name];
 V15_PRESET_KEYS.forEach((k,i)=>{p[k]=row?row[i]:V15_DEFAULTS[k];});}
function ensureReformsV15(n){
 if(!n)return;
 for(const k of ['policies','targets']){
  if(!n[k])continue;
  for(const[key,v]of Object.entries(V15_DEFAULTS))if(!Number.isFinite(n[k][key]))n[k][key]=v;}}
// Countries are seeded from their ideology's preset, which now carries positions on the reforms. A new
// state starts from the neutral settings instead: the presets' positions are for a government to adopt.
function neutralReformsV15(n){
 if(!n)return;
 for(const k of ['policies','targets'])if(n[k])Object.assign(n[k],V15_DEFAULTS);}

// What the reforms cost and raise. Balance keeps the convention that spending excludes debt service.
const v14FiscalV15=fiscal;
fiscal=function(n,p=n.policies){
 const b=v14FiscalV15(n,p),eff=.75+n.capacity*.0025;
 const v=k=>Number.isFinite(p[k])?p[k]:V15_DEFAULTS[k];
 const spend=v('basicIncome')+v('paidLeave')*.02+v('freeTuition')*.008+v('fuelSubsidy')
  +Math.max(0,v('taxEnforcement')-45)*.006;
 const leakage=clamp((100-(p.capitalControls??0))/100*.5,0,.5);
 const revenue=v('carbonTax')*.012*(1-clamp(n.clean,0,100)/100*.6)*eff
  +v('wealthTax')*.45*(1-leakage)*eff
  +Math.max(0,v('drugPolicy')-50)*.006
  +b.revenue*(v('taxEnforcement')-45)*.0009;
 b.reformSpend=spend;b.reformRevenue=revenue;
 b.spending+=spend;b.revenue+=revenue;
 b.balance=b.revenue-b.spending-b.debtService;
 return b;};

// What the reforms do. Each effect moves where a smoothed quantity settles rather than jolting it:
// a shift is divided by that quantity's own smoothing window (approval 8 months, investment share 9,
// rent burden 12, inequality 24, participation and housing supply 60, clean score 96, human
// development 120, fertility 180), so it builds in at the same pace the rest of the model moves.
function settleV15(n,k,shift,window,lo,hi){if(shift&&Number.isFinite(n[k]))n[k]=clamp(n[k]+shift/window,lo,hi);}
const v14TickNationV15=tickV4Nation;
tickV4Nation=function(n){
 v14TickNationV15(n);
 ensureReformsV15(n);
 const p=n.policies,settle=(k,shift,window,lo,hi)=>settleV15(n,k,shift,window,lo,hi);
 const ubi=p.basicIncome,leave=p.paidLeave/52,uni=p.freeTuition/100,carbon=p.carbonTax/100,wealth=p.wealthTax,
  subsidy=p.fuelSubsidy,rent=p.rentControl/100,drugs=(p.drugPolicy-20)/80,enforce=(p.taxEnforcement-45)/55;
 settle('inequality',-ubi*1.6-uni*1.2-wealth*2.4+subsidy*.4,24,5,75);
 settle('approval',ubi*.9+leave*1.5-carbon*2-Math.max(0,enforce)*1.5+subsidy*1.2,8,5,95);
 settle('human',uni*6+leave*1.5,120,0,100);
 settle('clean',carbon*14-subsidy*3,96,0,100);
 settle('rentBurden',-rent*9,12,8,65);
 settle('housingSupply',-rent*14,60,10,100);
 // Organised crime in every city: a regulated market takes trade away from it, prohibition feeds it.
 const crimeShift=-drugs*.12;
 if(crimeShift)for(const c of n.cities)c.crime=clamp(c.crime+crimeShift,0,100);
 // The fiscal rule acts on the budget at target policies, so it stops once enough is legislated
 // instead of overshooting while taxes are still phasing in.
 if(p.deficitCeiling<10&&fiscal(n,n.targets).balance<-p.deficitCeiling){
  const key=revenueLeverV15(n.targets),spec=POLICY.find(x=>x.key===key);
  if(n.targets[key]<spec.max){
   n.targets[key]=Math.min(spec.max,n.targets[key]+.25);
   if(n.id===S.player&&!(n.ruleNoticeV15>0)){
    addEvent('The fiscal rule binds',n.name+'’s deficit is above its '+p.deficitCeiling.toFixed(1)
     +'% ceiling, so the treasury is raising '+leverNameV15(key)+' a quarter-point a month until the budget is back inside it.','economy');
    n.ruleNoticeV15=12;}}}
 if(n.ruleNoticeV15>0)n.ruleNoticeV15--;};
// Everything that feeds potential output — productivity, participation, fertility and the investment
// share — is moved before the supply model runs, never after, or the reported Y* = A K^a L^(1-a) no
// longer matches its inputs. A carbon price and a wealth tax weigh on productivity growth; a basic
// income draws some people out of paid work and paid leave keeps parents in it.
const v14TickSupplyV15=tickSupply;
tickSupply=function(n){
 ensureReformsV15(n);
 const p=n.policies,drag=p.carbonTax/100*.12+p.wealthTax*.05,leave=p.paidLeave/52;
 if(drag)n.tfp*=Math.pow(1-drag/100,1/12);
 settleV15(n,'participation',-p.basicIncome*.006+leave*.012,60,.32,.72);
 settleV15(n,'fertility',leave*.12,180,1.2,6.6);
 settleV15(n,'investShare',-p.wealthTax*.006,9,.02,.5);
 v14TickSupplyV15(n);};

// ---------- build in every city at once ----------
// One national decision instead of a dozen municipal ones: 6 political capital for the first city and
// 2 for each after it. Each city still gets an ordinary project, financed and built on its own queue.
function rolloutCapitalV15(count){return count?6+2*(count-1):0;}
function rolloutPlanV15(n,type){
 const p=PROJECTS[type],limit=queueLimitV12(),cities=[],atLimit=[],full=[];
 for(const c of n.cities){
  if(c.levels[type]+c.queue.filter(q=>q.type===type).length>=5)atLimit.push(c);
  else if(c.queue.length>=limit)full.push(c);
  else cities.push(c);}
 return {type,cities,atLimit,full,
  finance:cities.reduce((a,c)=>a+n.gdp*c.share*p.cost/100,0),
  months:cities.reduce((a,c)=>Math.max(a,instantBuild()?1:projectMonths(n,c,p)),0),
  capital:rolloutCapitalV15(cities.length)};}
function rolloutV15(type){
 const n=current(),p=PROJECTS[type];
 if(!n||n.id!==S.player||!p)return false;
 const plan=rolloutPlanV15(n,type);
 if(!plan.cities.length){toast('No city can take this: each is at level 5 or has a full queue.');return false;}
 if(!canSpend(n,plan.capital)){toast('Building in '+plan.cities.length+' cities needs '+plan.capital+' political capital.');return false;}
 spendCapital(n,plan.capital);
 for(const c of plan.cities){
  const duration=instantBuild()?1:projectMonths(n,c,p);
  c.queue.push({type,duration,remaining:duration,cost:n.gdp*c.share*p.cost/100,paused:false});}
 addEvent('A national development programme',n.name+' approves '+p.name.toLowerCase()+' in '+plan.cities.length
  +(plan.cities.length===1?' city':' cities')+' at once, '+money(plan.finance)+' in total, financed city by city as each project runs.','development');
 renderPanel();renderStats();
 toast('Queued in '+plan.cities.length+(plan.cities.length===1?' city.':' cities.'));
 return true;}
let rolloutTypeV15=null;
function rolloutSummaryV15(n,plan){
 return metric('Cities that can take it',plan.cities.length+' of '+n.cities.length)
  +(plan.atLimit.length?metric('Already at level 5',String(plan.atLimit.length)):'')
  +(plan.full.length?metric('Queue already full',String(plan.full.length)):'')
  +metric('Total finance',money(plan.finance))
  +metric('Longest build',plan.months+(plan.months===1?' month':' months'))
  +metric('Political capital',infiniteCapital(n)?'∞':String(plan.capital));}
function rolloutBlockV15(n){
 if(n.cities.length<2)return '';
 if(!PROJECTS[rolloutTypeV15])rolloutTypeV15=Object.keys(PROJECTS)[0];
 const owned=n.id===S.player,plan=rolloutPlanV15(n,rolloutTypeV15);
 const label=!plan.cities.length?'No city can take this development'
  :'Build in '+plan.cities.length+(plan.cities.length===1?' city':' cities')+' · '+(infiniteCapital(n)?'∞':plan.capital)+' capital';
 return '<details class="controlgroup rollout"><summary>Build in all cities</summary>'
  +'<p>Approve one development for every city at once. A national programme costs 6 political capital for the first city '
  +'and 2 for each one after it, instead of 6 each. Cities at level 5 or with a full queue are skipped.</p>'
  +'<label class="eyebrow" for="rolloutType">Development</label>'
  +'<select id="rolloutType" class="full" '+(owned?'':'disabled')+'>'
  +Object.entries(PROJECTS).map(([k,p])=>'<option value="'+k+'"'+(k===rolloutTypeV15?' selected':'')+'>'+escapeHTML(p.name)+'</option>').join('')
  +'</select><div class="rolloutplan">'+rolloutSummaryV15(n,plan)+'</div>'
  +'<button class="primary full" id="rolloutGo" '+(!owned||!plan.cities.length||!canSpend(n,plan.capital)?'disabled':'')+'>'+label+'</button>'
  +'</details>';}
const v14CitiesPanelV15=citiesV5Panel;
citiesV5Panel=function(n){
 const html=v14CitiesPanelV15(n),anchor='<details class="controlgroup"><summary>Approve a new development';
 return html.includes(anchor)?html.replace(anchor,()=>rolloutBlockV15(n)+anchor):html;};
const v14BindPanelV15=bindPanel;
bindPanel=function(){
 v14BindPanelV15();
 // Every panel draw binds here, so a preset is funded however its page was opened. The balance to
 // hold is the one on screen before the click, read before the base handler stages the preset.
 if(budgetFitEnabled())for(const b of $('panel').querySelectorAll('[data-preset]')){
  const original=b.onclick;
  b.onclick=()=>{
   const n=current(),before={...(draft||n.targets)};
   original&&original();
   if(draft)draft=fundPresetV15(draft,n,before,b.dataset.preset);
   renderPanel();updateReformPreview();};}
 if($('rolloutType'))$('rolloutType').onchange=e=>{rolloutTypeV15=e.target.value;renderPanel();};
 if($('rolloutGo'))$('rolloutGo').onclick=()=>rolloutV15(rolloutTypeV15);};

// ---------- lifecycle ----------
const v14NewGameV15=newGame;
newGame=function(){
 v14NewGameV15();S.version=15;
 for(const n of S.nations)seedBudgetV15(n);};
// Difficulty and era are chosen after the world is created; before the first month, either re-seeds.
const v14ApplyDifficultyV15=applyDifficulty;
applyDifficulty=function(key,quiet=false){
 const ok=v14ApplyDifficultyV15(key,quiet);
 if(ok!==false&&worldAtStartV15())for(const n of S.nations)seedBudgetV15(n);
 return ok;};
const v14ApplyEraV15=applyEra;
applyEra=function(key){
 if(worldAtStartV15())for(const n of S.nations)unseedBudgetV15(n);
 const ok=v14ApplyEraV15(key);
 for(const n of S.nations)ensureReformsV15(n);
 if(ok&&worldAtStartV15())for(const n of S.nations)seedBudgetV15(n);
 return ok;};
// States that appear later — independence, a dissolution, a reunification — are seeded as they arrive.
// The player's own country is never re-seeded mid-game.
const v14TickHistoryV15=tickHistoryV12;
tickHistoryV12=function(){
 v14TickHistoryV15();
 for(const n of S.nations){
  ensureReformsV15(n);
  if(n.budgetSeededV15)continue;
  if(n.id===S.player)n.budgetSeededV15=true;else seedBudgetV15(n);}};
const v14ApplyHistoryV15=applyHistoryV8;
applyHistoryV8=function(key){
 v14ApplyHistoryV15(key);
 for(const n of S.nations)ensureReformsV15(n);};
const v14MigrateV15=migrateSave;
migrateSave=function(s){
 s=v14MigrateV15(s);
 if(!s||typeof s!=='object')return s;
 if(s.version===14){
  // A world already in progress keeps its budgets exactly as they are.
  for(const n of s.nations||[]){ensureReformsV15(n);n.budgetSeededV15=true;}
  if(s.options&&s.options.budgetFitPresets===undefined)s.options.budgetFitPresets=true;
  s.version=15;}
 return s;};
const v14ValidSaveV15=validSave;
validSave=function(s){
 v14ValidSaveV15(s);
 for(const n of s.nations){
  if(n.budgetSeededV15!==undefined&&typeof n.budgetSeededV15!=='boolean')throw Error('Invalid budget seeding flag.');
  if(n.ruleNoticeV15!==undefined&&(!Number.isFinite(n.ruleNoticeV15)||n.ruleNoticeV15<0||n.ruleNoticeV15>12))throw Error('Invalid fiscal rule notice.');}
 return s;};
const v14GuideV15=showGuide;
showGuide=function(){
 v14GuideV15();const box=$('modalContent');if(!box)return;
 box.insertAdjacentHTML('beforeend','<div class="block"><h3>Budgets, reforms and national programmes</h3>'
 +'<p><b>Budgets start sustainable.</b> A new world opens with each country near a small deficit — about 0.5% of GDP '
 +'on Easy, 1.5% on Medium and 3% on Hard — reached by setting its broad tax rate, the same lever the AI uses to '
 +'repair its own budget.</p>'
 +'<p><b>Ideology presets are funded.</b> Choosing one sets the broad tax rate that pays for it, so the balance stays '
 +'where it was. You can switch this off in Sandbox and stage presets exactly as written.</p>'
 +'<p><b>Ten new reforms</b> sit at the end of the Reforms list: a universal basic income, paid parental leave, '
 +'tuition-free universities, a carbon price, a wealth tax, revenue administration, fuel subsidies, rent regulation, '
 +'drug policy, and a fiscal rule that raises taxes automatically while the deficit is above a ceiling you choose.</p>'
 +'<p><b>Build in all cities</b> from the Cities tab: one national decision queues a development in every city that '
 +'can take it, for less political capital than approving each one.</p></div>');};
