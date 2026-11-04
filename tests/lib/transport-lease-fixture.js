const SOC=require('../../src/game/55-communications');
function fixture({alternate=false,jurisdiction='AU'}={}){
 const options={scenario:'enterprise',jurisdiction},commands=[];let state=SOC.create(options);
 const apply=c=>{commands.push(c);state=SOC.dispatch(state,c);return state;};
 for(const c of SOC.reference(state))apply(c);
 apply({type:'transport',command:{action:'start'}});
 for(const id of ['origin','destination'])apply({type:'transport',command:{action:'site',id,config:{name:id,region:jurisdiction,domain:id+'-site'}}});
 const config={from:'origin',to:'destination',mode:'purchased',capacityMbps:10,latencyMs:10,domain:'primary-trench',leadMinutes:1,setupCents:100,periodCents:30,contract:null};
 apply({type:'transport',command:{action:'link',id:'leased-path',config}});
 if(alternate)apply({type:'transport',command:{action:'link',id:'owned-path',config:{...config,mode:'owned',latencyMs:20,domain:'independent-trench'}}});
 for(const [resource,site] of [['identity','origin'],['service','destination'],['desk','destination'],['room','destination']])apply({type:'transport',command:{action:'bind',resource,site}});
 apply({type:'advance',minutes:1});
 return {options,commands,state};
}
const revoke={type:'transport',command:{action:'lease-revoke',link:'leased-path',durationMinutes:7}};
const call=(caseId='lease-test')=>({type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId,language:'en'});
function saturated(){
 const f=fixture();let state=f.state;const commands=[...f.commands],apply=c=>{commands.push(c);state=SOC.dispatch(state,c);};
 apply({type:'configure',id:'carrier',config:{capacity:10}});
 apply({type:'configure',id:'people',config:{people:10,entitlements:10,handlingMinutes:30,wrapMinutes:0}});
 apply({type:'configure',id:'service',config:{capacity:10,maxWait:60}});
 apply({type:'transport',command:{action:'link',id:'leased-path',config:{...state.transport.links['leased-path'].desired,capacityMbps:1,leadMinutes:3}}});
 apply({type:'advance',minutes:3});for(let n=0;n<6;n++)apply(call('headroom-'+n));
 return {options:f.options,commands,state};
}
const upgrade={type:'transport',command:{action:'headroom-upgrade',link:'leased-path',triggerBps:8000,targetBps:5000,maxCapacityMbps:10}};
module.exports={fixture,saturated,revoke,call,upgrade};
