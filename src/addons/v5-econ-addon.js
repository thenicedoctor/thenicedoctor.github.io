// V5 macro layer — central bank, production-function growth, demographics and domestic policy.
// Every coefficient below is a gameplay assumption, not an estimated parameter. Named concepts
// (Taylor rule, Okun's law, conditional convergence, NAIRU) are simplified to one-line proxies.
const ALPHA=.33,WORLD_FRONTIER=105;// capital share; frontier output per person in $k
const FX_REGIMES={float:'Floating exchange rate',managed:'Managed float',peg:'Fixed peg'};
const V5_MONETARY=[
{key:'inflationTarget',name:'Inflation target',min:0,max:8,step:.25,unit:'%',group:'Central bank',desc:'The rate the central bank aims for. Credible targets anchor expectations; changing the target often costs credibility.'},
{key:'cbIndependence',name:'Central-bank independence',min:0,max:100,step:5,unit:'/ 100',desc:'How far the policy rate follows the bank’s own reaction function instead of the rate you set. Independent banks anchor inflation faster; you lose direct control.'},
{key:'reserveRequirement',name:'Reserve requirement',min:0,max:30,step:1,unit:'%',desc:'Deposits banks must hold as reserves. Restrains credit growth and widens lending spreads.'},
{key:'assetPurchases',name:'Asset purchases · QE / QT',min:-4,max:4,step:.5,unit:'% GDP / yr',desc:'Positive figures buy assets and compress spreads with diminishing returns. Negative figures unwind the balance sheet.'},
{key:'macroprudential',name:'Macroprudential buffers',min:0,max:100,step:5,unit:'/ 100',desc:'Capital and loan-to-value limits. Damps credit-driven booms and financial shocks, at some cost to investment.'}
];
const V5_DOMESTIC=[
{key:'pensionAge',name:'Statutory pension age',min:58,max:72,step:1,unit:'years',group:'Domestic policy',desc:'A later pension age raises participation and cuts pension cost, and is unpopular. Effects appear over years.'},
{key:'familyBenefit',name:'Child & family benefit',min:0,max:4,step:.25,unit:'% GDP',desc:'Supports household incomes and birth rates modestly, and reduces child poverty. A recurring budget cost.'},
{key:'vocational',name:'Vocational & apprenticeships',min:0,max:100,step:5,unit:'/ 100',desc:'Occupational training raises skills and lowers structural unemployment. Costs up to 0.6% of GDP.'},
{key:'activeLabor',name:'Active labour-market programs',min:0,max:100,step:5,unit:'/ 100',desc:'Job placement, retraining and hiring support. Lowers the structural unemployment floor. Costs up to 0.7% of GDP.'},
{key:'regionalFunds',name:'Regional cohesion transfers',min:0,max:3,step:.25,unit:'% GDP',desc:'Transfers to lagging regions. Spreads city growth and reduces inequality, with modest aggregate returns.'},
{key:'digitalGov',name:'Digital public administration',min:0,max:100,step:5,unit:'/ 100',desc:'Raises state capacity and lowers administrative cost over time. Requires sustained funding.'},
{key:'landTax',name:'Land & property value tax',min:0,max:6,step:.25,unit:'% GDP',desc:'Revenue with comparatively little effect on output, and a direct cost to property owners.'},
{key:'sovereignFund',name:'Sovereign fund contribution',min:0,max:5,step:.25,unit:'% GDP',desc:'Saves budget resources into a fund that cushions shocks and earns a modeled return.'}
];
const V5_MACRO_DEFAULTS={inflationTarget:2,cbIndependence:60,reserveRequirement:8,assetPurchases:0,macroprudential:45,pensionAge:65,familyBenefit:.6,vocational:40,activeLabor:35,regionalFunds:.4,digitalGov:40,landTax:.8,sovereignFund:0};
POLICY.push(...V5_MONETARY,...V5_DOMESTIC);Object.assign(EXTRA_DEFAULTS,V5_MACRO_DEFAULTS);
for(const p of Object.values(PRESETS))Object.assign(p,V5_MACRO_DEFAULTS);
IDEOLOGY_EXEMPT.push('inflationTarget','cbIndependence','reserveRequirement','assetPurchases','macroprudential','digitalGov','pensionAge');
PROGRAMS.push(
{key:'stability',name:'Monetary credibility',tag:'Central bank',blurb:'An independent bank with a clear target anchors expectations. Disinflation is not free: the output gap does the work.',keys:['cbIndependence','inflationTarget','macroprudential','reserveRequirement'],stage:{cbIndependence:85,inflationTarget:2,macroprudential:60,reserveRequirement:10},stageNote:'Stages an independent bank on a 2% target with stronger financial buffers.'},
{key:'capability',name:'Skills & state capability',tag:'Domestic policy',blurb:'Training, active labour programs and a working administration raise productivity and lower the unemployment floor.',keys:['vocational','activeLabor','digitalGov','research'],stage:{vocational:80,activeLabor:75,digitalGov:80,research:3},stageNote:'Stages vocational training, placement services, digital administration and research.'});

