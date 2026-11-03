const E=require('../../src/game/55-communications');
const act=(s,type,command)=>E.dispatch(s,{type,command}),tick=(s,minutes=1)=>E.dispatch(s,{type:'advance',minutes});
function siteFixture(){
 let s=E.create();
 for(const [id,kind,config] of [['alexdesk','endpoint',{identity:'alex',extension:'101',number:'+61255500101'}],['admin-a','infrastructure',{}],['admin-b','infrastructure',{}],['backup-a','archive',{}],['backup-b','archive',{}],['restore-a','infrastructure',{}],['restore-b','infrastructure',{}]])s=E.dispatch(s,{type:'add',id,kind,config});
 s=E.dispatch(s,{type:'configure',id:'phone',config:{routes:[{prefix:'+61255500101',target:'alexdesk'},{prefix:'+61255500201',target:'desk'}]}});
 s=act(s,'operations',{action:'start'});
 s=act(s,'transport',{action:'start'});
 for(const id of ['office-a','office-b','ingress'])s=act(s,'transport',{action:'site',id,config:{name:id,region:'AU',domain:id+'-failure',powerDomain:id+'-power',backupPowerDomain:null}});
 for(const [id,from,to,domain,latencyMs] of [['between','office-a','office-b','shared-trench',1],['carrier-a','ingress','office-a','shared-trench',2],['carrier-b','ingress','office-b','shared-trench',2],['alternate-a','ingress','office-a','alternate-a-domain',10],['alternate-b','ingress','office-b','alternate-b-domain',10]])s=act(s,'transport',{action:'link',id,config:{from,to,domain,latencyMs,mode:'owned',capacityMbps:10,leadMinutes:1,setupCents:100,periodCents:0,contract:null}});
 for(const [resource,site] of [['identity','office-a'],['alexdesk','office-a'],['desk','office-b'],['carrier','ingress'],['service','office-b']])s=act(s,'transport',{action:'bind',resource,site});
 s=tick(s);s=act(s,'site-operations',{action:'start'});
 for(const suffix of ['a','b'])s=act(s,'site-operations',{action:'site',id:'site-'+suffix,config:{name:'Office '+suffix,region:'AU',transportSite:'office-'+suffix,ownership:'customer',owner:'customer',powerDomain:'office-'+suffix+'-power',failureDomain:'office-'+suffix+'-failure',sharedDomains:['shared-trench'],adminResource:'admin-'+suffix,endpointResources:[suffix==='a'?'alexdesk':'desk'],backupResource:'backup-'+suffix,restoreResource:'restore-'+suffix}});
 s=tick(s);for(const [resource,site] of [['alexdesk','site-a'],['desk','site-b']])s=act(s,'site-operations',{action:'bind',resource,site});return s;
}
function exercise(s,kind='power',targetSite='site-a',id='exercise-one'){
 s=act(s,'site-operations',{action:'exercise',id,kind,sites:['site-a','site-b'],targetSite});s=tick(s,2);
 s=act(s,'site-operations',{action:'recover',kind:'exercise',id});s=act(s,'site-operations',{action:'restore',kind:'exercise',id});return tick(s,2);
}
module.exports={E,act,tick,siteFixture,exercise};
