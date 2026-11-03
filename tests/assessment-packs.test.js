const test=require('node:test'),assert=require('node:assert/strict'),E=require('../src/game/55-communications');
test('completed handling and wrap do not invalidate their own assessment evidence',()=>{
 let s=E.dispatch(E.create(),{type:'configure',id:'people',config:{people:2}});
 s=E.dispatch(s,{type:'workforce',command:{action:'start'}});
 s=E.dispatch(s,{type:'advance',minutes:1});
 s=E.dispatch(s,{type:'interact',channel:'message',from:'alex',to:'service',caseId:'service-case'});
 s=E.dispatch(s,{type:'advance',minutes:5});
 assert.equal(s.interactions.at(-1).phase,'resolved');
 assert.equal(E.assess(s).passed,true,'transient agent assignment is not a configuration change');
 const roster=structuredClone(s.workforceOps.roster.desired);roster[0].languages=['ja'];
 s=E.dispatch(s,{type:'workforce',command:{action:'roster',people:roster}});
 assert.equal(E.assess(s).passed,false,'an actual changed configuration requires new evidence');
});
test('caller aliases keep canonical case identity and ambiguous cross-tenant aliases are rejected',()=>{
 let s=E.dispatch(E.create({scenario:'enterprise'}),{type:'calling',command:{action:'start'}});
 const identity=(canonical,tenant,aliases)=>({canonical,tenant,aliases,endpoint:'desk',number:'',known:true,site:'main',location:'Synthetic office',jurisdiction:'AU',emergencyEligible:false});
 s=E.dispatch(s,{type:'calling',command:{type:'configure',node:'directory',config:{tenants:[{id:'one',name:'One'},{id:'two',name:'Two'}],identities:[identity('alex','one',['111','201']),identity('bea','one',['222']),identity('casey','two',['201'])],federation:[],publicReach:[]}}});
 s=E.dispatch(s,{type:'calling',command:{type:'configure',node:'media',config:{...E.calling.defaults.media,encryptionRequired:false}}});
 s=E.dispatch(s,{type:'advance',minutes:1});
 for(const from of ['alex','111'])s=E.dispatch(s,{type:'interact',channel:'voice',from,to:'bea',caseId:'same-customer'});
 assert.equal(s.cases['same-customer'].identity,'alex');assert.equal(s.cases['same-customer'].tenant,'one');assert.equal(s.cases['same-customer'].interactions.length,2);
 assert.equal(s.interactions.at(-1).requestedFrom,'111');
 s=E.dispatch(s,{type:'interact',channel:'voice',from:'201',to:'bea',caseId:'ambiguous-customer'});
 assert.equal(s.interactions.at(-1).outcome,'AMBIGUOUS_CALLER');assert.equal(s.cases['ambiguous-customer'],undefined);
});