// ---------- national accounts state ----------
function econSeed(n){
 const p=n.policies,perCapita=n.gdp/Math.max(.01,n.pop);// $bn per million people = $k per person
 n.participation=clamp(.415+(n.human-50)*.002+p.services*.004+p.childcare*.006-(70-p.pensionAge)*.006,.32,.7);
 n.employment=n.pop*n.participation*(1-n.unemployment/100);
 n.capitalRatio=clamp(2.1+Math.log10(Math.max(1,perCapita))*.85+(n.infra-50)*.006,1.6,4.2);
 n.capitalStock=n.gdp*n.capitalRatio;
 n.tfp=n.gdp/(Math.pow(n.capitalStock,ALPHA)*Math.pow(Math.max(.01,n.employment),1-ALPHA));
 n.tfpBase=n.tfp;n.potentialGdp=n.gdp;n.outputGap=0;n.investShare=.22;
 n.nairuBase=clamp(n.unemployment,2.8,24);n.nairu=n.nairuBase;n.priceLevel=100;n.fund=0;n.reer=100;
 n.currentAccount=0;n.fertility=clamp(5.3-Math.log10(Math.max(.3,perCapita))*1.95-(n.human-55)*.02+p.familyBenefit*.12,1.2,6.6);
 n.potentialGrowth=clamp(n.growth,-8,10);
 // Opening split of the seeded growth rate, replaced by measured accounting after one month.
 n.decomposition={capital:n.potentialGrowth*.4,labour:n.potentialGrowth*.2,tfp:n.potentialGrowth*.4};n.tfpGrowth=1;n.popGrowth=.004;n.lastBalance=0;
 n.mon={expected:n.inflation,credibility:clamp(30+n.capacity*.55+p.cbIndependence*.12,15,92),balance:0,rate:p.rate,neutral:2,taylor:p.rate,spread:1.6};
}
function upgradeNationEconV5(n){
 for(const k of ['policies','targets'])n[k]={...V5_MACRO_DEFAULTS,...n[k]};
 if(!n.mon||!Number.isFinite(n.capitalStock))econSeed(n);
 if(!Number.isFinite(n.nairuBase))n.nairuBase=clamp(n.unemployment,2.8,24);
 if(!Number.isFinite(n.gapTarget))n.gapTarget=n.outputGap||0;
 n.policies.inflationTarget=clamp(n.policies.inflationTarget,0,8);n.targets.inflationTarget=clamp(n.targets.inflationTarget,0,8);
 if(!FX_REGIMES[n.fxRegime])n.fxRegime=n.capacity>62?'float':'managed';
}
// Global conditions every nation reacts to. Small countries take world rates as given.
let worldRate=2.6,worldInflation=2.4,worldGrowth=2.5;
function refreshWorld(){
 let r=0,i=0,g=0,w=0;
 for(const n of S.nations){const size=Math.sqrt(n.gdp);r+=(n.mon?.rate??n.policies.rate)*size;i+=n.inflation*size;g+=n.growth*size;w+=size;}
 worldRate=r/Math.max(1,w);worldInflation=i/Math.max(1,w);worldGrowth=g/Math.max(1,w);
}

// ---------- monetary policy ----------
function neutralRate(n){return clamp(.3+n.potentialGrowth*.5-(n.mon.balance)*.012-Math.max(0,n.policies.capitalControls-40)*.006,-1.5,6);}
function taylorRate(n){const p=n.policies,target=p.inflationTarget;
 return clamp(n.mon.neutral+n.inflation+.5*(n.inflation-target)+.5*n.outputGap,-.5,25);}
