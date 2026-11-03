/* Optional guided exercises based on bounded historical operator reports.
 * Every step is a real SOC command; source-specific gaps stay explicit. */
function socIssueExercisesKernel(){
 'use strict';
 const PACK='soc-issue-exercises-1',VERSION=1,copy=x=>JSON.parse(JSON.stringify(x));
 const fail=x=>{throw new Error(x);},id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x);
 const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
 const definitions={
  'directional-media':{
   source:{id:'RES-CISCO-VOIP-002',url:'https://puck.nether.net/pipermail/cisco-voip/2014-April/035734.html',date:'2014-04-30',evidence:'customer-style report with troubleshooting suggestions; original resolution unconfirmed'},
   scope:'This exercise reproduces a generic directional-media failure supported by the runtime. It does not model blind transfer, a new transfer leg, SDP renegotiation, CUBE/Lync, or early-offer trunk profiles, so it is not a reproduction of the archived transfer-specific mechanism.',
   failureCase:'issue-media-failure',recoveryCase:'issue-media-recovery',
   steps:['provision-test-agents','apply-agent-capacity','disable-inbound-media','apply-media-change','test-one-way-media','restore-inbound-media','apply-media-recovery','test-bidirectional-media','complete-recovered-call']
  },
  'carrier-outage-recovery':{
   source:{id:'voiceops-2010-12-dash-outage',url:'https://puck.nether.net/pipermail/voiceops/2010-December/002106.html',date:'2010-12-15',evidence:'outage inquiry and customer recollection; scope, cause, duration and resolution are not established'},
   scope:'This exercise demonstrates only a synthetic carrier outage and a fresh successful call after clearing the fault. It does not reproduce the archived provider event, establish its cause or scope, or model incident communications and evidence confidence.',
   failureCase:'issue-outage-failure',recoveryCase:'issue-outage-recovery',
   steps:['provision-test-agents','apply-agent-capacity','inject-carrier-outage','test-signalling-failure','clear-carrier-outage','test-recovered-call','complete-recovered-call']
  }
 };
 const pending=[
  {id:'RES-CISCO-VOIP-001',reason:'hold/resume offer-answer profiles and endpoint-specific SDP behavior are not modeled.'},
  {id:'RES-CISCO-VOIP-003',reason:'BLF key sequences and firmware-gated transfer behavior are not modeled.'},
  {id:'RES-CISCO-VOIP-004',reason:'trunk ingress-node membership is not modeled.'},
  {id:'RES-CISCO-VOIP-008',reason:'room endpoint provisioning authority and SIP URI drift are not modeled.'},
  {id:'RES-CISCO-VOIP-011',reason:'row-level device import mapping and uniqueness-conflict retry are not modeled.'},
  {id:'voiceops-2010-08-peer-of-peer',reason:'independent codec offers and transcoder paths are not modeled.'},
  {id:'voiceops-2010-12-sbc-tcp-keepalive',reason:'transport pinhole expiry and reconnect timing are not modeled.'}
 ];
 function create(s){if(!s||!Number.isSafeInteger(s.clock)||s.clock<0)fail('INVALID_ISSUE_EXERCISE_STATE');return {pack:PACK,version:VERSION,active:null,steps:{},startedAt:s.clock};}
 function pack(s){if(!s?.issueExercises||s.issueExercises.pack!==PACK)fail('ISSUE_EXERCISES_NOT_STARTED');return s.issueExercises;}
 function traceHas(i,code,predicate=()=>true){return Array.isArray(i?.trace)&&i.trace.some(t=>t?.code===code&&predicate(t));}
 function getInteraction(root,caseId){return root?.interactions?.filter(i=>i.caseId===caseId).at(-1)||null;}
 function sequenceComplete(p,exercise){return (p.steps[exercise]||[]).length===definitions[exercise].steps.length;}
 function stepCommand(exercise,step){
  if(exercise==='directional-media'){
   const commands={
    'provision-test-agents':{type:'configure',id:'people',config:{people:4,entitlements:4}},
    'apply-agent-capacity':{type:'advance',minutes:1},
    'disable-inbound-media':{type:'configure',id:'carrier',config:{mediaIn:false}},
    'apply-media-change':{type:'advance',minutes:1},
    'test-one-way-media':{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'issue-media-failure'},
    'restore-inbound-media':{type:'configure',id:'carrier',config:{mediaIn:true}},
    'apply-media-recovery':{type:'advance',minutes:1},
    'test-bidirectional-media':{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'issue-media-recovery'},
    'complete-recovered-call':{type:'advance',minutes:5}
   };return commands[step]||null;
  }
  if(exercise==='carrier-outage-recovery'){
   const commands={
    'provision-test-agents':{type:'configure',id:'people',config:{people:4,entitlements:4}},
    'apply-agent-capacity':{type:'advance',minutes:1},
    'inject-carrier-outage':{type:'fault',id:'carrier',fault:'OUTAGE'},
    'test-signalling-failure':{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'issue-outage-failure'},
    'clear-carrier-outage':{type:'fault',id:'carrier',fault:null},
    'test-recovered-call':{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'issue-outage-recovery'},
    'complete-recovered-call':{type:'advance',minutes:5}
   };return commands[step]||null;
  }
  return null;
 }
 function command(s,c,hooks={}){
  const p=pack(s);if(!c||typeof c!=='object'||Array.isArray(c)||typeof c.action!=='string')fail('INVALID_ISSUE_EXERCISE_COMMAND');
  if(c.action==='cancel'){
   if(!exact(c,['action','exercise'])||!definitions[c.exercise]||p.active!==c.exercise)fail('INVALID_ISSUE_EXERCISE_COMMAND');
   p.active=null;return {action:c.action,exercise:c.exercise};
  }
  if(c.action==='select'||c.action==='restart'){
   if(!exact(c,['action','exercise'])||!definitions[c.exercise])fail('INVALID_ISSUE_EXERCISE_COMMAND');
   if(p.active&&p.active!==c.exercise&&!sequenceComplete(p,p.active))fail('ISSUE_EXERCISE_RUN_INCOMPLETE');
   if(c.action==='restart')p.steps[c.exercise]=[];
   p.active=c.exercise;return {action:c.action,exercise:c.exercise};
  }
  if(!exact(c,['action','exercise','step'])||c.action!=='step'||!definitions[c.exercise]||!id(c.step))fail('INVALID_ISSUE_EXERCISE_COMMAND');
  const switching=p.active!==c.exercise;
  if(switching&&p.active&&!sequenceComplete(p,p.active))fail('ISSUE_EXERCISE_RUN_INCOMPLETE');
  const expected=definitions[c.exercise].steps,progress=p.steps[c.exercise]||[];
  if(c.step!==expected[progress.length])fail('ISSUE_EXERCISE_STEP_ORDER');
  const rootCommand=stepCommand(c.exercise,c.step);if(!rootCommand)fail('ISSUE_EXERCISE_STEP_UNAVAILABLE');
  if(typeof hooks.dispatchRootCommand!=='function')fail('ISSUE_EXERCISE_DISPATCH_REQUIRED');
  const result=hooks.dispatchRootCommand(s,copy(rootCommand));
  if(!result||typeof result!=='object'||!Array.isArray(result.interactions)||!Number.isSafeInteger(result.clock)||!Number.isSafeInteger(s.revision)||!Number.isSafeInteger(result.revision)||result.revision<=s.revision||!Array.isArray(result.commands))fail('ISSUE_EXERCISE_PARENT_COMMAND_NOT_RECORDED');
  if(JSON.stringify(result.commands.at(-1)?.command)!==JSON.stringify(rootCommand))fail('ISSUE_EXERCISE_PARENT_COMMAND_MISMATCH');
  if(result!==s){for(const key of Object.keys(s))delete s[key];Object.assign(s,result);}
  const updated=pack(s);updated.active=c.exercise;updated.steps[c.exercise]=[...progress,c.step];
  return {step:c.step,exercise:c.exercise};
 }
 function referenceCommands(exercise){const d=definitions[exercise];if(!d)fail('ISSUE_EXERCISE_UNAVAILABLE');return d.steps.map(step=>({action:'step',exercise,step}));}
 function evaluate(s,exercise){
  const p=pack(s),d=definitions[exercise];if(!d)fail('ISSUE_EXERCISE_UNAVAILABLE');
  const failed=getInteraction(s,d.failureCase),recovered=getInteraction(s,d.recoveryCase),commands=p.steps[exercise]||[];
  let failureObserved=false,recoveryObserved=false;
  if(exercise==='directional-media'){
   failureObserved=failed?.outcome==='ONE_WAY_MEDIA'&&failed.media?.out===true&&failed.media?.in===false&&traceHas(failed,'MEDIA_PATHS',m=>m.out===true&&m.in===false);
   recoveryObserved=!!recovered&&recovered.id!==failed?.id&&recovered.phase==='resolved'&&recovered.outcome==='RESOLVED'&&(!recovered.obligations||recovered.obligations.length===0)&&recovered.media?.out===true&&recovered.media?.in===true&&traceHas(recovered,'MEDIA_PATHS',m=>m.out===true&&m.in===true)&&['carrier','phone'].every(id=>s.resources?.[id]?.fault===null&&s.resources?.[id]?.effective?.mediaOut===true&&s.resources?.[id]?.effective?.mediaIn===true);
  }else{
   failureObserved=failed?.outcome==='SIGNALLING_FAILED'&&traceHas(failed,'SIGNALLING_FAILED');
   recoveryObserved=!!recovered&&recovered.id!==failed?.id&&recovered.phase==='resolved'&&recovered.outcome==='RESOLVED'&&(!recovered.obligations||recovered.obligations.length===0)&&traceHas(recovered,'200_OK')&&recovered.media?.out===true&&recovered.media?.in===true&&traceHas(recovered,'MEDIA_PATHS',m=>m.out===true&&m.in===true)&&['carrier','phone'].every(id=>s.resources?.[id]?.fault===null&&s.resources?.[id]?.effective?.mediaOut===true&&s.resources?.[id]?.effective?.mediaIn===true);
  }
  const complete=commands.length===d.steps.length&&failed?.startedAt>=p.startedAt&&recovered?.startedAt>=p.startedAt;
  return {exercise,sourceId:d.source.id,complete,failureObserved,recoveryObserved,passed:complete&&failureObserved&&recoveryObserved,scope:d.scope,observed:{failureCase:failed?{id:failed.id,outcome:failed.outcome,media:failed.media||null}:null,recoveryCase:recovered?{id:recovered.id,outcome:recovered.outcome||null,phase:recovered.phase,media:recovered.media||null}:null}};
 }
 function inspect(s){const p=pack(s);return {pack:PACK,version:VERSION,active:p.active,nextStep:p.active?definitions[p.active].steps[(p.steps[p.active]||[]).length]||null:null,exercises:Object.keys(definitions).map(key=>({...evaluate(s,key),source:copy(definitions[key].source),steps:copy(p.steps[key]||[]),stepCount:definitions[key].steps.length})),pending:copy(pending)};}
 function validate(s){const p=pack(s);if(!exact(p,['active','pack','startedAt','steps','version'])||p.version!==VERSION||!Number.isSafeInteger(p.startedAt)||p.startedAt<0||p.startedAt>s.clock||p.active!==null&&!definitions[p.active]||!p.steps||typeof p.steps!=='object'||Array.isArray(p.steps))fail('INVALID_ISSUE_EXERCISE_SAVE');for(const [key,steps] of Object.entries(p.steps)){if(!definitions[key]||!Array.isArray(steps)||steps.length>definitions[key].steps.length||steps.some((v,i)=>v!==definitions[key].steps[i])||new Set(steps).size!==steps.length)fail('INVALID_ISSUE_EXERCISE_SAVE');}return true;}
 function fingerprint(s){const p=s?.issueExercises;if(!p)return null;return JSON.stringify([PACK,VERSION,p.active,p.steps]);}
 function source(){return `const SOC_ISSUE_EXERCISES=(${socIssueExercisesKernel.toString()})();`;}
 return {PACK,VERSION,definitions,pending,create,command,referenceCommands,evaluate,inspect,validate,fingerprint,source};
}
const SOC_ISSUE_EXERCISES=socIssueExercisesKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_ISSUE_EXERCISES;
