#!/usr/bin/env node
/* Synthetic local MCP. No sockets, vendor requests or tenant credentials. */
'use strict';
const readline=require('node:readline');
const E=require('../src/game/55-communications');
const {version}=require('../package.json');
const PROTOCOL_VERSIONS=['2025-11-25','2025-06-18','2025-03-26','2024-11-05'];
let state=E.create();

const objectSchema=(properties={},required=[])=>({type:'object',properties,required,additionalProperties:false});
const stringSchema=(description,values)=>({type:'string',description,...(values?{enum:values}:{})});
const tools=[
 {name:'new_exercise',description:'Start a synthetic foundation exercise.',inputSchema:objectSchema({scenario:stringSchema('Fictional training scenario.',Object.keys(E.scenarios)),jurisdiction:stringSchema('Fictional jurisdiction profile.',E.jurisdictions),mode:stringSchema('Training mode.',['guided','assessed','sandbox'])})},
 {name:'inspect',description:'Read state, observations and catalogue without advancing time.',inputSchema:objectSchema()},
 {name:'command',description:'Execute the same validated command as the browser console.',inputSchema:objectSchema({command:{type:'object',description:'A validated SOC root command; pack commands use a nested command object.'}},['command'])},
 {name:'export_exercise',description:'Return a copy of the reproducible synthetic save state.',inputSchema:objectSchema()},
 {name:'import_exercise',description:'Validate and load a communications exercise; reject unrelated saves.',inputSchema:objectSchema({json:{type:'string',description:'Serialized SOC root state.',maxLength:8000000}},['json'])}
];
const toolByName=new Map(tools.map(t=>[t.name,t]));
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const clone=x=>JSON.parse(JSON.stringify(x));
const validMeta=x=>isObject(x);
const rpcError=(id,code,message)=>({jsonrpc:'2.0',id,error:{code,message}});
const rpcResult=(id,result)=>({jsonrpc:'2.0',id,result});
const errorId=message=>isObject(message)&&own(message,'id')&&(message.id===null||typeof message.id==='string'||typeof message.id==='number'&&Number.isFinite(message.id))?message.id:null;
const toolFailure=message=>({isError:true,content:[{type:'text',text:String(message)}]});
const toolSuccess=value=>({content:[{type:'text',text:JSON.stringify(value)}]});

function validateToolArgs(name,args){
 if(!isObject(args))throw new Error('Tool arguments must be an object.');
 const keys=Object.keys(args);
 const only=allowed=>{if(keys.some(k=>!allowed.includes(k)))throw new Error('Unexpected tool argument.');};
 if(name==='new_exercise'){
  only(['scenario','jurisdiction','mode']);
  if(args.scenario!==undefined&&(typeof args.scenario!=='string'||!Object.hasOwn(E.scenarios,args.scenario)))throw new Error('INVALID_EXERCISE');
  if(args.jurisdiction!==undefined&&!E.jurisdictions.includes(args.jurisdiction))throw new Error('INVALID_EXERCISE');
  if(args.mode!==undefined&&!['guided','assessed','sandbox'].includes(args.mode))throw new Error('INVALID_EXERCISE');
 }else if(name==='inspect'||name==='export_exercise')only([]);
 else if(name==='command'){
  only(['command']);
  if(!isObject(args.command))throw new Error('A SOC command object is required.');
 }else if(name==='import_exercise'){
  only(['json']);
  if(typeof args.json!=='string'||args.json.length>8000000)throw new Error('Serialized exercise must be a string no longer than 8 MB.');
 }
}

function inspect(){
 return {state:clone(state),observed:E.calculate(state),catalogue:E.catalogue,packs:{
  speechModels:{version:E.speechModels.PACK,sourceId:E.speechModels.SOURCE},
  productEvidence:{version:E.productEvidence.PACK,evidenceTypes:E.productEvidence.evidenceTypes},
  managedOperations:{version:E.managedOperations.PACK,operations:E.managedOperations.OPERATIONS,unit:E.managedOperations.UNIT},
  mediaNegotiation:{version:E.mediaNegotiation.PACK,codecs:E.mediaNegotiation.CODECS},
  siteOperations:{version:E.siteOperations.PACK,goals:E.siteOperations.GOALS},
  callingAchievements:{version:E.callingAchievements.PACK,goals:E.callingAchievements.goalIds},
  capabilityProgression:{version:E.capabilityProgression.PACK,levels:E.capabilityProgression.levelIds,goals:E.capabilityProgression.goalIds},
  sharedServices:{version:E.sharedServices.PACK,configuration:E.sharedServices.defaults},
  marketQualification:{version:E.marketQualification.PACK,thresholds:E.marketQualification.thresholds},
  specialistLifecycle:{version:E.specialistLifecycle.PACK,asOfDate:E.specialistLifecycle.AS_OF_DATE},
  business:{version:E.business.PACK,offers:E.business.offers,tracks:E.business.tracks},
  operations:{version:E.operations.PACK,schemas:E.operations.schemas,features:E.operations.features},
  information:{version:E.information.PACK,schemas:E.information.schemas,steps:E.information.steps,interfacePolicies:E.information.interfacePolicies},
  contact:{version:E.contact.PACK,configuration:E.contact.defaults},
  calling:{version:E.calling.PACK,configuration:E.calling.defaults},
  customerNeeds:{version:E.customerNeeds.PACK,segments:E.customerNeeds.sourceRows},
  workforce:{version:E.workforce.PACK,presenceStates:E.workforce.presenceStates},workforceOffers:{version:E.workforceOffers.PACK,offer:E.workforceOffers.offer},estate:{version:E.estate.PACK},
  products:{version:E.products.PACK,families:E.products.families,units:E.products.units},
  channels:{version:E.channels.PACK,accounts:E.channels.channels,configuration:E.channels.defaults},
  outcomes:{version:E.outcomes.PACK,configuration:E.outcomes.defaults},
  transport:{version:E.transport.PACK,profiles:E.transport.profiles},
  boundaries:{version:E.boundaries.PACK,profiles:E.boundaries.profiles},
  progression:{version:E.progression.PACK,content:E.progression.CONTENT},
  issueExercises:{version:E.issueExercises.PACK,definitions:E.issueExercises.definitions},
  admissionSecurity:{version:E.admissionSecurity.PACK,defaults:E.admissionSecurity.defaults},
  serviceObservation:{version:E.serviceObservation.PACK,thresholds:E.serviceObservation.thresholds},
  portfolio:{version:E.portfolio.PACK,markets:E.portfolio.markets},
  campaign:{version:E.campaign.PACK,content:E.campaign.CONTENT,tracks:E.campaign.tracks}
 }};
}

