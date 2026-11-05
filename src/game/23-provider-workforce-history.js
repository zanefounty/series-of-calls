"use strict";
// Historical team arithmetic only. The dispatcher owns successful resize events,
// authoritative clocks, and any retained evidence used to cross-check this journal.
function socProviderWorkforceHistoryKernel(){
 const VERSION=1,MAX_RESIZES=2048,HOURLY_CENTS=10000;
 const copy=x=>JSON.parse(JSON.stringify(x)),fail=code=>{throw new Error('INVALID_PROVIDER_WORKFORCE_HISTORY:'+code);};
 const integer=x=>Number.isSafeInteger(x)&&x>=0;
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(',');
 const team=x=>exact(x,['engineers','support'])&&integer(x.engineers)&&integer(x.support)&&x.engineers<=20&&x.support<=20;
 const equal=(a,b)=>a.engineers===b.engineers&&a.support===b.support;
 const initial=()=>({engineers:2,support:1});
 const total=x=>x.engineers+x.support;
 function shape(h){
  if(!exact(h,['version','startedAt','checkpoint','resizes'])||h.version!==VERSION||!integer(h.startedAt)||!exact(h.checkpoint,['at','team','personMinutes','sequence'])||!integer(h.checkpoint.at)||h.checkpoint.at<h.startedAt||!team(h.checkpoint.team)||!integer(h.checkpoint.personMinutes)||!integer(h.checkpoint.sequence)||!Array.isArray(h.resizes)||h.resizes.length>MAX_RESIZES)fail('SHAPE');
  const c=h.checkpoint,elapsed=c.at-h.startedAt;
  if(!Number.isSafeInteger(elapsed*40)||c.personMinutes>elapsed*40)fail('CHECKPOINT_MINUTES');
  if(c.sequence===0&&(!equal(c.team,initial())||c.personMinutes!==elapsed*3)||c.at===h.startedAt&&(c.sequence!==0||!equal(c.team,initial())||c.personMinutes!==0))fail('INITIAL_ANCHOR');
  let previous=c.team,at=c.at,sequence=c.sequence;
  for(const row of h.resizes){
   if(!exact(row,['sequence','at','from','to'])||!integer(row.sequence)||row.sequence!==sequence+1||!integer(row.at)||row.at<at||!team(row.from)||!team(row.to)||!equal(row.from,previous))fail('RESIZE_CHAIN');
   previous=row.to;at=row.at;sequence=row.sequence;
  }
  return true;
 }
 function create(startedAt=0){if(!integer(startedAt))fail('START');return {version:VERSION,startedAt,checkpoint:{at:startedAt,team:initial(),personMinutes:0,sequence:0},resizes:[]};}
 function at(history,clock,options={}){
  shape(history);if(!integer(clock)||clock<history.checkpoint.at)fail('HISTORY_NOT_RETAINED');
  if(!exact(options,[])&&!exact(options,['mode']))fail('READ_OPTIONS');const mode=options.mode??'sample';if(!['sample','current'].includes(mode))fail('READ_MODE');
  let current=copy(history.checkpoint.team),time=history.checkpoint.at,personMinutes=history.checkpoint.personMinutes;
  for(const row of history.resizes){if(row.at>clock||mode==='sample'&&row.at===clock)break;personMinutes+=(row.at-time)*total(current);time=row.at;current=copy(row.to);}
  personMinutes+=(clock-time)*total(current);if(!integer(personMinutes))fail('MINUTES_OVERFLOW');
  return {...current,personMinutes};
 }
 function resize(history,request){
  shape(history);if(!exact(request,['at','engineers','support'])||!integer(request.at)||!team({engineers:request.engineers,support:request.support}))fail('RESIZE_REQUEST');
  const last=history.resizes.at(-1),earliest=last?.at??history.checkpoint.at;if(request.at<earliest)fail('RESIZE_ORDER');if(history.resizes.length>=MAX_RESIZES)fail('CAPACITY');
  const next=copy(history),from=last?.to??history.checkpoint.team;next.resizes.push({sequence:(last?.sequence??history.checkpoint.sequence)+1,at:request.at,from:copy(from),to:{engineers:request.engineers,support:request.support}});shape(next);return next;
 }
 function prune(history,oldestRetainedSampleAt){
  shape(history);if(!integer(oldestRetainedSampleAt)||oldestRetainedSampleAt<history.checkpoint.at)fail('PRUNE_TIME');
  const cutoff=Math.max(history.checkpoint.at,history.startedAt,oldestRetainedSampleAt-1),snapshot=at(history,cutoff),consumed=history.resizes.filter(row=>row.at<cutoff);
  const next={version:VERSION,startedAt:history.startedAt,checkpoint:{at:cutoff,team:{engineers:snapshot.engineers,support:snapshot.support},personMinutes:snapshot.personMinutes,sequence:consumed.at(-1)?.sequence??history.checkpoint.sequence},resizes:copy(history.resizes.filter(row=>row.at>=cutoff))};shape(next);return next;
 }
 // Payroll is the existing {personMinutes,billedMinutes,costCents} accumulator.
 // workforce may be the full business workforce; only these canonical fields apply.
 // Root must additionally reconcile billed minutes/cost with actual payroll postings.
 function validate(history,context){
  shape(history);if(!context||typeof context!=='object'||Array.isArray(context)||Object.keys(context).some(k=>!['clock','workforce','payroll','oldestSampleAt'].includes(k))||!integer(context.clock)||!context.workforce||!team({engineers:context.workforce.engineers,support:context.workforce.support})||!exact(context.payroll,['personMinutes','billedMinutes','costCents']))fail('CONTEXT');
  if(history.resizes.some(row=>row.at>context.clock)||history.checkpoint.at>context.clock)fail('FUTURE');
  if(context.oldestSampleAt!==undefined&&(!integer(context.oldestSampleAt)||context.oldestSampleAt<history.checkpoint.at||context.oldestSampleAt>context.clock))fail('SAMPLE_RANGE');
  const current=at(history,context.clock,{mode:'current'}),p=context.payroll;
  if(!equal(current,context.workforce))fail('CURRENT_TEAM');
  if(!integer(p.personMinutes)||!integer(p.billedMinutes)||!integer(p.costCents)||p.personMinutes!==current.personMinutes||p.billedMinutes>p.personMinutes||!Number.isSafeInteger(p.billedMinutes*HOURLY_CENTS)||p.costCents!==Math.floor(p.billedMinutes*HOURLY_CENTS/60))fail('PAYROLL');
  return true;
 }
 return {VERSION,MAX_RESIZES,HOURLY_CENTS,create,resize,at,validate,prune,source:()=>`const SOC_PROVIDER_WORKFORCE_HISTORY=(${socProviderWorkforceHistoryKernel.toString()})();`};
}
const SOC_PROVIDER_WORKFORCE_HISTORY=socProviderWorkforceHistoryKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_WORKFORCE_HISTORY;
