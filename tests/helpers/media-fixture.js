const E=require('../../src/game/55-communications');const cmd=(s,command)=>E.dispatch(s,{type:'media-negotiation',command}),tick=(s,minutes=1)=>E.dispatch(s,{type:'advance',minutes});
function mediaFixture({target='service',sourceCodecs=['opus'],targetCodecs=['opus'],transcoder=false}={}){
 let s=E.create();s=E.dispatch(s,{type:'configure',id:'people',config:{people:2}});s=E.dispatch(s,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target}]}});s=E.dispatch(s,{type:'operations',command:{action:'start'}});s=tick(s);s=cmd(s,{action:'start'});
 for(const [id,resourceId,codecs,offerMode] of [['caller','phone',sourceCodecs,'delayed'],['recipient',target,targetCodecs,'early']]){s=cmd(s,{action:'endpoint',config:{id,resourceId,tenant:'orchard-repairs',codecs,offerMode}});s=cmd(s,{action:'observe',kind:'endpoint',id,available:true,signalling:true,mediaIn:true,mediaOut:true,fault:null});}
 s=cmd(s,{action:'carrier',config:{id:'carrier-profile',resourceId:'carrier',ingressCodecs:['opus','g711','g722','g729'],egressCodecs:['opus','g711','g722','g729']}});s=cmd(s,{action:'observe',kind:'carrier',id:'carrier-profile',available:true,signalling:true,mediaIn:true,mediaOut:true,fault:null});
 if(transcoder){s=cmd(s,{action:'transcoder',config:{id:'media-bridge',pairs:[{input:'opus',output:'g711'},{input:'g711',output:'opus'}],sessionCapacity:1}});s=cmd(s,{action:'observe',kind:'transcoder',id:'media-bridge',available:true,signalling:false,mediaIn:true,mediaOut:true,fault:null});}
 return tick(s);
}
const call=(s,caseId='media-case',inbound=false)=>E.dispatch(s,{type:'interact',channel:'voice',direction:inbound?'inbound':'outbound',from:inbound?'+12125550199':'alex',to:'+61255500201',caseId,media:{encrypted:true}});
module.exports={E,cmd,tick,mediaFixture,call};
