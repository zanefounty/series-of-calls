const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

test('AC-SOC-902 later customers receive distinct reactions from delivered work and their own settlement',()=>{
 const noted=[],context={ACT:{},N_:x=>x,document:{addEventListener(){}},addEventListener(){},SOC:{provider:{rules:{missions:{smb:{presentation:{firstWork:'Rina saw the work.',firstFailure:'Rina saw a failure.',recovered:'Recovered.',firstBill:'Rina earned {net}; credit {credit}.'}}}}}},SOC_PROVIDER_UI:{noteEvents:rows=>noted.push(...rows)}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../src/game/98-provider-runtime.js'),'utf8'),context);
 const customer=(id,name,completed,history)=>({id,name,metrics:{completed,failed:0},history});
 const before={clock:59,providerCampaign:{scenario:'smb',customers:[customer('starter-customer','Orchard Repairs',0,[]),customer('next-1-customer','Harbour Health',0,[])],events:[],incidents:[]}};
 const after={clock:60,providerCampaign:{scenario:'smb',customers:[customer('starter-customer','Orchard Repairs',1,[{netRetail:15000,credit:3000}]),customer('next-1-customer','Harbour Health',1,[{netRetail:12000,credit:6000}])],jobs:[{id:'job-1',customerId:'starter-customer',status:'completed'},{id:'job-2',customerId:'next-1-customer',status:'completed'}],events:[{id:'provider-event-1',code:'PROVIDER_PERIOD_SETTLED',at:60}],incidents:[]}};
 vm.runInContext('providerPresentationEvents(before,after)',Object.assign(context,{before,after}));
 assert.equal(noted.length,4);
 assert.equal(noted.find(row=>row.customerId==='starter-customer'&&row.sourceId==='job-1').message,'Rina saw the work.');
 assert.match(noted.find(row=>row.customerId==='next-1-customer'&&row.sourceId==='job-2').message,/Harbour Health: The first customer request was delivered/);
 assert.equal(noted.find(row=>row.sourceId==='provider-event-1:next-1-customer').message,'Harbour Health: The first period earned A$120.00 after a A$60.00 service credit. The next period will show what is delivered.');
 assert.equal(noted.find(row=>row.sourceId==='provider-event-1').message,'Rina earned A$150.00; credit A$30.00.');
});