function callTool(name,args){
 const tool=toolByName.get(name);
 if(!tool)throw new Error('Unknown tool: '+String(name));
 validateToolArgs(name,args);
 if(name==='new_exercise'){
  const next=E.create(args),observed=E.calculate(next);state=next;return observed;
 }
 if(name==='inspect')return inspect();
 if(name==='command'){
  const next=E.dispatch(state,args.command),observed=E.calculate(next);state=next;return {state:clone(state),observed};
 }
 if(name==='export_exercise')return clone(state);
 if(name==='import_exercise'){
  const next=E.restore(args.json),observed=E.calculate(next);state=next;return observed;
 }
 throw new Error('Tool has no implementation: '+name);
}

function handle(message){
 if(!isObject(message)||message.jsonrpc!=='2.0'||typeof message.method!=='string')return rpcError(errorId(message),-32600,'Invalid Request');
 if(Object.keys(message).some(k=>!['jsonrpc','id','method','params'].includes(k)))return rpcError(errorId(message),-32600,'Invalid Request: unexpected request field');
 const hasId=own(message,'id');
 if(hasId&&message.id!==null&&typeof message.id!=='string'&&!(typeof message.id==='number'&&Number.isFinite(message.id)))return rpcError(null,-32600,'Invalid Request: invalid id');
 if(hasId&&message.method.startsWith('notifications/'))return rpcError(message.id,-32600,'Notifications must not include an id');
 // MCP notifications carry no id and have no response. In particular, tool calls are never run as notifications.
 if(!hasId)return undefined;
 if(own(message,'params')&&!isObject(message.params))return rpcError(message.id,-32600,'Invalid Request: params must be an object');
 const params=message.params||{};
 if(message.method==='initialize'){
  const allowed=['protocolVersion','capabilities','clientInfo','_meta'];
  if(Object.keys(params).some(k=>!allowed.includes(k))||typeof params.protocolVersion!=='string'||params.capabilities!==undefined&&!isObject(params.capabilities)||params.clientInfo!==undefined&&!isObject(params.clientInfo)||params._meta!==undefined&&!validMeta(params._meta))return rpcError(message.id,-32602,'Invalid initialize parameters');
  return rpcResult(message.id,{protocolVersion:PROTOCOL_VERSIONS.includes(params.protocolVersion)?params.protocolVersion:PROTOCOL_VERSIONS[0],capabilities:{tools:{listChanged:false}},serverInfo:{name:E.APP,title:'Series of Calls communications training',version},instructions:'Synthetic communications training. Use new_exercise, inspect, and validated SOC commands. State remains in this process unless exported.'});
 }
 if(message.method==='ping'){
  if(Object.keys(params).some(k=>k!=='_meta')||params._meta!==undefined&&!validMeta(params._meta))return rpcError(message.id,-32602,'ping takes no parameters');
  return rpcResult(message.id,{});
 }
 if(message.method==='tools/list'){
  if(Object.keys(params).some(k=>k!=='_meta')||params._meta!==undefined&&!validMeta(params._meta))return rpcError(message.id,-32602,'Invalid tools/list parameters');
  return rpcResult(message.id,{tools:tools.map(({name,description,inputSchema})=>({name,description,inputSchema:clone(inputSchema)}))});
 }
 if(message.method==='tools/call'){
  if(Object.keys(params).some(k=>!['name','arguments','_meta'].includes(k))||typeof params.name!=='string'||params.arguments!==undefined&&!isObject(params.arguments)||params._meta!==undefined&&!validMeta(params._meta))return rpcError(message.id,-32602,'Invalid tools/call parameters');
  try{return rpcResult(message.id,toolSuccess(callTool(params.name,params.arguments??{})));}
  catch(error){return rpcResult(message.id,toolFailure(error?.message||error));}
 }
 if(message.method.startsWith('notifications/'))return undefined;
 return rpcError(message.id,-32601,'Method not found: '+message.method);
}

function handleLine(line){
 let message;try{message=JSON.parse(line);}catch{return rpcError(null,-32700,'Parse error');}
 return handle(message);
}

if(require.main===module){
 const rl=readline.createInterface({input:process.stdin});
 rl.on('line',line=>{if(!line.trim())return;const response=handleLine(line);if(response!==undefined)process.stdout.write(JSON.stringify(response)+'\n');});
}
module.exports={handle,handleLine,tools:tools.map(clone),PROTOCOL_VERSIONS:PROTOCOL_VERSIONS.slice()};
