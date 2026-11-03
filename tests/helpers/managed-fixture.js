const SOC=require('../../src/game/55-communications');

const defaultCustomers=[
 {id:'managed-sydney',tenant:'tenant-managed-sydney',name:'Managed Sydney',market:'au-sydney',scenario:'smb'},
 {id:'managed-melbourne',tenant:'tenant-managed-melbourne',name:'Managed Melbourne',market:'au-melbourne',scenario:'smb'}
];
const dispatch=(root,command)=>SOC.dispatch(root,command);
const child=(root,id)=>root.portfolio.customers.find(row=>row.id===id)?.root;
const dispatchChild=(root,id,command)=>dispatch(root,{type:'portfolio',command:{action:'dispatchcustomer',customerId:id,command}});
function setup(customers=defaultCustomers,mode='guided'){
 let root=dispatch(SOC.create({scenario:'smb',jurisdiction:'AU',mode}),{type:'portfolio',command:{action:'start'}});
 for(const customer of customers)root=dispatch(root,{type:'portfolio',command:{action:'addcustomer',...customer}});
 for(const customer of customers){
  root=dispatchChild(root,customer.id,{type:'business',command:{action:'start'}});
  root=dispatchChild(root,customer.id,{type:'estate',command:{action:'start'}});
  root=dispatchChild(root,customer.id,{type:'estate',command:{action:'discover',items:[{sourceKey:'directory-alex',kind:'user',observedId:`${customer.id}-alex`,confidence:1,conflicts:[],unknowns:[]}]}});
  root=dispatchChild(root,customer.id,{type:'estate',command:{action:'link',sourceKey:'directory-alex',canonicalId:'identity',resource:'identity'}});
  root=dispatchChild(root,customer.id,{type:'estate',command:{action:'connector',connector:{id:'orchard-sync',actions:['provision','deprovision'],resourceKinds:['user'],version:1,localDependency:false}}});
  root=dispatchChild(root,customer.id,{type:'estate',command:{action:'recover',connector:'orchard-sync',authenticated:true,delegated:true,reachable:true}});
  root=dispatchChild(root,customer.id,{type:'business',command:{action:'order',offer:'managed-operations',quantity:1,unit:'managed-operation',currency:'AUD',resources:['identity'],customer:'customer',supportOwner:'orchard-msp',price:0,sell:true}});
 }
 return dispatch(root,{type:'advance',minutes:2});
}
function participant(root,customerId,operation='joiner',options={}){
 const c=root.portfolio.customers.find(x=>x.id===customerId),contract=c.root.business.contracts.find(x=>x.offer==='managed-operations'&&x.status==='active');
 if(!contract)throw Error('MANAGED_FIXTURE_CONTRACT_NOT_ACTIVE');
 const resource=options.resource||'identity',config=structuredClone(c.root.resources[resource].desired);
 if(operation==='joiner'){if(!config.identities.includes('jules'))config.identities.push('jules');if(!config.entitled.includes('jules'))config.entitled.push('jules');}
 return {customerId,contractId:contract.id,connector:'orchard-sync',operation,items:[{resource,config}]};
}
function submit(root,participants,id='managed-integration-job'){return dispatch(root,{type:'managed-operations',command:{action:'submit',id,participants}});}
function advance(root,minutes=1){return dispatch(root,{type:'advance',minutes});}
module.exports={SOC,defaultCustomers,dispatch,child,dispatchChild,setup,participant,submit,advance};