function effectiveRate(n){return n.mon?n.mon.rate:n.policies.rate;}
function expectedInflation(n){return n.mon?n.mon.expected:n.inflation;}
function lendingSpread(n){const p=n.policies,debtRatio=n.debt/n.gdp*100;
 // Balance-sheet support has diminishing returns past roughly 25% of GDP.
 const qe=Math.sign(n.mon.balance)*Math.sqrt(Math.abs(n.mon.balance))*.22;
 return clamp(1.1+p.reserveRequirement*.055+p.macroprudential*.009-qe+Math.max(0,debtRatio-90)*.011+Math.max(0,55-n.mon.credibility)*.02-n.capacity*.008,.2,12);}
function tickMonetary(n){
 const p=n.policies,m=n.mon,target=p.inflationTarget;
 m.neutral=neutralRate(n);m.taylor=taylorRate(n);
 const indep=p.cbIndependence/100;
 let desired=indep*m.taylor+(1-indep)*p.rate;
 // A peg imports the world policy rate and surrenders most monetary autonomy.
 if(n.fxRegime==='peg')desired=worldRate*.8+desired*.2;else if(n.fxRegime==='managed')desired=worldRate*.35+desired*.65;
 m.rate+=(clamp(desired,-.5,25)-m.rate)/2.5;
 m.spread=lendingSpread(n);
 m.balance=clamp(m.balance+p.assetPurchases/12,-8,60);
 // Expectations anchor on the target in proportion to credibility.
 const anchor=m.credibility/100*target+(1-m.credibility/100)*n.inflation;
 m.expected+=(anchor-m.expected)/9;
 const miss=Math.abs(n.inflation-target);
 m.credibility=clamp(m.credibility+(miss<1.2?.22:-Math.min(miss,8)*.05)+(indep-.5)*.09+(n.capacity-55)*.004-Math.max(0,m.balance-25)*.006,5,97);
 // Real exchange rate: floats correct, pegs accumulate misalignment.
 const drift=(n.inflation-worldInflation)*.09+(worldRate-m.rate)*.05;
 if(n.fxRegime==='peg')n.reer=clamp(n.reer+drift,55,190);
 else n.reer=clamp(n.reer+drift*(n.fxRegime==='managed'?.55:.3)+(100-n.reer)/(n.fxRegime==='float'?26:60),55,190);
}
// ---------- supply side ----------
function tickSupply(n){
 const p=n.policies,perCapita=n.gdp/Math.max(.01,n.pop);
 // Demographics: fertility, ageing and migration instead of one global growth rate.
 const targetFert=clamp(5.3-Math.log10(Math.max(.3,perCapita))*1.95-(n.human-55)*.02+p.familyBenefit*.12+p.childcare*.015,1.2,6.6);
 n.fertility+=(targetFert-n.fertility)/180;
 // Annual rates: fertility above replacement adds people, ageing societies shrink, policy moves migration.
 const natural=(n.fertility-2.08)*.006,migration=(p.immigration-50)*.00006+(perCapita>25?.0015:0);
 n.popGrowth=clamp(natural+migration,-.008,.032);n.pop=Math.max(.001,n.pop*(1+n.popGrowth/12));
 const partTarget=clamp(.415+(n.human-50)*.002+p.services*.004+p.childcare*.006+p.familyBenefit*.012-(70-p.pensionAge)*.006+(p.activeLabor-35)*.0012+(p.vocational-40)*.0008+(p.liberties-50)*.0006-Math.max(0,p.labor-80)*.001-Math.max(0,n.unemployment-12)*.004,.32,.72);
 n.participation+=(partTarget-n.participation)/60;
 // Structural unemployment floor, then Okun's law around it.
 n.nairu+=(clamp(n.nairuBase+Math.max(0,p.labor-70)*.05+Math.max(0,p.minimumWage-65)*.03-(p.activeLabor-35)*.02-(p.vocational-40)*.015-(p.business-50)*.008+(n.inequality-40)*.03+(n.crime-40)*.015,2,26)-n.nairu)/36;
 n.employment=n.pop*n.participation*(1-n.unemployment/100);
 // Investment: public capital plus a private response to real lending rates and conditions.
 const realLending=effectiveRate(n)+n.mon.spread-expectedInflation(n);
 const privateInvest=clamp(17.5-realLending*.7+(p.business-50)*.045+p.competition*.02+p.smeCredit*1.1+(n.mon.credibility-50)*.03-p.capitalControls*.025-p.macroprudential*.012-(n.war?4:0)-Math.max(0,n.debt/n.gdp*100-110)*.02,3,34);
 const publicInvest=p.investment+p.transit*.6+p.urbanization+p.regionalFunds*.7;
 n.investShare+=((privateInvest+publicInvest)/100-n.investShare)/9;
 const depreciation=clamp(.045+(50-n.infra)*.0002,.032,.068);
 const oldCapital=n.capitalStock;
 n.capitalStock=clamp(n.capitalStock+(n.investShare*n.gdp-depreciation*n.capitalStock)/12,n.gdp*1.2,n.gdp*6);
 n.capitalRatio=n.capitalStock/Math.max(.001,n.gdp);
 // Conditional convergence: catching up needs institutions, openness and schooling.
 const quality=clamp((n.capacity*.42+p.institutions*.25+n.human*.15+p.trade*.18)/100,.12,1);
 const gap=clamp(Math.log(WORLD_FRONTIER/Math.max(.4,perCapita)),0,3.2);
 const sanctions=S.sanctions.filter(t=>t.split(':').includes(n.id)).length;
 const tfpGrowth=clamp(.75+gap*.8*quality+(p.research-1.5)*.09+(p.vocational-40)*.006+(p.digitalGov-40)*.005+(p.competition-50)*.005+(p.trade-55)*.005+(p.antiCorruption-55)*.005+n.tradeGrowth*.35-sanctions*.45-(n.war?1.4:0)-Math.max(0,n.crime-55)*.012-Math.max(0,p.tax-42)*.022,-3.5,7.5);
 n.tfp*=Math.pow(1+tfpGrowth/100,1/12);
 const oldPotential=n.potentialGdp;
 n.potentialGdp=n.tfp*Math.pow(n.capitalStock,ALPHA)*Math.pow(Math.max(.005,n.pop*n.participation*(1-n.nairu/100)),1-ALPHA);
 n.potentialGrowth=clamp((Math.pow(n.potentialGdp/Math.max(.001,oldPotential),12)-1)*100,-12,14);
 const capitalGrowth=clamp((Math.pow(Math.max(1e-9,n.capitalStock)/Math.max(1e-9,oldCapital),12)-1)*100,-25,25);
 // Labour is the residual, so the three components always sum to potential growth.
 n.decomposition={capital:ALPHA*capitalGrowth,labour:n.potentialGrowth-ALPHA*capitalGrowth-tfpGrowth,tfp:tfpGrowth};
 n.tfpGrowth=tfpGrowth;
}
// ---------- demand, prices and the output gap ----------
function macroV5(n,budget,legacyPotential,realRate,shock,warCost,sanctionCount,tradeCount){
 const p=n.policies,m=n.mon,oldGDP=n.gdp;
 tickMonetary(n);tickSupply(n);
 const monetaryGap=-(effectiveRate(n)-expectedInflation(n)-m.neutral)*(n.fxRegime==='peg'?.75:.55);
 const fiscalImpulse=clamp(-(budget.balance-(n.lastBalance??budget.balance))*.22,-2.2,2.2);
 n.lastBalance=budget.balance;
 const competitiveness=(100-n.reer)*.035;
 const target=clamp(monetaryGap+fiscalImpulse+competitiveness+n.tradeGrowth*.5+p.publicEmployment*.35+p.smeCredit*.25-shock*1.15-warCost*.9-sanctionCount*.5+Math.min(tradeCount,5)*.1+(m.credibility-50)*.006+(clamp(legacyPotential,-12,10)-2.5)*.14-Math.max(0,n.inflation-10)*.11,-9,7);
 n.gapTarget+=(target-n.gapTarget)/7;
 const closing=clamp(n.gapTarget-n.outputGap,-9,9)/5;
 n.gdp=Math.max(.02,n.gdp*(1+n.potentialGrowth/1200)*(1+closing/100));
 n.outputGap=clamp((n.gdp/Math.max(.0001,n.potentialGdp)-1)*100,-16,14);
 n.growth+=((Math.pow(n.gdp/oldGDP,12)-1)*100-n.growth)/3;
 n.growth=clamp(n.growth,-28,22);
 // Expectations-augmented Phillips curve with import-price and tariff pass-through.
 const passThrough=(p.tariff*.035+Math.max(0,n.reer-100)*.02*(n.fxRegime==='peg'?.4:1))*(1-p.capitalControls*.002);
 const wanted2=expectedInflation(n)+n.outputGap*.42+passThrough-shock*.75+warCost*.55+Math.max(0,-budget.balance-6)*.09+Math.max(0,m.balance-20)*.015;
 n.inflation+=(clamp(wanted2,-3.5,90)-n.inflation)/6;
 n.priceLevel=Math.max(1,n.priceLevel*Math.pow(1+n.inflation/100,1/12));
 // Sovereign fund and external balance.
 n.fund=Math.max(0,n.fund+(p.sovereignFund*n.gdp/100)/12+n.fund*.035/12);
 n.currentAccount+=(clamp((n.exports-n.imports)/Math.max(.01,n.gdp)*100+competitiveness*.4-n.investShare*12+(n.mon.credibility-50)*.02,-14,14)-n.currentAccount)/12;
}
// Unemployment is set by Okun's law around the structural floor, replacing the v4 rule.
function unemploymentV5(n){
 const p=n.policies,okun=clamp(n.nairu-.45*n.outputGap-p.publicEmployment*.35-p.smeCredit*.15,1.2,32);
 n.unemployment+=(okun-n.unemployment)/9;n.unemployment=clamp(n.unemployment,1.2,34);
}
// ---------- fiscal cost of the new instruments ----------
const v4FiscalEcon=fiscal;
fiscal=function(n,p=n.policies){
 const b=v4FiscalEcon(n,p),eff=.75+n.capacity*.0025;
 const land=p.landTax*eff,pension=Math.max(0,(67-p.pensionAge))*.3,
  domestic=p.familyBenefit+p.vocational*.006+p.activeLabor*.007+p.regionalFunds+p.digitalGov*.004+p.sovereignFund;
 b.revenue+=land;b.spending+=pension+domestic;
 // Central-bank asset purchases are not budget revenue; only the interest channel is modelled.
 if(n.mon)b.interest=clamp(b.interest+(effectiveRate(n)-n.policies.rate)*.55+n.mon.spread*.18-Math.max(0,n.mon.credibility-60)*.006,.2,14),b.debtService=n.debt/n.gdp*b.interest;
 b.balance=b.revenue-b.spending-b.debtService;
 b.econRevenue={land};b.econSpending={pension,domestic};
 return b;};

