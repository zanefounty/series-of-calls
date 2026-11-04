const SOC=require('../../src/game/55-communications');
function journey({jurisdiction='AU'}={}){
 const options={scenario:'enterprise',jurisdiction},commands=[],rejectedAttempts=[];let s=SOC.create(options);
 const apply=c=>{s=SOC.dispatch(s,c);commands.push(c);return s;};
 const workforce=command=>apply({type:'workforce',command});
 apply({type:'business',command:{action:'start'}});
 apply({type:'configure',id:'people',config:{operator:'bpo'}});
 workforce({action:'start'});apply({type:'advance',minutes:1});
 const request={type:'workforce',command:{action:'coach',person:'agent-01',skill:'billing',minutes:2,costCents:125}};
 const before=JSON.stringify(s);let rejected=false;try{SOC.dispatch(s,request);}catch(e){if(e.message!=='WORKFORCE_DELEGATION_REQUIRED')throw e;rejected=true;}if(!rejected||JSON.stringify(s)!==before)throw Error('COACHING_FIXTURE_REJECTION');
 rejectedAttempts.push({afterCommandCount:commands.length,command:request,expectedError:'WORKFORCE_DELEGATION_REQUIRED'});
 workforce({action:'agreement',id:'scoped-coaching',resources:['workforce'],actions:['coach'],expires:s.clock+1});
 apply(request);apply({type:'advance',minutes:1});apply({type:'advance',minutes:1});
 return {options,commands,rejectedAttempts,expectedState:s};
}
module.exports={journey};
