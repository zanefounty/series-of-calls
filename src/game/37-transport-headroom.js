/*
 * Bounded, pure transport capacity advice. This is an independent adaptation
 * inspired by the PNI/IX standing-order work in
 * https://github.com/thesysadmindev/seriesoftubes/commit/62c242c9a73913675c22b30356684d9041e796d9
 * It does not copy upstream code or place orders; dispatch remains explicit.
 */
function socTransportHeadroomKernel(){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,47}$/.test(x);
 const result=(status,reason,link,loadKbps,currentCapacityMbps,targetCapacityMbps,config=null)=>({status,reason,link,loadKbps,currentCapacityMbps,targetCapacityMbps,config});
 function contractReady(root,config,key){
  if(config.contract===null)return true;
  const p=root.transport,b=root.business?.contracts?.find(x=>x.id===config.contract);
  if(!b||b.offer!=='access'||b.unit!=='Mbps'||b.status!=='active'||!Number.isSafeInteger(b.quantity)||!Array.isArray(b.reasons)||b.reasons.length)return false;
  const other=Object.entries(p.links).filter(([k,n])=>k!==key&&n?.desired?.contract===config.contract).reduce((sum,[,n])=>sum+n.desired.capacityMbps,0);
  return Number.isSafeInteger(other)&&b.quantity>=config.capacityMbps+other;
 }
 function siteReady(root,key){
  const p=root.transport,n=p.sites[key],c=n?.effective;
  if(!c||n.provisioning?.status!=='ready'||n.observed?.available!==true||p.domains?.[c.domain])return false;
  const primary=!c.powerDomain||!p.domains?.[c.powerDomain];
  const backup=!!c.backupPowerDomain&&n.observed.backupPower===true&&!p.domains?.[c.backupPowerDomain];
  return (primary&&n.observed.power===true)||backup;
 }
 function blocked(reason,link=null,load=0,current=null){return result('blocked',reason,link,load,current,null,null);}
 function recommend(root,options){
  const link=options&&id(options.link)?options.link:null;
  if(!root||!root.transport||!link)return blocked('invalid-input',link);
  const p=root.transport,n=p.links?.[link];
  if(!n)return blocked('link-missing',link);
  const current=n.effective?.capacityMbps??n.desired?.capacityMbps??null;
  if(!n.effective||!n.desired)return blocked('link-not-effective',link,0,current);
  if(!int(n.effective.capacityMbps,1,100000)||!int(n.desired.capacityMbps,1,100000))return blocked('invalid-transport-state',link,0,current);
  let loadKbps=0;
  if(!Array.isArray(p.reservations))return blocked('invalid-transport-state',link,0,current);
  for(const r of p.reservations){
   if(!r||!Array.isArray(r.edges)||!int(r.kbps,1,100000000))return blocked('invalid-transport-state',link,0,current);
   if(r.edges.includes(link)){loadKbps+=r.kbps;if(!Number.isSafeInteger(loadKbps))return blocked('invalid-transport-state',link,0,current);}
  }
  if(n.provisioning?.status==='pending')return blocked('provisioning-pending',link,loadKbps,current);
  if(n.provisioning?.status==='failed')return blocked('provisioning-failed',link,loadKbps,current);
  if(n.provisioning?.status!=='ready')return blocked('link-not-effective',link,loadKbps,current);
  if(p.leaseRevocations!==undefined&&!Array.isArray(p.leaseRevocations))return blocked('invalid-transport-state',link,loadKbps,current);
  if((p.leaseRevocations||[]).some(r=>r?.link===link&&r.status==='active'))return blocked('active-lease-incident',link,loadKbps,current);
  if(n.observed?.available!==true||n.observed?.power!==true||p.domains?.[n.effective.domain]||!siteReady(root,n.effective.from)||!siteReady(root,n.effective.to))return blocked('transport-unavailable',link,loadKbps,current);
  if(!contractReady(root,n.effective,link))return blocked('contract-capacity-unavailable',link,loadKbps,current);
  const {triggerBps,targetBps,maxCapacityMbps}=options||{};
  if(!int(triggerBps,1,10000)||!int(targetBps,1,9999)||targetBps>=triggerBps||!int(maxCapacityMbps,current,100000))return blocked('invalid-limits',link,loadKbps,current);
  if(loadKbps*10000<current*1000*triggerBps)return result('idle','below-trigger',link,loadKbps,current,current,null);
  const targetCapacityMbps=Math.ceil(loadKbps*10000/(targetBps*1000));
  if(!Number.isSafeInteger(targetCapacityMbps))return blocked('invalid-load',link,loadKbps,current);
  if(targetCapacityMbps<=current)return result('idle','capacity-sufficient',link,loadKbps,current,current,null);
  if(targetCapacityMbps>maxCapacityMbps)return blocked('maximum-capacity-exceeded',link,loadKbps,current);
  if(n.effective.contract!==null){
   const b=root.business?.contracts?.find(x=>x.id===n.effective.contract);
   const other=Object.entries(p.links).filter(([k,x])=>k!==link&&x?.desired?.contract===n.effective.contract).reduce((sum,[,x])=>sum+x.desired.capacityMbps,0);
   if(!b||!Number.isSafeInteger(b.quantity)||!Number.isSafeInteger(other)||b.quantity<targetCapacityMbps+other)return blocked('contract-headroom-unavailable',link,loadKbps,current);
  }
  const config=copy(n.desired);config.capacityMbps=targetCapacityMbps;
  return result('upgrade','headroom-required',link,loadKbps,current,targetCapacityMbps,config);
 }
 return {recommend,source:()=>`const SOC_TRANSPORT_HEADROOM=(${socTransportHeadroomKernel.toString()})();`};
}
const SOC_TRANSPORT_HEADROOM=socTransportHeadroomKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_TRANSPORT_HEADROOM;