// ---------- panels ----------
function gapLabel(g){return g>2.5?'Overheating':g>.6?'Above potential':g>-.6?'Near potential':g>-2.5?'Below potential':'Deep slack';}
function monetaryPanel(n){
 const m=n.mon,p=n.policies,real=effectiveRate(n)-expectedInflation(n),owned=n.id===S.player;
 return '<div class="block"><h3>Monetary conditions</h3>'
 +metric('Effective policy rate',m.rate.toFixed(2)+'%')
 +metric('Your instructed rate',p.rate.toFixed(2)+'%')
 +metric('Bank’s reaction-function rate',m.taylor.toFixed(2)+'%')
 +metric('Neutral rate · modeled r*',m.neutral.toFixed(2)+'%')
 +metric('Real policy rate',real.toFixed(2)+'%',real>m.neutral+1?'negative':real<m.neutral-1?'neutral':'positive')
 +metric('Lending spread',m.spread.toFixed(2)+' pts')
 +'<p>The effective rate blends your instruction with the bank’s own rule, weighted by independence. A managed float or peg pulls it toward the world rate of '+worldRate.toFixed(2)+'%.</p></div>'
 +'<div class="block"><h3>Prices & credibility</h3>'
 +metric('Inflation',n.inflation.toFixed(2)+'%',Math.abs(n.inflation-p.inflationTarget)>2?'negative':'positive')
 +metric('Target',p.inflationTarget.toFixed(2)+'%')
 +metric('Expected inflation',m.expected.toFixed(2)+'%')
 +metric('Credibility',m.credibility.toFixed(0)+' / 100',m.credibility<40?'negative':m.credibility>70?'positive':'')
 +metric('Balance sheet',m.balance.toFixed(1)+'% of GDP')
 +metric('Real exchange rate',n.reer.toFixed(1)+' index',Math.abs(n.reer-100)>18?'negative':'')
 +'<div class="bar"><div style="width:'+clamp(m.credibility,0,100)+'%"></div></div>'
 +'<p>Expectations move toward the target in proportion to credibility, so a credible bank disinflates at a smaller cost in output. Persistent misses erode it.</p></div>'
 +'<div class="block"><h3>Exchange-rate regime</h3><label class="eyebrow" for="fxRegime">Regime</label><select id="fxRegime" class="full"'+(owned?'':' disabled')+'>'
 +Object.entries(FX_REGIMES).map(([k,v])=>'<option value="'+k+'"'+(n.fxRegime===k?' selected':'')+'>'+v+'</option>').join('')
 +'</select><p>A float keeps monetary autonomy and lets the real exchange rate correct. A peg imports the world rate and can accumulate misalignment, which shows up in competitiveness.</p></div>';
}
function growthPanel(n){
 const d=n.decomposition,perCapita=n.gdp/Math.max(.01,n.pop)*1000;
 return '<div class="block"><h3>Potential output & the gap</h3>'
 +metric('Actual output',money(outputValue(n)))
 +metric('Potential output',money(n.potentialGdp))
 +metric('Output gap',pct(n.outputGap)+' · '+gapLabel(n.outputGap),n.outputGap>2.5||n.outputGap<-2.5?'negative':'positive')
 +metric('Potential growth',pct(n.potentialGrowth||0))
 +metric('Measured growth',pct(n.growth),n.growth>=0?'positive':'negative')
 +'<p>Output is produced with capital and labour: Y = A · K<sup>0.33</sup> · L<sup>0.67</sup>. Demand moves output around that supply path; it cannot raise it for long.</p></div>'
 +'<div class="block"><h3>Growth accounting · annual</h3>'
 +metric('Capital deepening',pct(d.capital||0))
 +metric('Labour input',pct(d.labour||0))
 +metric('Productivity · TFP',pct(d.tfp||0))
 +metric('Investment share',(n.investShare*100).toFixed(1)+'% of GDP')
 +metric('Capital / output ratio',n.capitalRatio.toFixed(2))
 +metric('Productivity index',(n.tfp/Math.max(.0001,n.tfpBase)*100).toFixed(1))
 +'<p>Convergence is conditional: catching up to the frontier requires institutions, schooling and openness, so weak states converge slowly or not at all.</p></div>'
 +'<div class="block"><h3>Labour market & people</h3>'
 +metric('Unemployment',n.unemployment.toFixed(1)+'%',n.unemployment>n.nairu+2?'negative':'positive')
 +metric('Structural floor · NAIRU',n.nairu.toFixed(1)+'%')
 +metric('Participation rate',(n.participation*100).toFixed(1)+'%')
 +metric('Employment',(n.pop*n.participation*(1-n.unemployment/100)).toFixed(1)+'m people')
 +metric('Population',n.pop.toFixed(2)+'m')
 +metric('Fertility · births per woman',n.fertility.toFixed(2))
 +metric('Output per person',(perCapita>=1000?'$'+(perCapita/1000).toFixed(1)+'k':'$'+perCapita.toFixed(0)))
 +'<p>Unemployment follows the structural floor adjusted by the output gap. Training and placement lower the floor; the gap moves the cycle.</p></div>';
}
const v4EconomyPanelEcon=economyPanel;
economyPanel=function(n){
 const b=fiscal(n),nominal=n.gdp*n.priceLevel/100;
 return '<div class="block"><h3>Macroeconomic summary</h3>'
 +metric('Output gap',pct(n.outputGap)+' · '+gapLabel(n.outputGap))
 +metric('Potential growth',pct(n.potentialGrowth||0))
 +metric('Nominal output · index-based',money(nominal))
 +metric('Price level · 2026 = 100',n.priceLevel.toFixed(1))
 +metric('Current account',pct(n.currentAccount)+' of GDP',n.currentAccount<-6?'negative':'')
 +metric('Sovereign fund',money(n.fund))
 +metric('Land & property tax',b.econRevenue.land.toFixed(2)+'% GDP')
 +metric('Pensions & family policy',(b.econSpending.pension+b.econSpending.domestic).toFixed(2)+'% GDP')
 +'<button class="full" data-action="monetaryView">Open central bank →</button>'
 +'<button class="full" data-action="growthView">Open growth accounts →</button>'
 +'<button class="full" data-action="monetaryControls">Adjust monetary policy →</button>'
 +'<button class="full" data-action="domesticControls">Adjust domestic policy →</button></div>'
 +v4EconomyPanelEcon(n);};
const v4PoliciesPanelEcon=policiesPanel;
policiesPanel=function(n){
 if(subview==='monetaryControls'){if(!draft)draft={...n.targets};
  return '<h3>Monetary policy</h3><p>The central bank follows its own rule in proportion to its independence. Raising independence gives up direct control in exchange for anchored expectations.</p>'
  +POLICY.filter(x=>['rate','inflationTarget','cbIndependence','reserveRequirement','assetPurchases','macroprudential','capitalControls'].includes(x.key)).map(x=>policyControl(x,n)).join('')+reformFooter(n);}
 if(subview==='domesticControls'){if(!draft)draft={...n.targets};
  return '<h3>Domestic policy</h3><p>Pensions, families, skills, regions and administration. Most of these change the supply side slowly rather than the next month’s output.</p>'
  +POLICY.filter(x=>['pensionAge','familyBenefit','vocational','activeLabor','regionalFunds','digitalGov','landTax','sovereignFund','minimumWage','immigration'].includes(x.key)).map(x=>policyControl(x,n)).join('')+reformFooter(n);}
 return v4PoliciesPanelEcon(n);};
Object.assign(actions,{
 monetaryView:()=>setView('monetary'),growthView:()=>setView('growth'),
 monetaryControls:()=>{view='policies';subview='monetaryControls';draft={...current().targets};renderHead();renderPanel();},
 domesticControls:()=>{view='policies';subview='domesticControls';draft={...current().targets};renderHead();renderPanel();}});
const v4BindEcon=bindPanel;
bindPanel=function(){v4BindEcon();
 if($('fxRegime'))$('fxRegime').onchange=e=>{const n=player();if(current().id!==n.id)return;n.fxRegime=FX_REGIMES[e.target.value]?e.target.value:'float';
  addEvent('Exchange-rate regime changed',n.name+' moves to a '+FX_REGIMES[n.fxRegime].toLowerCase()+'.','model');toast('Regime set: '+FX_REGIMES[n.fxRegime]+'.');renderPanel();};};

// ---------- lifecycle ----------
const v4PrepareEcon=prepareV4Month;
prepareV4Month=function(){v4PrepareEcon();refreshWorld();};
const v4TickNationEcon=tickV4Nation;
tickV4Nation=function(n){
 v4TickNationEcon(n);
 unemploymentV5(n);
 const p=n.policies;
 n.capacity=clamp(n.capacity+(p.digitalGov-n.capacity)*.0004,0,100);
 n.inequality=clamp(n.inequality-p.regionalFunds*.02-p.familyBenefit*.03-p.landTax*.015,5,80);
 n.approval=clamp(n.approval-Math.max(0,p.pensionAge-65)*.05-Math.max(0,n.inflation-p.inflationTarget-2)*.06,5,95);
 n.human=clamp(n.human+p.vocational*.0006,0,100);
};
const v4NewGameEcon=newGame;
newGame=function(){v4NewGameEcon();for(const n of S.nations)upgradeNationEconV5(n);refreshWorld();
 addEvent('Central banks and national accounts','Policy rates, inflation targets and credibility are now modelled separately from the treasury. Output follows capital, labour and productivity.','model');};
const v4MigrateEcon=migrateSave;
migrateSave=function(s){s=v4MigrateEcon(s);if(s?.version!==5)return s;for(const n of s.nations)upgradeNationEconV5(n);return s;};
const v4ValidSaveEcon=validSave;
validSave=function(s){v4ValidSaveEcon(s);
 for(const n of s.nations){
  for(const k of ['pop','gdp','capitalStock','tfp','potentialGdp','outputGap','participation','nairu','priceLevel','reer','fund','fertility','investShare'])
   if(!Number.isFinite(n[k])||Math.abs(n[k])>1e14)throw Error('Invalid macroeconomic data.');
  if(!n.mon||!Number.isFinite(n.mon.rate)||!Number.isFinite(n.mon.credibility)||!Number.isFinite(n.mon.expected))throw Error('Invalid monetary data.');
  if(!FX_REGIMES[n.fxRegime])throw Error('Invalid exchange-rate regime.');
  if(n.capitalStock<=0||n.tfp<=0||n.potentialGdp<=0)throw Error('Invalid production data.');}
 return s;};
function cityDefaultsV5(n){return cityTemplate(n);}
ICONS.monetary='<path d="M12 3v18M8 7h6a3 3 0 010 6H8m0 0h7"/>';
ICONS.growth='<path d="M3 20h18M6 16l4-5 3 3 5-7"/><circle cx="18" cy="7" r="1.4"/>';
const v4GuideEcon=showGuide;
showGuide=function(){v4GuideEcon();
 const box=$('modalContent');if(!box)return;
 box.insertAdjacentHTML('beforeend','<div class="block"><h3>V5 macroeconomics</h3>'
 +'<p><b>Growth:</b> output is produced from a capital stock, an employed labour force and total factor productivity, combined as Y = A · K<sup>0.33</sup> · L<sup>0.67</sup>. Investment builds capital net of depreciation. Productivity grows with research, competition, openness and administrative quality, and catches up toward the frontier only where institutions, schooling and trade support it. Demand shifts output around that supply path through the output gap; it does not raise potential.</p>'
 +'<p><b>Central bank:</b> the bank has an inflation target, a reaction function of the Taylor type, a modelled neutral rate, a balance sheet and a credibility score. The effective policy rate is a weighted blend of your instruction and the bank’s rule, using independence as the weight; a managed float or peg pulls it toward the world rate. Expectations move toward the target in proportion to credibility, and inflation follows an expectations-augmented Phillips curve with an output-gap term, tariff and import-price pass-through, and shock effects. Reserve requirements, macroprudential buffers and asset purchases move the lending spread, not the budget.</p>'
 +'<p><b>Labour and people:</b> unemployment follows Okun’s law around a structural floor set by labour rules, minimum wages, training, placement programs, inequality and crime. Participation responds to the pension age, childcare and training. Population changes through modelled fertility, ageing and migration rather than one global rate.</p>'
 +'<p><b>New statistics:</b> potential output, output gap, growth accounting, NAIRU, participation, capital/output ratio, productivity index, price level, an index-based nominal output figure, the real exchange rate, the current account and a sovereign fund.</p>'
 +'<p>These are deliberately simple textbook relationships used as gameplay rules. Coefficients are chosen for playability, they are not estimated from data, and no figure here should be read as a forecast or as a statistic about any real country. Concepts follow standard references: '
 +'<a target="_blank" rel="noopener noreferrer" href="https://www.federalreserve.gov/monetarypolicy/monetary-policy-what-are-its-goals-how-does-it-work.htm">Federal Reserve: goals and transmission of monetary policy</a>; '
 +'<a target="_blank" rel="noopener noreferrer" href="https://www.ecb.europa.eu/mopo/strategy/pricestab/html/index.en.html">ECB: price stability and the inflation target</a>; '
 +'<a target="_blank" rel="noopener noreferrer" href="https://www.imf.org/en/Publications/fandd/issues/Series/Back-to-Basics/Okuns-Law">IMF: Okun’s law</a>; '
 +'<a target="_blank" rel="noopener noreferrer" href="https://www.oecd.org/en/data/indicators/gdp-long-term-forecast.html">OECD: potential output and long-term projections</a>; '
 +'<a target="_blank" rel="noopener noreferrer" href="https://www.bis.org/publ/qtrpdf/r_qt1809f.htm">BIS: macroprudential frameworks</a>.</p></div>');};
