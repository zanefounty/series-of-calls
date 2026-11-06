/* Series of Calls simulation kernel. All services and protocol events are synthetic.
   calculate() is pure; dispatch() is the sole state-changing command boundary. */
const SOC = (function socKernel() {
  'use strict';
  const APP='series-of-calls', PACK='soc-foundation-1', SCHEMA=1;
  const informationRecordStore=typeof SOC_INFORMATION_RECORD_STORE!=='undefined'?SOC_INFORMATION_RECORD_STORE:require('./23-information-record-store.js');
  const providerVariants=typeof SOC_PROVIDER_VARIANTS!=='undefined'?SOC_PROVIDER_VARIANTS:require('./23-provider-variants.js');
  const providerDemand=typeof SOC_PROVIDER_DEMAND!=='undefined'?SOC_PROVIDER_DEMAND:require('./22-provider-demand.js');
  const providerContinuity=typeof SOC_PROVIDER_CONTINUITY!=='undefined'?SOC_PROVIDER_CONTINUITY:require('./23-provider-continuity.js');
  const providerSecurity=typeof SOC_PROVIDER_SECURITY!=='undefined'?SOC_PROVIDER_SECURITY:require('./23-provider-security.js');
  const governmentArchitectures=typeof SOC_GOVERNMENT_ARCHITECTURES!=='undefined'?SOC_GOVERNMENT_ARCHITECTURES:require('./23-provider-government.js');
  const providerResponsibility=typeof SOC_PROVIDER_RESPONSIBILITY!=='undefined'?SOC_PROVIDER_RESPONSIBILITY:require('./23-provider-responsibility.js');
  const providerServiceRetirement=typeof SOC_PROVIDER_SERVICE_RETIREMENT!=='undefined'?SOC_PROVIDER_SERVICE_RETIREMENT:require('./23-provider-service-retirement.js');
  const providerOwnedSiteCustody=typeof SOC_PROVIDER_OWNED_SITE_CUSTODY!=='undefined'?SOC_PROVIDER_OWNED_SITE_CUSTODY:require('./23-provider-owned-site-custody.js');
  const providerOwnedSiteMission=typeof SOC_PROVIDER_OWNED_SITE_MISSION!=='undefined'?SOC_PROVIDER_OWNED_SITE_MISSION:require('./23-provider-owned-site-mission.js');
  const providerWorkforceHistory=typeof SOC_PROVIDER_WORKFORCE_HISTORY!=='undefined'?SOC_PROVIDER_WORKFORCE_HISTORY:require('./23-provider-workforce-history.js');
  const providerSupportHistory=typeof SOC_PROVIDER_SUPPORT_HISTORY!=='undefined'?SOC_PROVIDER_SUPPORT_HISTORY:require('./23-provider-support-history.js');
  const providerRegionalIntegrations=typeof SOC_PROVIDER_REGIONAL_INTEGRATIONS!=='undefined'?SOC_PROVIDER_REGIONAL_INTEGRATIONS:require('./23-provider-regional-integrations.js');
  const providerRegionalSupport=typeof SOC_PROVIDER_REGIONAL_SUPPORT!=='undefined'?SOC_PROVIDER_REGIONAL_SUPPORT:require('./23-provider-regional-support.js');
  const providerOwnedSites=typeof SOC_PROVIDER_OWNED_SITES!=='undefined'?SOC_PROVIDER_OWNED_SITES:require('./23-provider-owned-sites.js');
  const providerCentralProgression=typeof SOC_PROVIDER_CENTRAL_PROGRESSION!=='undefined'?SOC_PROVIDER_CENTRAL_PROGRESSION:require('./23-provider-central-progression.js');
  const providerLocalProgression=typeof SOC_PROVIDER_LOCAL_PROGRESSION!=='undefined'?SOC_PROVIDER_LOCAL_PROGRESSION:require('./23-provider-local-progression.js');
  const providerResilienceProgression=typeof SOC_PROVIDER_RESILIENCE_PROGRESSION!=='undefined'?SOC_PROVIDER_RESILIENCE_PROGRESSION:require('./23-provider-resilience-progression.js');
  const providerResilienceSequence=typeof SOC_PROVIDER_RESILIENCE_SEQUENCE!=='undefined'?SOC_PROVIDER_RESILIENCE_SEQUENCE:require('./23-provider-resilience-sequence.js');
  const providerResilience=typeof SOC_PROVIDER_RESILIENCE!=='undefined'?SOC_PROVIDER_RESILIENCE:require('./23-provider-resilience.js');
  const providerExternalReach=typeof SOC_PROVIDER_EXTERNAL_REACH!=='undefined'?SOC_PROVIDER_EXTERNAL_REACH:require('./23-provider-external-reach.js');
  const providerUcCcIntegration=typeof SOC_PROVIDER_UC_CC_INTEGRATION!=='undefined'?SOC_PROVIDER_UC_CC_INTEGRATION:require('./23-provider-uc-cc-integration.js');
  const providerServiceBoundary=typeof SOC_PROVIDER_SERVICE_BOUNDARY!=='undefined'?SOC_PROVIDER_SERVICE_BOUNDARY:require('./23-provider-service-boundary.js');
  const providerChangePreview=typeof SOC_PROVIDER_CHANGE_PREVIEW!=='undefined'?SOC_PROVIDER_CHANGE_PREVIEW:require('./23-provider-change-preview.js');
  const providerConfigurationAuthority=typeof SOC_PROVIDER_CONFIGURATION_AUTHORITY!=='undefined'?SOC_PROVIDER_CONFIGURATION_AUTHORITY:require('./23-provider-configuration-authority.js');
  const providerCapacityAuthority=typeof SOC_PROVIDER_CAPACITY_AUTHORITY!=='undefined'?SOC_PROVIDER_CAPACITY_AUTHORITY:require('./23-provider-capacity-authority.js');
  const providerProgressionReceipts=typeof SOC_PROVIDER_PROGRESSION_RECEIPTS!=='undefined'?SOC_PROVIDER_PROGRESSION_RECEIPTS:require('./23-provider-progression-receipts.js');
  const providerProgressionFacts=typeof SOC_PROVIDER_PROGRESSION_FACTS!=='undefined'?SOC_PROVIDER_PROGRESSION_FACTS:require('./23-provider-progression.js');
  const providerIntegrationAssurance=typeof SOC_PROVIDER_INTEGRATION_ASSURANCE!=='undefined'?SOC_PROVIDER_INTEGRATION_ASSURANCE:require('./23-provider-integration-assurance.js');
  const providerPolicy=typeof SOC_PROVIDER_POLICY!=='undefined'?SOC_PROVIDER_POLICY:require('./23-provider-policy.js');
  const providerDedicatedInterconnect=typeof SOC_PROVIDER_DEDICATED_INTERCONNECT!=='undefined'?SOC_PROVIDER_DEDICATED_INTERCONNECT:require('./23-provider-dedicated-interconnect.js');
  const providerRoomIntegration=typeof SOC_PROVIDER_ROOM_INTEGRATION!=='undefined'?SOC_PROVIDER_ROOM_INTEGRATION:require('./23-provider-room-integration.js');
  const providerIncidentSequence=typeof SOC_PROVIDER_INCIDENT_SEQUENCE!=='undefined'?SOC_PROVIDER_INCIDENT_SEQUENCE:require('./23-provider-incident-sequence.js');
  const providerIncidentDiagnosis=typeof SOC_PROVIDER_INCIDENT_DIAGNOSIS!=='undefined'?SOC_PROVIDER_INCIDENT_DIAGNOSIS:require('./23-provider-incident-diagnosis.js');
  const providerFollowupRetryArchive=typeof SOC_PROVIDER_FOLLOWUP_RETRY_ARCHIVE!=='undefined'?SOC_PROVIDER_FOLLOWUP_RETRY_ARCHIVE:require('./23-provider-followup-retry-archive.js');
  const providerCaseFollowup=typeof SOC_PROVIDER_CASE_FOLLOWUP!=='undefined'?SOC_PROVIDER_CASE_FOLLOWUP:require('./23-provider-case-followup.js');
  const providerCaseHandoff=typeof SOC_PROVIDER_CASE_HANDOFF!=='undefined'?SOC_PROVIDER_CASE_HANDOFF:require('./23-provider-case-handoff.js');
  const providerJourneys=typeof SOC_PROVIDER_JOURNEYS!=='undefined'?SOC_PROVIDER_JOURNEYS:require('./23-provider-journeys.js');
  const providerSupportWork=typeof SOC_PROVIDER_SUPPORT_WORK!=='undefined'?SOC_PROVIDER_SUPPORT_WORK:require('./23-provider-support-work.js');
  const providerHistory=typeof SOC_PROVIDER_HISTORY!=='undefined'?SOC_PROVIDER_HISTORY:require('./23-provider-history.js');
  const providerProducts=typeof SOC_PROVIDER_PRODUCTS!=='undefined'?SOC_PROVIDER_PRODUCTS:require('./23-provider-products.js');
  const providerRules=typeof SOC_PROVIDER_RULES!=='undefined'?SOC_PROVIDER_RULES:require('./24-provider-rules.js');
  const providerCampaign=typeof SOC_PROVIDER_CAMPAIGN!=='undefined'?SOC_PROVIDER_CAMPAIGN:require('./25-provider-campaign.js');
  const business=typeof SOC_BUSINESS!=='undefined'?SOC_BUSINESS:require('./54-business.js');
  const operations=typeof SOC_OPERATIONS!=='undefined'?SOC_OPERATIONS:require('./53-service-operations.js');
  const information=typeof SOC_INFORMATION!=='undefined'?SOC_INFORMATION:require('./52-information.js');
  const contact=typeof SOC_CONTACT!=='undefined'?SOC_CONTACT:require('./51-contact.js');
  const estate=typeof SOC_ESTATE!=='undefined'?SOC_ESTATE:require('./48-estate.js');
  const workforce=typeof SOC_WORKFORCE!=='undefined'?SOC_WORKFORCE:require('./49-workforce.js');
  const workforceOffers=typeof SOC_WORKFORCE_OFFERS!=='undefined'?SOC_WORKFORCE_OFFERS:require('./38-workforce-offers.js');
  const workforceQuality=typeof SOC_WORKFORCE_QUALITY!=='undefined'?SOC_WORKFORCE_QUALITY:require('./38-workforce-quality.js');
  const calling=typeof SOC_CALLING!=='undefined'?SOC_CALLING:require('./50-calling.js');
  const products=typeof SOC_PRODUCTS!=='undefined'?SOC_PRODUCTS:require('./45-products.js');
  const channels=typeof SOC_CHANNELS!=='undefined'?SOC_CHANNELS:require('./47-channels.js');
  const outcomes=typeof SOC_OUTCOMES!=='undefined'?SOC_OUTCOMES:require('./46-outcomes.js');
  const transport=typeof SOC_TRANSPORT!=='undefined'?SOC_TRANSPORT:require('./42-transport.js');
  const boundaries=typeof SOC_BOUNDARIES!=='undefined'?SOC_BOUNDARIES:require('./43-boundaries.js');
  const progression=typeof SOC_PROGRESSION!=='undefined'?SOC_PROGRESSION:require('./41-progression.js');
  const issueExercises=typeof SOC_ISSUE_EXERCISES!=='undefined'?SOC_ISSUE_EXERCISES:require('./40-issue-exercises.js');
  const admissionSecurity=typeof SOC_ADMISSION_SECURITY!=='undefined'?SOC_ADMISSION_SECURITY:require('./38-admission-security.js');
  const serviceObservation=typeof SOC_SERVICE_OBSERVATION!=='undefined'?SOC_SERVICE_OBSERVATION:require('./39-service-observation.js');
  const portfolio=typeof SOC_PORTFOLIO!=='undefined'?SOC_PORTFOLIO:require('./37-portfolio.js');
  const productEvidence=typeof SOC_PRODUCT_EVIDENCE!=='undefined'?SOC_PRODUCT_EVIDENCE:require('./28-product-evidence.js');
  const managedOperations=typeof SOC_MANAGED_OPERATIONS!=='undefined'?SOC_MANAGED_OPERATIONS:require('./29-managed-operations.js');
  const mediaNegotiation=typeof SOC_MEDIA_NEGOTIATION!=='undefined'?SOC_MEDIA_NEGOTIATION:require('./30-media-negotiation.js');
  const siteOperations=typeof SOC_SITE_OPERATIONS!=='undefined'?SOC_SITE_OPERATIONS:require('./32-site-operations.js');
  const capabilityProgression=typeof SOC_CAPABILITY_PROGRESSION!=='undefined'?SOC_CAPABILITY_PROGRESSION:require('./31-capability-progression.js');
  const callingAchievements=typeof SOC_CALLING_ACHIEVEMENTS!=='undefined'?SOC_CALLING_ACHIEVEMENTS:require('./33-calling-achievements.js');
  const specialistLifecycle=typeof SOC_SPECIALIST_LIFECYCLE!=='undefined'?SOC_SPECIALIST_LIFECYCLE:require('./34-specialist-lifecycle.js');
  const sharedServices=typeof SOC_SHARED_SERVICES!=='undefined'?SOC_SHARED_SERVICES:require('./35-shared-services.js');
  const marketQualification=typeof SOC_MARKET_QUALIFICATION!=='undefined'?SOC_MARKET_QUALIFICATION:require('./36-market-qualification.js');
  const campaign=typeof SOC_CAMPAIGN!=='undefined'?SOC_CAMPAIGN:require('./44-campaign.js');
  const customerNeeds=typeof SOC_CUSTOMER_NEEDS!=='undefined'?SOC_CUSTOMER_NEEDS:require('./26-customer-needs.js');
  const speechModels=typeof SOC_SPEECH_MODELS!=='undefined'?SOC_SPEECH_MODELS:require('./27-speech-models.js');
  const clone=x=>JSON.parse(JSON.stringify(x));
  const fail=(code,detail)=>{throw new Error(code+(detail?': '+detail:''));};
  const ownKey=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const isId=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,47}$/.test(x);
  const units=['seat','session','agent','Mbps','minute','message','room','GB','processor-minute','managed-operation'];
  const catalogue={
    directory:{name:'Microsnoft Identity Grove',console:'identity',unit:'seat',defaults:{enabled:true,local:false,identities:['alex','bea'],entitled:['alex','bea'],region:'AU'}},
    connectivity:{name:'Level Tree Access',console:'carrier',unit:'Mbps',defaults:{enabled:true,capacity:20,local:false,region:'AU'}},
    uc:{name:'Microsnoft Workplace Phone',console:'workplace',unit:'seat',defaults:{enabled:true,directory:'identity',connectivity:'access',deployment:'multitenant',carrierModel:'managed',capacity:10,routes:[{prefix:'+61',target:'desk'}],extensionScope:'tenant',normalisation:'+61',signalling:true,mediaOut:true,mediaIn:true,local:false,region:'AU'}},
    dedicated:{name:'Disco Dedicated Voice',console:'disco',unit:'seat',defaults:{enabled:true,directory:'identity',connectivity:'access',deployment:'dedicated',carrierModel:'gateway',capacity:10,routes:[{prefix:'+61',target:'desk'}],extensionScope:'site',normalisation:'+61',signalling:true,mediaOut:true,mediaIn:true,local:true,region:'AU'}},
    trunk:{name:'Bellwether Interconnect',console:'carrier',unit:'session',defaults:{enabled:true,capacity:4,signalling:true,mediaOut:true,mediaIn:true,local:false,region:'AU'}},
    endpoint:{name:'Disco Desk',console:'disco',unit:'seat',defaults:{enabled:true,identity:'bea',extension:'201',scope:'tenant',number:'+61255500201',registered:true,firmware:2,local:true,region:'AU'}},
    workforce:{name:'People Orchard',console:'workforce',unit:'agent',defaults:{enabled:true,operator:'player',people:2,entitlements:2,skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440,handlingMinutes:3,wrapMinutes:1,digitalConcurrency:2,local:true,region:'AU'}},
    queue:{name:'Disco Service Desk',console:'contact',unit:'session',defaults:{enabled:true,workforce:'people',capacity:4,skill:'service',language:'en',maxWait:8,callback:true,local:true,region:'AU'}},
    channel:{name:'Chatterleaf Business',console:'engage',unit:'message',defaults:{enabled:true,approved:true,templates:['appointment'],rateLimit:10,local:false,region:'AU'}},
    crm:{name:'Casebook',console:'casebook',unit:'seat',defaults:{enabled:true,identityMapping:true,local:true,region:'AU'}},
    workflow:{name:'Disco Connective',console:'engage',unit:'message',defaults:{enabled:true,channel:'messages',queue:'service',crm:'cases',template:'appointment',handoff:true,botResolves:false,retries:2,local:false,region:'AU'}},
    room:{name:'Disco Room Garden',console:'rooms',unit:'room',defaults:{enabled:true,directory:'identity',calendar:true,account:'bea',mode:'native',interop:false,firmware:2,microphone:true,camera:true,local:true,region:'AU'}},
    recorder:{name:'Echo Vault Capture',console:'governance',unit:'session',defaults:{enabled:true,capacity:4,consent:true,identityMapping:true,archive:'archive',local:true,region:'AU'}},
    archive:{name:'Echo Vault Archive',console:'governance',unit:'GB',defaults:{enabled:true,capacity:20,retentionDays:30,access:['supervisor'],local:true,region:'AU'}},
    processor:{name:'Disco Speech Orchard',console:'processing',unit:'processor-minute',defaults:{enabled:true,capacity:10,language:'en',operation:'transcription',local:true,licenceLocal:false,region:'AU'}},
    infrastructure:{name:'Clockwork Local Services',console:'infrastructure',unit:'session',defaults:{enabled:true,identity:true,dns:true,time:true,certificates:true,licensing:true,backup:true,local:true,region:'AU'}}
  };
  const scenarios={
    smb:{name:'SMB · Orchard Repairs',channel:'message',goal:'Resolve a digital enquiry with retained case context.',required:['resolved','context'],jurisdiction:'AU'},
    enterprise:{name:'Enterprise · Canopy Group',channel:'voice',goal:'Complete recorded calling and a room join after a cohort change.',required:['resolved','recording','meeting'],jurisdiction:'AU'},
    government:{name:'Government · Civic Grove',channel:'voice',goal:'Resolve a recorded enquiry with permitted transcription and retention.',required:['resolved','recording','transcript'],jurisdiction:'AU'},
    defence:{name:'Defence · Wattle Training Centre',channel:'voice',goal:'Keep local administrative calling and rooms working during disconnection.',required:['resolved','meeting','disconnected'],jurisdiction:'AU'}
  };
  const jurisdictions=['AU','US','JP','EU'];
  const scenarioTenants={smb:'orchard-repairs',enterprise:'canopy-group',government:'civic-grove',defence:'wattle-centre'};
  function validateConfig(kind,c){
    const p=catalogue[kind];if(!p||!c||Array.isArray(c)||typeof c!=='object')fail('INVALID_CONFIG');
    for(const [k,v] of Object.entries(c)){
      if(!ownKey(p.defaults,k))fail('UNKNOWN_FIELD',k);
      const d=p.defaults[k];
      if(Array.isArray(d)){
        if(!Array.isArray(v)||v.length>200)fail('INVALID_LIST',k);
        if(k==='routes')for(const r of v){if(!r||Object.keys(r).sort().join(',')!=='prefix,target'||typeof r.prefix!=='string'||!/^\+?[0-9]{1,16}$/.test(r.prefix)||!isId(r.target))fail('INVALID_ROUTE');}
        else if(v.some(x=>typeof x!=='string'||x.length>80)||new Set(v).size!==v.length)fail('INVALID_LIST',k);
      }else if(typeof v!==typeof d||(typeof v==='number'&&(!Number.isFinite(v)||v<0||v>100000||!Number.isInteger(v)))||(typeof v==='string'&&v.length>100))fail('INVALID_FIELD',k);
    }
    if(Object.keys(c).length!==Object.keys(p.defaults).length)fail('MISSING_CONFIG_FIELD');
    if(!jurisdictions.includes(c.region))fail('INVALID_REGION');
    if(c.deployment&&!['multitenant','dedicated','premises'].includes(c.deployment))fail('INVALID_DEPLOYMENT');
    if(kind==='uc'&&c.deployment!=='multitenant')fail('PRODUCT_DEPLOYMENT_MISMATCH');
    if(kind==='dedicated'&&c.deployment==='multitenant')fail('PRODUCT_DEPLOYMENT_MISMATCH');
    if(c.carrierModel&&!['managed','direct','mobile','gateway'].includes(c.carrierModel))fail('INVALID_CARRIER_MODEL');
    if(c.operator&&!['player','bpo','customer'].includes(c.operator))fail('INVALID_OPERATOR');
    if(c.mode&&!['native','guest','bridge'].includes(c.mode))fail('INVALID_ROOM_MODE');
    if(c.operation&&!['transcription','translation','summary','redaction','index'].includes(c.operation))fail('INVALID_PROCESSING_OPERATION');
    if(kind==='workforce'&&(c.shiftStart>=c.shiftEnd||c.shiftEnd>1440||c.handlingMinutes<1||c.digitalConcurrency<1))fail('INVALID_SHIFT');
  }
  function resource(id,kind,config={}){
    if(!isId(id)||!ownKey(catalogue,kind))fail('INVALID_RESOURCE');
    const desired={...clone(catalogue[kind].defaults),...clone(config)};validateConfig(kind,desired);
    return {id,kind,desired,effective:null,generation:1,provisioning:{status:'pending',due:1,generation:1},fault:null};
  }
  function create({scenario='smb',jurisdiction='AU',mode='guided',seed=73,tenant,clock=0,customerName,experience,providerName='Busy Signal MSP',market='au-sydney',difficulty='normal',openingVariant}={}){
    if(!ownKey(scenarios,scenario)||!jurisdictions.includes(jurisdiction)||!['guided','assessed','sandbox'].includes(mode)||!Number.isSafeInteger(seed)||seed<1||seed>2147483646||!Number.isSafeInteger(clock)||clock<0||clock>100000000||tenant!==undefined&&(!isId(tenant)||tenant.length>48)||customerName!==undefined&&(typeof customerName!=='string'||!customerName.trim()||customerName.length>100))fail('INVALID_EXERCISE');
    const resources={};
    const add=(id,kind,c={})=>resources[id]=resource(id,kind,{region:jurisdiction,...c});
    add('identity','directory');add('access','connectivity');add('phone','uc');add('carrier','trunk');add('desk','endpoint');
    add('people','workforce');add('service','queue');add('messages','channel');add('cases','crm');add('engage','workflow');
    add('room','room');add('archive','archive');add('recorder','recorder');add('speech','processor');add('local','infrastructure');
    // Deliberate initial faults are repairable through the same configuration surface.
    resources.phone.desired.routes=[{prefix:'+61',target:'service'}];
    if(scenario==='smb')resources.people.desired.people=0;
    if(scenario==='enterprise'){resources.recorder.desired.identityMapping=false;resources.room.desired.calendar=false;}
    if(scenario==='government')resources.speech.desired.region=jurisdiction==='AU'?'US':'AU';
    if(scenario==='defence'){
      resources.phone=resource('phone','dedicated',{region:jurisdiction,routes:[{prefix:'+61',target:'desk'}]});
      for(const id of ['identity','access','carrier'])resources[id].desired.local=true;
      resources.local.desired.licensing=false;
    }
    for(const r of Object.values(resources))r.provisioning.due=clock+1;
    const root={app:APP,v:SCHEMA,pack:PACK,rules:'fictional-boundaries-1',scenario,jurisdiction,mode,seed,...(tenant!==undefined?{tenant}:{}),...(customerName!==undefined?{customerName}:{}),clock,revision:0,nextId:1,tracePrunedThrough:0,connected:true,resources,interactions:[],cases:{},records:[],ledger:[],totals:{revenue:0,cost:0},commands:[],receipts:[],lastMeeting:null};
    root.experience={version:1,kind:experience|| (mode==='sandbox'?'lab':'training'),custom:mode==='sandbox'};
    if(root.experience.kind==='campaign'){
      if(!ownKey(portfolio.markets,market))fail('INVALID_PROVIDER_MARKET');
      root.jurisdiction=portfolio.markets[market].jurisdiction;
      for(const r of Object.values(resources)){r.desired.enabled=false;r.desired.region=root.jurisdiction;}
      root.experience.custom=false;root.providerRequestSequence=0;
      root.business=business.create(root);root.business.balance.opening=root.business.balance.cash=providerRules.data.difficultyCapitalCents[difficulty||'normal'];
      Object.assign(root.business.workforce,{engineers:providerRules.data.staff.engineers,support:providerRules.data.staff.support,hourlyCents:providerRules.data.staff.payrollCentsPerPerson});
      root.portfolio=portfolio.create({clock});
      root.providerCampaign=providerCampaign.create(root,{providerName,market,difficulty,scenario,seed,...(openingVariant!==undefined?{openingVariant}:{})},providerHooks());
    }
    return validateState(root);
  }
  const links={uc:{directory:['directory'],connectivity:['connectivity']},dedicated:{directory:['directory'],connectivity:['connectivity']},queue:{workforce:['workforce']},workflow:{channel:['channel'],queue:['queue'],crm:['crm']},room:{directory:['directory']},recorder:{archive:['archive']}};
  function dependencies(s,r,c){
    const errors=[];
    for(const [field,kinds] of Object.entries(links[r.kind]||{})){
      const target=s.resources[c[field]];
      if(!target)errors.push({code:'MISSING_DEPENDENCY',field,target:c[field]});
      else if(!kinds.includes(target.kind))errors.push({code:'INCOMPATIBLE_DEPENDENCY',field,target:c[field]});
    }
    return errors;
  }
  function observe(s,id,visited=new Set()){
    const r=s.resources[id];if(!r)return {ready:false,reasons:['MISSING_RESOURCE']};
    const c=r.effective;if(!c)return {ready:false,reasons:['NOT_PROVISIONED']};
    if(visited.has(id))return {ready:false,reasons:['DEPENDENCY_CYCLE']};
    const next=new Set(visited);next.add(id);const reasons=[];
    if(!c.enabled)reasons.push('DISABLED');if(r.fault)reasons.push(r.fault);
    if(!s.connected&&!c.local)reasons.push('EXTERNAL_DEPENDENCY');
    if(id==='local'&&s.providerContinuity&&providerContinuity.observe(s.providerContinuity,s.clock,s.connected).expired)reasons.push('LOCAL_AUTONOMY_EXHAUSTED');
    for(const e of dependencies(s,r,c))reasons.push(e.code+':'+e.field);
    for(const field of Object.keys(links[r.kind]||{})){
      if(!observe(s,c[field],next).ready)reasons.push('DEPENDENCY_UNAVAILABLE:'+field);
    }
    if(!s.connected&&['uc','dedicated','directory','room','processor','trunk'].includes(r.kind)){
      const local=s.resources.local?.effective;
      if(!local||!['identity','dns','time','certificates','licensing'].every(k=>local[k])||!observe(s,'local',next).ready)reasons.push('LOCAL_SUPPORT_DEPENDENCY');
      if(r.kind==='processor'&&!c.licenceLocal)reasons.push('EXTERNAL_LICENCE');
    }
    return {ready:reasons.length===0,reasons};
  }
  const config=(s,id)=>s.resources[id]?.effective;
  const productBindingKinds={
    ...Object.fromEntries(['workload-scoped-availability','eligibility-evidence','regional-evidence','lifecycle-evidence'].map(feature=>[feature,{kinds:{phone:['uc','dedicated']},modes:['commercial','gcc','gcc-high','dod','jurisdiction-scoped-cloud','sovereign-infrastructure'],scopedEvidence:true}])),
    telephony:{kinds:{phone:['uc']},modes:['multitenant'],coreDeployment:'multitenant'},
    'multitenant-calling':{kinds:{phone:['uc']},modes:['multitenant'],coreDeployment:'multitenant'},
    'carrier-interconnect':{kinds:{carrier:['trunk']},modes:['multitenant','dedicated','premises']},
    'pstn-supply':{kinds:{carrier:['trunk']},modes:['multitenant','dedicated','premises']},
    'unified-communications':{kinds:{phone:['dedicated'],'dedicated-platform':['dedicated']},modes:['dedicated','premises'],coreDeployment:['dedicated','premises']},
    meetings:{kinds:{room:['room']},modes:['room-deployment','native-room']},
    events:{kinds:{room:['room']},modes:['room-deployment','native-room']},
    'room-devices':{kinds:{room:['room']},modes:['room-deployment','native-room']},
    'room-panels':{kinds:{room:['room']},modes:['room-deployment','native-room']},
    'calendar-integration':{kinds:{room:['room']},modes:['room-deployment','native-room']},
    'native-join':{kinds:{room:['room']},modes:['native-room','room-deployment'],roomModes:['native']},
    'interop-join':{kinds:{room:['room']},modes:['interop-bridge'],roomModes:['guest','bridge'],interop:true},
    'browser-join':{kinds:{room:['room']},modes:['interop-bridge','native-room'],roomModes:['guest','native','bridge']},
    'local-inference':{kinds:{speech:['processor']},modes:['customer-operated-local'],processorLocal:true},
    'supported-language-stage':{kinds:{speech:['processor']},modes:['customer-operated-local']},
    'versioned-integration':{kinds:{speech:['processor']},modes:['customer-operated-local'],processorLocal:true},
    'stored-output':{kinds:{archive:['archive']},modes:['customer-operated-local']},
    'operating-effort':{kinds:{people:['workforce']},modes:['customer-operated-local']},
    'licensing-connectivity':{kinds:{local:['infrastructure']},modes:['customer-operated-local']},
    'agent-assistance':{kinds:{speech:['processor']},modes:['cloud','multitenant','hosted','premises']},
    'ai-assistance':{kinds:{speech:['processor']},modes:['multitenant','hosted','premises']},
    recording:{kinds:{recorder:['recorder']},modes:['cloud','customer-operated','multitenant','premises']},
    'quality-review':{kinds:{recorder:['recorder']},modes:['multitenant','hosted','premises']}
  };
  Object.assign(productBindingKinds,{
    'omnichannel-routing':{kinds:{service:['queue']},modes:['cloud','customer-operated']},
    'customer-records':{kinds:{cases:['crm']},modes:['cloud','customer-operated']},
    'customer-workflows':{kinds:{engage:['workflow']},modes:['cloud','customer-operated']},
    ...Object.fromEntries(['embedded-communications','supported-architecture','teams-aligned-integration'].map(feature=>[feature,{kinds:{engage:['workflow']},modes:['cloud','embedded']}])),
    ...Object.fromEntries(['workflow-flows','api-execution','webhook-delivery'].map(feature=>[feature,{kinds:{engage:['workflow']},modes:['cloud','provider-operated']}])),
    'channel-accounts':{kinds:{messages:['channel']},modes:['cloud','provider-operated']},
    'tenant-administration':{kinds:{identity:['directory']},modes:['provider-operated','multi-tenant']},
    ...Object.fromEntries(['wholesale-billing','order-fulfilment'].map(feature=>[feature,{kinds:{engage:['workflow']},modes:['provider-operated','multi-tenant']}]))
  });
  function productBindingInScope(s,deployment,binding,strict=true){
    const model=productBindingKinds[binding.feature],cfg=deployment.effective||deployment.desired;
    if(!model||!model.modes.includes(cfg.mode)||binding.resources.some(id=>!ownKey(model.kinds,id)||!s.resources[id]||!model.kinds[id].includes(s.resources[id].kind)))return false;
    if(model.coreDeployment&&(Array.isArray(model.coreDeployment)?!model.coreDeployment.includes(cfg.mode):cfg.mode!==model.coreDeployment))return false;
    if(model.scopedEvidence){const dependencies=products.families[cfg.family]?.features?.[binding.feature]||[];if(!dependencies.length||binding.resources.some(id=>dependencies.some(dep=>cfg.dependencies[dep]!==id)))return false;}
    if(!strict)return true;
    if(cfg.region!==s.jurisdiction)return false;
    for(const id of binding.resources){const r=s.resources[id],effective=r.effective||r.desired;if(r.desired.region!==s.jurisdiction||effective.region!==s.jurisdiction)return false;
      if(model.coreDeployment&&!(Array.isArray(model.coreDeployment)?model.coreDeployment.includes(r.desired.deployment):r.desired.deployment===cfg.mode&&r.desired.deployment===model.coreDeployment))return false;
      if(model.roomModes&&(!model.roomModes.includes(effective.mode)||model.interop&&!effective.interop))return false;
      if(model.processorLocal&&(!effective.local||!observe(s,id).ready))return false;
    }
    return true;
  }
  function productEvidenceHooks(){return {
    authorize:(state,r)=>business.authorise(state,r.desired.resourceId,'configure'),
    qualification:(state,resourceId)=>{const b=state.business,organisation=state.providerQualification?.organisation||b?.player,expires=state.providerQualification?.expires||b?.qualifications?.[organisation]?.[state.scenario]||0;return {eligible:expires>state.clock,organisation,scenario:state.scenario,expires,resourceId,authorised:business.authorise(state,resourceId,'configure')};},
    boundaryAssessment:(state,resourceId)=>{const b=boundaryCheck(state,resourceId);return b?{...b,resourceBindings:(b.resourceBindings||[]).map(x=>x.resource)}:{eligible:false,resourceBindings:[]};},
    lifecycle:(state,resourceId,context)=>{const d=state.products?.deployments.find(x=>x.id===context.deploymentId),o=state.products?.offers.find(x=>x.id===context.offer),life=o?.effectiveLifecycle;return {eligible:!!d&&d.generation===context.generation&&o?.lifecycleProvisioning.status==='ready'&&life?.sale==='available'&&life?.support==='supported'&&business.authorise(state,resourceId,'configure'),offerId:o?.id,offerGeneration:o?.lifecycleGeneration,axes:life?{sale:life.sale,support:life.support}:null,deploymentId:d?.id,productVersion:d?.desired.productVersion,family:d?.desired.family,mode:d?.desired.mode,synthetic:true,externalApprovalClaim:false};}
  };}
  function speechHooks(s){
    const stamp=(...values)=>values.reduce((n,x)=>n*100000+(Number.isSafeInteger(x)?x:0),0);
    return {
      authorize:(state,request)=>business.authorise(state,'speech','configure')&&!!state.products?.deployments.some(d=>d.id===request.scope&&d.desired.family==='cisco:local-speech'),
      deployment:(state,id)=>{
        const d=state.products?.deployments.find(x=>x.id===id);if(!d)return null;
        const current=d.provisioning.status==='ready'&&d.provisioning.generation===d.generation?d.effective:d.desired;
        if(!current)return null;
        return {id:d.id,family:current.family,mode:current.mode,status:d.provisioning.status==='ready'&&d.provisioning.generation===d.generation?'ready':d.provisioning.status==='pending'?'provisioning':'unavailable',generation:d.generation,productVersion:current.productVersion,offerId:current.offer,region:current.region};
      },
      resource:(state,id,role,scope)=>{
        const r=state.resources[id],c=r?.effective;if(!r||!c||r.provisioning.status!=='ready'||r.provisioning.generation!==r.generation)return null;
        if(role==='compute'){
          const processor=state.resources.speech,pc=processor?.effective,local=state.resources[id],ready=observe(state,id).ready&&observe(state,'speech').ready&&local.kind==='infrastructure'&&processor?.kind==='processor';
          return {ready,generation:stamp(local.generation,processor.generation),region:c.region,localInference:ready&&c.local===true&&pc.local===true,capacity:pc.capacity,offlineSupported:pc.local===true&&c.identity===true&&c.dns===true&&c.time===true&&c.certificates===true,languages:['en','ja','fr','de'],stages:['transcription','diarisation','translation']};
        }
        if(role==='permission'){
          const info=state.information,recorder=state.resources.recorder,rc=recorder?.effective,b=info?.boundary?.effective,p=info?.pipeline?.effective;
          if(r.kind!=='recorder'||!info||!rc||!b||!p)return null;
          const region=rc.region;
          return {ready:observe(state,id).ready&&rc.consent===true&&rc.identityMapping===true&&p.enabled===true&&b.processRegions.includes(region),generation:stamp(r.generation,info.pipeline.generation,info.boundary.generation),deploymentId:scope.deploymentId,localSpeech:true};
        }
        if(role==='licensing'){
          const processor=state.resources.speech,pc=processor?.effective,local=state.resources[id];if(local.kind!=='infrastructure'||processor?.kind!=='processor'||!pc)return null;
          const offlineAuthorized=c.licensing===true&&pc.licenceLocal===true;
          return {ready:observe(state,id).ready, generation:stamp(local.generation,processor.generation),deploymentId:scope.deploymentId,connected:state.connected===true,offlineAuthorized};
        }
        return null;
      },
      integration:(state,q)=>{
        const d=state.products?.deployments.find(x=>x.id===q.deploymentId),cfg=d&&(d.provisioning.status==='ready'&&d.provisioning.generation===d.generation?d.effective:d.desired);
        const installed=state.speechModels?.installations.some(x=>x.desired.deploymentId===q.deploymentId&&x.desired.deploymentGeneration===q.deploymentGeneration&&x.desired.productVersion===q.productVersion&&x.desired.modelVersion===q.modelVersion&&x.provisioning.status==='ready'&&x.effective);
        if(!d||!cfg||d.generation!==q.deploymentGeneration||cfg.productVersion!==q.productVersion||cfg.offer!==q.offerId||cfg.region!==q.region||cfg.family!=='cisco:local-speech'||!cfg.features.includes('versioned-integration')||q.integrationId!=='local-speech-adapter'||q.integrationVersion!=='scenario-2.0.0'||!installed)return {status:'blocked',reason:'SPEECH_ADAPTER_SCOPE_OR_VERSION_MISMATCH'};
        return {status:'scenario-verified',integrationId:q.integrationId,integrationVersion:q.integrationVersion,deploymentId:d.id,deploymentGeneration:d.generation,productVersion:cfg.productVersion,offerId:cfg.offer,region:cfg.region};
      }
    };
  }
  function productHooks(s){
    return {
      authorize:(state,objectId,action,context)=>{const findBindings=id=>state.products?.deployments.find(x=>x.id===id)?.desired.bindings.flatMap(b=>b.resources)||[],refs=Object.values(context?.dependencies||{}),bound=[...(context?.bindings||[]).flatMap(b=>b.resources||[]),...findBindings(context?.source),...findBindings(context?.target),...findBindings(objectId)],resources=[...new Set([...refs,...bound])].filter(id=>state.resources[id]);return (resources.length?resources:['phone']).every(id=>business.authorise(state,id,'configure'));},
      validateBinding:(state,deployment,binding)=>productBindingInScope(state,deployment,binding,true),
      observeDependency:(state,kind,resourceId,context)=>{if(['language-model','integration-version'].includes(kind))return state.speechModels?speechModels.availability(state,kind,resourceId,context,speechHooks(state)):{ready:false,reason:'SPEECH_MODELS_NOT_STARTED'};const r=state.resources[resourceId];if(!r)return {ready:false,reason:'PRODUCT_DEPENDENCY_MISSING'};const types={identity:['directory'],carrier:['trunk','connectivity'],calendar:['room'], 'capture-permission':['recorder'],workforce:['workforce'],crm:['crm'],'api-access':['workflow'],compute:['infrastructure'],'licensing-service':['infrastructure'],'network-edge':['connectivity','trunk'],recording:['recorder'],processing:['processor'],'channel-supplier':['channel'],'interop-provider':['room'],media:['uc','dedicated','trunk'],'tenant-authority':['directory'],'contract-authority':['directory'],'billing-system':['workflow'],'order-system':['workflow'],'support-owner':['workforce'],storage:['archive'],'information-policy':['archive'],operator:['workforce']};if(types[kind]&&!types[kind].includes(r.kind))return {ready:false,reason:'PRODUCT_DEPENDENCY_KIND_MISMATCH'};if(kind.endsWith('-evidence'))return state.productEvidence?productEvidence.availability(state,kind,resourceId,context,productEvidenceHooks()):{ready:false,reason:'PRODUCT_EVIDENCE_UNAVAILABLE'};const c=r.effective||{};if(kind==='calendar'&&!c.calendar)return {ready:false,reason:'CALENDAR_NOT_ENABLED'};if(kind==='capture-permission'&&(!c.consent||!c.identityMapping))return {ready:false,reason:'CAPTURE_PERMISSION_NOT_READY'};if(kind==='workforce'&&(!c.people||!c.entitlements))return {ready:false,reason:'WORKFORCE_NOT_STAFFED'};if(kind==='crm'&&!c.identityMapping)return {ready:false,reason:'CRM_IDENTITY_MAPPING_MISSING'};if(kind==='licensing-service'&&!c.licensing)return {ready:false,reason:'LOCAL_LICENCE_UNAVAILABLE'};if(kind==='channel-supplier'&&!c.approved)return {ready:false,reason:'CHANNEL_NOT_APPROVED'};const result=observe(state,resourceId);return {ready:result.ready,generation:r.generation,reason:result.reasons[0]||'PRODUCT_DEPENDENCY_UNAVAILABLE'};},
      testDirectionalPath:(state,source,target)=>source.effective?.region===target.effective?.region&&source.effective?.region===state.jurisdiction?{ready:true}:{ready:false,reason:'COMPATIBILITY_REGION_SCOPE'}
    };
  }
  function productGate(s,resourceId){if(!s.products)return null;const hooks=productHooks(s),bindings=products.bindingsForResource(s,resourceId);for(const b of bindings){const status=products.bindingStatus(s,b.deploymentId,b.feature,resourceId,hooks);if(!status.available)return {available:false,...b,reason:status.code,details:status};}return bindings.length?{available:true,bindings}:null;}
  function speechModelContext(s){
    if(!s.speechModels||!s.products)return null;const gate=productGate(s,'speech');if(!gate?.available)return null;
    const binding=gate.bindings.find(x=>['local-inference','supported-language-stage','versioned-integration'].includes(x.feature));if(!binding)return null;
    const d=s.products.deployments.find(x=>x.id===binding.deploymentId),c=d?.effective;if(!d||!c||c.family!=='cisco:local-speech')return null;
    return {deploymentId:d.id,family:c.family,generation:d.generation,mode:c.mode,offer:c.offer,productVersion:c.productVersion,region:c.region,modelResourceId:c.dependencies['language-model'],integrationResourceId:c.dependencies['integration-version']};
  }
  function productServices(s){const services=Object.fromEntries(Object.keys(s.resources).map(id=>[id,observe(s,id)]));if(s.products)for(const id of Object.keys(s.resources)){const gate=productGate(s,id);if(gate&&!gate.available)services[id]={ready:false,reasons:['PRODUCT_FEATURE_UNAVAILABLE:'+gate.reason]};}if(s.boundaries)for(const id of Object.keys(s.resources)){const gate=boundaryCheck(s,id);if(gate&&!gate.eligible)services[id]={ready:false,reasons:gate.blocking.map(x=>x.code)};}return services;}
  function providerGuestAdmission(state,booking,session){
    const rule=providerRules.data.missions[state.scenario]?.externalCollaboration;
    const guest=booking?.externalGuest,expected=rule&&{version:1,guestId:rule.guestId,guestTenant:rule.guestTenant,hostTenant:state.tenant};
    if(state.providerCustomer?.externalCollaborationVersion!==1||rule?.version!==1||!guest||Object.keys(guest).length!==4||Object.keys(expected).some(key=>guest[key]!==expected[key])||booking.attendees!==rule.attendees||booking.end-booking.start!==rule.durationMinutes||booking.start%providerRules.data.periodMinutes!==rule.minute||!session||session.bookingId!==booking.id)return {admitted:false,reasons:['PROVIDER_EXTERNAL_GUEST_NOT_AUTHORED']};
    return {admitted:true,admissionId:'guest-'+booking.id+'-'+session.id,guestId:expected.guestId,guestTenant:expected.guestTenant,hostTenant:expected.hostTenant};
  }
  function informationHooks(s){return {...productServices(s),boundaryCheck:(state,id)=>boundaryCheck(state,id),authorize:(state,id,action)=>business.authorise(state,id,action),speechModelContext:()=>speechModelContext(s),
    admitExternalGuest:providerGuestAdmission,observeExternalGuest:providerGuestAdmission,
    meetingSnapshot:(state,booking,declaredDependency)=>{const result=meeting(state),profile=state.information?.meeting.effective,resourceId=declaredDependency?.resourceId||'phone',platform=state.resources[resourceId],phone=config(state,resourceId),media={out:!!phone?.mediaOut,in:!!phone?.mediaIn};
      let dependency=null;if(declaredDependency){const observed=platform?observe(state,resourceId):null,gate=platform?productGate(state,resourceId):null,boundary=platform?boundaryCheck(state,resourceId):null,reasons=[...(!platform||!['uc','dedicated'].includes(platform.kind)?['MEETING_PLATFORM_RESOURCE_INVALID']:[]),...(observed?.reasons||[]),...(gate&&!gate.available?['PRODUCT_FEATURE_UNAVAILABLE:'+gate.reason]:[]),...(boundary&&!boundary.eligible?boundary.blocking.map(x=>x.code):[])];dependency={version:1,resourceId,generation:platform?.generation||0,ready:!!observed?.ready&&!reasons.length,reasons,media};}
      const session=state.information?.meetingSessions?.find(x=>x.bookingId===booking.id&&['scheduled','active'].includes(x.status));let productIntegration;
      if(session?.joinMethod==='bridge'&&state.products?.integrations.some(e=>e.id===providerRoomIntegration.EDGE_ID)){
        const hooks={resourceReady:(root,id)=>observe(root,id),featureStatus:(root,id,feature)=>products.featureStatus(root,id,feature,productHooks(root)),meetingPath:root=>transport.resourcePath(root,'identity','room','meeting')};
        productIntegration=session.status==='active'?providerRoomIntegration.observeAccepted(state,booking,session,session.productIntegration,state.clock,hooks):providerRoomIntegration.acceptedSnapshot(state,booking,session,state.clock,hooks);
        if(!productIntegration){result.success=false;result.reasons.push('MEETING_PRODUCT_INTEGRATION_UNAVAILABLE');}
      }
      return {...result,roomSlots:observe(state,'room').ready?1:0,participantCapacity:booking.event?profile?.eventCapacity||0:profile?.capacity||0,media,...(dependency?{platformDependency:dependency}:{}),...(productIntegration?{productIntegration}:{})};},
    reserveMeeting:(state,request)=>request.recording?reserveCapture(state,request.sessionId,'meeting'):{accepted:true},
    releaseMeeting:(state,sessionId)=>releaseCapture(state,sessionId),
    completeMeetingCapture:(state,session)=>{
      const recorder=config(state,'recorder'),archive=config(state,recorder?.archive);
      if(!state.captureReservations?.some(r=>r.id===session.id&&r.kind==='meeting')||!observe(state,'recorder').ready||!observe(state,'archive').ready||!recorder?.consent||!archive?.access.includes('supervisor'))return {accepted:false,reasons:['MEETING_CAPTURE_UNAVAILABLE']};
      const storage=informationRecordStore.admission(state,{resourceId:recorder.archive,region:archive.region,capacityUnits:archive.capacity,store:state.recordStore});
      if(!storage.accepted)return {accepted:false,reasons:[storage.reason]};
      for(const id of ['recorder','archive']){const gate=boundaryCheck(state,id);if(gate&&!gate.eligible)return {accepted:false,reasons:['INFORMATION_BOUNDARY_FAILED']};}
      const item={id:'record-'+state.nextId++,kind:'recording',interaction:session.bookingId,parents:[],captureRegion:recorder.region,region:archive.region,retentionDays:archive.retentionDays,access:[...archive.access],createdAt:state.clock,meetingSessionId:session.id,...(state.recordStore?{archiveId:recorder.archive}:{})};
      state.records.push(item);information.enqueue(state,item,speechModelContext(state),informationHooks(state));return {accepted:true,recordId:item.id};
    }
  };}
  const estateKind=r=>r.kind==='directory'?'user':['endpoint','room'].includes(r.kind)?'device':['carrier','trunk'].includes(r.kind)?'number':'dependency';
  function managedLeaverResources(child,resourceId,completeConfig,revocations){
    const r=child?.resources?.[resourceId];
    if(resourceId!=='identity'||r?.kind!=='directory'||JSON.stringify(revocations)!==JSON.stringify(['identity'])||!Array.isArray(completeConfig?.identities)||!Array.isArray(r.desired.identities))fail('MANAGED_LEAVER_SCOPE_UNSUPPORTED');
    const removed=r.desired.identities.filter(person=>!completeConfig.identities.includes(person));
    if(removed.length!==1)fail('MANAGED_LEAVER_SCOPE_UNSUPPORTED');
    const resources=['identity'];
    if(child.calling)resources.push('phone');
    const person=child.workforceOps?.roster.desired.find(person=>person.id===removed[0]);
    if(person?.available)resources.push('people');
    return resources.sort();
  }
  function estateHooks(s){
    function getResource(state,id){const r=state.resources[id];return r?{...r,estateKind:estateKind(r)}:null;}
    function applyResource(state,id,completeConfig,expectedGeneration){const r=state.resources[id];if(!r)fail('RESOURCE_UNAVAILABLE');if(r.generation!==expectedGeneration)fail('STALE_GENERATION');if(!business.authorise(state,id,'configure'))fail('DELEGATION_REQUIRED');validateConfig(r.kind,completeConfig);r.desired=clone(completeConfig);r.generation++;r.provisioning={status:'pending',due:state.clock+1,generation:r.generation};return r;}
    const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
    const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
    function applyLeaver(state,id,completeConfig,revocations,expectedGeneration,jobId){
      if(!Array.isArray(revocations)||!revocations.length||new Set(revocations).size!==revocations.length||revocations.some(x=>!['identity','group-token','number','device'].includes(x)))fail('LEAVER_REVOCATION_INTENT_REQUIRED');
      const trial=clone(state),r=trial.resources[id];if(!r)fail('RESOURCE_UNAVAILABLE');if(r.generation!==expectedGeneration)fail('STALE_GENERATION');
      const row=trial.estate.inventory.find(x=>x.resourceId===id&&x.canonicalId===id&&!x.conflicts.length&&!x.unknowns.length);if(!row)fail('IDENTITY_LINK_REQUIRED');
      const profile=trial.resources.identity?.effective?.identities||trial.resources.identity?.desired?.identities||[];
      const job=trial.estate.jobs.find(j=>j.id===jobId&&j.operation==='leaver'&&j.items.some(item=>item.resource===id&&item.expectedGeneration===expectedGeneration));
      if(!job)fail('LEAVER_JOB_LINEAGE_REQUIRED');
      if(job.managedApproval){
        const approval=job.managedApproval,contract=trial.business?.contracts.find(c=>c.id===approval.contractId),resources=managedLeaverResources(trial,id,completeConfig,revocations);
        if(approval.tenant!==trial.tenant||JSON.stringify(resources)!==JSON.stringify(approval.requiredResources))fail('MANAGED_LEAVER_SCOPE_CHANGED');
        if(!contract||contract.status!=='active'||contract.renewAt<=trial.clock||contract.offer!=='managed-operations'||contract.unit!=='managed-operation'||contract.currency!=='AUD'||contract.sell!==true||contract.customer!=='customer'||contract.supportOwner!==approval.operator||!trial.business.organisations[approval.operator]?.roles.some(role=>['msp','integrator'].includes(role))||resources.some(resource=>!contract.resources.includes(resource)))fail('MANAGED_SUPPORT_CONTRACT_REQUIRED');
        const acting={...trial,business:{...trial.business,player:approval.operator}};
        for(const resource of resources)if(!business.authorise(acting,resource,'configure'))fail('MANAGED_AUTHORITY_DENIED');
      }
      let principal=null,change;
      if(revocations.includes('device')){
        if(revocations.length!==1||!['endpoint','room'].includes(r.kind))fail('LEAVER_REVOCATION_RESOURCE_MISMATCH');
        principal=r.kind==='endpoint'?r.desired.identity:r.desired.account;
        const identityItem=job?.items.find(item=>item.resource==='identity'&&item.revocations?.includes('identity')&&Array.isArray(item.config?.identities)&&!item.config.identities.includes(principal));
        if(!profile.includes(principal)&&!identityItem)fail('LEAVER_IDENTITY_UNKNOWN');
        const expected=clone(r.desired);if(r.kind==='endpoint')expected.registered=false;else expected.enabled=false;
        if(!same(completeConfig,expected))fail('DEVICE_REVOCATION_CONFIG_REQUIRED');
        change=()=>applyResource(trial,id,completeConfig,expectedGeneration);
      }else{
        if(!revocations.includes('identity')||id!=='identity'||r.kind!=='directory')fail('LEAVER_REVOCATION_RESOURCE_MISMATCH');
        const before=r.desired.identities,after=completeConfig?.identities;
        const removed=before.filter(x=>!Array.isArray(after)||!after.includes(x)),added=Array.isArray(after)?after.filter(x=>!before.includes(x)):[];
        if(removed.length!==1||added.length||!r.desired.entitled.includes(removed[0])||!Array.isArray(completeConfig.entitled)||completeConfig.entitled.includes(removed[0]))fail('LEAVER_IDENTITY_CONFIG_REQUIRED');
        principal=removed[0];if(!profile.includes(principal))fail('LEAVER_IDENTITY_UNKNOWN');
        const expected=clone(r.desired);expected.identities=before.filter(x=>x!==principal);expected.entitled=r.desired.entitled.filter(x=>x!==principal);
        if(!same(completeConfig,expected))fail('LEAVER_COMPLETE_CONFIG_REQUIRED');
        const devices=Object.values(trial.resources).filter(x=>x.kind==='endpoint'&&x.desired.identity===principal||x.kind==='room'&&x.desired.account===principal);
        for(const device of devices){const item=job?.items.find(x=>x.resource===device.id&&x.revocations?.includes('device')&&(x.kind==='device'));if(!item)fail('LEAVER_DEVICE_ITEM_REQUIRED');}
        change=()=>applyResource(trial,id,completeConfig,expectedGeneration);
      }
      if(trial.workforceOps){
        const person=trial.workforceOps.roster.desired.find(x=>x.id===principal);
        if(person){if(trial.workforceOps.assignments.some(x=>x.person===principal&&['voice','digital','wrap'].includes(x.status)))fail('WORKFORCE_ASSIGNMENT_ACTIVE');if(person.available){if(!business.authorise(trial,'people','configure'))fail('DELEGATION_REQUIRED');workforce.command(trial,{action:'availability',person:principal,available:false});}}
      }
      if(!business.authorise(trial,'identity','configure'))fail('DELEGATION_REQUIRED');
      if(revocations.includes('identity')&&trial.calling){
        if(!business.authorise(trial,'phone','configure'))fail('DELEGATION_REQUIRED');
        const node=trial.calling.nodes.directory,old=node.desired,oldPerson=old.identities.find(x=>x.canonical===principal);
        const directory={...clone(old),identities:old.identities.filter(x=>x.canonical!==principal)};
        if(revocations.includes('number'))directory.publicReach=old.publicReach.filter(x=>!oldPerson||x.number!==oldPerson.number||x.tenant!==oldPerson.tenant);
        if(!same(directory,old))calling.configure(trial.calling,{node:'directory',config:directory,at:trial.clock});
      }
      if(revocations.includes('group-token')){
        if(!trial.calling)fail('GROUP_TOKEN_MAPPING_UNAVAILABLE');if(!business.authorise(trial,'phone','configure'))fail('DELEGATION_REQUIRED');
        const old=trial.calling.nodes.services.desired,groups=old.groups.map(g=>({...g,members:g.members.filter(x=>x!==principal)})),mailboxes=old.mailboxes.map(m=>m.delegate===principal?{...m,delegate:null}:m),forwarding=old.forwarding.filter(x=>x.from!==principal&&x.target!==principal),fallback=old.fallback.filter(x=>x.from!==principal&&x.target!==principal);
        const services={...clone(old),groups,mailboxes,forwarding,fallback};if(same(services,old))fail('GROUP_TOKEN_MAPPING_UNAVAILABLE');calling.configure(trial.calling,{node:'services',config:services,at:trial.clock});
      }
      if(revocations.includes('number')){
        if(!business.authorise(trial,'carrier','configure'))fail('DELEGATION_REQUIRED');
        let found=false;if(trial.operations){for(const n of trial.operations.numbers.filter(x=>x.holder===principal&&x.status==='active')){n.holder=null;n.status='reserved';found=true;}}
        if(trial.calling){const node=trial.calling.nodes.directory,old=node.desired,person=old.identities.find(x=>x.canonical===principal),effective=trial.calling.nodes.directory.effective?.identities.find(x=>x.canonical===principal),number=person?.number||effective?.number;if(number){const base=clone(node.desired),identities=base.identities.map(x=>x.canonical===principal?{...x,number:''}:x),publicReach=base.publicReach.filter(x=>x.number!==number);const directory={...base,identities,publicReach};calling.configure(trial.calling,{node:'directory',config:directory,at:trial.clock});found=true;}}
        if(!found)fail('NUMBER_ACCESS_UNAVAILABLE');
      }
      change();
      if(trial.calling)calling.validate(trial.calling);if(trial.workforceOps)workforce.validate(trial);if(trial.operations)operations.validate(trial);
      state.resources=trial.resources;state.calling=trial.calling;state.workforceOps=trial.workforceOps;state.operations=trial.operations;
      return state.resources[id];
    }
    function nativeMeetingRequired(state,resourceId){const r=state.resources[resourceId];return r?.kind==='room'&&(r.effective?.mode==='native'||r.desired?.mode==='native');}
    function nativeMeetingCompatible(state,resourceId,firmware){
      const r=state.resources[resourceId],room=r?.effective,firmwareLevel=Number(String(firmware).replace(/\D/g,''));
      if(resourceId!=='room'||r?.kind!=='room'||!room||!observe(state,'room').ready||firmwareLevel<2||room.firmware<2||room.mode!=='native'||room.interop||!room.calendar||!room.microphone||!room.camera)return false;
      const directory=state.resources[room.directory]?.effective;if(!directory||!observe(state,room.directory).ready||!directory.identities.includes(room.account))return false;
      if(!state.products)return false;
      const choices={
        'microsoft:meetings-rooms':{modes:['room-deployment'],features:['meetings','room-devices']},
        'cisco:meetings-devices':{modes:['native-room'],features:['room-device','native-join']}
      };
      return state.products.deployments.some(d=>{const spec=choices[d.effective?.family];if(!spec||!spec.modes.includes(d.effective.mode)||!d.effective.productVersion)return false;return d.effective.features.some(feature=>spec.features.includes(feature)&&products.bindingStatus(state,d.id,feature,resourceId,productHooks(state)).available);});
    }
    return {getResource,applyResource,applyLeaver,nativeMeetingRequired,nativeMeetingCompatible};
  }
  function campaignConfiguration(s){return JSON.stringify([Object.entries(s.resources).map(([id,r])=>[id,r.generation,r.desired,r.effective]),operations.fingerprint(s),information.fingerprint(s),contact.fingerprint(s),workforce.fingerprint(s),s.calling?calling.fingerprint(s.calling):null,s.products?products.fingerprint(s):null,s.channels?channels.fingerprint(s.channels):null,s.outcomes?outcomes.fingerprint(s):null,s.boundaries?boundaries.fingerprint(s):null,s.transport?transport.fingerprint(s):null,...(s.siteOperations?[siteOperations.configurationFingerprint(s)]:[]),...(s.mediaNegotiation?[mediaNegotiation.fingerprint(s)]:[]),...(s.productEvidence?[productEvidence.fingerprint(s)]:[])]);}
  function progressionHooks(s){return {portfolioHooks:portfolioHooks(s),siteHooks:siteHooks(),boundaryAssessment:(state,id)=>boundaries.evaluate(state,id),integrationStatus:(state,id)=>{const edge=state.products?.integrations.find(e=>e.id===id);if(!edge)return {status:'missing'};const report=products.compatibilityStatus(state,id);if(report.status!=='scenario-verified')return report;for(const [deploymentId,featureKey] of [[edge.source,'sourceFeature'],[edge.target,'targetFeature']]){const deployment=state.products.deployments.find(d=>d.id===deploymentId);for(const pair of edge.features){const feature=pair[featureKey],binding=deployment.effective?.bindings.find(b=>b.feature===feature);if(!binding||binding.resources.some(resourceId=>!productServices(state)[resourceId]?.ready||!products.bindingStatus(state,deploymentId,feature,resourceId,productHooks(state)).available))return {status:'unavailable'};}}return report;},marketQualificationHooks:()=>marketHooks(),productBindingAvailable:(state,deploymentId,feature,resourceId)=>productServices(state)[resourceId]?.ready===true&&products.bindingStatus(state,deploymentId,feature,resourceId,productHooks(state)).available,observeResource:(state,id)=>{const observation=observe(state,id),gate=productGate(state,id),boundary=boundaryCheck(state,id);return {...observation,ready:observation.ready&&(!gate||gate.available)&&(!boundary||boundary.eligible)};}};}
  function serviceObservationHooks(){const domains=(s,edges)=>[...new Set(edges.map(id=>s.transport?.links[id]?.effective?.domain).filter(Boolean))];return {observeResource:(s,id)=>productServices(s)[id],dispatchRootCommand:(s,c)=>dispatch(s,c),observeTransportPath:(s,q)=>{const p=transport.resourcePath(s,q.from,q.to,q.profile);return {...p,domains:domains(s,p.edges||[])};},transportDomainsForEdges:domains,transportDomainFailed:(s,id)=>s.transport?.domains[id]===true};}
  function managedHooks(){return {
    leaverResources:(state,q)=>{const child=state.portfolio?.customers.find(c=>c.id===q.customerId)?.root;return managedLeaverResources(child,q.resource,q.config,q.revocations);},
    authorizeCustomer:(state,q)=>{const row=state.portfolio?.customers.find(c=>c.id===q.customerId),b=row?.root.business,c=b?.contracts.find(c=>c.id===q.contractId);return !!row?.active&&c?.status==='active'&&c.supportOwner===q.operator&&c.resources.includes(q.resource)&&business.authorise({...row.root,business:{...b,player:q.operator}},q.resource,q.action);},
    dispatchCustomer:(state,customerId,command)=>{portfolio.command(state.portfolio,{action:'dispatchcustomer',customerId,command},portfolioHooks(state));return state.portfolio.customers.find(c=>c.id===customerId).root;},
    resourceReadiness:(state,q)=>{const child=state.portfolio?.customers.find(c=>c.id===q.customerId)?.root,r=child?.resources[q.resource];return !!r&&r.generation===q.generation&&r.provisioning.status==='ready'&&JSON.stringify(r.effective)===JSON.stringify(q.config)&&productServices(child)[q.resource]?.ready===true;},
    settleUsage:(state,q)=>{const row=state.portfolio?.customers.find(c=>c.id===q.customerId);if(!row?.active||!productServices(row.root)[q.resource]?.ready)fail('MANAGED_USAGE_RESOURCE_UNAVAILABLE');return business.managedUsage(row.root,q);}
  };}
  function portfolioHooks(s,advancing=false){return {...(advancing?{adoptAdvancedCustomer:state=>state}:{}),managedOperationsObligations:customerId=>!!s.managedOperations?.jobs.some(job=>job.participants.some(p=>p.customerId===customerId&&p.childJobId&&(p.status!=='complete'||p.items.some(item=>item.status!=='complete'||item.billingStatus!=='posted')))),createCustomer:(_,c)=>create({scenario:c.scenario,jurisdiction:c.jurisdiction,tenant:c.tenant,customerName:c.name,clock:c.clock,mode:s.mode,seed:s.seed}),dispatchCustomer:(state,command)=>state.providerCustomer?dispatchInternal(state,command,true,advancing,false,s):dispatch(state,command),validateCustomer:state=>{if(state.mode!==s.mode||state.seed!==s.seed)fail('PORTFOLIO_CUSTOMER_CONTEXT_MISMATCH');if(!advancing)validateState(state,s);return true;}};}
  // Only authored campaign rules can reach these capabilities. They are never exported.
  function providerResilienceHooks(parent){
    return {
      authorizedTransportEvolution:(p,c,child)=>providerOwnedTransportEvolution(parent,c,child),
      validatePaidProject:(p,c,project)=>{
        const entry=parent.business.ledger.find(row=>row.id===project.postingId),number=Number(project.postingId.slice(6));
        return entry?entry.category==='cost'&&entry.cents===project.setupCents&&entry.customerId===c.id&&entry.projectId===project.id:Number.isSafeInteger(number)&&number>0&&number<=(parent.business.ledgerPrunedThrough||0);
      },
      resourceOwnedAt:(child,id,at)=>parent.providerCampaign.projects.some(project=>project.customerId===child.providerCustomer.id&&project.configSubmittedAt!==null&&project.configSubmittedAt<=at&&project.status!=='cancelled'&&project.resources.includes(id)),
      managedEligibility:(p,c)=>p.progressionReceipts?.receipts?.some(receipt=>receipt.sourceId==='progress.goal.'+'rd'&&receipt.sourceEvidence?.market===c.market)===true,
      validateDomainState:(p,c,child)=>{
        const incidents=p.incidents.filter(i=>i.customerId===c.id&&i.kind==='transport-domain');
        const expected={};
        for(const incident of incidents){
          const job=p.jobs.find(j=>j.id===incident.jobId),sequence=job?.resilienceSequence;
          if(!sequence||sequence.incidentId!==incident.id||incident.domain!==c.id+'-primary-domain'||incident.resource!=='access'||incident.fault!=='TRANSPORT_DOMAIN'||incident.activatedAt!==sequence.windowStart||incident.receipt?.at!==incident.activatedAt||incident.receipt?.domain!==incident.domain)return false;
          expected[incident.domain]=true;
          if(incident.status==='resolved'){
            const repair=p.projects.find(project=>project.id===incident.repairProjectId&&project.customerId===c.id&&project.operationId==='transport-repair'&&project.configSubmittedAt===incident.resolvedAt);
            if(!repair||repair.operationReceipt?.incidentId!==incident.id||repair.operationReceipt?.domain!==incident.domain||repair.operationReceipt?.at!==incident.resolvedAt-1)return false;
            expected[incident.domain]=false;
          }
        }
        for(const x of child.siteOperations?.exercises||[]){
          const project=p.projects.find(project=>project.customerId===c.id&&['site-recovery','managed-site-recovery'].includes(project.operationId)&&project.operationReceipt?.exerciseId===x.id);
          if(!project||project.config.kind!==x.kind||project.config.targetSite!==x.targetSite)return false;
          if(x.fault)expected[x.failedDomain]=x.phase==='faulted'&&!project.siteAbort;
        }
        return JSON.stringify(Object.entries(child.transport.domains).sort())===JSON.stringify(Object.entries(expected).sort());
      }
    };
  }
  function providerResilienceReady(child,definition,project){
    if(definition.id==='transport-repair')return child.transport?.domains[project.operationReceipt?.domain]===false;
    const installed=child.providerResilience?.installations.find(row=>row.projectId===project.id);
    return !!installed&&[...installed.sites.map(row=>child.transport.sites[row.id]),...installed.links.map(row=>child.transport.links[row.id])].every(node=>node?.provisioning.status==='ready'&&node.effectiveGeneration===1);
  }
  function providerResilienceActions(s,customerId){
    return [...providerResilience.OPS,'transport-repair'].map(id=>{const quote=providerCampaign.quote(s,{action:'operation',operationId:id,customerId},providerHooks());return {id,name:providerRules.data.operations.find(row=>row.id===id).name,available:quote.blockers.length===0,blockers:clone(quote.blockers),quote};});
  }
  function providerMeetingActions(s,customerId){return ['browser-guest-room','room','cisco-meetings-interoperability'].map(id=>{const quote=providerCampaign.quote(s,{action:'operation',operationId:id,customerId},providerHooks());return {id,name:providerRules.data.operations.find(row=>row.id===id)?.name||providerProducts.recipes[id].name,available:quote.blockers.length===0,blockers:clone(quote.blockers),quote};});}
  function providerCustodyPins(projectId,evidence){
    const all=providerOwnedSiteCustody.retentionPins(evidence),pins={};
    for(const key of ['interactionIds','caseIds','processingJobIds','recordIds'])pins[key]=[...new Set(all[key])].sort();
    return {version:1,projectId,pins};
  }
  function expectedProviderCustodyPins(parent,customerId,receipts=parent.providerCampaign.progressionReceipts?.receipts||[]){
    const p=parent.providerCampaign.projects.find(p=>p.customerId===customerId&&p.operationId==='custody-review'&&p.operationReceipt?.custody);
    if(!p)return undefined;
    const marker=providerCustodyPins(p.id,p.operationReceipt.custody);
    for(const receipt of receipts.filter(r=>r.sourceEvidence?.missions?.support&&r.sourceEvidence.customerId===customerId))for(const participant of receipt.sourceEvidence.missions?.support?.supportSample?.participants||[])for(const job of participant.freshJobs||[]){marker.pins.interactionIds.push(job.interactionId);marker.pins.caseIds.push(job.caseId);}
    for(const key of Object.keys(marker.pins))marker.pins[key]=[...new Set(marker.pins[key])].sort();
    return marker;
  }
  function providerOwnedMissionSummary(parent){
    const p=parent.providerCampaign,proofs=[...(p.segmentHistory||[]).map(row=>row.victoryProof),p.mission.victoryProof].filter(Boolean),missions=[];
    for(const scenario of ['defence','enterprise','government','smb']){
      const victory=proofs.find(v=>v.scenario===scenario&&providerCampaign.retainedMissionVictory(parent,v));
      if(!victory)return null;
      const c=p.customers.find(c=>c.id===victory.winnerCustomerId),child=parent.portfolio.customers.find(row=>row.id===c?.portfolioId)?.root;
      const project=p.projects.find(project=>project.id===c?.stages.partner?.projectId&&project.customerId===c.id&&project.kind==='stage'&&project.stage==='partner'&&project.status==='complete');
      if(!child||!project)return null;
      missions.push({customerId:c.id,tenant:child.tenant,victory:clone(victory),projectId:project.id,postingId:project.postingId});
    }
    return {version:1,at:Math.max(...missions.map(row=>Math.max(row.victory.at,p.projects.find(project=>project.id===row.projectId).completedAt))),missions};
  }
  function providerOwnedMissionSupportHooks(parent){
    const factHooks=providerProgressionHooks(parent,false),samples=providerProgressionFacts.decodeSupportObservation(parent.providerCampaign.supportObservation);
    return {factHooks,supportSamples:samples,
      validateMissionEvidence:(s,id,summary)=>JSON.stringify(summary)===JSON.stringify(providerOwnedMissionSummary(s)),
      currentResponsibility:(s,id)=>{const record=providerResponsibility.responsibilities(s,id,factHooks).records.find(r=>r.role==='msp'&&r.organisationId==='orchard-msp');return record?{...record,scope:[...record.scope].sort()}:null;},
      currentSupportSample:(s,id)=>{const sample=samples.at(-1),current=providerProgressionFacts.sampleSupport(s,factHooks);return sample?.at===s.clock&&JSON.stringify(sample.participants.find(p=>p.customerId===id))===JSON.stringify(current.participants.find(p=>p.customerId===id))?sample:null;},
      validateHistoricalSupportSnapshot:(s,id,at,evidence)=>{const shared=evidence.responsibility?.evidence?.sharedWorkforce,payroll=s.providerCampaign.payroll;return !!shared&&at<=s.clock&&shared.support>0&&shared.personMinutes>0&&shared.billedMinutes>0&&shared.billedMinutes<=shared.personMinutes&&shared.personMinutes<=(at-s.providerCampaign.startedAt)*40&&shared.personMinutes<=payroll.personMinutes&&shared.billedMinutes<=payroll.billedMinutes&&providerProgressionFacts.validateSupportSamples(s,[evidence.supportSample],factHooks,{checkCurrent:false});}
    };
  }
  function providerOwnedMissionEvidence(parent,customerId,options={}){
    const summary=providerOwnedMissionSummary(parent);if(!summary||summary.at>(options.at??parent.clock))return null;
    const hooks=providerOwnedMissionSupportHooks(parent);
    if(options.historical){const saved=options.evidence;if(!saved)return null;const {support,...prior}=saved;return JSON.stringify(prior)===JSON.stringify(summary)&&providerOwnedSiteMission.validateEvidence(parent,customerId,support,summary,hooks,{historical:true,claimedAt:options.at})?clone(saved):null;}
    const result=providerOwnedSiteMission.evaluate(parent,customerId,summary,hooks);return result.status==='ready'?{...summary,support:result.evidence}:null;
  }
  function providerSiteMigrationBusy(child,resourceId){
    const resources=[resourceId,config(child,resourceId)?.identity].filter(Boolean);
    return (child.transport?.reservations||[]).some(r=>resources.includes(r.from)||resources.includes(r.to));
  }
  function providerCustodyPermissionSnapshotAt(s,customerId,child,at,context){
    const customer=s.providerCampaign.customers.find(c=>c.id===customerId);if(!customer||!Number.isSafeInteger(at)||at>s.clock)return null;
    const archive=providerConfigurationAuthority.configurationAt(s.providerCampaign,customer,child,'archive',at,{catalogue});if(!archive)return null;
    // Provider operations start this pack but never author its read boundary.
    const info=information.create({clock:0,jurisdiction:child.jurisdiction}).boundary;
    let serviceBoundary={contractId:null,generation:null,flowId:null,effective:null},generation=0,policy=null;
    const projects=s.providerCampaign.projects.filter(p=>p.customerId===customerId&&p.configSubmittedAt!==null&&p.configSubmittedAt<=at&&p.status!=='cancelled').sort((a,b)=>a.configSubmittedAt-b.configSubmittedAt||a.acceptedAt-b.acceptedAt);
    for(const project of projects){
      if(['compliance','compliance-local'].includes(project.operationId)){
        const architecture=governmentArchitectures.plan(project.operationId==='compliance-local'?'local-processing':'regional-cloud',{jurisdiction:child.jurisdiction,resources:['recorder','archive','speech'],contractId:'provider-public-service-processing'});
        policy={...architecture.boundaryContract,id:'provider-public-service-capture',flows:architecture.boundaryContract.flows.filter(f=>['archive','recorder'].includes(f.resource))};
      }else if(project.operationId!=='public-service-capture-reserve'||!policy)continue;
      generation++;
      const flows=[];for(const flow of policy.flows){const resource=providerConfigurationAuthority.configurationAt(s.providerCampaign,customer,child,flow.resource,project.configSubmittedAt,{catalogue});if(!resource)return null;flows.push({...clone(flow),resourceGeneration:resource.generation});}
      serviceBoundary={contractId:policy.id,generation,flowId:'archive-flow',effective:{...clone(policy),flows}};
    }
    const record=child.records.find(r=>r.id===context.recordId);if(!record)return null;
    const view={...child,information:{...child.information,boundary:{effective:info.desired}}},flow=serviceBoundary.effective?.flows.find(f=>f.resource==='archive');
    const canRead=archive.config.enabled===true&&archive.config.access.includes(context.role)&&archive.config.region===record.region&&information.canRead(view,{...record,deleted:false},context.role,context.region)&&(!flow||flow.accessRoles.includes(context.role)&&flow.storageRegions.includes(record.region));
    return {informationGeneration:info.generation,informationDesired:clone(info.desired),informationEffective:clone(info.desired),archive:{id:'archive',generation:archive.generation,effective:clone(archive.config)},serviceBoundary,canRead:!!canRead};
  }
  function providerOwnedSiteHooks(parent){return {
    customerRoot:(s,id)=>s.portfolio.customers.find(c=>c.id===id)?.root,siteOperationsHooks:providerSiteHooks(parent),
    custodyReadiness:(s,c,child)=>providerOwnedSiteCustody.readiness(s,c.id,child),
    permissionSnapshotAt:providerCustodyPermissionSnapshotAt,
    validateCustodyRead:(s,c,child,r,options)=>{const project=s.providerCampaign.projects.find(p=>p.id===r.projectId);return providerOwnedSiteCustody.validateRead(s,c.id,child,project,r.custody,{permissionSnapshotAt:providerCustodyPermissionSnapshotAt},options);},
    missionEvidence:(s,c,child,options)=>providerOwnedMissionEvidence(s,c.id,options),
    validateMissionEvidence:(s,c,child,e,options)=>JSON.stringify(e)===JSON.stringify(providerOwnedMissionEvidence(s,c.id,{...options,at:options?.at??s.clock,evidence:e}))
  };}
  function providerOwnedSiteActions(parent,customerId){
    const child=parent.portfolio.customers.find(c=>c.id===customerId).root,sites=providerOwnedSites.SITE_IDS;
    const choices=[['power',sites.head],['power',sites.branch],['site-failure',sites.head],['site-failure',sites.branch],['shared-risk',sites.head]],choice=choices.find(([kind,targetSite])=>!parent.providerCampaign.projects.some(p=>p.customerId===customerId&&['site-recovery','managed-site-recovery'].includes(p.operationId)&&p.status==='complete'&&p.config.kind===kind&&p.config.targetSite===targetSite));
    const requests=[{action:'operation',operationId:'site-diverse-ingress',customerId},{action:'operation',operationId:'owned-site-operations',customerId},{action:'operation',operationId:'custody-review',customerId},...(choice?['site-recovery','managed-site-recovery'].map(operationId=>({action:'operation',operationId,customerId,config:{kind:choice[0],targetSite:choice[1]}})):[])];
    for(const resourceId of ['desk','dedicated-endpoint']){const fromSite=child.siteOperations?.bindings[resourceId]?.site;if(fromSite)requests.push({action:'operation',operationId:'site-resource-migration',customerId,config:{resourceId,fromSite,toSite:fromSite===sites.head?sites.branch:sites.head}});}
    return requests.map(request=>{const quote=providerCampaign.quote(parent,request,providerHooks());return {id:request.operationId,request,available:quote.blockers.length===0,quote};});
  }
  function providerOwnedTransportEvolution(parent,customer,child){
    const projects=parent.providerCampaign.projects.filter(p=>p.customerId===customer.id&&providerOwnedSites.OPERATION_IDS.includes(p.operationId)&&p.configSubmittedAt!==null&&!['cancelled','blocked'].includes(p.status));
    const out={version:1,sites:[],links:[],bindings:[],domains:[]};
    if(!projects.length){if(child.siteOperations||child.providerSiteWork)fail('UNFUNDED_PROVIDER_SITE_OPERATIONS');return out;}
    providerOwnedSites.validateCustomer(parent,customer.id,child,providerOwnedSiteHooks(parent));
    validateProviderSiteWork(parent,customer,child);
    for(const p of projects){const r=p.operationReceipt,base={projectId:p.id,postingId:p.postingId,at:p.configSubmittedAt-1};
      if(p.operationId==='site-diverse-ingress'){
        out.sites.push({...base,id:r.siteId,config:clone(child.transport.sites[r.siteId].desired),generation:r.siteGeneration});
        for(const link of r.links)out.links.push({...base,id:link.id,config:clone(child.transport.links[link.id].desired),generation:link.generation});
        out.bindings.push({...base,resource:r.carrierBinding.resource,fromSite:r.carrierBinding.from,toSite:r.carrierBinding.to,receiptId:p.id});
      }
      if(p.operationId==='owned-site-operations')for(const binding of r.transportBindings)out.bindings.push({...base,resource:binding.resource,fromSite:binding.from,toSite:binding.to,receiptId:p.id});
      if(p.operationId==='site-resource-migration'){
        const migration=child.siteOperations.migrations.find(x=>x.id===r.migrationId);
        for(const item of migration?.items||[])if(item.status==='complete'){
          const fromSite=child.siteOperations.sites[migration.fromSite].effective.transportSite,toSite=child.siteOperations.sites[migration.toSite].effective.transportSite;
          for(const resource of [item.resource,config(child,item.resource)?.identity].filter(Boolean))out.bindings.push({...base,at:item.at,resource,fromSite,toSite,receiptId:item.receiptId});
        }
      }
    }
    for(const node of Object.values(child.siteOperations?.sites||{}))for(const id of [node.desired.powerDomain,node.desired.failureDomain,...node.desired.sharedDomains])if(!out.domains.some(x=>x.id===id))out.domains.push({id});
    return out;
  }
  function providerOwnedSiteOrder(parent,customerId,definition,apply){
    const plan=providerOwnedSites.operationPlan(parent,customerId,definition.id,providerOwnedSiteHooks(parent));
    const project=parent.providerCampaign.projects.find(p=>p.id===plan.projectId);
    if(definition.id==='owned-site-operations'){
      let child=parent.portfolio.customers.find(c=>c.id===customerId).root;
      if(!child.operations)apply(parent,customerId,{type:'operations',command:{action:'start'}});
      child=parent.portfolio.customers.find(c=>c.id===customerId).root;
      for(const [number,holder] of [['+61255500202','alex'],['+61255500201','bea']]){
        if(!child.operations.numbers.some(n=>n.number===number))apply(parent,customerId,{type:'operations',command:{action:'reserve',number,type:'user'}});
        apply(parent,customerId,{type:'operations',command:{action:'assign',number,holder}});
      }
    }
    if(definition.id==='owned-site-operations'||project?.ownedSiteRoutingVersion===2&&['site-recovery','managed-site-recovery'].includes(definition.id)){
      const platforms=['phone','dedicated-platform'];
      if(project?.ownedSiteRoutingVersion===2&&parent.portfolio.customers.find(c=>c.id===customerId).root.resources['migration-phone'])platforms.push('migration-phone');
      for(const id of platforms){
        const child=parent.portfolio.customers.find(c=>c.id===customerId).root;
        const routes=[{prefix:'+61255500202',target:'dedicated-endpoint'},{prefix:'+61255500201',target:'desk'},...child.resources[id].desired.routes.filter(r=>!['+61255500202','+61255500201'].includes(r.prefix))];
        apply(parent,customerId,{type:'configure',id,config:{routes}});
      }
    }
    for(const command of plan.commands||[]){
      const child=parent.portfolio.customers.find(c=>c.id===customerId).root;
      if(command.type==='transport')transport.command(child,command.command,{...transportHooks(child),authorize:()=>true});
      else apply(parent,customerId,command);
    }
    if(plan.custodyCandidate){
      const child=parent.portfolio.customers.find(c=>c.id===customerId).root,project=parent.providerCampaign.projects.find(p=>p.id===plan.projectId);
      const audit=child.information.audit.at(-1),candidate=plan.custodyCandidate;
      if(audit?.code!=='RECORD_READ'||audit.record!==candidate.recordId||audit.role!=='supervisor'||audit.at!==child.clock)fail('ACTUAL_CUSTODY_READ_REQUIRED');
      audit.permissionSnapshot={...clone(candidate.permissionSnapshot),readAt:audit.at,permissionReceiptId:'information-read-'+audit.auditId};
      const custody=providerOwnedSiteCustody.completeRead(parent,customerId,child,project,candidate);
      if(!custody)fail('AUTHORIZED_PROCESSED_RECORD_CUSTODY_REQUIRED');
      child.providerCustodyPins=providerCustodyPins(project.id,custody);
      return {kind:'custody-review',version:1,projectId:project.id,postingId:project.postingId,customerId,custody,completedAt:parent.clock};
    }
    if(plan.receiptContract)return clone(plan.receiptContract);
    const child=parent.portfolio.customers.find(c=>c.id===customerId).root;
    if(plan.workflow)return {kind:'site-recovery',version:1,projectId:plan.projectId,postingId:plan.postingId,customerId,exerciseId:plan.workflow.exerciseId,backupSnapshotId:child.siteOperations.exercises.find(x=>x.id===plan.workflow.exerciseId).backupSnapshot.snapshotId,restoreReceiptId:null,completedAt:null};
    if(plan.migration)return {kind:'site-resource-migration',version:1,projectId:plan.projectId,postingId:plan.postingId,customerId,migrationId:plan.migration.id,resourceId:plan.migration.resourceId,fromSite:plan.migration.fromSite,toSite:plan.migration.toSite,completedAt:null};
    fail('PROVIDER_OWNED_SITE_RECEIPT_REQUIRED');
  }
  function providerOwnedSiteOperationReady(parent,project){
    const hooks=providerOwnedSiteHooks(parent),child=parent.portfolio.customers.find(c=>c.id===project.customerId)?.root;
    if(project.operationId==='site-diverse-ingress')return providerOwnedSites.ingressReady(parent,project.customerId,project.id,hooks).ready;
    if(project.operationId==='owned-site-operations')return providerOwnedSites.ownedSiteReady(parent,project.customerId,project.id,hooks).ready&&providerOwnedSites.activationCommands(project.customerId).every(c=>child.siteOperations?.bindings[c.command.resource]?.site===c.command.site);
    return project.operationReceipt?.completedAt!==null&&Number.isSafeInteger(project.operationReceipt?.completedAt);
  }
  function providerOwnedSitePlatformAdvance(parent){
    for(const project of parent.providerCampaign.projects.filter(p=>['migration','migration-consolidated'].includes(p.operationId)&&p.status==='complete')){
      const changes=providerOwnedSites.platformMigrationTransitions(parent,project.customerId,project.id,providerOwnedSiteHooks(parent));
      for(const change of changes){
        if(change?.phase!=='effective')continue;
        const child=parent.portfolio.customers.find(c=>c.id===project.customerId).root,binding=child.siteOperations.bindings[change.resource];
        if(change.currentResourceGeneration!==change.toGeneration||![change.fromGeneration,change.toGeneration].includes(change.priorResourceGeneration)||binding.resourceGeneration!==change.priorResourceGeneration)fail('INVALID_PROVIDER_SITE_PLATFORM_GENERATION');
        // Both purchased sites inventory this endpoint for later paid site moves.
        // Update current inventory only; completed exercise snapshots stay historical.
        for(const node of Object.values(child.siteOperations.sites))if(node.effective&&Object.hasOwn(node.resourceGenerations,change.resource)){
          if(![change.fromGeneration,change.toGeneration].includes(node.resourceGenerations[change.resource]))fail('INVALID_PROVIDER_SITE_PLATFORM_GENERATION');
          node.resourceGenerations[change.resource]=change.toGeneration;
        }
        binding.resourceGeneration=change.toGeneration;
      }
    }
  }
  function providerOwnedSiteAdvance(parent){
    for(const project of parent.providerCampaign.projects.filter(p=>p.operationId==='owned-site-operations'&&p.status==='commissioning')){
      const child=parent.portfolio.customers.find(c=>c.id===project.customerId).root,ready=providerOwnedSites.ownedSiteReady(parent,project.customerId,project.id,providerOwnedSiteHooks(parent));
      if(ready.ready)for(const c of ready.activationCommands)if(child.siteOperations.bindings[c.command.resource]?.site!==c.command.site)siteOperations.command(child,c.command,providerSiteHooks(parent));
    }
    for(const customer of parent.providerCampaign.customers){
      const child=parent.portfolio.customers.find(c=>c.id===customer.portfolioId).root;
      for(const work of child.providerSiteWork||[]){
        const i=child.interactions.find(i=>i.id===work.interactionId),usage=i?.usageMinutes||0,delta=usage-work.billedMinutes;
        if(delta<0)fail('INVALID_SITE_WORK_USAGE');
        if(delta){const cents=delta*providerRules.data.plans[customer.planId].voiceCents,posted=business.postProvider(parent,'cost',cents,{reason:'provider-site-voice-usage',customerId:customer.id,projectId:work.projectId,interactionId:work.interactionId,quantity:delta,usageUnit:'minute',unit:'AUD-cent'});work.billedMinutes=usage;const postingId=typeof posted==='string'?posted:posted.id;work.postingIds.push(postingId);work.usageReceipts.push({id:postingId,at:parent.clock,quantity:delta,cents});}
      }
    }
    for(const p of parent.providerCampaign.projects.filter(p=>['site-recovery','managed-site-recovery','site-resource-migration'].includes(p.operationId)&&p.status==='commissioning')){
      const child=parent.portfolio.customers.find(c=>c.id===p.customerId).root,r=p.operationReceipt;
      if(['site-recovery','managed-site-recovery'].includes(p.operationId)){const x=child.siteOperations?.exercises.find(x=>x.id===r.exerciseId);if(x?.status==='complete'&&x.completion?.at!==undefined)r.completedAt=x.completion.at;}
      else{const m=child.siteOperations?.migrations.find(m=>m.id===r.migrationId);if(m?.phase==='complete'&&m.items.every(i=>i.status==='complete'))r.completedAt=Math.max(...m.items.map(i=>i.at));}
    }
  }
  function providerOwnedSiteJourney(parent,child,q){
    const project=parent.providerCampaign.projects.find(p=>p.customerId===child.providerCustomer.id&&['site-recovery','managed-site-recovery'].includes(p.operationId)&&q.exerciseId==='site-exercise-'+p.id&&p.configSubmittedAt!==null);
    if(!project)fail('PAID_SITE_JOURNEY_REQUIRED');
    child.providerSiteWork??=[];
    let work=child.providerSiteWork.find(w=>w.projectId===project.id&&w.phase===q.phase);
    if(work?.deliveredAt!==null&&work?.deliveredAt!==undefined)return null;
    if(!work){
      if(child.providerSiteWork.length>=60)fail('PROVIDER_SITE_WORK_CAPACITY');
      const target=q.toResources.find(id=>child.transport.bindings[id]===q.targetSite),source=q.phase==='baseline'?q.fromResources.find(id=>child.transport.bindings[id]===q.sourceSite):null;
      if(!target||q.phase==='baseline'&&!source)return {success:false};
      const from=source?config(child,source)?.identity:'+12125550199',caseId='site-'+project.id+'-'+q.phase;
      startInteraction(child,{channel:'voice',direction:source?'outbound':'inbound',from,to:config(child,target).number,caseId,durationMinutes:2,media:{encrypted:true}});
      const i=child.interactions.at(-1);
      work={projectId:project.id,exerciseId:q.exerciseId,phase:q.phase,interactionId:i.id,caseId,startedAt:child.clock,sourceResource:source||'carrier',targetResource:target,sourceSite:q.sourceSite||child.transport.bindings.carrier,targetSite:q.targetSite,deliveredAt:null,billedMinutes:0,postingIds:[],usageReceipts:[]};
      child.providerSiteWork.push(work);
    }
    const i=child.interactions.find(i=>i.id===work.interactionId);
    if(!i)fail('SITE_WORK_INTERACTION_MISSING');
    if(!['resolved','failed'].includes(i.phase))return null;
    work.deliveredAt=child.clock;
    const path=i.trace.find(t=>t.code==='MEDIA_TRANSPORT_ADMITTED');
    return {success:i.phase==='resolved'&&i.outcome==='CONNECTED'&&i.destination===work.targetResource&&i.finishedAt>=i.startedAt+2&&!i.probe,interactionId:i.id,sourceSite:work.sourceSite,targetSite:work.targetSite,targetResource:i.destination,edges:path?.edges||[],interaction:clone(i)};
  }
  function validateProviderSiteWork(parent,customer,child){
    for(const p of parent.providerCampaign.projects.filter(p=>p.customerId===customer.id&&(p.siteAbort!==undefined||['site-recovery','managed-site-recovery'].includes(p.operationId)&&p.status==='blocked'))){
      const a=p.siteAbort,x=child.siteOperations?.exercises.find(x=>x.id===p.operationReceipt?.exerciseId),r=p.operationReceipt;
      if(!['site-recovery','managed-site-recovery'].includes(p.operationId)||p.status!=='blocked'||!a||Object.keys(a).sort().join(',')!=='at,clearedDomain,exerciseId,retainedSetupCents,version'||a.version!==1||!Number.isSafeInteger(a.at)||a.at<p.configSubmittedAt||a.at>parent.clock||p.completedAt!==a.at||a.retainedSetupCents!==p.setupCents||x?.status!=='failed'||a.exerciseId!==x.id||x.id!=='site-exercise-'+p.id||a.clearedDomain!==(x.fault?.id||null)||!r||r.projectId!==p.id||r.postingId!==p.postingId||r.customerId!==customer.id||r.backupSnapshotId!==x.backupSnapshot.snapshotId||r.restoreReceiptId!==(x.restoration?.receiptId||null)||r.completedAt!==null||x.kind!==p.config.kind||x.targetSite!==p.config.targetSite)fail('INVALID_PROVIDER_SITE_ABORT');
      // A later paid exercise can legitimately reuse this failure domain. The
      // ordered domain replay independently checks its current state.
      if(x.baseline?.success!==false&&!x.continuity.some(sample=>sample.success===false)&&x.recoveredJourney?.success!==false&&x.restoration?.status!=='failed')fail('SITE_ABORT_FAILURE_EVIDENCE_REQUIRED');
    }
    const rows=child.providerSiteWork||[],seen=new Set(),postings=new Set();
    if(!Array.isArray(rows)||rows.length>60)fail('INVALID_PROVIDER_SITE_WORK');
    for(const w of rows){
      if(!w||Object.keys(w).sort().join(',')!=='billedMinutes,caseId,deliveredAt,exerciseId,interactionId,phase,postingIds,projectId,sourceResource,sourceSite,startedAt,targetResource,targetSite,usageReceipts'||!['baseline','faulted','recovered'].includes(w.phase)||seen.has(w.projectId+':'+w.phase)||!Array.isArray(w.postingIds)||!Array.isArray(w.usageReceipts)||w.usageReceipts.length!==w.postingIds.length)fail('INVALID_PROVIDER_SITE_WORK');
      seen.add(w.projectId+':'+w.phase);
      const p=parent.providerCampaign.projects.find(p=>p.id===w.projectId&&p.customerId===customer.id&&['site-recovery','managed-site-recovery'].includes(p.operationId)&&p.configSubmittedAt!==null),x=child.siteOperations?.exercises.find(x=>x.id===w.exerciseId),i=child.interactions.find(i=>i.id===w.interactionId);
      if(!p||!x||x.id!=='site-exercise-'+p.id||p.operationReceipt?.exerciseId!==x.id||!i||i.probe||i.channel!=='voice'||i.durationMinutes!==2||i.caseId!==w.caseId||w.caseId!=='site-'+p.id+'-'+w.phase||i.startedAt!==w.startedAt||w.startedAt<x.startedAt||w.startedAt>child.clock||w.billedMinutes!==(i.usageMinutes||0)||!['desk','dedicated-endpoint'].includes(w.targetResource)||i.to!==child.resources[w.targetResource].desired.number)fail('INVALID_PROVIDER_SITE_WORK_LINEAGE');
      const source=w.phase==='baseline'?x.siteSnapshots[x.sites[0]].transportSite:customer.id+'-ingress',target=w.phase==='baseline'?x.siteSnapshots[x.sites[1]].transportSite:x.siteSnapshots[x.sites.find(id=>id!==x.targetSite)].transportSite;
      const bindings=providerOwnedSites.endpointBindingsAt(parent,customer.id,child,w.startedAt),baseline=w.phase==='baseline',sourceIdentity=providerOwnedSites.ENDPOINTS.find(row=>row.resource===w.sourceResource)?.person;
      if(!bindings||w.sourceSite!==source||w.targetSite!==target||bindings[w.targetResource]!==target||i.direction!==(baseline?'outbound':'inbound')||i.from!==(baseline?sourceIdentity:'+12125550199')||(baseline?bindings[w.sourceResource]!==source:w.sourceResource!=='carrier'))fail('INVALID_PROVIDER_SITE_WORK_SCOPE');
      if(w.deliveredAt!==null){const sample=w.phase==='baseline'?x.baseline:w.phase==='recovered'?x.recoveredJourney:x.continuity.find(r=>r.interactionId===i.id||r.success===false&&r.at===w.deliveredAt);if(!Number.isSafeInteger(w.deliveredAt)||w.deliveredAt>child.clock||w.deliveredAt<i.finishedAt||!sample||sample.at!==w.deliveredAt||(sample.success===true?(sample.interactionId!==i.id||i.phase!=='resolved'||i.outcome!=='CONNECTED'||i.destination!==w.targetResource||i.finishedAt<i.startedAt+2):(x.status!=='failed'||!['failed','resolved'].includes(i.phase)||i.phase==='resolved'&&i.outcome==='CONNECTED'&&i.destination===w.targetResource&&i.finishedAt>=i.startedAt+2)))fail('INVALID_PROVIDER_SITE_DELIVERY');}
      let minutes=0;
      for(const [index,id] of w.postingIds.entries()){
        if(postings.has(id))fail('DUPLICATE_PROVIDER_SITE_USAGE');postings.add(id);
        const r=w.usageReceipts[index],row=parent.business.ledger.find(r=>r.id===id),number=Number(/^entry-([1-9][0-9]*)$/.exec(id)?.[1]);
        if(!r||Object.keys(r).sort().join(',')!=='at,cents,id,quantity'||r.id!==id||!Number.isSafeInteger(r.quantity)||r.quantity<1||r.cents!==r.quantity*providerRules.data.plans[customer.planId].voiceCents||!Number.isSafeInteger(r.at)||r.at<=w.startedAt||r.at>parent.clock)fail('INVALID_PROVIDER_SITE_USAGE');
        if(row?(row.reason!=='provider-site-voice-usage'||row.category!=='cost'||row.customerId!==customer.id||row.projectId!==p.id||row.interactionId!==i.id||row.quantity!==r.quantity||row.cents!==r.cents||row.at!==r.at):(!Number.isSafeInteger(number)||number<1||number>(parent.business.ledgerPrunedThrough||0)))fail('INVALID_PROVIDER_SITE_USAGE');
        minutes+=r.quantity;
      }
      if(minutes!==w.billedMinutes)fail('INVALID_PROVIDER_SITE_USAGE');
    }
    if(parent.business.ledger.some(r=>r.customerId===customer.id&&r.reason==='provider-site-voice-usage'&&!postings.has(r.id)))fail('ORPHAN_PROVIDER_SITE_USAGE');
    for(const x of child.siteOperations?.exercises||[])for(const sample of [x.baseline,...x.continuity,x.recoveredJourney].filter(Boolean))if(!rows.some(w=>w.exerciseId===x.id&&(w.interactionId===sample.interactionId||sample.success===false&&['failed','resolved'].includes(child.interactions.find(i=>i.id===w.interactionId)?.phase))&&w.deliveredAt===sample.at))fail('UNFUNDED_PROVIDER_SITE_JOURNEY');
  }
  function providerRegionalSupportHooks(){return {customerRoot:(s,id)=>s.portfolio.customers.find(c=>c.id===id)?.root,observeResource:(child,id)=>providerHooks().observe(child,id),responsibilities:(s,id)=>providerCustomerResponsibility(s,id)};}
  function validateProviderNamedSupport(s){
    providerRegionalSupport.validate(s);
    for(const project of s.providerCampaign.projects){
      if(project.operationId!==providerRegionalSupport.OPERATION_ID){if(['supportRequest','supportReplacesProjectId','supportReplacement','supportCommercialEvidence'].some(key=>Object.hasOwn(project,key)))fail('PROVIDER_SUPPORT_FIELDS_FORBIDDEN');continue;}
      if(s.providerCampaign.contentVersion!=='provider-campaigns-8'||!project.config||!project.supportRequest||Object.keys(project.supportRequest).sort().join(',')!=='coverageId,customerId,market,personId'||project.supportRequest.customerId!==project.customerId||['market','personId','coverageId'].some(key=>project.config[key]!==project.supportRequest[key])||project.status==='complete'&&(project.completedAt<project.dueAt||project.config.coverageId!=='distributor-extended'&&project.completedAt!==project.dueAt))fail('INVALID_PROVIDER_NAMED_SUPPORT_PROJECT');
      const next=s.providerCampaign.projects.find(p=>p.operationId===providerRegionalSupport.OPERATION_ID&&p.supportReplacesProjectId===project.id&&p.status==='complete'),r=project.supportReplacement;
      if(next){if(!r||Object.keys(r).sort().join(',')!=='commitmentEndsAt,effectiveAt,projectId,version'||r.version!==1||r.projectId!==next.id||r.effectiveAt!==next.completedAt||r.commitmentEndsAt!==Math.max(next.completedAt,project.completedAt+project.minimumTermPeriods*60))fail('INVALID_PROVIDER_SUPPORT_REPLACEMENT_TERMS');}
      else if(r!==undefined)fail('INVALID_PROVIDER_SUPPORT_REPLACEMENT_TERMS');
    }
  }
  function providerSupportReplacements(s){
    for(const next of s.providerCampaign.projects.filter(p=>p.operationId===providerRegionalSupport.OPERATION_ID&&p.status==='complete'&&p.supportReplacesProjectId)){
      const old=s.providerCampaign.projects.find(p=>p.id===next.supportReplacesProjectId);if(!old)fail('INVALID_PROVIDER_SUPPORT_REPLACEMENT');
      const receipt={version:1,projectId:next.id,effectiveAt:next.completedAt,commitmentEndsAt:Math.max(next.completedAt,old.completedAt+old.minimumTermPeriods*60)};
      if(old.supportReplacement&&JSON.stringify(old.supportReplacement)!==JSON.stringify(receipt))fail('INVALID_PROVIDER_SUPPORT_REPLACEMENT_TERMS');old.supportReplacement=receipt;
    }
  }
  // Diagnosis reads a narrow native symptom. Its historical reconstruction replays
  // the same validated incident/paid repair writes as resource authority; a saved
  // diagnosis is never its own authorization. Other failure domains stay inconclusive.
  function providerDiagnosisObservation(s,customer,child,incidentId,at=child.clock){
    const p=s.providerCampaign,incident=p.incidents.find(i=>i.id===incidentId&&i.customerId===customer.id);
    if(!incident||!Number.isSafeInteger(at)||at>child.clock||incident.activatedAt===null||incident.activatedAt>at)fail('PROVIDER_DIAGNOSIS_INCIDENT_REQUIRED');
    const resource=({processor:'speech',connectivity:'access'})[incident.resource]||incident.resource;
    let outage=false,connected=true;const events=[];
    for(const i of p.incidents.filter(i=>i.customerId===customer.id&&i.kind!=='transport-domain'&&i.activatedAt!==null&&i.activatedAt<=at))events.push({at:i.activatedAt,order:1,incident:i});
    for(const project of p.projects.filter(x=>x.customerId===customer.id&&['repair','mitigate','service-repair'].includes(x.operationId)&&x.configSubmittedAt!==null&&x.configSubmittedAt<=at&&x.status!=='cancelled'))events.push({at:project.configSubmittedAt,order:0,project});
    events.sort((a,b)=>a.at-b.at||a.order-b.order);
    for(const e of events){if(e.incident){const i=e.incident,id=({processor:'speech',connectivity:'access'})[i.resource]||i.resource;if(i.kind==='disconnection')connected=false;else if(id===resource&&i.kind!=='boundary'&&!(id==='room'&&i.fault==='CAPACITY'))outage=true;}else if(e.project.operationReceipt?.resources?.includes(resource)){outage=false;if(incident.kind==='disconnection')connected=true;}}
    if(at===child.clock&&(incident.kind==='outage'&&(child.resources[resource]?.fault==='OUTAGE')!==outage||incident.kind==='disconnection'&&child.connected!==connected))fail('PROVIDER_DIAGNOSIS_NATIVE_OBSERVATION_MISMATCH');
    const reasons=incident.kind==='outage'&&outage?['OUTAGE']:incident.kind==='disconnection'&&!connected?['DISCONNECTED']:[];
    const status=incident.resolvedAt!==null&&incident.resolvedAt<=at?'resolved':incident.acknowledgedAt!==null&&incident.acknowledgedAt<=at?'acknowledged':'active';
    return {version:1,at,customerId:customer.id,incidentId,resource:incident.resource,incidentKind:incident.kind,incidentStatus:status,incidentFault:incident.fault??null,receipt:clone(incident.receipt??null),serviceReady:reasons.length?false:null,serviceReasons:reasons,paths:[]};
  }
  function providerDiagnosisHooks(s){return {
    observe:(_p,c,child,id)=>providerDiagnosisObservation(s,c,child,id),
    validatePaidProject:(p,c,project)=>{const posting=s.business.ledger.find(e=>e.id===project.postingId),pruned=Number(/^entry-([1-9][0-9]*)$/.exec(project.postingId)?.[1]);return p===s.providerCampaign&&p.projects.includes(project)&&project.customerId===c.id&&(posting?posting.category==='cost'&&posting.cents===6000&&posting.projectId===project.id&&posting.customerId===c.id:Number.isSafeInteger(pruned)&&pruned<=s.business.ledgerPrunedThrough);},
    validateRecordedObservation:(_p,c,project,observation)=>{try{const child=s.portfolio.customers.find(x=>x.id===c.portfolioId).root,at=project.completedAt,i=s.providerCampaign.incidents.find(i=>i.id===project.config.incidentId),expected=providerDiagnosisObservation(s,c,child,i.id,at),status=observation.incidentStatus;const possible=status==='active'?(i.acknowledgedAt===null||i.acknowledgedAt>=at)&&(i.resolvedAt===null||i.resolvedAt>=at):status==='acknowledged'?i.acknowledgedAt!==null&&i.acknowledgedAt<=at&&(i.resolvedAt===null||i.resolvedAt>=at):status==='resolved'&&i.resolvedAt!==null&&i.resolvedAt<=at;if(!possible)return false;expected.incidentStatus=status;return JSON.stringify(expected)===JSON.stringify(observation);}catch{return false;}}
  };}
  function validateProviderDiagnoses(s){
    const p=s.providerCampaign,h=providerDiagnosisHooks(s),seen=new Set();
    for(const project of p.projects){if(project.operationId!==providerIncidentDiagnosis.OPERATION_ID){if(project.operationReceipt?.kind===providerIncidentDiagnosis.OPERATION_ID)fail('INVALID_PROVIDER_DIAGNOSIS_RECEIPT');continue;}
      if(p.contentVersion!=='provider-campaigns-8')fail('INVALID_PROVIDER_DIAGNOSIS_VERSION');
      const c=p.customers.find(c=>c.id===project.customerId),child=s.portfolio.customers.find(x=>x.id===c?.portfolioId)?.root,i=p.incidents.find(i=>i.id===project.config?.incidentId&&i.customerId===c?.id),key=c?.id+'|'+i?.id;
      if(!i||i.activatedAt===null||i.activatedAt>project.acceptedAt||i.resolvedAt!==null&&i.resolvedAt<=project.acceptedAt||seen.has(key)&&!['cancelled','blocked'].includes(project.status))fail('INVALID_PROVIDER_DIAGNOSIS_SCOPE');if(!['cancelled','blocked'].includes(project.status))seen.add(key);
      if(project.configSubmittedAt===null){if(project.operationReceipt!==undefined)fail('INVALID_PROVIDER_DIAGNOSIS_RECEIPT');continue;}
      if(project.status==='complete'){if(project.completedAt!==project.dueAt)fail('INVALID_PROVIDER_DIAGNOSIS_COMPLETION');providerIncidentDiagnosis.validateDiagnosis(p,c,child,project.operationReceipt?.evidence,h,{historical:true});}
      else if(project.status!=='commissioning'||JSON.stringify(project.operationReceipt)!==JSON.stringify({kind:providerIncidentDiagnosis.OPERATION_ID,version:1,projectId:project.id,postingId:project.postingId}))fail('INVALID_PROVIDER_DIAGNOSIS_RECEIPT');
    }
  }
  function providerFollowupArchiveHooks(){return {followup:providerCaseFollowup,followupHooks:providerFollowupHooks,
    settlement:(s,j)=>s.providerCampaign.customers.find(c=>c.id===j.customerId)?.history.find(row=>row.period===j.periodIndex),
    validateSettlement:(s,id,record,j,at)=>{try{const c=s.providerCampaign.customers.find(c=>c.id===id),project=s.providerCampaign.projects.find(p=>p.operationId===providerCaseFollowup.RETRY&&p.customerId===id&&p.config?.jobId===j.id),proof=project?.followupSettlementProof;if(!proof||JSON.stringify(proof.customer)!==JSON.stringify(record)||record.settledAt>at)return false;providerCampaign.validateRetainedSettlement(s,c,j,proof,providerHooks());return true;}catch{return false;}},
    validateAcceptance:(s,id,a,i,attempt,j)=>{try{const c=s.providerCampaign.customers.find(c=>c.id===id),root=s.portfolio.customers.find(c=>c.id===id).root,authored=providerCampaign.followupDemandPlan(s,id,j,providerHooks()),grants=s.providerCampaign.projects.filter(p=>p.customerId===id&&(['cisco-programmable-engagement','ms-communications-api'].includes(p.productId)||p.productId==='cisco-provider-operations'&&(p.recipeVersion??1)===1)&&Number.isSafeInteger(p.configSubmittedAt)&&p.configSubmittedAt-1<=a.authorizedAt&&p.operationReceipt?.at===p.configSubmittedAt-1),grant=grants.find(p=>p.configSubmittedAt-1===a.permissionUpdatedAt),feature=providerHandoffCapability(s,id,attempt.at),entry=grant&&s.business.ledger.find(e=>e.id===grant.postingId),n=Number(grant?.postingId?.slice(6));return !!c&&authored.person===a.person&&a.person==='alex'&&a.tenant===root.tenant&&a.channel===authored.account&&a.template===authored.template&&a.permissionExpiresAt===null&&!!grant&&(entry?entry.category==='cost'&&entry.projectId===grant.id&&entry.customerId===id&&entry.cents===grant.setupCents:Number.isSafeInteger(n)&&n>0&&n<=(s.business.ledgerPrunedThrough||0))&&a.accountGeneration===grants.length&&a.permissionUpdatedAt<=i.startedAt&&!!feature.ready&&feature.projectId===attempt.connector.projectId&&feature.generation===attempt.connector.generation&&JSON.stringify(feature.configuration)===JSON.stringify(attempt.connector.configuration)&&i.trace.some(t=>t.code==='CHANNEL_ACCEPTED'&&t.at===a.authorizedAt&&t.job===a.parentJob)&&i.trace.some(t=>t.code==='PRODUCT_FEATURE_ACCEPTED'&&t.resource==='messages'&&t.bindings?.some(b=>b.deploymentId==='d-cisco-programmable-engagement'&&b.feature==='channel-accounts'));}catch{return false;}}
  };}
  function archiveProviderFollowupRetry(s,j,ordinal){
    const p=s.providerCampaign,c=p.customers.find(c=>c.id===j.customerId),project=p.projects.find(x=>x.operationId===providerCaseFollowup.RETRY&&x.customerId===j.customerId&&x.config?.jobId===j.id),customer=c.history.find(row=>row.period===j.periodIndex),provider=p.periodHistory.find(row=>row.period===j.periodIndex);if(!project||!customer||!provider)fail('PROVIDER_FOLLOWUP_SETTLEMENT_REQUIRED');
    const entries=s.business.ledger.filter(e=>e.customerId===j.customerId&&e.period===j.periodIndex&&e.at===customer.to);project.followupSettlementProof={version:1,customer:clone(customer),provider:clone(provider),revenuePostingId:entries.find(e=>e.category==='revenue')?.id||null,costPostingIds:entries.filter(e=>e.category==='cost').map(e=>e.id)};
    project.followupRetryArchive=providerFollowupRetryArchive.create(s,project.id,ordinal,providerFollowupArchiveHooks());
  }
  function validateProviderFollowups(s){
    const p=s.providerCampaign,h=providerFollowupHooks(),seen=new Set();
    for(const project of p.projects){if((project.followupRetryArchive!==undefined)!==(project.followupSettlementProof!==undefined)||project.followupRetryArchive!==undefined&&p.jobs.some(j=>j.id===project.config?.jobId))fail('INVALID_PROVIDER_FOLLOWUP_RETRY_ARCHIVE');if(project.operationId!==providerCaseFollowup.RETRY&&(project.followupRetryArchive!==undefined||project.followupSettlementProof!==undefined))fail('INVALID_PROVIDER_FOLLOWUP_RETRY_ARCHIVE');if(!providerCaseFollowup.terms(project.operationId))continue;
      if(p.caseFollowupVersion!==1||p.contentVersion!=='provider-campaigns-8')fail('INVALID_PROVIDER_CASE_FOLLOWUP_VERSION');
      const key=project.customerId+'|'+project.operationId+'|'+(project.config?.jobId||'');if(!['cancelled','blocked'].includes(project.status)){if(seen.has(key))fail('INVALID_PROVIDER_FOLLOWUP_DUPLICATE');seen.add(key);}
      if(project.configSubmittedAt!==null&&(project.operationReceipt?.kind!=='provider-case-followup-workflow'||Object.keys(project.operationReceipt).sort().join(',')!=='at,kind'||project.operationReceipt.at!==project.configSubmittedAt-1))fail('INVALID_PROVIDER_FOLLOWUP_PROJECT');
      if(project.operationId===providerCaseFollowup.RETRY){const j=p.jobs.find(j=>j.id===project.config?.jobId&&j.customerId===project.customerId);if(j){const first=j.followup?.attempts?.[0],i=h.customerRoot(s,j.customerId).interactions.find(i=>i.id===first?.interactionId);if(!i||i.phase!=='failed'||i.finishedAt>project.acceptedAt||project.dueAt>=j.deadlineAt)fail('INVALID_PROVIDER_FOLLOWUP_RETRY');}else if(!project.followupRetryArchive)fail('INVALID_PROVIDER_FOLLOWUP_RETRY');}
      else {const connector=h.connectorAt(s,project.customerId,project.acceptedAt);if(!connector?.ready)fail('INVALID_PROVIDER_FOLLOWUP_PAID_CONNECTOR');if(project.operationId===providerCaseFollowup.MANAGED&&!h.earnedAt(s,project.customerId,providerCaseFollowup.SOURCE_ID,project.acceptedAt))fail('INVALID_PROVIDER_FOLLOWUP_EARNED');}
    }
    for(const j of p.jobs)if((j.followupPlan!==undefined||j.messageUnits!==undefined)!==(j.followup!==undefined))fail('INVALID_PROVIDER_CASE_FOLLOWUP');
    providerCaseFollowup.validate(s,h);providerFollowupRetryArchive.validateAll(s,providerFollowupArchiveHooks());
  }
  function providerFollowupWorkflowAt(s,id,at){const p=s.providerCampaign.projects.findLast(p=>p.customerId===id&&[providerCaseFollowup.DIRECT,providerCaseFollowup.MANAGED].includes(p.operationId)&&p.status==='complete'&&p.completedAt<=at&&!(p.serviceRetirement?.effectiveAt<=at));return p?{ready:true,projectId:p.id,postingId:p.postingId}:null;}
  function providerFollowupPins(s,id){const pins=providerCaseFollowup.pins(s,id);return pins.interactionIds.length?{version:1,interactionIds:pins.interactionIds.sort(),caseIds:pins.caseIds.sort()}:undefined;}
  function syncProviderFollowupPins(s){for(const c of s.portfolio?.customers||[]){const pins=providerFollowupPins(s,c.id);if(pins)c.root.providerCaseFollowupPins=pins;else delete c.root.providerCaseFollowupPins;}}
  function providerFollowupHooks(){
    const childOf=(s,id)=>s.portfolio.customers.find(c=>c.id===id)?.root;
    return {customerRoot:childOf,authoredCase:(s,id,j)=>providerCampaign.followupDemandPlan(s,id,j,providerHooks()),workflowAt:providerFollowupWorkflowAt,connectorAt:providerHandoffCapability,
      paidProject:(s,p,at)=>{const entry=s.business.ledger.find(e=>e.id===p.postingId),terms=providerCaseFollowup.terms(p.operationId),n=Number(p.postingId?.slice(6));return s.providerCampaign.projects.includes(p)&&p.completedAt<=at&&(!terms||Object.keys(terms).every(k=>p[k]===terms[k]))&&(entry?entry.category==='cost'&&entry.cents===p.setupCents&&entry.projectId===p.id&&entry.customerId===p.customerId&&entry.reason==='provider-operation':Number.isSafeInteger(n)&&n>0&&n<=(s.business.ledgerPrunedThrough||0));},
      earnedAt:(s,id,sourceId,at)=>{const r=s.providerCampaign.progressionReceipts?.receipts?.find(r=>r.sourceId===sourceId&&r.at<=at),c=s.providerCampaign.customers.find(c=>c.id===id);return !!r&&r.sourceEvidence?.market===c?.market&&r.sourceEvidence?.job?.followup?.workflow?.operationId===providerCaseFollowup.DIRECT&&providerCaseFollowup.validateEvidence(s,r.sourceEvidence,providerFollowupHooks());},
      consentAt:(s,id,person,caseId,at)=>{const child=childOf(s,id),j=s.providerCampaign.jobs.find(j=>j.customerId===id&&j.caseId===caseId);if(!j||providerCampaign.followupDemandPlan(s,id,j,providerHooks()).person!==person)return false;
        // Provider channel grants are authored by paid connector preparation.
        // Recommissioning may update today's grant; it cannot erase the earlier
        // permission attached to the original paid project and accepted attempt.
        const grantProject=s.providerCampaign.projects.findLast(p=>p.customerId===id&&['cisco-programmable-engagement','ms-communications-api'].includes(p.productId)&&Number.isSafeInteger(p.configSubmittedAt)&&p.configSubmittedAt-1<=at&&p.operationReceipt?.at===p.configSubmittedAt-1);
        if(!grantProject||person!=='alex')return false;
        const attempt=j.followup?.attempts.find(a=>a.at===at),historical=attempt&&child.channels?.acceptances?.find(a=>a.interaction===attempt.interactionId&&a.caseId===caseId&&a.person===person&&a.tenant===child.tenant&&a.authorizedAt>=at&&a.permissionUpdatedAt<=at&&a.permissionGranted&&(a.permissionExpiresAt===null||a.permissionExpiresAt>at)&&a.channel==='chatterleaf'&&a.purpose==='service');if(historical)return true;
        const grant=child.channels?.permissions?.find(p=>p.person===person&&p.tenant===child.tenant&&p.channel==='chatterleaf'&&p.purpose==='service');return !!grant&&grant.granted&&grant.expiresAt===null&&(grant.updatedAt<=at||at<s.clock&&s.providerCampaign.projects.some(p=>p.customerId===id&&['cisco-programmable-engagement','ms-communications-api'].includes(p.productId)&&p.configSubmittedAt-1===grant.updatedAt));},
      boundaryAt:(s,id,at)=>providerHandoffCapability(s,id,at)?.ready===true,
      humanReady:(s,id)=>providerHandoffHooks().humanReady(s,id),
      retryAt:(s,id,jobId,at)=>{const p=s.providerCampaign.projects.find(p=>p.customerId===id&&p.operationId===providerCaseFollowup.RETRY&&p.config?.jobId===jobId&&p.status==='complete'&&p.completedAt<=at);return p?{projectId:p.id,postingId:p.postingId}:null;},
      connectorAccepted:(s,id,i,proof)=>{const child=childOf(s,id),acceptance=child.channels?.acceptances?.find(a=>a.interaction===i.id&&a.caseId===i.caseId&&a.tenant===i.tenant&&a.person===i.from&&a.permissionGranted&&a.channel===i.account),feature=i.trace.find(t=>t.code==='PRODUCT_FEATURE_ACCEPTED'&&t.resource==='messages'&&t.bindings?.some(b=>b.deploymentId==='d-cisco-programmable-engagement'&&b.feature==='channel-accounts')),snapshot=feature&&providerHandoffCapability(s,id,feature.at);return !!acceptance&&i.trace.some(t=>t.code==='CHANNEL_ACCEPTED')&&!!snapshot?.ready&&snapshot.projectId===proof.projectId&&snapshot.generation===proof.generation&&JSON.stringify(snapshot.configuration)===JSON.stringify(proof.configuration);}
    };
  }
  function providerHandoffPins(s,id){const pins=providerCaseHandoff.pins(s,id);return pins.interactionIds.length?{version:1,...pins}:undefined;}
  function syncProviderHandoffPins(s){for(const customer of s.portfolio?.customers||[]){const pins=providerHandoffPins(s,customer.id);if(pins)customer.root.providerCaseHandoffPins=pins;else delete customer.root.providerCaseHandoffPins;}}
  function providerHandoffCapability(s,id,at){
    const child=s.portfolio?.customers.find(c=>c.id===id)?.root;
    if(!child||typeof providerSupportHistory.productFeatureAt!=='function')return {ready:false};
    return providerSupportHistory.productFeatureAt(s,id,'d-cisco-programmable-engagement','channel-accounts',at,{catalogue,supportWorkOrigin:providerSupportWork.origin,ownedSiteHooks:providerOwnedSiteHooks(s)});
  }
  function providerHandoffHooks(){return {
    customerRoot:(s,id)=>s.portfolio.customers.find(c=>c.id===id)?.root,
    demandPlan:(s,id,j)=>providerCampaign.handoffDemandPlan(s,id,j,providerHooks()),
    capabilityAt:providerHandoffCapability,
    humanReady:(s,id)=>{const child=s.portfolio.customers.find(c=>c.id===id)?.root;return !!child&&observe(child,'people').ready&&workforce.effectiveCapacity(child,{channel:'digital',skill:config(child,'service')?.skill||'service',language:'en'}).capacity>0;},
    finish:(s,id,interactionId,code)=>{const child=s.portfolio.customers.find(c=>c.id===id).root,i=child.interactions.find(i=>i.id===interactionId);if(!i)fail('PROVIDER_CASE_HANDOFF_SOURCE_REQUIRED');const prior=providerHandoffPins(s,id)||{version:1,interactionIds:[],caseIds:[]};child.providerCaseHandoffPins={version:1,interactionIds:[...new Set([...prior.interactionIds,i.id])].sort(),caseIds:[...new Set([...prior.caseIds,i.caseId])].sort()};finish(child,i,code);},
    start:(s,id,command)=>providerHooks().interact(s,id,command),
    record:(s,id,sourceId,targetId,detail)=>{const child=s.portfolio.customers.find(c=>c.id===id).root;for(const interactionId of [sourceId,targetId])event(child,child.interactions.find(i=>i.id===interactionId),'handoff',providerCaseHandoff.CODE,{detail:clone(detail)});}
  };}
  function providerSecurityEqual(a,b){const sort=x=>Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;return JSON.stringify(sort(a))===JSON.stringify(sort(b));}
  function providerSecurityPinsFor(s,customerId){
    const runs=(s.providerSecurityAbuse?.runs||[]).filter(run=>run.recipe.customerId===customerId);
    if(!runs.length)return undefined;
    const pins={version:1,eventIds:[],interactionIds:[],jobIds:[],caseIds:[]};
    for(const run of runs){
      pins.eventIds.push(...Object.values(run.eventIds));
      if(run.blockedInteractionId)pins.interactionIds.push(run.blockedInteractionId);
      if(run.blockedCaseId)pins.caseIds.push(run.blockedCaseId);
      if(run.evidence){pins.interactionIds.push(run.evidence.interactionId);pins.jobIds.push(run.evidence.jobId);pins.caseIds.push(run.evidence.caseId);}
    }
    for(const key of ['eventIds','interactionIds','jobIds','caseIds'])pins[key]=[...new Set(pins[key])].sort();
    return pins;
  }
  function syncProviderSecurityPins(s){for(const row of s.portfolio.customers){const pins=providerSecurityPinsFor(s,row.id);if(pins)row.root.providerSecurityPins=pins;else delete row.root.providerSecurityPins;}}
  function validateProviderSecurityAbuse(s){
    const store=s.providerSecurityAbuse;
    if(store!==undefined){
      if(!store||Object.keys(store).sort().join(',')!=='runs,version'||store.version!==1||!Array.isArray(store.runs)||store.runs.length>200||new Set(store.runs.map(run=>run?.recipe?.runKey)).size!==store.runs.length)fail('INVALID_PROVIDER_SECURITY_ABUSE');
      for(const run of store.runs){
        const recipe=run?.recipe,child=s.portfolio.customers.find(row=>row.id===recipe?.portfolioId)?.root;
        if(!run||Object.keys(run).sort().join(',')!=='blockedCaseId,blockedInteractionId,eventIds,evidence,recipe'||!child||!providerSecurity.validateAbuseRecipe(s,recipe,child,{historical:true})||recipe.controlBindings.some(binding=>{const project=s.providerCampaign.projects.find(p=>p.id===binding.projectId);return !Number.isSafeInteger(project?.completedAt)||project.completedAt>recipe.createdAt;}))fail('INVALID_PROVIDER_SECURITY_ABUSE_RECIPE');
        const names=['network','sipRate','sipOversize','sipAllowed','destination'];
        if(!run.eventIds||Object.keys(run.eventIds).sort().join(',')!==names.slice().sort().join(',')||new Set(Object.values(run.eventIds)).size!==5)fail('INVALID_PROVIDER_SECURITY_ABUSE_EVENTS');
        let previous=0;
        for(const name of names){const e=child.admissionSecurity?.events.find(e=>e.id===run.eventIds[name]),number=Number(/^security-event-([1-9]\d*)$/.exec(e?.id||'')?.[1]);
          if(!e||e.at!==recipe.createdAt||!Number.isSafeInteger(number)||number<=previous||!providerSecurity.abuseEventMatchesV2(name,e,recipe,child))fail('INVALID_PROVIDER_SECURITY_ABUSE_EVENTS');previous=number;
        }
        const blocked=child.interactions.find(i=>i.id===run.blockedInteractionId),event=child.admissionSecurity.events.find(e=>e.id===run.eventIds.destination);
        if(!isId(run.blockedCaseId)||!blocked||event.detail.interactionId!==blocked.id||blocked.caseId!==run.blockedCaseId||blocked.phase!=='failed'||blocked.outcome!=='DESTINATION_NOT_ALLOWED'||blocked.startedAt!==recipe.createdAt||blocked.finishedAt!==recipe.createdAt||!blocked.trace.some(t=>t.stage==='security'&&t.code==='SECURITY_CALL_BLOCKED'&&t.nativeEventId===event.id&&providerSecurityEqual(t.reasons,event.detail.reasons))||!child.cases[run.blockedCaseId]?.interactions.includes(blocked.id))fail('INVALID_PROVIDER_SECURITY_ABUSE_INTERACTION');
        if(run.evidence!==null&&(!providerSecurityEqual(run.evidence.recipe,recipe)||!providerSecurityEqual(run.evidence.abuseEventIds,run.eventIds)||run.evidence.blockedInteractionId!==run.blockedInteractionId||!providerSecurity.validateEvidence(s,run.evidence,child,{historical:true})||s.providerCampaign.jobs.find(j=>j.id===run.evidence.jobId)?.arrivalAt<=recipe.createdAt))fail('INVALID_PROVIDER_SECURITY_ABUSE_EVIDENCE');
      }
    }
    for(const row of s.portfolio.customers){
      if(!providerSecurityEqual(row.root.providerSecurityPins,providerSecurityPinsFor(s,row.id)))fail('INVALID_PROVIDER_SECURITY_PINS');
      const eventIds=new Set((store?.runs||[]).filter(run=>run.recipe.portfolioId===row.id).flatMap(run=>Object.values(run.eventIds)));
      if(row.root.admissionSecurity?.events.some(e=>['packet-batch','signalling-batch'].includes(e.kind)&&!eventIds.has(e.id)))fail('INVALID_PROVIDER_SECURITY_ABUSE_EVENTS');
    }
  }
  function providerSecurityAbuseAdvance(s){
    const childOf=id=>s.portfolio.customers.find(row=>row.id===id).root;
    for(const customer of s.providerCampaign.customers){
      if(!['active','renewal'].includes(customer.status))continue;
      let child=childOf(customer.portfolioId);
      if(!providerSecurity.currentStatus(s,customer.id,child).voiceAdmissionReady)continue;
      let recipe;
      try{recipe=providerSecurity.abuseRecipe(s,customer.id,child);}catch(error){if(['PROVIDER_SECURITY_ATTACK_PATH_UNAVAILABLE','PROVIDER_SECURITY_CORE_CALL_BUCKET_FULL','PROVIDER_SECURITY_ATTACK_BUCKETS_FULL'].includes(error.message))continue;throw error;}
      const platform=operations.platform(child,'alex'),phone=config(child,platform),directory=config(child,phone?.directory);
      const callerReady=directory?.identities.includes('alex')&&directory.entitled.includes('alex')&&config(child,'cases')?.identityMapping&&[platform,'identity','carrier','cases'].every(id=>observe(child,id).ready);
      if(!(s.providerSecurityAbuse?.runs||[]).some(run=>run.recipe.runKey===recipe.runKey)&&callerReady){
        if((s.providerSecurityAbuse?.runs.length||0)>=200)fail('PROVIDER_SECURITY_ABUSE_CAPACITY');
        const run={recipe,eventIds:{},blockedInteractionId:null,blockedCaseId:null,evidence:null};
        if(!s.providerSecurityAbuse)s.providerSecurityAbuse={version:1,runs:[]};s.providerSecurityAbuse.runs.push(run);
        const names=['network','sipRate','sipOversize','sipAllowed'];
        for(let index=0;index<recipe.steps.nativeCommands.length;index++){
          child=providerHooks().securityCommand(s,customer.id,recipe.steps.nativeCommands[index]);
          run.eventIds[names[index]]=child.admissionSecurity.events.at(-1).id;syncProviderSecurityPins(s);
        }
        run.blockedCaseId='security-abuse-'+s.clock+'-'+child.nextId;
        run.blockedInteractionId=providerHooks().interact(s,customer.id,{channel:'voice',from:'alex',to:recipe.steps.blockedDestination.to,caseId:run.blockedCaseId});
        child=childOf(customer.portfolioId);
        const denial=child.admissionSecurity.events.findLast(e=>e.kind==='call-admission'&&e.detail.interactionId===run.blockedInteractionId);
        if(!denial||!providerSecurity.abuseEventMatchesV2('destination',denial,recipe,child))fail('PROVIDER_SECURITY_AUTHORED_DESTINATION_REQUIRED');
        run.eventIds.destination=denial.id;syncProviderSecurityPins(s);
      }
    }
    for(const run of s.providerSecurityAbuse?.runs||[]){
      if(run.evidence)continue;
      const child=childOf(run.recipe.portfolioId);
      if(!providerSecurity.currentStatus(s,run.recipe.customerId,child).voiceAdmissionReady||!admissionSecurity.evaluate(child).passed)continue;
      for(const job of s.providerCampaign.jobs.filter(j=>j.customerId===run.recipe.customerId&&j.arrivalAt>run.recipe.createdAt&&j.channel==='voice'&&['completed','late'].includes(j.status)&&j.contextRetained&&!j.resilienceSequence)){
        if(!providerSecurity.ordinaryDeliveryMatches(s,run.recipe.customerId,job,child.interactions.find(i=>i.id===job.interactionId),child.admissionSecurity.settlements.find(row=>row.interactionId===job.interactionId)))continue;
        const evidence=providerSecurity.evaluateProviderEvidence(s,run.recipe.customerId,child,job.id,run.recipe);
        if(providerSecurity.validateEvidence(s,evidence,child)){run.evidence=evidence;syncProviderSecurityPins(s);break;}
      }
    }
  }
  function validateProviderSecurity(s){
    for(const project of s.providerCampaign.projects){const definition=providerSecurity.operationDefinition(project.operationId);if(!definition){if(project.securityPlan!==undefined||project.operationReceipt?.providerSecurity!==undefined)fail('INVALID_PROVIDER_SECURITY_PROJECT');continue;}
      const plan=project.securityPlan,c=s.providerCampaign.customers.find(c=>c.id===project.customerId),child=s.portfolio.customers.find(row=>row.id===c?.portfolioId)?.root;
      if(!providerSecurity.validatePlan(plan)||plan.customerId!==c?.id||plan.portfolioId!==c?.portfolioId||plan.tenant!==child?.tenant||plan.market!==c?.market||plan.operationId!==project.operationId||plan.planId!==project.config?.planId||plan.quotedAt!==project.acceptedAt)fail('INVALID_PROVIDER_SECURITY_PLAN');
      if(project.configSubmittedAt!==null&&(!providerSecurityEqual(project.operationReceipt,{providerSecurity:providerSecurity.planReceipt(plan)})||!providerSecurity.paidProjectValid(s,project)))fail('INVALID_PROVIDER_SECURITY_RECEIPT');
    }
    for(const c of s.providerCampaign.customers){const child=s.portfolio.customers.find(row=>row.id===c.portfolioId).root,projects=s.providerCampaign.projects.filter(p=>p.customerId===c.id&&providerSecurity.operationDefinition(p.operationId)),native=child.admissionSecurity;
      if(!projects.length){if(native)fail('UNFUNDED_PROVIDER_SECURITY');continue;}if(!native)fail('MISSING_PROVIDER_SECURITY');
      const defaults=admissionSecurity.create(child),submitted=projects.filter(p=>p.configSubmittedAt!==null).sort((a,b)=>a.configSubmittedAt-b.configSubmittedAt||a.acceptedAt-b.acceptedAt);
      for(const control of providerSecurity.controlNames){const paid=submitted.filter(p=>p.securityPlan.control===control),latest=paid.at(-1),n=native.controls[control];
        if(!latest){if(n.generation!==0||n.effectiveGeneration!==0||n.effective!==null||!providerSecurityEqual(n.desired,defaults.controls[control].desired)||n.provisioning.status!=='unconfigured')fail('UNFUNDED_PROVIDER_SECURITY_CONTROL');continue;}
        if(n.generation!==paid.length||!providerSecurityEqual(n.desired,latest.securityPlan.nativeConfig)||n.provisioning.due!==latest.configSubmittedAt)fail('INVALID_PROVIDER_SECURITY_GENERATION');
        const effective=paid[n.effectiveGeneration-1];if(n.effectiveGeneration>paid.length||n.effectiveGeneration<0||(effective?!providerSecurityEqual(n.effective,effective.securityPlan.nativeConfig):n.effective!==null))fail('INVALID_PROVIDER_SECURITY_EFFECTIVE');
        if(latest.status==='complete'&&(n.provisioning.status!=='ready'||n.effectiveGeneration!==paid.length))fail('INVALID_PROVIDER_SECURITY_COMPLETION');
      }
      const sip=submitted.findLast(p=>p.securityPlan.control==='sip'),expectedPeer=sip?{[sip.securityPlan.supplierPeer.id]:{id:sip.securityPlan.supplierPeer.id,observed:{authenticated:true,available:true,methods:sip.securityPlan.supplierPeer.methods,at:sip.configSubmittedAt-1}}}:{};
      if(!providerSecurityEqual(native.peers,expectedPeer))fail('INVALID_PROVIDER_SECURITY_SUPPLIER');
    }
  }
  function providerHooks(){
    const row=(s,id)=>{const value=s.portfolio?.customers.find(x=>x.id===id);if(!value)fail('UNKNOWN_PROVIDER_CUSTOMER');return value;};
    const apply=(s,id,command)=>{const target=row(s,id);target.root=dispatchInternal(target.root,command,true,true,false,s);target.clock=target.root.clock;return target.root;};
    const configure=(s,id,configs)=>{for(const [resourceId,config] of Object.entries(configs))apply(s,id,{type:'configure',id:resourceId,config});return row(s,id).root;};
    return {
      securityCommand:(s,id,command)=>apply(s,id,{type:'admission-security',command}),
      archiveFollowupRetry:archiveProviderFollowupRetry,
      followupQuote:(s,r)=>providerCaseFollowup.quoteDetails(s,r,providerFollowupHooks()),
      followupWorkflowAt:providerFollowupWorkflowAt,
      followupReserve:(s,j)=>providerCaseFollowup.reserve(s,j,providerFollowupHooks()),
      followupObserve:(s,j)=>providerCaseFollowup.observe(s,j,providerFollowupHooks()),
      followupCommit:(s,r)=>{const h=providerFollowupHooks(),plan=providerCaseFollowup.startPlan(s,r,h),j=s.providerCampaign.jobs.find(j=>j.id===r.jobId&&j.customerId===r.customerId),interactionId=providerHooks().interact(s,r.customerId,plan.interaction),child=row(s,r.customerId).root,i=child.interactions.find(i=>i.id===interactionId);if(!i||i.phase==='failed')fail('PROVIDER_FOLLOWUP_TARGET_REFUSED');event(child,i,'followup',plan.trace.code,{detail:clone(plan.trace.detail)});j.followup=providerCaseFollowup.recordAttempt(s,r,plan,interactionId,h);syncProviderFollowupPins(s);},
      stopFollowupWork:(s,id,j)=>{const child=row(s,id).root;for(const interactionId of [j.interactionId,...j.followup.attempts.map(a=>a.interactionId)]){const i=child.interactions.find(i=>i.id===interactionId);if(i&&!['resolved','failed'].includes(i.phase))finish(child,i,j.failure||'PROVIDER_WORK_CANCELLED');}},
      handoffQuote:(s,request)=>providerCaseHandoff.quoteDetails(s,request,providerHandoffHooks()),
      handoffCommit:(s,request)=>{const receipt=providerCaseHandoff.commit(s,request,providerHandoffHooks());syncProviderHandoffPins(s);return receipt;},
      handoffChannelAt:(s,id,at)=>providerHandoffCapability(s,id,at)?.ready===true,
      stopHandoffWork:(s,id,job)=>{const child=row(s,id).root;for(const interactionId of [job.handoff.sourceInteractionId,job.handoff.targetInteractionId]){const i=child.interactions.find(i=>i.id===interactionId);if(i&&!['resolved','failed'].includes(i.phase))finish(child,i,job.failure||'PROVIDER_WORK_CANCELLED');}},
      siteResponse:(s,projectId,response)=>{
        if(response==='retry-migration'){
          const p=s.providerCampaign.projects.find(p=>p.id===projectId&&p.operationId==='site-resource-migration'&&p.status==='commissioning');
          if(!p)fail('PAID_SITE_MIGRATION_REQUIRED');
          const child=row(s,p.customerId).root,m=child.siteOperations?.migrations.find(m=>m.id===p.operationReceipt?.migrationId),target=child.siteOperations?.sites[p.config.toSite]?.effective?.transportSite;
          if(providerSiteMigrationBusy(child,p.config.resourceId))fail('SITE_MIGRATION_ACTIVE_WORK');
          if(m?.phase!=='partial'||child.siteOperations.exercises.some(x=>x.status==='active')||!siteHooks().transportSite(child,target)?.ready)fail('SITE_MIGRATION_RETRY_UNAVAILABLE');
          siteOperations.command(child,{action:'cutover',id:m.id},providerSiteHooks(s));
          if(m.phase==='complete'&&m.items.every(item=>item.status==='complete')){p.operationReceipt.completedAt=child.clock;p.completedAt=s.clock;p.status='complete';}
          return;
        }
        const p=s.providerCampaign.projects.find(p=>p.id===projectId&&['site-recovery','managed-site-recovery'].includes(p.operationId)&&p.status==='commissioning');
        if(!p||!['recover','restore','abort'].includes(response))fail('PAID_SITE_RECOVERY_REQUIRED');
        const child=row(s,p.customerId).root,x=child.siteOperations?.exercises.find(x=>x.id===p.operationReceipt?.exerciseId);
        if(response==='abort'){
          if(x?.status!=='failed'||p.siteAbort)fail('FAILED_SITE_EXERCISE_REQUIRED');
          if(x.fault&&child.transport.domains[x.fault.id]===true)providerSiteHooks(s).clearFault(child,x.fault.id);
          p.siteAbort={version:1,at:s.clock,exerciseId:x.id,clearedDomain:x.fault?.id||null,retainedSetupCents:p.setupCents};
          p.status='blocked';p.completedAt=s.clock;
          return;
        }
        if(x?.status!=='active')fail('ACTIVE_SITE_EXERCISE_REQUIRED');
        siteOperations.command(child,{action:response,kind:'exercise',id:p.operationReceipt.exerciseId},providerSiteHooks(s));
        if(response==='restore')p.operationReceipt.restoreReceiptId=x.restoration.receiptId;
      },
      repayCredit:(s,loan,cents)=>{business.command(s,{action:'repay',loan,cents},{},assess(s));return true;},
      credit:s=>{business.command(s,{action:'loan',cents:100000},{},assess(s));return clone(s.business.loans.at(-1));},
      automationControl:(s,id,enabled)=>{const policy=s.providerAutomation?.find(p=>p.customerId===id);if(!policy)fail('PROVIDER_POLICY_REQUIRED');if(enabled&&policy.spentCents>=policy.budgetCents)fail('PROVIDER_POLICY_BUDGET_EXHAUSTED');const funded=s.providerCampaign.projects.find(p=>p.id===policy.projectId);if(enabled&&funded?.operationId===providerIntegrationAssurance.OPERATION_ID){providerIntegrationAssurance.validatePolicy(s,funded,policy.config);if(funded.status!=='complete'||!providerIntegrationAssurance.current(s,funded.operationReceipt.binding,providerProgressionHooks(s,false)).eligible)fail('INTEGRATION_ASSURANCE_SCOPE_NOT_CURRENT');}policy.status=enabled?'active':'suspended';if(policy.config){policy.config.enabled=enabled;policy.config.suspended=!enabled;}},
      configurePolicy:(s,id,config)=>{const policy=s.providerAutomation?.find(p=>p.customerId===id);if(!policy)fail('PROVIDER_PAID_POLICY_REQUIRED');const funded=s.providerCampaign.projects.find(p=>p.id===policy.projectId);if(funded?.operationId==='cisco-provider-operations'&&!providerProductPolicyReady(s,policy))fail('PROVIDER_PRODUCT_NOT_READY');providerPolicy.validate(config);if(config.budgetSpentCents!==policy.spentCents||config.actionsUsed!==policy.actions.length)fail('POLICY_COUNTERS_READ_ONLY');const ids=[...config.customerIds,...config.rules.flatMap(r=>r.customerIds)];if(!config.customerIds.length||ids.some(id=>!s.providerCampaign.customers.some(c=>c.id===id)))fail('POLICY_EXPLICIT_SCOPE_REQUIRED');if(funded.operationId==='automation'&&ids.some(scope=>scope!==id))fail('POLICY_CUSTOMER_SCOPE_MISMATCH');if(funded.operationId==='regional-provisioning')validateRegionalProvisioningScope(s,config,funded);if(funded.operationId===providerIntegrationAssurance.OPERATION_ID){providerIntegrationAssurance.validatePolicy(s,funded,config);if(config.enabled&&!config.suspended&&!providerIntegrationAssurance.current(s,funded.operationReceipt.binding,providerProgressionHooks(s,false)).eligible)fail('INTEGRATION_ASSURANCE_SCOPE_NOT_CURRENT');}policy.config=clone(config);policy.budgetCents=config.lifetimeBudgetCents;policy.status=config.enabled&&!config.suspended?'active':'suspended';},
      business:s=>s.business,setStaff:(s,team)=>{Object.assign(s.business.workforce,team);return {at:s.clock,...team};},
      forecast:s=>{const p=s.providerCampaign,b=s.business,active=p.customers.filter(c=>!['exited','default'].includes(c.status)),recurringRevenue=active.filter(c=>c.status==='active').reduce((n,c)=>n+c.retailCents,0),recurringCost=p.customers.reduce((n,c)=>n+Object.values(c.stages).filter(Boolean).reduce((t,x)=>t+(['exited','default'].includes(c.status)?Math.floor(x.periodCents*Math.min(60,Math.max(0,x.acceptedAt+providerRules.data.plans[c.planId].minimumPeriods*60-s.clock))/60):x.periodCents),0),0)+(b.workforce.engineers+b.workforce.support)*b.workforce.hourlyCents+p.projects.filter(x=>providerCampaign.operationBillable(x)&&(x.supportReplacement||x.serviceRetirement||x.retirement||x.minimumTermPeriods||active.some(c=>c.id===x.customerId))).reduce((n,x)=>n+(x.supportReplacement||x.serviceRetirement||x.retirement||!active.some(c=>c.id===x.customerId)?providerCampaign.operationExposure(x,p.customers.find(c=>c.id===x.customerId),s.clock,s.clock+60):x.periodCents),0);return {recurringRevenue,recurringCost,operatingResult:recurringRevenue-recurringCost,variableUsage:active.map(c=>({customerId:c.id,voiceCentsPerMinute:providerRules.data.plans[c.planId].voiceCents,messageCents:providerRules.data.plans[c.planId].messageCents}))};},post:(s,category,cents,details)=>business.postProvider(s,category,cents,details),
      customer:(s,id)=>row(s,id).root,
      retainSupportWork:(s,id)=>providerSupportWork.capture(s,id),
      retainResilienceCase:(s,id,job)=>{row(s,id).root.providerResilienceCase={version:1,jobId:job.id,caseId:job.caseId,interactionIds:job.resilienceSequence.phases.map(phase=>phase.interactionId)};},
      startResilienceIncident:(s,id,domain)=>{const child=row(s,id).root;transport.command(child,{action:'domain',id:domain,failed:true},{...transportHooks(child),authorize:()=>true});return {at:child.clock,domain};},
      stopResilienceWork:(s,id,job)=>{const child=row(s,id).root;for(const phase of job.resilienceSequence.phases){const interaction=child.interactions.find(i=>i.id===phase.interactionId);if(interaction&&!['resolved','failed'].includes(interaction.phase))finish(child,interaction,job.failure||'PROVIDER_WORK_CANCELLED');}},
      validateResilienceJob:(s,c,job)=>providerResilienceSequence.validateJob(s,c,job,row(s,c.id).root),
      addCustomer:(s,c)=>{
        const hooks=portfolioHooks(s);hooks.createCustomer=(_,config)=>{
          const child=create({scenario:config.scenario,jurisdiction:config.jurisdiction,tenant:config.tenant,customerName:config.name,clock:config.clock,mode:s.mode,seed:s.seed});
          child.experience={version:1,kind:'campaign',custom:false};
          child.providerCustomer={version:1,id:c.id,recording:providerRules.data.missions[c.scenario].requirements.recording,planId:c.planId,...(s.providerCampaign.externalCollaborationVersion===1?{externalCollaborationVersion:1}:{})};
          if(child.providerCustomer.externalCollaborationVersion===1)child.recordStore=informationRecordStore.create();
          if(c.scenario==='defence'){child.resources.phone=resource('phone','uc',{region:child.jurisdiction,routes:[{prefix:'+61',target:'service'}]});child.resources.phone.provisioning.due=child.clock+1;}
          for(const resource of Object.values(child.resources)){resource.desired.enabled=false;resource.effective=null;}
          return child;
        };
        portfolio.command(s.portfolio,{action:'addcustomer',id:c.id,tenant:c.id,name:c.name,market:c.market,scenario:c.scenario},hooks);
        return row(s,c.id).root;
      },
      serviceRetirementPreview:(s,projectId)=>providerServiceRetirement.preview(s,projectId,{operationExposure:providerCampaign.operationExposure}),
      retireService:(s,projectId)=>{const plan=providerServiceRetirement.plan(s,projectId,{operationExposure:providerCampaign.operationExposure});const child=configure(s,plan.customerId,plan.configs);if(plan.receipt.resources.some(id=>child.resources[id].generation!==plan.receipt.expectedGenerations[id]))fail('SERVICE_RETIREMENT_GENERATION_CHANGED');return plan.receipt;},
      retirementPreview:(s,project)=>{const child=row(s,project.customerId).root,d=child.products?.deployments.find(d=>d.id==='d-'+project.productId);if(!d)return null;const resources=[...new Set(d.desired.bindings.flatMap(b=>b.resources))];
        const calls=child.interactions.filter(i=>!['resolved','failed'].includes(i.phase)&&(resources.includes(i.voicePath?.platform)||resources.includes(i.voicePath?.carrier)||resources.includes(i.destination)||i.channel==='message'&&resources.some(r=>['engage','messages','service','cases'].includes(r))));
        const meetings=(child.information?.meetingSessions||[]).filter(m=>['scheduled','active'].includes(m.status)&&resources.some(r=>['room','identity','phone'].includes(r)));
        const processing=(child.information?.jobs||[]).filter(j=>!['complete','failed','cancelled'].includes(j.status)&&resources.some(r=>['speech','archive','recorder','local'].includes(r)));
        return {deploymentId:d.id,resources,affectedWork:[...calls.map(i=>({id:i.id,kind:i.channel,caseId:i.caseId})),...meetings.map(m=>({id:m.id,kind:'meeting'})),...processing.map(j=>({id:j.id,kind:'processing'}))],blockers:[...(d.retirement?['PRODUCT_ALREADY_RETIRING']:d.provisioning.status!=='ready'?['PRODUCT_NOT_READY']:[]),...([providerRoomIntegration.SOURCE_ID,providerRoomIntegration.TARGET_ID].includes(d.id)&&s.providerCampaign.customers.some(c=>c.id===project.customerId&&['active','renewal'].includes(c.status))&&s.providerCampaign.projects.some(p=>p.customerId===project.customerId&&p.operationId===providerRoomIntegration.OPERATION_ID&&['running','commissioning'].includes(p.status))?['ROOM_INTEGRATION_PENDING']:[])]};},
      retireProduct:(s,project)=>{const child=apply(s,project.customerId,{type:'products',command:{action:'retire',id:'d-'+project.productId}});return clone(child.products.deployments.find(d=>d.id==='d-'+project.productId).retirement);},
      configureCustomer:(s,id,configs)=>{const child=configure(s,id,configs);if(s.providerCampaign.enterpriseContinuityVersion===1&&child.scenario==='enterprise'&&configs.carrier?.enabled&&!child.operations)apply(s,id,{type:'operations',command:{action:'start'}});return row(s,id).root;},
      channelEligibility:child=>{const ready=id=>child.products?.deployments.some(d=>d.id==='d-'+id&&d.provisioning.status==='ready'&&d.effective.features.every(f=>products.featureStatus(child,d.id,f,productHooks(child)).available));const accountReady=id=>child.channels?.accounts[id]?.provisioning.status==='ready'&&child.channels.accounts[id].observed.authenticated&&child.channels.accounts[id].observed.providerAvailable;return {socialMessaging:!!ready('cisco-programmable-engagement')&&!!accountReady('chatterleaf'),workplaceChat:!!ready('ms-communications-api')&&!!accountReady('workplace'),video:!!ready('cisco-meetings-interoperability')};},
      afterCommissioning:s=>{providerRetainedStorageAdvance(s);providerSupportReplacements(s);},afterCustomerExit:providerRetainedStorageAdvance,retainedStorageOnExit:providerRetainedStorageOnExit,pendingCaptureStorageOnExit:providerPendingCaptureStorageOnExit,
      testServiceIntegration:(s,projectId)=>s.providerCampaign.projects.find(p=>p.id===projectId)?.operationId===providerRoomIntegration.OPERATION_ID?providerRoomIntegrationTest(s,projectId,apply):providerUcCcTest(s,projectId,apply),
      claimProgression:(s,sourceId)=>{const result=providerProgressionReceipts.claim(s,sourceId,providerProgressionHooks(s));if(result.receipt.sourceEvidence?.missions?.support){const id=result.receipt.sourceEvidence.customerId;row(s,id).root.providerCustodyPins=expectedProviderCustodyPins(s,id,result.state.providerCampaign.progressionReceipts.receipts);}if(sourceId==='progress.goal.'+'ca'){const child=row(s,result.receipt.customerIds[0]).root;child.providerProgressionPins={version:1,sourceId,receiptId:result.receipt.id,pins:providerLocalProgression.retentionPins(result.receipt.sourceEvidence)};}if(['progress.progression-level.5','progress.progression-level.6'].includes(sourceId))for(const customerId of result.receipt.customerIds)row(s,customerId).root.providerCentralPins=providerCentralPinsFor(s,customerId,result.state.providerCampaign.progressionReceipts.receipts);if(sourceId===providerExternalReach.SOURCE_ID)for(const customerId of result.receipt.customerIds)row(s,customerId).root.providerExternalReachPins=providerExternalReachPinsFor(s,customerId,result.state.providerCampaign.progressionReceipts.receipts);if(sourceId===providerDedicatedInterconnect.SOURCE_ID)for(const customerId of result.receipt.customerIds)row(s,customerId).root.providerInterconnectPins=providerInterconnectPinsFor(s,customerId,result.state.providerCampaign.progressionReceipts.receipts);if(Object.values(providerRegionalSupport.GOALS).includes(sourceId))for(const customerId of result.receipt.customerIds)row(s,customerId).root.providerRegionalPins=providerRegionalPinsFor(s,customerId,result.state.providerCampaign.progressionReceipts.receipts);return result;},
      operationBlockers:(s,id,definition,request={})=>{const child=row(s,id).root,p=s.providerCampaign,op=definition.id,blockers=[];
        if(providerSecurity.operationDefinition(op)){const customer=p.customers.find(c=>c.id===id);if(!['active','renewal'].includes(customer?.status))blockers.push('CUSTOMER_NOT_ACTIVE');if(!observe(child,'carrier').ready)blockers.push('SECURITY_CARRIER_REQUIRED');if(definition.control!=='network'&&!observe(child,'phone').ready)blockers.push('SECURITY_PHONE_REQUIRED');if(!child.admissionSecurity&&child.interactions.some(i=>i.channel==='voice'&&!['resolved','failed'].includes(i.phase)))blockers.push('SECURITY_ACTIVE_CALLS');if(p.projects.some(p=>p.customerId===id&&p.operationId===op&&!['cancelled','blocked'].includes(p.status)))blockers.push('SECURITY_CONTROL_ALREADY_ORDERED');return blockers;}
        if(op===providerIncidentDiagnosis.OPERATION_ID){if(p.contentVersion!=='provider-campaigns-8')blockers.push('PROVIDER_CONTENT_EIGHT_REQUIRED');else blockers.push(...providerIncidentDiagnosis.readiness(p,p.customers.find(c=>c.id===id),child,request.config?.incidentId,providerDiagnosisHooks(s)).missing);}
        if(providerCaseFollowup.terms(op)){
          if(op===providerCaseFollowup.RETRY){const r={action:'retry-case-followup',customerId:id,jobId:request.config?.jobId},q=providerCaseFollowup.quoteDetails(s,r,providerFollowupHooks());blockers.push(...q.blockers);if(!q.fundingRequired)blockers.push('FOLLOWUP_RETRY_NOT_REQUIRED');if(p.projects.some(x=>x.operationId===op&&x.customerId===id&&x.config?.jobId===r.jobId&&!['cancelled','blocked'].includes(x.status)))blockers.push('FOLLOWUP_RETRY_ALREADY_FUNDED');}
          else {blockers.push(...providerCaseFollowup.canOrder(s,{customerId:id,operationId:op},providerFollowupHooks()).blockers);if(p.projects.some(x=>x.customerId===id&&x.operationId===op&&!['cancelled','blocked'].includes(x.status)))blockers.push('FOLLOWUP_ALREADY_FUNDED');}
        }
        const interconnect=!!providerDedicatedInterconnect.terms(op),pending=p.projects.filter(x=>x.customerId===id&&['running','commissioning'].includes(x.status));
        if(pending.some(x=>x.status==='running'&&providerDedicatedInterconnect.terms(x.operationId)))blockers.push('PROVIDER_INTERCONNECT_WORK_IN_PROGRESS');
        if(interconnect){blockers.push(...providerDedicatedInterconnect.canOrder(s,{customerId:id,operationId:op},providerInterconnectHooks()).missing);if(pending.length)blockers.push('PROVIDER_INTERCONNECT_EXISTING_WORK_REQUIRED');}

        if(op===providerRegionalSupport.OPERATION_ID){if(p.contentVersion!=='provider-campaigns-8')blockers.push('PROVIDER_CONTENT_EIGHT_REQUIRED');else blockers.push(...providerRegionalSupport.canOrder(s,{customerId:id,...request.config},providerRegionalSupportHooks()).missing);}
        if(op==='managed-site-recovery'&&!p.progressionReceipts?.receipts?.some(r=>r.sourceId==='progress.goal.'+'df'&&r.sourceEvidence?.market===p.customers.find(c=>c.id===id)?.market))blockers.push('EARNED_SITE_RECOVERY_MARKET_REQUIRED');if(providerOwnedSites.OPERATION_IDS.includes(op)){if(!['provider-campaigns-7','provider-campaigns-8'].includes(p.contentVersion))blockers.push("PROVIDER_CONTENT_SEVEN_REQUIRED");else blockers.push(...providerOwnedSites.canOrder(s,id,op,request.config||{},providerOwnedSiteHooks(s)).missing);if(op==='site-resource-migration'&&request.config?.toSite){const target=child.siteOperations?.sites[request.config.toSite]?.effective?.transportSite;if(!target||!siteHooks().transportSite(child,target)?.ready)blockers.push('TARGET_SITE_UNAVAILABLE');}if(['site-recovery','managed-site-recovery'].includes(op))for(const resource of ['identity','phone','carrier','access','local','dedicated-platform'])if(!providerHooks().observe(child,resource).ready)blockers.push('SITE_RECOVERY_DEPENDENCY_UNAVAILABLE:'+resource);}
        const nationalOps=['national-wholesale-headroom','managed-national-wholesale-headroom'];
        if([...nationalOps,'public-service-capture-reserve'].includes(op)){
          if(!['provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(p.contentVersion))blockers.push('PROVIDER_CONTENT_SIX_REQUIRED');
          const sourceId=nationalOps.includes(op)?'progress.progression-level.5':'progress.progression-level.6',earned=p.progressionReceipts?.receipts?.find(r=>r.sourceId===sourceId);
          if(!earned||!earned.customerIds.includes(id))blockers.push('EARNED_CENTRAL_SERVICE_CUSTOMER_REQUIRED');
          if(nationalOps.includes(op)){
            if(!providerHooks().observe(child,'carrier').ready)blockers.push('CARRIER_NOT_COMMISSIONED');
            if(child.resources.carrier.desired.capacity>992)blockers.push('CARRIER_CAPACITY_LIMIT');
            if(p.projects.some(x=>x.customerId===id&&[...nationalOps,'carrier-headroom','managed-carrier-headroom','direct-external-reach','managed-external-reach'].includes(x.operationId)&&['running','commissioning'].includes(x.status)))blockers.push('CARRIER_UPGRADE_PENDING');
          }else{
            if(child.scenario!=='government'||!child.providerGovernment)blockers.push('GOVERNMENT_ARCHITECTURE_REQUIRED');
            if(!['recorder','archive','speech'].every(resourceId=>boundaryCheck(child,resourceId)?.eligible===true&&providerHooks().observe(child,resourceId).ready))blockers.push('CURRENT_PUBLIC_SERVICE_BOUNDARY_REQUIRED');
            if(child.resources.recorder.desired.capacity>992)blockers.push('RECORDER_CAPACITY_LIMIT');
            if(p.projects.some(x=>x.customerId===id&&['capture-headroom','public-service-capture-reserve'].includes(x.operationId)&&['running','commissioning'].includes(x.status)))blockers.push('CAPTURE_UPGRADE_PENDING');
          }
        }

        if(providerResilience.OPS.includes(op)){if(!['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(p.contentVersion))blockers.push('PROVIDER_RESILIENCE_CONTENT_REQUIRED');else blockers.push(...providerResilience.canOrder(p,p.customers.find(c=>c.id===id),op,child,providerResilienceHooks(s)).missing);if(!['base','carrier','partner'].every(stage=>p.customers.find(c=>c.id===id).stages[stage]?.status==='effective'))blockers.push('PROVIDER_RESILIENCE_BASE_REQUIRED');}
        if(op==='transport-repair'){const incident=p.incidents.find(i=>i.customerId===id&&i.kind==='transport-domain'&&['active','acknowledged'].includes(i.status));if(!incident)blockers.push('NO_ACTIVE_TRANSPORT_INCIDENT');else if(incident.status!=='acknowledged')blockers.push('INCIDENT_ACKNOWLEDGEMENT_REQUIRED');if(p.projects.some(project=>project.customerId===id&&project.operationId===op&&['running','commissioning'].includes(project.status)))blockers.push('TRANSPORT_REPAIR_PENDING');}

        if(['automation','regional-provisioning','integration-assurance','cisco-provider-operations'].includes(op)&&s.providerAutomation?.some(p=>p.customerId===id)&&!child.products?.deployments.find(d=>d.id==='d-'+op)?.retirement)blockers.push('POLICY_ALREADY_FUNDED');
        if(definition.kind==='product'&&child.products?.deployments.find(d=>d.id==='d-'+op)?.retirement?.status==='pending')blockers.push('PRODUCT_RETIREMENT_PENDING');
        if(['carrier-headroom','managed-carrier-headroom'].includes(op)){if(!child.resources.carrier?.effective?.enabled)blockers.push('CARRIER_NOT_COMMISSIONED');if(child.resources.carrier?.desired?.capacity>996)blockers.push('CARRIER_CAPACITY_LIMIT');if(p.projects.some(x=>x.customerId===id&&['carrier-headroom','managed-carrier-headroom','national-wholesale-headroom','managed-national-wholesale-headroom'].includes(x.operationId)&&['running','commissioning'].includes(x.status)))blockers.push('CARRIER_UPGRADE_PENDING');}
        if(['browser-guest-room','managed-local-spares',...providerResilience.OPS,'transport-repair'].includes(op)&&!['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(p.contentVersion))blockers.push('PROVIDER_CONTENT_FIVE_REQUIRED');
        if(op===providerRoomIntegration.OPERATION_ID){blockers.push(...providerRoomIntegration.canOrder(s,id,providerRoomIntegrationHooks()).missing);if(p.projects.some(x=>x.customerId===id&&x.operationId===op&&['running','commissioning'].includes(x.status)))blockers.push('ROOM_INTEGRATION_PENDING');}
        if(providerUcCcIntegration.OPERATION_IDS.includes(op)){blockers.push(...providerUcCcIntegration.canOrder(s,id,op,providerUcCcHooks(s,id,child)).missing);if(p.projects.some(x=>x.customerId===id&&providerUcCcIntegration.OPERATION_IDS.includes(x.operationId)&&x.status==='running'))blockers.push('UC_CC_DELIVERY_PENDING');if(op==='managed-uc-cc-retest'&&!p.progressionReceipts?.receipts?.some(r=>r.sourceId==='progress.goal.'+'ix'&&r.customerIds.includes(id)))blockers.push('EARNED_UC_CC_INTEGRATION_REQUIRED');if(op==='managed-uc-cc-integration'){const earned=p.progressionReceipts?.receipts?.find(r=>r.sourceId==='progress.progression-level.3');if(!earned||!earned.sourceEvidence?.markets?.includes(p.customers.find(c=>c.id===id)?.market))blockers.push('EARNED_UC_CC_MARKET_REQUIRED');}}
        if(['direct-external-reach','managed-external-reach'].includes(op)){
          if(p.externalCollaborationVersion!==1||child.scenario!=='enterprise')blockers.push('EXTERNAL_REACH_SCENARIO_REQUIRED');
          if(!child.operations||!['identity','phone','carrier'].every(resourceId=>providerHooks().observe(child,resourceId).ready))blockers.push('EXTERNAL_REACH_SERVICE_REQUIRED');
          if(child.resources.carrier.desired.capacity>998)blockers.push('CARRIER_CAPACITY_LIMIT');
          if(p.projects.some(project=>project.customerId===id&&['direct-external-reach','managed-external-reach'].includes(project.operationId)&&!['cancelled','blocked'].includes(project.status)))blockers.push('EXTERNAL_REACH_ALREADY_FUNDED');
          if(p.projects.some(project=>project.customerId===id&&['carrier-headroom','managed-carrier-headroom','national-wholesale-headroom','managed-national-wholesale-headroom'].includes(project.operationId)&&['running','commissioning'].includes(project.status)))blockers.push('CARRIER_UPGRADE_PENDING');
          if(op==='managed-external-reach'&&!p.progressionReceipts?.receipts?.some(receipt=>receipt.sourceId==='progress.goal.'+'tr'&&receipt.sourceEvidence?.market===p.customers.find(c=>c.id===id)?.market))blockers.push('EARNED_EXTERNAL_REACH_MARKET_REQUIRED');
        }
        if(op==='after-call-assistance'){if(!['people','cases','engage'].every(resourceId=>providerHooks().observe(child,resourceId).ready))blockers.push('CUSTOMER_WORKFLOW_REQUIRED');if(child.resources.people.desired.wrapMinutes===0||p.projects.some(project=>project.customerId===id&&project.operationId===op&&['running','commissioning'].includes(project.status)))blockers.push('AFTER_CALL_ASSISTANCE_ALREADY_FUNDED');}
        if(op==='capture-headroom'){if(!child.resources.recorder?.effective?.enabled)blockers.push('RECORDER_NOT_COMMISSIONED');if(child.resources.recorder?.desired?.capacity>996)blockers.push('RECORDER_CAPACITY_LIMIT');if(p.projects.some(x=>x.customerId===id&&['capture-headroom','public-service-capture-reserve'].includes(x.operationId)&&['running','commissioning'].includes(x.status)))blockers.push('CAPTURE_UPGRADE_PENDING');}
        if(op==='service-boundary-review'){try{providerServiceBoundary.plan(s,id,providerServiceBoundaryHooks());}catch(error){blockers.push(error.message);}if(p.projects.some(x=>x.customerId===id&&x.operationId===op&&['running','commissioning'].includes(x.status)))blockers.push('SERVICE_BOUNDARY_REVIEW_PENDING');}
        if(op==='integrator-room'&&!p.progressionReceipts?.receipts?.some(r=>r.sourceId==='progress.goal.'+'bz'&&r.customerIds.includes(id)))blockers.push('EARNED_MANAGED_BUSINESS_REQUIRED');
        if(op===providerIntegrationAssurance.OPERATION_ID)blockers.push(...providerIntegrationAssurance.eligibility(s,id,providerProgressionHooks(s,false)).missing);
        if(op==='regional-provisioning'&&!regionalProvisioningReceipt(s,[p.customers.find(c=>c.id===id)?.market]))blockers.push('EARNED_REGIONAL_SCOPE_REQUIRED');
        if(op==='managed-carrier-headroom'&&!p.progressionReceipts?.receipts?.some(r=>r.sourceId==='progress.progression-level.1'&&r.customerIds.includes(id)))blockers.push('EARNED_LOCAL_RESELLER_REQUIRED');
        if(op==='compliance-local'&&child.scenario!=='government')blockers.push('GOVERNMENT_SCENARIO_REQUIRED');if(['compliance','compliance-local'].includes(op)&&p.projects.some(x=>x.customerId===id&&['compliance','compliance-local'].includes(x.operationId)&&!['cancelled','blocked'].includes(x.status)))blockers.push('GOVERNMENT_ARCHITECTURE_ALREADY_ORDERED');
        if(op==='quality'){if(!providerReviewCandidate(child))blockers.push('CONSENTED_CASE_RECORDING_REQUIRED');if(p.projects.some(x=>x.customerId===id&&x.operationId==='quality'&&['running','commissioning'].includes(x.status)))blockers.push('QUALITY_REVIEW_PENDING');}
        if(p.commercialResponsibilityVersion===1){
          const responsibilityHooks={observeResource:(root,resourceId)=>providerHooks().observe(root,resourceId)};
          if(op==='partner-qualification'){blockers.push(...providerResponsibility.qualificationReadiness(s,id,responsibilityHooks).missing);if(p.projects.some(project=>project.customerId===id&&project.operationId===op&&['running','commissioning'].includes(project.status)))blockers.push('QUALIFICATION_REVIEW_PENDING');}
          if(Array.isArray(definition.requirements)&&definition.requirements.includes('partner-qualification')){const qualification=providerResponsibility.qualification(s,id,'partner-qualification',responsibilityHooks);if(!providerResponsibility.permits(qualification.status==='active'?qualification.certificate:null,id,op,s.clock))blockers.push(qualification.status==='expired'?'DISTRIBUTOR_QUALIFICATION_EXPIRED':'CURRENT_SCOPED_DISTRIBUTOR_QUALIFICATION_REQUIRED');}
        }else if(op==='partner-qualification'&&!p.customers.find(c=>c.id===id).history.some(h=>h.qualified))blockers.push('OBSERVED_QUALIFIED_SERVICE_PERIOD_REQUIRED');
        if(['migration','migration-consolidated'].includes(op)&&p.projects.some(x=>x.customerId===id&&['migration','migration-consolidated'].includes(x.operationId)&&!['cancelled','blocked'].includes(x.status)))blockers.push('MIGRATION_ALREADY_ORDERED');
        if(['local-spares','managed-local-spares','sync-records','sync-all'].includes(op)){const c=child.providerContinuity;if(child.scenario!=='defence'||!c)blockers.push('DEFENCE_LOCAL_DEPLOYMENT_REQUIRED');
          if(['local-spares','managed-local-spares'].includes(op)&&p.projects.some(x=>x.customerId===id&&['local-spares','managed-local-spares'].includes(x.operationId)&&!['cancelled','blocked'].includes(x.status)))blockers.push('LOCAL_SPARES_ALREADY_ORDERED');
          if(op==='managed-local-spares'&&!p.progressionReceipts?.receipts?.some(receipt=>receipt.sourceId==='progress.goal.'+'ca'&&receipt.sourceEvidence?.market===p.customers.find(c=>c.id===id)?.market))blockers.push('EARNED_LOCAL_CONTINUITY_MARKET_REQUIRED');
          if(op.startsWith('sync-')){if(!child.connected)blockers.push('RECONNECTION_REQUIRED');if(c&&!(op==='sync-records'?c.pending.filter(x=>x.recordId!==null).length+c.pendingCheckpoint.recorded:c.pending.length+c.pendingCheckpoint.total))blockers.push('NO_RETAINED_WORK_IN_SCOPE');if(p.projects.some(x=>x.customerId===id&&['sync-records','sync-all'].includes(x.operationId)&&['running','commissioning'].includes(x.status)))blockers.push('RECONCILIATION_BUSY');}}
        return blockers;},
      operationCommercial:(s,id,definition,request={})=>{const root=row(s,id).root,meeting=root.information?.meeting.effective;if(providerSecurity.operationDefinition(definition.id)){const c=s.providerCampaign.customers.find(c=>c.id===id),scope={customerId:id,portfolioId:c.portfolioId,tenant:root.tenant,market:c.market},plan=providerSecurity.operationPlan(definition.id,request.config,scope,s.clock),choices=Object.values(providerSecurity.operationIds).map(operationId=>providerSecurity.operationDefinition(operationId)),requiredTerms=choices.map(d=>d.id===definition.id?plan:s.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId===d.id&&p.status!=='cancelled')?.securityPlan||Object.values(d.offers).reduce((best,o)=>o.setupCents<best.setupCents?o:best));return {security:{plan,choices,requiredControlCount:3,partialDeploymentBlocksVoice:true,interruptionStartsAtPurchase:!root.admissionSecurity,totalMinimumSetupCents:requiredTerms.reduce((sum,p)=>sum+p.setupCents,0),totalMinimumPeriodCents:requiredTerms.reduce((sum,p)=>sum+p.periodCents,0),nativeUsageCentsPerMinute:2,providerWholesaleUsageSeparate:true}};}if(definition.id===providerRoomIntegration.OPERATION_ID)return {roomIntegration:{version:1,plan:clone(providerRoomIntegration.canOrder(s,id,providerRoomIntegrationHooks()).plan),implementationMinutes:definition.workMinutes,requiresExplicitTest:true,requiresCompletedBridgeMeeting:true}};if(providerDedicatedInterconnect.terms(definition.id)){const h=providerInterconnectHooks(),eligible=providerDedicatedInterconnect.canOrder(s,{customerId:id,operationId:definition.id},h);return {dedicatedInterconnect:{version:1,plan:eligible.allowed?providerDedicatedInterconnect.plan(s,{customerId:id,operationId:definition.id},h):null,totalLeadMinutes:definition.workMinutes+1,addedSessions:0}};}if(definition.id===providerRegionalSupport.OPERATION_ID){const result=providerRegionalSupport.canOrder(s,{customerId:id,...request.config},providerRegionalSupportHooks()),old=s.providerCampaign.projects.find(p=>p.id===result.supportReplacesProjectId),customer=s.providerCampaign.customers.find(c=>c.id===id),end=old?Math.max(s.clock+definition.workMinutes,old.completedAt+old.minimumTermPeriods*60):s.clock;return {regionalSupport:{...clone(result.plan),...(result.earnedTerms?{earnedTerms:clone(result.earnedTerms)}:{}),minimumTermPeriods:providerRules.data.missions[customer.scenario].termPeriods,supportReplacesProjectId:result.supportReplacesProjectId||null,remainingPreviousCommitmentCents:old?providerCampaign.operationExposure({...old,supportReplacement:{commitmentEndsAt:end}},customer,s.clock,end):0}};}if(providerOwnedSites.OPERATION_IDS.includes(definition.id))return {ownedSite:{version:1,...(['owned-site-operations','site-recovery','managed-site-recovery'].includes(definition.id)?{routingVersion:2}:{}),operationId:definition.id,selection:clone(request.config||{}),implementationMinutes:definition.workMinutes,commissioningMinutes:providerOwnedSites.TERMS[definition.id].commissioningMinutes||1}};if(['national-wholesale-headroom','managed-national-wholesale-headroom','public-service-capture-reserve'].includes(definition.id)){const capture=definition.id==='public-service-capture-reserve',resource=capture?'recorder':'carrier',added=8;return {capacity:[{id:resource,current:root.resources[resource].desired.capacity,capacity:root.resources[resource].desired.capacity+added,added,unit:capture?'concurrent capture reservations':'concurrent sessions'}],earnedScope:{version:1,customerId:id,customerName:s.providerCampaign.customers.find(c=>c.id===id)?.name||id,sourceId:capture?'progress.progression-level.6':'progress.progression-level.5',deliveryRequiresCurrentBoundary:capture}};}if(['room','browser-guest-room','distributor-room','integrator-room','cisco-meetings-interoperability'].includes(definition.id)){const guest=definition.id==='browser-guest-room',bridge=definition.id==='cisco-meetings-interoperability';return {meetingJoin:{version:1,method:guest?'browser':bridge?'bridge':'native',participantCapacity:guest?2:8,supports:{recording:!guest,captions:!guest,externalGuests:true,events:false},totalLeadMinutes:definition.workMinutes+(definition.kind==='product'?1:0),mediaPlacement:guest?'cloud':root.resources.phone.desired.local?'local':'cloud',capturePrerequisites:['recorder','archive'],captionPrerequisites:['speech','archive'],retainedCommitments:s.providerCampaign.projects.filter(p=>p.customerId===id&&p.resources.includes('room')&&p.status==='complete').map(p=>({projectId:p.id,operationId:p.operationId,periodCents:p.periodCents,commitmentEndsAt:p.serviceRetirement?.commitmentEndsAt??null}))}};}if([...providerResilience.OPS,'transport-repair'].includes(definition.id)){const commissioningMinutes=definition.id==='managed-diverse-upstream'?10:['primary-upstream','diverse-upstream'].includes(definition.id)?8:1;return {transport:{version:1,implementationMinutes:definition.workMinutes,commissioningMinutes,totalLeadMinutes:definition.workMinutes+commissioningMinutes-1,capacityMbps:['primary-upstream','diverse-upstream','managed-diverse-upstream'].includes(definition.id)?20:0,siteCount:definition.id==='primary-upstream'?2:0,newLinkCount:['primary-upstream','diverse-upstream','managed-diverse-upstream'].includes(definition.id)?1:0},...(definition.id==='primary-upstream'?{resilienceWorkload:clone(providerRules.data.resilienceSequence)}:{})};}if(['direct-external-reach','managed-external-reach'].includes(definition.id))return {capacity:[{id:'carrier',current:root.resources.carrier.desired.capacity,capacity:root.resources.carrier.desired.capacity+2,added:2,unit:'concurrent sessions'}],externalReach:{version:1,aliases:[{number:'+6125550191',holder:'alex'},{number:'+6125550192',holder:'bea'}],allowedPrefix:'+44',allowInternational:false}};if(definition.id==='ms-meetings-room'&&meeting?.bridgeLicensed)return {roomCompatibility:{version:1,customerId:id,previousProfile:clone(meeting),nextBridgeLicensed:false,keptDeploymentIds:(root.products?.deployments||[]).filter(d=>!d.retirement&&d.effective).map(d=>d.id),affectedSessions:(root.information.meetingSessions||[]).filter(m=>['scheduled','active'].includes(m.status)).map(m=>({id:m.id,status:m.status,bookingId:m.bookingId}))}};if(['migration','migration-consolidated'].includes(definition.id))return {migrationPreview:providerChangePreview.preview(s,id,definition.id)};if(s.providerCampaign.commercialResponsibilityVersion!==1)return {};if(definition.id==='partner-qualification')return {qualification:{issuer:'Branch Distribution',holder:'Orchard MSP',validForMinutes:providerResponsibility.QUALIFICATION_MINUTES,startsAfterCommissioning:true,scopes:clone(providerResponsibility.SCOPES)}};if(Array.isArray(definition.requirements)&&definition.requirements.includes('partner-qualification')){const q=providerResponsibility.qualification(s,id,'partner-qualification',{observeResource:(root,resourceId)=>providerHooks().observe(root,resourceId)});return {qualificationAuthorization:q.status==='active'?{certificateId:q.certificate.id,issuer:'Branch Distribution',scope:definition.id,expiresAt:q.certificate.expiresAt}:null};}return {};},
      continuity:child=>child.providerContinuity?{...clone(child.providerContinuity),...providerContinuity.observe(child.providerContinuity,child.clock,child.connected)}:null,
      operationResourceReady:(child,definition,id)=>['ms-workplace-calling','cisco-contact-centre'].includes(definition.id)&&child.products?.integrations.some(e=>e.id===providerUcCcIntegration.EDGE_ID)?providerUcCcHooks(null,null,child).resourceReady(child,id).ready:['migration','migration-consolidated'].includes(definition.id)?providerServiceBoundaryHooks().observeServiceResource(child,id,'provider-service-boundary-'+child.providerCustomer.id).ready:providerHooks().observe(child,id).ready,
      operationFunded:(s,project)=>{if(providerSecurity.operationDefinition(project.operationId)&&!row(s,project.customerId).root.admissionSecurity)apply(s,project.customerId,{type:'admission-security',command:{action:'start'}});},
      operationDelivered:(s,project)=>{if(project.operationId===providerRoomIntegration.OPERATION_ID){const result=providerRoomIntegration.projectEvidence(s,project.id,providerRoomIntegrationHooks());if(!result.ready)fail('PROVIDER_ROOM_INTEGRATION_DELIVERY_REQUIRED');project.operationReceipt.evidence=clone(result.evidence);}if(project.operationId===providerIncidentDiagnosis.OPERATION_ID){const c=s.providerCampaign.customers.find(c=>c.id===project.customerId),child=row(s,c.id).root;project.operationReceipt.evidence=providerIncidentDiagnosis.complete(s.providerCampaign,c,project,child,providerDiagnosisHooks(s));}if(providerDedicatedInterconnect.terms(project.operationId)){project.operationReceipt.deliveredAt=s.clock;providerDedicatedInterconnect.validateReceipt(s,project,providerInterconnectHooks());}if(project.operationId===providerRegionalSupport.OPERATION_ID&&project.config?.coverageId==='distributor-extended'){const delivery=providerRegionalSupport.completeEligibility(s,project,providerRegionalSupportHooks());if(!delivery.eligible)fail('DISTRIBUTOR_SUPPORT_DELIVERY_REQUIRED');Object.assign(project.operationReceipt.commercial,clone(delivery.commissionEvidence));}},
      operationReady:(child,definition,parent,project)=>providerSecurity.operationDefinition(definition.id)?child.admissionSecurity?.controls[definition.control]?.provisioning.status==='ready'&&providerSecurityEqual(child.admissionSecurity.controls[definition.control].effective,project.securityPlan.nativeConfig):definition.id===providerRoomIntegration.OPERATION_ID?providerRoomIntegration.projectEvidence(parent,project.id,providerRoomIntegrationHooks()).ready:providerDedicatedInterconnect.terms(definition.id)?!!providerDedicatedInterconnect.commissionEvidence(parent,project,providerInterconnectHooks()):definition.id===providerIntegrationAssurance.OPERATION_ID?providerIntegrationAssurance.current(parent,project.operationReceipt?.binding,providerProgressionHooks(parent,false)).eligible:definition.id===providerRegionalSupport.OPERATION_ID?project.operationReceipt?.kind===providerRegionalSupport.OPERATION_ID&&project.operationReceipt.projectId===project.id&&(project.config?.coverageId!=='distributor-extended'||providerRegionalSupport.completeEligibility(parent,project,providerRegionalSupportHooks()).eligible):providerOwnedSites.OPERATION_IDS.includes(definition.id)?providerOwnedSiteOperationReady(parent,project):definition.id==='public-service-capture-reserve'?['recorder','archive','speech'].every(id=>boundaryCheck(child,id)?.eligible===true&&providerHooks().observe(child,id).ready):[...providerResilience.OPS,'transport-repair'].includes(definition.id)?providerResilienceReady(child,definition,project):providerUcCcIntegration.OPERATION_IDS.includes(definition.id)?providerUcCcOperationReady(parent,project):definition.id==='service-boundary-review'?child.boundaries?.contracts.some(c=>c.id==='provider-service-boundary-'+child.providerCustomer.id&&boundaries.evaluate(child,c.id).eligible):['migration','migration-consolidated'].includes(definition.id)?!!child.providerTasks?.some(t=>(definition.id==='migration-consolidated'?t.mode==='consolidated':t.mode===undefined)&&child.operations?.migrations.some(m=>m.id===t.migrationId&&m.status==='complete')):definition.id==='cisco-dedicated-uc'&&child.providerTasks?.some(t=>t.mode==='product-dedicated')?child.products?.deployments.some(d=>d.id==='d-'+definition.id&&d.provisioning.status==='ready')&&child.providerTasks.filter(t=>t.mode==='product-dedicated').every(t=>child.operations?.migrations.some(m=>m.id===t.migrationId&&m.status==='complete')):definition.id==='coaching'?child.workforceOps?.coaching.some(j=>j.providerReceipt&&j.status==='complete'):definition.id==='bpo'?child.workforceOps?.providerCover?.people.every(id=>child.workforceOps.roster.effective?.some(p=>p.id===id)):definition.kind!=='product'||child.products?.deployments.some(d=>d.id==='d-'+definition.id&&d.provisioning.status==='ready'&&!d.retirement&&(!d.retirementHistory?.length||d.effective.features.every(f=>products.featureStatus(child,d.id,f,productHooks(child)).available))),
      operation:(s,id,definition)=>{
        if(providerSecurity.operationDefinition(definition.id)){const project=s.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId===definition.id&&p.status==='running');if(!project||!providerSecurity.validatePlan(project.securityPlan))fail('PAID_SECURITY_PLAN_REQUIRED');for(const command of providerSecurity.nativeCommands(project.securityPlan))apply(s,id,{type:'admission-security',command});return {providerSecurity:providerSecurity.planReceipt(project.securityPlan)};}
        if(definition.kind==='product')return providerProductOrder(s,id,definition,apply);
        const configs=Object.fromEntries((definition.resources||[]).map(resourceId=>[resourceId,{enabled:true,...(definition.config?.[resourceId]||{})}]));
        for(const [resourceId,config] of Object.entries(definition.config||{}))configs[resourceId]={...configs[resourceId],...config};
        const child=row(s,id).root;
        if(definition.id===providerIncidentDiagnosis.OPERATION_ID){const project=s.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId===definition.id&&p.status==='running');if(!project)fail('PROVIDER_DIAGNOSIS_PAID_PROJECT_REQUIRED');return {kind:definition.id,version:1,projectId:project.id,postingId:project.postingId};}
        if(providerCaseFollowup.terms(definition.id))return {kind:'provider-case-followup-workflow',at:s.clock-1};
        if(providerDedicatedInterconnect.terms(definition.id)){const project=s.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId===definition.id&&p.status==='running'),plan=project?.interconnectPlan;if(!project||!providerDedicatedInterconnect.validPlan(plan))fail('PAID_PROVIDER_INTERCONNECT_REQUIRED');apply(s,id,{type:'operations',command:{action:'configure',kind:'carrier',config:clone(plan.carrierProfile)}});return providerDedicatedInterconnect.createReceipt(plan,{projectId:project.id,postingId:project.postingId,submittedAt:s.clock});}
        if(definition.id===providerRegionalSupport.OPERATION_ID){const project=s.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId===definition.id&&p.status==='running');if(!project)fail('PAID_NAMED_SUPPORT_REQUIRED');const plan=providerRegionalSupport.operationPlan(project.supportRequest);return {kind:providerRegionalSupport.OPERATION_ID,version:1,projectId:project.id,postingId:project.postingId,customerId:id,installedAt:child.clock,supportAssignment:clone(plan.supportAssignment),...(project.supportCommercialEvidence?{commercial:{...clone(project.supportCommercialEvidence),deliveredAt:null,deliveryDistributor:null}}:{})};}
        if(providerOwnedSites.OPERATION_IDS.includes(definition.id))return providerOwnedSiteOrder(s,id,definition,apply);
        if(providerResilience.OPS.includes(definition.id)){
          const p=s.providerCampaign,customer=p.customers.find(c=>c.id===id),project=p.projects.findLast(row=>row.customerId===id&&row.operationId===definition.id&&row.status==='running'),hooks=providerResilienceHooks(s),order=providerResilience.commands(p,customer,project,child,hooks);
          if(!child.transport)child.transport=transport.create(child);
          for(const command of order.commands)transport.command(child,command,{...transportHooks(child),authorize:()=>true});
          child.providerResilience??={version:1,installations:[]};const installed=providerResilience.installation(p,customer,project,child,hooks);child.providerResilience.installations.push(installed);
          return {kind:definition.id,installedAt:child.clock,projectId:project.id,postingId:project.postingId};
        }
        if(definition.id==='transport-repair'){
          const incident=s.providerCampaign.incidents.find(i=>i.customerId===id&&i.kind==='transport-domain'&&i.status==='acknowledged'),project=s.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId===definition.id&&p.status==='running');
          if(!incident||!project)fail('ACKNOWLEDGED_TRANSPORT_INCIDENT_REQUIRED');
          transport.command(child,{action:'domain',id:incident.domain,failed:false},{...transportHooks(child),authorize:()=>true});
          incident.status='resolved';incident.resolvedAt=s.clock;incident.repairProjectId=project.id;
          return {kind:'provider-transport-repair',at:child.clock,incidentId:incident.id,domain:incident.domain,resources:[]};
        }
        if(definition.id===providerRoomIntegration.OPERATION_ID){const project=s.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId===definition.id&&p.status==='running'),receipt=project&&providerRoomIntegration.createReceipt(s,project.id,providerRoomIntegrationHooks());if(!receipt)fail('PAID_ROOM_INTEGRATION_SCOPE_REQUIRED');for(const command of providerRoomIntegration.integrationCommands(receipt.plan))apply(s,id,command);return receipt;}
        if(providerUcCcIntegration.OPERATION_IDS.includes(definition.id)){const project=s.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId===definition.id&&p.status==='running');if(!project)fail('PAID_UC_CC_PROJECT_REQUIRED');const receipt=providerUcCcIntegration.createReceipt(s,project.id,providerUcCcHooks(s,id,child));for(const command of providerUcCcIntegration.startCommands(receipt.plan))apply(s,id,command);return receipt;}
        // Qualification reviews existing service and settlement evidence; it does
        // not reprovision the dependencies whose generations a boundary binds.
        if(definition.id==='partner-qualification')return {kind:'operation',operationId:definition.id,at:child.clock,revision:child.revision};
        if(definition.id==='service-boundary-review'){const plan=providerServiceBoundary.plan(s,id,providerServiceBoundaryHooks());if(!row(s,id).root.boundaries)apply(s,id,{type:'boundaries',command:{action:'start'}});for(const command of providerServiceBoundary.startCommands(plan))apply(s,id,command);return {kind:'service-boundary',at:row(s,id).root.clock,plan};}
        if(['national-wholesale-headroom','managed-national-wholesale-headroom','public-service-capture-reserve'].includes(definition.id)){
          const capture=definition.id==='public-service-capture-reserve',resourceId=capture?'recorder':'carrier',before=child.resources[resourceId].desired.capacity,added=8;
          configure(s,id,{[resourceId]:{capacity:before+added}});
          let boundaryRefresh;
          if(capture){
            const current=row(s,id).root,contractId=current.boundaries.bindings.recorder,contract=current.boundaries.contracts.find(c=>c.id===contractId),previousGeneration=contract.generation;
            // Rebind the purchased capacity to the existing policy. A changed or
            // ineligible policy remains changed; this purchase grants no permissions.
            const policy={...clone(contract.desired),flows:contract.desired.flows.map(({resourceGeneration,...flow})=>clone(flow))};
            apply(s,id,{type:'boundaries',command:{action:'contract',contract:policy}});
            boundaryRefresh={contractId,previousGeneration,generation:previousGeneration+1};
          }
          return {kind:definition.id,resource:resourceId,previousCapacity:before,capacity:before+added,unit:capture?'concurrent capture reservations':'concurrent sessions',at:child.clock,...(boundaryRefresh?{boundaryRefresh}:{})};
        }
        if(['carrier-headroom','managed-carrier-headroom'].includes(definition.id)){const before=child.resources.carrier.desired.capacity;configure(s,id,{carrier:{capacity:before+4}});return {kind:definition.id,resource:'carrier',previousCapacity:before,capacity:before+4,unit:'concurrent sessions'};}
        if(['direct-external-reach','managed-external-reach'].includes(definition.id)){
          const before=child.resources.carrier.desired.capacity,aliases=[{number:'+6125550191',holder:'alex'},{number:'+6125550192',holder:'bea'}];
          const patches={carrier:{capacity:before+2}};
          for(const resourceId of ['phone','migration-phone'])if(child.resources[resourceId])patches[resourceId]={routes:[...clone(child.resources[resourceId].desired.routes).filter(route=>route.prefix!=='+44'),{prefix:'+44',target:'service'}]};
          configure(s,id,patches);
          for(const alias of aliases){apply(s,id,{type:'operations',command:{action:'reserve',number:alias.number,type:'user'}});apply(s,id,{type:'operations',command:{action:'assign',...alias}});}
          for(const identity of ['alex','bea'])apply(s,id,{type:'operations',command:{action:'policy',identity,allowInternational:false,allowedPrefixes:['+61','+44'],callerId:child.operations.policies[identity].callerId}});
          return {kind:definition.id,resource:'carrier',previousCapacity:before,capacity:before+2,unit:'concurrent sessions',at:child.clock,aliases,allowedPrefix:'+44'};
        }
        if(definition.id==='capture-headroom'){const before=child.resources.recorder.desired.capacity;configure(s,id,{recorder:{capacity:before+4}});return {kind:definition.id,resource:'recorder',previousCapacity:before,capacity:before+4,unit:'concurrent capture reservations'};}
        if(['repair','mitigate','service-repair'].includes(definition.id)){
          const affected=[];
          for(const incident of s.providerCampaign.incidents.filter(x=>x.customerId===id&&x.kind!=='transport-domain'&&['active','acknowledged'].includes(x.status))){
            const resourceId=({processor:'speech',connectivity:'access'})[incident.resource]||incident.resource;
            affected.push(resourceId);
            if(incident.kind==='boundary'){apply(s,id,{type:'boundaries',command:{action:'contract',contract:clone(incident.receipt.previousContract)}});continue;}
            if(incident.kind==='disconnection')apply(s,id,{type:'connect',connected:true});
            else if(incident.fault==='CAPACITY'&&resourceId==='room')apply(s,id,{type:'information',command:{action:'configure',kind:'meeting',config:{capacity:incident.receipt.previousCapacity}}});
            else apply(s,id,{type:'fault',id:resourceId,fault:null});
            if(definition.id==='mitigate'){if(resourceId==='room')apply(s,id,{type:'information',command:{action:'configure',kind:'meeting',config:{capacity:(incident.receipt.previousCapacity||row(s,id).root.information.meeting.capacity)+1}}});else configure(s,id,{[resourceId]:{capacity:row(s,id).root.resources[resourceId].desired.capacity+1}});}
          }
          return {kind:definition.id,resources:affected,at:child.clock,revision:row(s,id).root.revision};
        }
        if(['local-spares','managed-local-spares','sync-records','sync-all'].includes(definition.id)){
          const project=s.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId===definition.id&&p.status==='running');if(!project||!child.providerContinuity)fail('PROVIDER_PAID_CONTINUITY_REQUIRED');
          const receipt={projectId:project.id,postingId:project.postingId,at:child.clock};
          if(['local-spares','managed-local-spares'].includes(definition.id))providerContinuity.installSpares(child.providerContinuity,child.clock,receipt);
          else {
            const scope=definition.id==='sync-records'?'records':'all',items=clone(child.providerContinuity.pending.filter(item=>scope==='all'||item.recordId!==null)),pending=child.providerContinuity.pendingCheckpoint,checkpoint=scope==='all'?{total:pending.total,recorded:pending.recorded,unrecorded:pending.unrecorded,throughAt:pending.lastAt}:{total:pending.recorded,recorded:pending.recorded,unrecorded:0,throughAt:pending.lastRecordedAt};
            return {kind:definition.id,...providerContinuity.synchronise(child,scope,receipt),...(['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion)?{reconciliationVersion:1,items,checkpoint}:{})};
          }
          return {kind:definition.id,...receipt};
        }
        if(definition.id==='quality'){
          const project=s.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId==='quality'&&p.status==='running');if(!project)fail('PROVIDER_PAID_REVIEW_REQUIRED');const candidate=providerReviewCandidate(child,project.acceptedAt);if(!candidate)fail('CONSENTED_CASE_RECORDING_REQUIRED');
          child.providerReviews??=[];const review={projectId:project.id,postingId:project.postingId,at:child.clock,reviewer:'supervisor',...candidate};child.providerReviews.push(review);return clone(review);
        }
        if(definition.id===providerIntegrationAssurance.OPERATION_ID){const project=s.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId===definition.id&&p.status==='running');if(!project)fail('PROVIDER_PAID_POLICY_REQUIRED');const receipt=providerIntegrationAssurance.createReceipt(s,project,providerProgressionHooks(s,false)),config={...providerPolicy.create(),customerIds:[id]};s.providerAutomation??=[];s.providerAutomation.push({projectId:project.id,customerId:id,budgetCents:0,spentCents:0,status:'suspended',actions:[],config});return receipt;}
        if(definition.id==='regional-provisioning'){const project=s.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId===definition.id&&p.status==='running');if(!project)fail('PROVIDER_PAID_POLICY_REQUIRED');const config={...providerPolicy.create(),customerIds:[id]};s.providerAutomation??=[];s.providerAutomation.push({projectId:project.id,customerId:id,budgetCents:0,spentCents:0,status:'suspended',actions:[],config});const earned=regionalProvisioningReceipt(s,[s.providerCampaign.customers.find(c=>c.id===id)?.market],project.acceptedAt);if(!earned)fail('EARNED_REGIONAL_SCOPE_REQUIRED');return {kind:'regional-provisioning',projectId:project.id,...(s.providerCampaign.contentVersion==='provider-campaigns-8'?{sourceId:earned.sourceId,receiptId:earned.id,allowedMarkets:clone(earned.sourceEvidence.markets)}:{})};}
        if(definition.id==='automation'){
          const project=s.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId==='automation'&&p.status==='running');if(!project)fail('PROVIDER_PAID_POLICY_REQUIRED');
          s.providerAutomation??=[];s.providerAutomation.push({projectId:project.id,customerId:id,budgetCents:16000,spentCents:0,status:'active',actions:[]});return {kind:'assurance-policy',projectId:project.id,budgetCents:16000};
        }
        if(['bpo','coaching'].includes(definition.id)){
          const project=s.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId===definition.id&&p.status==='running');if(!project)fail('PROVIDER_PAID_WORKFORCE_REQUIRED');
          if(definition.id==='bpo'){const count=child.workforceOps.roster.desired.length+2;configure(s,id,{people:{enabled:true,people:count,entitlements:Math.max(count,child.resources.people.desired.entitlements)}});return workforce.providerCover(row(s,id).root,{projectId:project.id,postingId:project.postingId});}
          return workforce.providerCoach(child,{projectId:project.id,postingId:project.postingId,costCents:definition.setupCents});
        }
        if(definition.id==='recording'){configs.recorder={...configs.recorder,identityMapping:true};child.providerCustomer.recording=true;}
        if(definition.id==='transcription')configs.speech={...configs.speech,region:child.jurisdiction,local:true,licenceLocal:true};
        if(definition.id==='local-deployment'){
          if(child.scenario==='defence'&&!child.providerContinuity)child.providerContinuity=providerContinuity.create(child.clock);
          // The authored change replaces the platform blueprint; callers cannot set kinds.
          const old=child.resources.phone,desired={...old.desired,...configs.phone,deployment:'dedicated',local:true};
          const replacement=resource('phone','dedicated',desired);replacement.generation=old.generation+1;replacement.provisioning={status:'pending',due:child.clock+1,generation:replacement.generation};
          child.resources.phone=replacement;delete configs.phone;
          for(const key of ['identity','access','carrier','messages','engage'])configs[key]={...configs[key],local:true};
        }
        if(s.providerCampaign.meetingDependencyVersion===1&&['migration','migration-consolidated'].includes(definition.id)){delete configs.phone;delete configs.desk;}
        if(['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion)&&['room','distributor-room','integrator-room'].includes(definition.id))configs.room={...configs.room,mode:'native',interop:false};
        configure(s,id,configs);
        if(['room','browser-guest-room','distributor-room','integrator-room','recording','transcription','local-deployment','compliance'].includes(definition.id)&&!row(s,id).root.information)apply(s,id,{type:'information',command:{action:'start'}});
        if(['room','distributor-room','integrator-room','local-deployment'].includes(definition.id))apply(s,id,{type:'information',command:{action:'configure',kind:'meeting',config:{...(s.providerCampaign.meetingDependencyVersion===1?{platformDependency:{version:1,resourceId:'phone'}}:{}),mediaPlacement:row(s,id).root.resources.phone.desired.local?'local':'cloud',platform:child.providerCustomer.planId==='steady'?'disco':'grove',nativePlatform:child.providerCustomer.planId==='steady'?'disco':'grove'}}});
        if(['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion)&&['room','browser-guest-room','distributor-room','integrator-room'].includes(definition.id)){
          const guest=definition.id==='browser-guest-room',platform=child.providerCustomer.planId==='steady'?'disco':'grove';
          apply(s,id,{type:'information',command:{action:'configure',kind:'meeting',config:{calendarAuthorised:true,bookingEnabled:true,platform,nativePlatform:platform,guestJoin:true,bridgeLicensed:false,capacity:guest?2:8,eventLicensed:false,eventCapacity:100,mediaPlacement:guest?'cloud':child.resources.phone.desired.local?'local':'cloud',captions:false,recording:guest?false:child.providerCustomer.recording===true,...(s.providerCampaign.meetingDependencyVersion===1?{platformDependency:{version:1,resourceId:'phone'}}:{})}}});
        }
        if(definition.id==='transcription')apply(s,id,{type:'information',command:{action:'configure',kind:'pipeline',config:{steps:['transcription'],languages:['en','ja'],quality:90,minimumQuality:70}}});
        if(['compliance','compliance-local'].includes(definition.id)){
          if(!row(s,id).root.boundaries)apply(s,id,{type:'boundaries',command:{action:'start'}});
          const root=row(s,id).root,region=root.jurisdiction,resources=Object.keys(root.resources).filter(id=>root.resources[id].desired.enabled);
          const architecture=s.providerCampaign.contentVersion!=='provider-campaigns-1'?governmentArchitectures.plan(definition.id==='compliance-local'?'local-processing':'regional-cloud',{jurisdiction:region,resources:['recorder','archive','speech'],contractId:'provider-public-service-processing'}):null;
          if(architecture){configure(s,id,architecture.resourceConfigs);const project=s.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId===definition.id&&p.status==='running');row(s,id).root.providerGovernment={version:1,architectureId:architecture.id,projectId:project.id,postingId:project.postingId,installedAt:row(s,id).root.clock,lastConnectedAt:row(s,id).root.clock};}
          const contract={id:'provider-public-service',workload:'public-service-records',profile:region,sensitivity:'internal',edition:'standard',productVersion:'provider-1',offeringEvidence:region==='US'?'eligible':'pending',customerAuthorization:'approved',agencyAuthorizationRequired:region==='US',agencyAuthorization:region==='US'?'approved':'not-required',serviceRegistration:region==='JP'?'registered':'not-registered',serviceRegistrationId:region==='JP'?'scenario-jp-public-service':null,usesAi:false,aiUseDecision:'not-required',language:region==='JP'?'ja':'en',supportLanguage:region==='JP'?'ja':'en',requirements:{processingRegions:[region],storageRegions:[region],backupRegions:[region],keyRegions:[region],adminRegions:[region],supportRegions:[region],allowedAccessRoles:['supervisor'],adminAuthorization:'customer-approved',continuity:'cloud',allowedTransferMechanisms:[]},flows:resources.map(resource=>({id:resource+'-flow',resource,informationClass:'internal',processingRegions:[region],storageRegions:[region],backupRegions:[region],keyCustodyRegions:[region],adminLocations:[region],supportRegions:[region],adminAuthorization:'customer-approved',accessRoles:['supervisor'],connectivity:'cloud',continuity:'cloud',licenceMode:'cloud',transfer:{parties:[],mechanism:null}}))};
          for(const [group,members] of Object.entries({calling:resources.filter(x=>!['archive','recorder','speech'].includes(x)),capture:['archive','recorder'],processing:['speech']})){const source=architecture&&group!=='calling'?architecture.boundaryContract:contract,scoped={...source,id:contract.id+'-'+group,flows:source.flows.filter(f=>members.includes(f.resource))};apply(s,id,{type:'boundaries',command:{action:'contract',contract:scoped}});for(const resource of members)apply(s,id,{type:'boundaries',command:{action:'bind',resource,contract:scoped.id}});}
          providerBoundaryObservations(row(s,id).root);
        }
        if(['migration','migration-consolidated'].includes(definition.id)){
          const consolidated=definition.id==='migration-consolidated';
          if(consolidated){const current=row(s,id).root,old=current.resources.phone,replacement=resource('phone','dedicated',{...old.desired,deployment:'dedicated',local:true,extensionScope:'site'});replacement.generation=old.generation+1;replacement.provisioning={status:'pending',due:current.clock+1,generation:replacement.generation};current.resources.phone=replacement;}
          if(!consolidated&&!row(s,id).root.resources['migration-phone'])apply(s,id,{type:'add',id:'migration-phone',kind:'dedicated',config:{region:child.jurisdiction,routes:clone(row(s,id).root.resources.phone.desired.routes)}});
          if(!row(s,id).root.operations)apply(s,id,{type:'operations',command:{action:'start'}});
          const target=row(s,id).root;target.providerTasks=target.providerTasks||[];target.providerTasks.push({kind:'migration',status:'waiting',createdAt:target.clock,migrationId:null,...(consolidated?{mode:'consolidated'}:{})});
        }
        return {kind:'operation',operationId:definition.id,at:row(s,id).root.clock,revision:row(s,id).root.revision};
      },
      interact:(s,id,command)=>{const child=apply(s,id,{type:'interact',...command});return child.interactions.at(-1)?.id;},
      interaction:(child,id)=>child.interactions.find(x=>x.id===id),observe:(child,id)=>{const observed=observe(child,id),gate=productGate(child,id),boundary=boundaryCheck(child,id);const roomCapacity=id!=='room'||!child.information||child.information.meeting.effective?.capacity>0;return {...observed,reasons:[...observed.reasons,...(!roomCapacity?['MEETING_CAPACITY']:[]),...(gate&&!gate.available?[gate.reason]:[]),...(boundary&&!boundary.eligible?boundary.blocking.map(x=>x.code):[])],boundary:boundary?{...boundary,requirements:clone(child.boundaries.contracts.find(c=>c.id===boundary.contract)?.effective?.requirements||null),flow:clone(child.boundaries.contracts.find(c=>c.id===boundary.contract)?.effective?.flows.find(f=>f.resource===id)||null)}:null,ready:observed.ready&&roomCapacity&&(!gate||gate.available)&&(!boundary||boundary.eligible)};},
      meeting:(s,id,request)=>{try{if(!row(s,id).root.information)return {blocked:'MEETING_SERVICE_NOT_COMMISSIONED'};const root=apply(s,id,{type:'information',command:{action:'book',...request,event:false,language:'en'}}),bookingId=root.information.bookings.at(-1).id;const next=apply(s,id,{type:'information',command:{action:'schedule',booking:bookingId}});return {bookingId,sessionId:next.information.meetingSessions.at(-1).id};}catch(error){return {blocked:error.message};}},
      missionEvidence:(s,id,window)=>{const child=row(s,id).root,from=window.from,to=window.to;
        return {meetingSessions:(child.information?.meetingSessions||[]).filter(x=>x.status==='completed'&&x.startedAt>=from&&x.endedAt<=to&&(!['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion)||!providerRules.data.missions[child.scenario].requirements.recording||x.features.recording&&child.records.some(r=>r.id===x.captureRecordId&&r.kind==='recording'&&r.interaction===x.bookingId&&!r.deleted))).map(x=>({id:x.id,startedAt:x.startedAt,endedAt:x.endedAt,recordId:x.captureRecordId,...(x.platformDependency?{platformDependency:clone(x.platformDependency)}:{})})),transcripts:child.records.filter(x=>x.kind==='transcription'&&!x.deleted&&x.createdAt>=from&&x.createdAt<=to).map(x=>x.id),boundaryEligible:['recorder','archive','speech'].every(id=>boundaryCheck(child,id)?.eligible===true),migrationComplete:providerMigrationEvidence(s,id,window).complete,reconciliationComplete:!!child.providerContinuity&&child.connected&&child.providerContinuity.syncedCheckpoint.total>0&&child.providerContinuity.pending.length+child.providerContinuity.pendingCheckpoint.total===0,localReady:['identity','access','phone','local','carrier','messages','engage'].every(id=>child.resources[id]?.effective?.local&&observe(child,id).ready),disconnectedDelivered:child.interactions.filter(x=>!x.probe&&x.providerContext?.connected===false&&x.phase==='resolved'&&x.finishedAt>=from&&x.finishedAt<=to).length};
      },
      setIncident:(s,id,incident)=>{if(incident.fault==='BOUNDARY_SUPPORT'){const child=row(s,id).root,contractId=child.boundaries?.bindings.speech,contract=child.boundaries?.contracts.find(c=>c.id===contractId);if(!contract?.effective)fail('GOVERNMENT_BOUNDARY_NOT_READY');const previousContract={...clone(contract.effective),flows:contract.effective.flows.map(({resourceGeneration,...flow})=>clone(flow))},changed=clone(previousContract);changed.flows.find(f=>f.resource==='speech').supportRegions=[child.jurisdiction==='US'?'AU':'US'];apply(s,id,{type:'boundaries',command:{action:'contract',contract:changed}});return {at:child.clock,resource:'speech',contractId,field:'supportRegions',previousContract,revision:row(s,id).root.revision};}if(incident.fault==='CAPACITY'&&incident.resource==='room'){const previousCapacity=row(s,id).root.information?.meeting.effective?.capacity;if(!Number.isSafeInteger(previousCapacity))fail('PROVIDER_MEETING_CAPACITY_REQUIRED');apply(s,id,{type:'information',command:{action:'configure',kind:'meeting',config:{capacity:0}}});return {at:row(s,id).root.clock,resource:'room',previousCapacity,revision:row(s,id).root.revision};}if(incident.connected!==undefined)apply(s,id,{type:'connect',connected:incident.connected});const resourceId=({processor:'speech',connectivity:'access'})[incident.resource]||incident.resource;if(incident.resource&&incident.connected===undefined)apply(s,id,{type:'fault',id:resourceId,fault:incident.fault===null?null:'OUTAGE'});return {at:row(s,id).root.clock,resource:resourceId,revision:row(s,id).root.revision};}
    };
  }
  function validateProviderSyncItems(parent,child,receipt,seen){
    const required=['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(parent.providerCampaign.contentVersion);
    if(receipt.reconciliationVersion===undefined){if(required)fail('INVALID_PROVIDER_SYNC_ITEMS');return;}
    const cp=receipt.checkpoint;
    if(receipt.reconciliationVersion!==1||!Array.isArray(receipt.items)||receipt.items.length>128||!cp||Object.keys(cp).sort().join(',')!=='recorded,throughAt,total,unrecorded'||!['total','recorded','unrecorded'].every(key=>Number.isSafeInteger(cp[key])&&cp[key]>=0)||cp.total!==cp.recorded+cp.unrecorded||cp.total>0&&(!Number.isSafeInteger(cp.throughAt)||cp.throughAt>receipt.at)||cp.total===0&&cp.throughAt!==null||receipt.scope==='records'&&cp.unrecorded!==0)fail('INVALID_PROVIDER_SYNC_ITEMS');
    let recorded=cp.recorded,unrecorded=cp.unrecorded;
    for(const item of receipt.items){
      if(!item||Object.keys(item).sort().join(',')!=='caseId,finishedAt,interactionId,recordId'||!isId(item.interactionId)||!isId(item.caseId)||!Number.isSafeInteger(item.finishedAt)||item.finishedAt<child.providerContinuity.installedAt||item.finishedAt>receipt.at||item.recordId!==null&&!isId(item.recordId)||receipt.scope==='records'&&item.recordId===null||seen.has(item.interactionId)||child.providerContinuity.pending.some(row=>row.interactionId===item.interactionId))fail('INVALID_PROVIDER_SYNC_ITEMS');
      seen.add(item.interactionId);const interaction=child.interactions.find(row=>row.id===item.interactionId),number=Number(/^interaction-([1-9][0-9]*)$/.exec(item.interactionId)?.[1]);
      if(interaction?interaction.phase!=='resolved'||interaction.probe===true||interaction.providerContext?.connected!==false||interaction.caseId!==item.caseId||interaction.finishedAt!==item.finishedAt||item.recordId!==null&&!interaction.records?.includes(item.recordId):!Number.isSafeInteger(number)||number>(child.providerArchive?.throughInteractionId||0))fail('INVALID_PROVIDER_SYNC_ITEMS');
      const record=item.recordId===null?null:child.records.find(row=>row.id===item.recordId);if(record&&record.interaction!==item.interactionId)fail('INVALID_PROVIDER_SYNC_ITEMS');
      if(item.recordId!==null)recorded++;else unrecorded++;
    }
    if(receipt.recorded!==recorded||receipt.unrecorded!==unrecorded||receipt.total!==recorded+unrecorded)fail('INVALID_PROVIDER_SYNC_ITEMS');
  }
  function validateProviderContinuityLineage(s){
    for(const customer of s.portfolio.customers){const c=customer.root.providerContinuity;if(!c)continue;const projects=s.providerCampaign.projects.filter(p=>p.customerId===customer.id),deployment=projects.find(p=>p.operationId==='local-deployment'&&p.configSubmittedAt===c.installedAt+1);if(!deployment||customer.root.scenario!=='defence')fail('INVALID_PROVIDER_CONTINUITY_LINEAGE');
      if(c.sparesReceipt){const r=c.sparesReceipt,p=projects.find(p=>p.id===r.projectId);if(!p||!['local-spares','managed-local-spares'].includes(p.operationId)||p.postingId!==r.postingId||p.configSubmittedAt!==r.at+1)fail('INVALID_PROVIDER_SPARES_LINEAGE');}
      const receipts=projects.filter(p=>['sync-records','sync-all'].includes(p.operationId)&&p.operationReceipt).map(p=>{const r=p.operationReceipt;if(r.projectId!==p.id||r.postingId!==p.postingId||r.at+1!==p.configSubmittedAt||r.scope!==(p.operationId==='sync-records'?'records':'all')||!Number.isSafeInteger(r.total)||r.total!==r.recorded+r.unrecorded)fail('INVALID_PROVIDER_SYNC_LINEAGE');return r;});
      const synchronized=new Set();for(const receipt of receipts)validateProviderSyncItems(s,customer.root,receipt,synchronized);
      for(const key of ['total','recorded','unrecorded'])if(c.syncedCheckpoint[key]!==receipts.reduce((n,r)=>n+r[key],0))fail('INVALID_PROVIDER_SYNC_TOTALS');
      if(c.lastSyncReceipt&&!receipts.some(r=>r.projectId===c.lastSyncReceipt.projectId&&r.postingId===c.lastSyncReceipt.postingId&&r.total===c.lastSyncReceipt.total&&r.scope===c.lastSyncReceipt.scope))fail('INVALID_PROVIDER_SYNC_LINEAGE');
      const m=s.providerCampaign.customers.find(x=>x.id===customer.id).metrics;if(c.pending.length+c.pendingCheckpoint.total+c.syncedCheckpoint.total>m.completed)fail('INVALID_PROVIDER_RETAINED_WORK_TOTAL');
    }
  }
  function providerReviewCandidate(child,through=Infinity){
    for(const interaction of [...child.interactions].reverse()){
      if(interaction.finishedAt>through||interaction.probe||interaction.channel!=='voice'||!['resolved','failed'].includes(interaction.phase)||!interaction.agent||!interaction.caseId||child.providerReviews?.some(r=>r.interactionId===interaction.id))continue;
      const record=child.records.find(r=>r.kind==='recording'&&r.interaction===interaction.id&&!r.deleted&&r.access.includes('supervisor')&&(!r.expiresAt||r.expiresAt>child.clock||r.held));if(!record)continue;
      const linked=child.cases[interaction.caseId];if(!linked)continue;
      return {interactionId:interaction.id,caseId:interaction.caseId,recordingId:record.id,agent:interaction.agent,criteria:{completeCapture:record.captureScope!=='partial',caseContinuity:linked.interactions.includes(interaction.id),delivered:interaction.phase==='resolved',noOutstandingObligation:interaction.obligations.length===0},basis:'observed-service-review-v1'};
    }return null;
  }
  function providerStandingPolicyModel(s){
    const m=providerCampaign.inspect(s,providerHooks());
    return {...m,revision:s.revision,cash:s.business.balance.cash,customers:m.customers.map(c=>{const child=s.portfolio.customers.find(x=>x.id===c.id).root;return {...c,regionalSupport:s.providerCampaign.contentVersion==='provider-campaigns-8'?providerRegionalSupport.inspectCustomer(s,c.id,providerRegionalSupportHooks()):null,responsibility:providerCustomerResponsibility(s,c.id),wholesaleStatement:providerWholesaleStatement(s,c.id),services:c.services.map(r=>({...r,name:child.resources[r.id]?.name||(r.id==='migration-phone'?'Canopy coexistence platform':catalogue[r.kind]?.name||r.name),...(r.id==='room'?{meetingService:providerMeetingService(child)}:{}),...(r.id==='room'&&child.information?.meeting.effective?.platformDependency?{resources:[...(r.resources||[]),child.information.meeting.effective.platformDependency.resourceId],meetingDependency:clone(child.information.meeting.effective.platformDependency)}:{}),pressure:providerResourcePressure(child,r),storage:providerArchiveStorage(child,r)}))};}),migrations:m.customers.map(c=>({id:'platform-cutover',customerId:c.id,eligible:['active','renewal'].includes(c.status)&&c.services.some(r=>r.id==='phone'&&r.observed?.ready)&&c.services.some(r=>r.id==='identity'&&r.observed?.ready)&&!m.projects.some(p=>p.customerId===c.id&&['migration','migration-consolidated'].includes(p.operationId)&&!['cancelled','blocked'].includes(p.status))}))};
  }
  function providerPolicyPreview(s,config,anchorId){
    providerPolicy.validate(config);for(const policy of s.providerAutomation||[]){const project=s.providerCampaign.projects.find(p=>p.id===policy.projectId);if(project?.operationId===providerIntegrationAssurance.OPERATION_ID&&(anchorId?policy.customerId===anchorId:config.customerIds.includes(policy.customerId))){try{providerIntegrationAssurance.validatePolicy(s,project,config);}catch(error){return {status:'blocked',intent:null,reason:error.message};}const status=providerIntegrationAssurance.current(s,project.operationReceipt.binding,providerProgressionHooks(s,false));if(!status.eligible)return {status:'suspended',intent:null,reason:status.missing[0],blockers:status.missing};}}const model=providerStandingPolicyModel(s),quotes=[];
    for(const c of model.customers)for(const rule of config.rules){
      const request=rule.kind==='provisioning'?{action:'purchase',customerId:c.id,offerId:c.id==='starter-customer'?'starter':c.id.replace(/-customer$/,''),planId:c.planId,stage:rule.stage}:{action:'operation',customerId:c.id,operationId:rule.operationId};
      // A repair preview includes the explicit acknowledgement that the policy will submit.
      const q=providerCampaign.quote(s,request,providerHooks());if(rule.kind==='assurance')q.blockers=q.blockers.filter(x=>x!=='INCIDENT_ACKNOWLEDGEMENT_REQUIRED');quotes.push(q);
    }
    return providerPolicy.plan(config,model,quotes);
  }
  function providerProductPolicyReady(s,policy){
    const project=s.providerCampaign.projects.find(p=>p.id===policy.projectId);if(project?.operationId!=='cisco-provider-operations')return true;
    const child=s.portfolio.customers.find(c=>c.id===policy.customerId)?.root,d=child?.products?.deployments.find(d=>d.id==='d-cisco-provider-operations');return !!d&&d.provisioning.status==='ready'&&d.effective.features.every(f=>products.featureStatus(child,d.id,f,productHooks(child)).available);
  }
  function providerStandingPolicyAdvance(s,policy){
    const funded=s.providerCampaign.projects.find(p=>p.id===policy.projectId);if(funded?.operationId===providerIntegrationAssurance.OPERATION_ID){if(funded.status!=='complete')return;const status=providerIntegrationAssurance.current(s,funded.operationReceipt.binding,providerProgressionHooks(s,false));if(!status.eligible){policy.config.suspended=true;policy.status='suspended';return;}}
    if(!providerProductPolicyReady(s,policy))return;
    const preview=providerPolicyPreview(s,policy.config,policy.customerId);if(preview.status!=='ready')return;
    const incident=preview.trigger?.kind==='incident'?s.providerCampaign.incidents.find(i=>i.id===preview.trigger.id):null;
    if(incident&&policy.actions.some(a=>a.incidentId===incident.id))return;
    if(incident?.status==='active')Object.assign(s,dispatchInternal(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}},true,true,true));
    const request=preview.intent.command,q=providerCampaign.quote(s,request,providerHooks());if(q.blockers.length)return;
    // Replan at the new revision after acknowledgement; no stale or unpriced intent commits.
    const checked=providerPolicyPreview(s,policy.config,policy.customerId);if(checked.status!=='ready')return;
    Object.assign(s,dispatchInternal(s,checked.intent,true,true,true));
    const project=s.providerCampaign.projects.at(-1);
    policy.spentCents+=project.setupCents;policy.config.budgetSpentCents=policy.spentCents;policy.config.actionsUsed++;
    policy.actions.push({incidentId:incident?.id||null,projectId:project.id,at:s.clock,cents:project.setupCents,ruleId:checked.ruleId,kind:checked.trigger.kind});
  }
  function validateProviderEarnedOperations(s){
    const requirements={'managed-site-recovery':'progress.goal.'+'df','national-wholesale-headroom':'progress.progression-level.5','managed-national-wholesale-headroom':'progress.progression-level.5','public-service-capture-reserve':'progress.progression-level.6','managed-local-spares':'progress.goal.'+'ca','managed-diverse-upstream':'progress.goal.'+'rd','managed-external-reach':'progress.goal.'+'tr','managed-carrier-headroom':'progress.progression-level.1','integrator-room':'progress.goal.'+'bz','regional-provisioning':'progress.progression-level.2','managed-uc-cc-integration':'progress.progression-level.3','managed-uc-cc-retest':'progress.goal.'+'ix'};
    for(const project of s.providerCampaign.projects){if(project.operationId===providerIntegrationAssurance.OPERATION_ID){const scope=providerIntegrationAssurance.scope(s,project.customerId,project.acceptedAt);if(!scope)fail('INVALID_PROVIDER_EARNED_OPERATION');if(project.configSubmittedAt!==null)providerIntegrationAssurance.validateReceipt(s,project);continue;}if(['national-wholesale-headroom','managed-national-wholesale-headroom','public-service-capture-reserve'].includes(project.operationId)&&!['provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion))fail('INVALID_PROVIDER_OPERATION_CONTENT_VERSION');if(['browser-guest-room','managed-local-spares',...providerResilience.OPS,'transport-repair'].includes(project.operationId)&&!['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion))fail('INVALID_PROVIDER_OPERATION_CONTENT_VERSION');const sourceId=requirements[project.operationId];if(!sourceId)continue;const customer=s.providerCampaign.customers.find(c=>c.id===project.customerId),receipt=project.operationId==='regional-provisioning'?regionalProvisioningReceipt(s,[customer?.market],project.acceptedAt,project.operationReceipt?.sourceId):s.providerCampaign.progressionReceipts?.receipts?.find(r=>r.sourceId===sourceId);if(!receipt||receipt.at>project.acceptedAt||(['managed-site-recovery','managed-external-reach','managed-diverse-upstream','managed-local-spares'].includes(project.operationId)?receipt.sourceEvidence?.market!==customer?.market:['regional-provisioning','managed-uc-cc-integration'].includes(project.operationId)?!receipt.sourceEvidence?.markets?.includes(customer?.market):!receipt.customerIds.includes(project.customerId)))fail('INVALID_PROVIDER_EARNED_OPERATION');}
  }
  function regionalProvisioningReceipt(s,markets,at=s.clock,sourceId){
    const sources=['progress.progression-level.2','progress.goal.'+'c3','progress.goal.'+'c5'];
    return (s.providerCampaign.progressionReceipts?.receipts||[]).filter(r=>sources.includes(r.sourceId)&&(!sourceId||r.sourceId===sourceId)&&r.at<=at&&Array.isArray(r.sourceEvidence?.markets)&&markets.every(m=>r.sourceEvidence.markets.includes(m))).sort((a,b)=>b.sourceEvidence.markets.length-a.sourceEvidence.markets.length||a.sourceId.localeCompare(b.sourceId))[0]||null;
  }
  function validateRegionalProvisioningScope(s,config,project){
    const ids=[...config.customerIds,...config.rules.flatMap(r=>r.customerIds)],markets=ids.map(id=>s.providerCampaign.customers.find(c=>c.id===id)?.market),proof=project?.operationReceipt;
    const receipt=regionalProvisioningReceipt(s,markets,project?.acceptedAt??s.clock,proof?.sourceId||'progress.progression-level.2');
    if(!receipt||config.rules.some(r=>r.kind!=='provisioning'))fail('REGIONAL_PROVISIONING_SCOPE_REQUIRED');
    if(s.providerCampaign.contentVersion==='provider-campaigns-8'&&project?.configSubmittedAt!==null){if(!proof||Object.keys(proof).sort().join(',')!=='allowedMarkets,kind,projectId,receiptId,sourceId'||proof.kind!=='regional-provisioning'||proof.projectId!==project.id||proof.receiptId!==receipt.id||proof.sourceId!==receipt.sourceId||JSON.stringify(proof.allowedMarkets)!==JSON.stringify(receipt.sourceEvidence.markets))fail('INVALID_PROVIDER_REGIONAL_POLICY_RECEIPT');}
  }
  function validateProviderStandingPolicy(s,p){
    const project=s.providerCampaign.projects.find(x=>x.id===p.projectId);
    if(Object.keys(p).sort().join(',')!=='actions,budgetCents,config,customerId,projectId,spentCents,status'||!project||!['automation','regional-provisioning','integration-assurance','cisco-provider-operations'].includes(project.operationId)||project.customerId!==p.customerId||!Array.isArray(p.actions)||p.actions.length>10000||!['active','suspended','budget-exhausted'].includes(p.status))fail('INVALID_PROVIDER_AUTOMATION');
    providerPolicy.validate(p.config);if(project.operationId===providerIntegrationAssurance.OPERATION_ID)providerIntegrationAssurance.validatePolicy(s,project,p.config);if(project.operationId==='regional-provisioning')validateRegionalProvisioningScope(s,p.config,project);
    if(!p.config.customerIds.length||[...p.config.customerIds,...p.config.rules.flatMap(r=>r.customerIds)].some(id=>!s.providerCampaign.customers.some(c=>c.id===id))||p.config.actionsUsed!==p.actions.length||p.config.budgetSpentCents!==p.spentCents||p.budgetCents!==p.config.lifetimeBudgetCents||p.spentCents!==p.actions.reduce((n,a)=>n+a.cents,0)||p.status!==(p.config.enabled&&!p.config.suspended?'active':'suspended')||new Set(p.actions.map(a=>a.projectId)).size!==p.actions.length)fail('INVALID_PROVIDER_AUTOMATION');
    for(const a of p.actions){const work=s.providerCampaign.projects.find(x=>x.id===a.projectId),keys=Object.keys(a).sort().join(',');if(!['at,cents,incidentId,projectId','at,cents,incidentId,kind,projectId,ruleId'].includes(keys)||!work||a.at!==work.acceptedAt||a.cents!==work.setupCents||work.acceptedAt<project.configSubmittedAt)fail('INVALID_PROVIDER_AUTOMATION_LINEAGE');
      const kind=a.kind||'incident';if(!['incident','missing-stage','migration','headroom'].includes(kind)||a.ruleId!==undefined&&!isId(a.ruleId))fail('INVALID_PROVIDER_AUTOMATION_LINEAGE');
      if(project.operationId===providerIntegrationAssurance.OPERATION_ID)providerIntegrationAssurance.validateAction(project,a,work);
      if(kind==='incident'){if(work.operationId!=='repair'||!s.providerCampaign.incidents.some(i=>i.id===a.incidentId&&i.customerId===work.customerId&&i.acknowledgedAt<=a.at))fail('INVALID_PROVIDER_AUTOMATION_LINEAGE');}
      else if(a.incidentId!==null||kind==='missing-stage'&&!(work.kind==='stage'&&['carrier','partner'].includes(work.stage))||kind==='migration'&&!['migration','migration-consolidated'].includes(work.operationId)||kind==='headroom'&&work.operationId!=='carrier-headroom')fail('INVALID_PROVIDER_AUTOMATION_LINEAGE');
    }
  }
  function providerAutomationAdvance(s){
    if(!s.providerCampaign||s.providerCampaign.status==='won'||s.business?.solvency?.status==='default')return;
    for(const policy of s.providerAutomation||[]){if(policy.status!=='active')continue;
      if(policy.config){providerStandingPolicyAdvance(s,policy);continue;}
      const incident=s.providerCampaign.incidents.find(i=>i.customerId===policy.customerId&&['active','acknowledged'].includes(i.status));if(!incident||policy.actions.some(a=>a.incidentId===incident.id))continue;
      if(policy.spentCents+8000>policy.budgetCents){policy.status='budget-exhausted';continue;}
      if(incident.status==='active')Object.assign(s,dispatchInternal(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}},true,true,true));
      const intent={action:'operation',operationId:'repair',customerId:policy.customerId},q=providerCampaign.quote(s,intent,providerHooks());if(q.blockers.length)continue;
      Object.assign(s,dispatchInternal(s,{type:'provider',command:{...intent,quoteRevision:q.atRevision}},true,true,true));
      policy.spentCents+=q.setupCents;policy.actions.push({incidentId:incident.id,projectId:s.providerCampaign.projects.at(-1).id,at:s.clock,cents:q.setupCents});
    }
  }
  function providerProductOrder(parent,customerId,definition,apply){
    const authored=providerProducts.recipes[definition.id];if(!authored)fail('UNKNOWN_PROVIDER_PRODUCT');const recipe=clone(authored);if(definition.recipeVersion===1&&recipe.id==='cisco-dedicated-uc'){recipe.quote.resources=recipe.quote.resources.filter(id=>id!=='dedicated-endpoint');recipe.preparation.commands=recipe.preparation.commands.filter(c=>c.id!=='dedicated-endpoint');}
    const child=()=>parent.portfolio.customers.find(c=>c.id===customerId).root;
    const retired=child().products?.deployments.find(d=>d.id==='d-'+recipe.id&&d.retirement?.status==='retired');

    if(!child().products)apply(parent,customerId,{type:'products',command:{action:'start'}});
    for(const command of recipe.preparation?.commands||[]){if(command.type==='add'&&child().resources[command.id])continue;if(command.command?.action==='start'&&((command.type==='information'&&child().information)||(command.type==='speech-models'&&child().speechModels)))continue;apply(parent,customerId,clone(command));}
    for(const resourceId of recipe.quote.resources){if(!child().resources[resourceId])fail('PROVIDER_PRODUCT_RESOURCE_MISSING');const patch={enabled:true,...recipe.quote.config?.[resourceId]};if(Object.entries(patch).some(([k,v])=>JSON.stringify(child().resources[resourceId].desired[k])!==JSON.stringify(v)))apply(parent,customerId,{type:'configure',id:resourceId,config:patch});}
    if(['ms-meetings-room','cisco-meetings-interoperability'].includes(recipe.id)){
      if(!child().information)apply(parent,customerId,{type:'information',command:{action:'start'}});
      apply(parent,customerId,{type:'information',command:{action:'configure',kind:'meeting',config:{...(parent.providerCampaign.meetingDependencyVersion===1?{platformDependency:{version:1,resourceId:'phone'}}:{}),...(['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(parent.providerCampaign.contentVersion)?{capacity:8,guestJoin:true}:{}),bridgeLicensed:recipe.id==='cisco-meetings-interoperability',...(recipe.id==='cisco-meetings-interoperability'?{platform:'grove',nativePlatform:'disco'}:{}),recording:child().providerCustomer.recording,mediaPlacement:child().resources.phone.desired.local?'local':'cloud'}}});
    }
    if(recipe.id==='cisco-contact-centre'){
      child().providerCustomer.recording=true;
      apply(parent,customerId,{type:'configure',id:'speech',config:{region:child().jurisdiction}});
      if(!child().information)apply(parent,customerId,{type:'information',command:{action:'start'}});
    }
    if(['cisco-programmable-engagement','ms-communications-api'].includes(recipe.id)||recipe.id==='cisco-provider-operations'&&definition.recipeVersion===1){
      if(!child().operations)apply(parent,customerId,{type:'operations',command:{action:'start'}});
      apply(parent,customerId,{type:'operations',command:{action:'configure',kind:'workflow',config:{authenticated:true,endpointAvailable:true,callbackVerified:true,transientFailures:1,retries:2,backoff:1,timeout:10,deliveryReceipts:true}}});
      apply(parent,customerId,{type:'configure',id:'messages',config:{rateLimit:5}});
      if(!child().channels)apply(parent,customerId,{type:'channels',command:{action:'start'}});
      for(const account of ['chatterleaf',...(recipe.id==='ms-communications-api'?['workplace']:[])]){
        apply(parent,customerId,{type:'channels',command:{action:'configure',channel:account,config:clone(channels.defaults[account])}});
        apply(parent,customerId,{type:'channels',command:{action:'permission',tenant:child().tenant,person:'alex',channel:account,purpose:'service',granted:true,expiresAt:null}});
      }
      apply(parent,customerId,{type:'channels',command:{action:'webhook-configure',config:{enabled:true,rateLimit:5,retries:3,backoff:1}}});

    }
    if(!child().products)apply(parent,customerId,{type:'products',command:{action:'start'}});
    if(recipe.preparation?.requests){
      const root=child();if(root.scenario!=='government'||!['phone','recorder','archive','speech'].every(id=>boundaryCheck(root,id)?.eligible))fail('PROVIDER_SCOPED_ELIGIBILITY_REQUIRED');
      const project=parent.providerCampaign.projects.findLast(p=>p.customerId===customerId&&p.operationId===definition.id&&p.status==='running');if(!project)fail('PROVIDER_PAID_REVIEW_REQUIRED');
      root.providerQualification={organisation:'orchard-msp',scenario:root.scenario,at:root.clock,expires:root.clock+600,eventId:project.id,postingId:project.postingId};
      if(!root.productEvidence)apply(parent,customerId,{type:'product-evidence',command:{action:'start'}});
    }
    if(retired){apply(parent,customerId,{type:'products',command:{action:'reinstate',id:retired.id}});const root=child(),task=root.providerProductTasks.find(t=>t.recipeId===recipe.id);task.status='waiting';task.createdAt=root.clock;return {kind:'product',recipeId:recipe.id,at:root.clock,reinstated:true,generation:root.products.deployments.find(d=>d.id===retired.id).generation};}
    apply(parent,customerId,{type:'products',command:{action:'offer',offer:{id:recipe.id,family:recipe.family,edition:recipe.edition,unit:recipe.unit,quantity:recipe.quantity,features:clone(recipe.features),dependencies:clone(recipe.dependencies)}}});
    child().providerProductTasks??=[];child().providerProductTasks.push({recipeId:recipe.id,createdAt:child().clock,status:'waiting',deploymentId:'d-'+recipe.id});
    if(recipe.id==='cisco-provider-operations'&&definition.recipeVersion!==1){
      const project=parent.providerCampaign.projects.findLast(p=>p.customerId===customerId&&p.operationId===recipe.id&&p.status==='running');if(!project)fail('PROVIDER_PAID_POLICY_REQUIRED');
      if(!parent.providerAutomation?.some(p=>p.customerId===customerId)){const config={...providerPolicy.create(),customerIds:[customerId],lifetimeBudgetCents:16000,maxActions:2,engineerCeiling:1,supportCeiling:1};parent.providerAutomation??=[];parent.providerAutomation.push({projectId:project.id,customerId,budgetCents:16000,spentCents:0,status:'suspended',actions:[],config});}
    }
    if(recipe.id==='cisco-dedicated-uc'&&definition.recipeVersion!==1){if(!child().operations)apply(parent,customerId,{type:'operations',command:{action:'start'}});child().providerTasks??=[];child().providerTasks.push({kind:'migration',mode:'product-dedicated',status:'waiting',createdAt:child().clock,migrationId:null});}
    return {kind:'product',recipeId:recipe.id,at:child().clock};
  }
  function providerProductsAdvance(s){
    const apply=command=>Object.assign(s,dispatchInternal(s,command,true,true,true));
    for(const task of s.providerProductTasks||[]){const deployment=s.products?.deployments.find(d=>d.id===task.deploymentId),offer=deployment&&s.products.offers.find(o=>o.id===deployment.desired.offer);if(deployment?.provisioning.status==='failed'&&!deployment.retirement&&offer?.effectiveLifecycle?.sale==='available'&&offer.effectiveLifecycle.support==='supported'&&(task.status==='waiting'||(s.clock-task.createdAt)%5===0))apply({type:'products',command:{action:'retry',id:deployment.id}});}
    for(const task of s.providerProductTasks||[]){if(task.status!=='waiting'||s.products?.offers.find(o=>o.id===task.recipeId)?.lifecycleProvisioning?.status!=='ready')continue;
      const recipe=providerProducts.recipes[task.recipeId];
      const existing=s.products.deployments.find(d=>d.id===task.deploymentId);if(existing&&(existing.retirement||existing.provisioning.status==='failed'))continue;
      if(!existing)apply({type:'products',command:{action:'deploy',id:task.deploymentId,offer:recipe.id,productVersion:'scenario-1',mode:recipe.mode,region:s.jurisdiction,features:clone(recipe.features),dependencies:clone(recipe.dependencies),bindings:clone(recipe.bindings)}});
      const generation=s.products.deployments.find(d=>d.id===task.deploymentId).generation,suffix=generation>1?'-g'+generation:'';
      for(const request of recipe.preparation?.requests||[])apply({type:'product-evidence',command:{action:'request',id:recipe.id+'-'+request.feature+suffix,deploymentId:task.deploymentId,...request}});
      if(recipe.preparation?.install){apply({type:'speech-models',command:{...clone(recipe.preparation.install),id:recipe.preparation.install.id+suffix,deploymentId:task.deploymentId,region:s.jurisdiction}});apply({type:'speech-models',command:{...clone(recipe.preparation.integrationTest),id:recipe.preparation.integrationTest.id+suffix,installationId:recipe.preparation.install.id+suffix}});}
      s.providerProductTasks.find(t=>t.recipeId===task.recipeId).status='submitted';
    }
  }
  function providerMigrationEvidence(parent,customerId,window){
    const child=parent.portfolio.customers.find(c=>c.id===customerId)?.root,missing=[];
    const project=parent.providerCampaign.projects.find(p=>p.customerId===customerId&&['migration','migration-consolidated'].includes(p.operationId)&&p.status==='complete');
    if(!project)return {complete:false,missing:['FUNDED_ENTERPRISE_MIGRATION_REQUIRED']};
    const consolidated=project.operationId==='migration-consolidated',target=consolidated?'phone':'migration-phone',cohort=consolidated?['alex','bea']:['bea'];
    const task=child.providerTasks?.find(t=>(consolidated?t.mode==='consolidated':t.mode===undefined)&&t.createdAt+1===project.configSubmittedAt),migration=child.operations?.migrations.find(m=>m.id===task?.migrationId&&m.target===target&&m.status==='complete'&&JSON.stringify(m.identities)===JSON.stringify(cohort));
    if(!migration||cohort.some(id=>operations.platform(child,id)!==target))missing.push('COHORT_CUTOVER_INCOMPLETE');
    const numbers=cohort.map(person=>child.operations?.numbers.find(n=>n.holder===person&&n.status==='active'));
    if(numbers.some(n=>!n))missing.push('COHORT_NUMBER_UNAVAILABLE');
    const jobs=parent.providerCampaign.jobs.filter(j=>j.customerId===customerId&&j.channel==='voice'&&j.arrivalAt>=window.from&&j.completedAt<=window.to&&j.status==='completed');
    const evidence=jobs.map(job=>({job,interaction:child.interactions.find(i=>i.id===job.interactionId)})).filter(({interaction:i})=>i&&!i.probe&&i.phase==='resolved'&&i.context&&child.cases[i.caseId]);
    if(parent.providerCampaign.contentVersion!=='provider-campaigns-1'&&cohort.some(person=>!evidence.some(({interaction:i})=>i.from===person&&i.trace.some(t=>t.code==='CALL_REQUEST'&&t.platform===target))))missing.push('MIGRATED_COHORT_SERVICE_NOT_OBSERVED');
    if(parent.providerCampaign.enterpriseContinuityVersion===1&&cohort.some(person=>!evidence.some(({interaction:i})=>i.direction==='inbound'&&i.trace.some(t=>t.code==='INBOUND_NUMBER_ACCEPTED'&&t.holder===person)&&i.trace.some(t=>t.code==='ORDERED_INBOUND_ROUTE'&&t.platform===target))))missing.push('MIGRATED_COHORT_INBOUND_NOT_OBSERVED');
    const roomResource='phone',roomSessions=(child.information?.meetingSessions||[]).filter(m=>m.status==='completed'&&m.startedAt>=Math.max(window.from,migration?.cutoverAt??Infinity)&&m.endedAt<=window.to&&m.endedAt>m.startedAt&&m.platformDependency?.version===1&&m.platformDependency.resourceId===roomResource&&m.platformDependency.generation===child.resources[roomResource]?.generation&&m.platformDependency.ready&&m.platformDependency.media.in&&m.platformDependency.media.out);
    if(parent.providerCampaign.meetingDependencyVersion===1&&!roomSessions.length)missing.push('MIGRATED_ROOM_PLATFORM_SERVICE_NOT_OBSERVED');
    return {complete:missing.length===0,missing,projectId:project.id,migrationId:migration?.id||null,target,cohort,roomContinuity:parent.providerCampaign.meetingDependencyVersion===1?{resourceId:roomResource,mode:consolidated?'replaced-platform':'retained-platform',generation:child.resources[roomResource]?.generation,sessionIds:roomSessions.map(m=>m.id)}:null,numberAssignments:numbers.filter(Boolean).map(n=>({number:n.number,holder:n.holder,status:n.status})),jobIds:evidence.map(x=>x.job.id),interactionIds:evidence.map(x=>x.interaction.id)};
  }
  function providerResourcePressure(child,r){
    const effective=r.effective;if(!effective)return null;
    let used,limit=effective.capacity,unit;
    if(r.kind==='trunk'){used=carrierOccupancy(child,null);unit='concurrent sessions';}
    else if(r.kind==='queue'){used=child.interactions.filter(i=>i.destination===r.id&&['handling','wrap'].includes(i.phase)).length;unit='handling sessions';}
    else if(r.kind==='recorder'){used=(child.captureReservations||[]).filter(x=>x.resource===r.id).length;unit='capture sessions';}
    else if(r.kind==='archive'){used=informationRecordStore.usage(child.records,{resourceId:r.id,region:effective.region}).used/100;unit='GB';}
    else return null;
    return {used,limit,unit,at:child.clock,constrained:used>=limit};
  }
  function providerArchiveStorage(child,r){
    if(r.kind!=='archive'||!r.effective)return null;
    const usage=informationRecordStore.usage(child.records,{resourceId:r.id,region:r.effective.region});
    const queued=(child.information?.jobs||[]).filter(job=>!['complete','failed'].includes(job.status)&&job.plan.archive===r.id);
    const pending=child.records.filter(record=>record.processingAdmission?.plan.archive===r.id&&!record.deleted);
    return {...usage,limit:informationRecordStore.limit(r.effective.capacity),pending:pending.length,queued:queued.length,remainingOutputs:queued.reduce((total,job)=>total+job.plan.steps.length-job.stage,0)+pending.reduce((total,record)=>total+record.processingAdmission.plan.steps.length,0)};
  }
  function providerWholesaleStatement(parent,customerId){
    const child=parent.portfolio.customers.find(c=>c.id===customerId)?.root,deployment=child?.products?.deployments.find(d=>d.id==='d-cisco-provider-operations');if(!deployment)return null;
    const gate=products.featureStatus(child,deployment.id,'wholesale-billing',productHooks(child));if(!gate.available)return {available:false,reason:gate.code,reasons:clone(gate.reasons||[]),rows:[]};
    const customer=parent.providerCampaign.customers.find(c=>c.id===customerId),rows=customer.history.map(h=>({customerId,period:h.period,from:h.from,to:h.to,fixedCents:h.wholesale,voiceCents:h.voiceCost,messageCents:h.messageCost,totalCents:h.wholesale+h.voiceCost+h.messageCost,voiceMinutes:h.voiceMinutes,messages:h.messages,basis:h.basis,postingIds:parent.business.ledger.filter(e=>e.customerId===customerId&&e.period===h.period&&['provider-wholesale-period','provider-operation-period','provider-voice-usage','provider-message-usage'].includes(e.reason)).map(e=>e.id)}));
    return {available:true,deploymentId:deployment.id,rows,retainedPeriods:rows.length,archivedPeriods:customer.historyCheckpoint.periods,ledgerPrunedThrough:parent.business.ledgerPrunedThrough||0};
  }
  function providerMeetingService(child){
    if(!child.information)return null;const profile=child.information.meeting.effective,dependency=profile?.platformDependency,resource=dependency&&child.resources[dependency.resourceId],observed=resource?providerHooks().observe(child,dependency.resourceId):null;
    return {profile:clone(profile),platform:dependency?{id:dependency.resourceId,name:resource?catalogue[resource.kind]?.name||resource.id:dependency.resourceId,generation:resource?.generation||null,ready:!!observed?.ready,reasons:clone(observed?.reasons||['MEETING_PLATFORM_RESOURCE_UNKNOWN'])}:null,sessions:clone(child.information.meetingSessions.slice(-8))};
  }
  function validateProviderServiceRetirements(s){
    for(const project of s.providerCampaign.projects){const r=project.serviceRetirement;if(r===undefined)continue;
      const definition=providerServiceRetirement.definitions[project.operationId],customer=s.providerCampaign.customers.find(c=>c.id===project.customerId),child=s.portfolio.customers.find(c=>c.id===project.customerId)?.root;
      const keys=r&&Object.keys(r).filter(k=>!['storageReleasedAt','storageTransferredAt','storageTransferProjectId'].includes(k)).sort().join(',');
      if(s.providerCampaign.serviceRetirementVersion!==1||!definition||project.productId||project.status!=='complete'||!r||keys!=='commitmentEndsAt,effectiveAt,expectedGenerations,requestedAt,resources,retainedPeriodCents,retainedResources,version'||r.version!==1||!Number.isSafeInteger(r.requestedAt)||r.requestedAt<project.completedAt||r.requestedAt>s.clock||r.effectiveAt!==r.requestedAt+1||r.commitmentEndsAt!==Math.max(r.effectiveAt,project.completedAt+(project.minimumTermPeriods??providerRules.data.missions[customer.scenario].termPeriods)*60)||JSON.stringify(r.resources)!==JSON.stringify(definition.resources)||JSON.stringify(r.retainedResources)!==JSON.stringify(definition.retainedResources)||!r.expectedGenerations||Object.keys(r.expectedGenerations).sort().join(',')!==[...r.resources].sort().join(',')||![0,definition.retainedStorage?.periodCents||0].includes(r.retainedPeriodCents))fail('INVALID_PROVIDER_SERVICE_RETIREMENT');
      for(const id of r.resources){const resource=child?.resources[id],generation=r.expectedGenerations[id];if(!Number.isSafeInteger(generation)||generation<2||!resource||resource.generation<generation||resource.generation===generation&&(resource.desired.enabled!==false||s.clock>=r.effectiveAt&&resource.effective?.enabled!==false))fail('INVALID_PROVIDER_SERVICE_RETIREMENT_GENERATION');if(resource.generation>generation&&!s.providerCampaign.projects.some(p=>p.id!==project.id&&p.customerId===project.customerId&&p.configSubmittedAt>r.requestedAt&&p.resources.includes(id)&&(p.expectedGenerations?.[id]===resource.generation||p.serviceRetirement?.expectedGenerations?.[id]===resource.generation)))fail('UNFUNDED_SERVICE_RECOMMISSION');}
      if(definition.retainedStorage&&r.retainedPeriodCents===0&&child.records.some(record=>!record.deleted&&record.createdAt<=r.requestedAt))fail('INVALID_PROVIDER_RETAINED_STORAGE_TERM');
      if(r.storageTransferredAt!==undefined||r.storageTransferProjectId!==undefined){const replacement=s.providerCampaign.projects.find(p=>p.id===r.storageTransferProjectId);if(!replacement||replacement.customerId!==project.customerId||replacement.operationId!=='recording'||replacement.status!=='complete'||replacement.acceptedAt<r.requestedAt||replacement.completedAt!==r.storageTransferredAt||r.storageTransferredAt>s.clock||r.storageTransferredAt<r.effectiveAt||!r.retainedPeriodCents||r.storageReleasedAt!==undefined)fail('INVALID_PROVIDER_STORAGE_TRANSFER');}
      if(r.storageReleasedAt!==undefined&&child.records.some(record=>!record.deleted&&record.createdAt<=r.storageReleasedAt))fail('INVALID_PROVIDER_STORAGE_RELEASE');
      if(r.storageReleasedAt!==undefined&&(!Number.isSafeInteger(r.storageReleasedAt)||r.storageReleasedAt<r.effectiveAt||r.storageReleasedAt>s.clock))fail('INVALID_PROVIDER_STORAGE_RELEASE');
    }
  }
  function providerRetainedStorageOnExit(s,customerId){
    if(s.providerCampaign.serviceRetirementVersion!==1)return [];
    const customer=s.providerCampaign.customers.find(c=>c.id===customerId),child=s.portfolio.customers.find(c=>c.id===customerId)?.root;if(!customer||!child)return [];
    const projects=s.providerCampaign.projects.filter(p=>p.customerId===customerId&&p.operationId==='recording'&&p.status==='complete'),last=projects.at(-1),rows=[];
    for(const p of projects){const r=p.serviceRetirement||p.exitStorage;if(r?.retainedPeriodCents&&r.storageReleasedAt===undefined&&r.storageTransferredAt===undefined)rows.push({projectId:p.id,periodCents:r.retainedPeriodCents,retainedResources:clone(r.retainedResources),startsAt:r.commitmentEndsAt});}
    if(last&&!last.serviceRetirement&&!last.exitStorage&&child.records.some(r=>!r.deleted))rows.push({projectId:last.id,periodCents:providerServiceRetirement.RETAINED_RECORD_STORAGE_CENTS,retainedResources:['archive'],startsAt:Math.max(customer.exitAt??s.clock,last.completedAt+(last.minimumTermPeriods??providerRules.data.missions[customer.scenario].termPeriods)*60)});
    return rows;
  }
  function providerPendingCaptureStorageOnExit(s,customerId){
    if(s.providerCampaign.serviceRetirementVersion!==1)return null;
    const child=s.portfolio.customers.find(c=>c.id===customerId)?.root,project=s.providerCampaign.projects.findLast(p=>p.customerId===customerId&&p.operationId==='recording'&&p.status==='complete');
    if(!child||!project||project.serviceRetirement||project.exitStorage||child.records.some(r=>!r.deleted))return null;
    const reservationIds=(child.captureReservations||[]).map(r=>r.id);
    return reservationIds.length?{periodCents:providerServiceRetirement.RETAINED_RECORD_STORAGE_CENTS,projectId:project.id,reservationIds,conditional:true}:null;
  }
  function validateProviderResourceAuthority(s,customer,child){
    const expected={identity:'directory',access:'connectivity',phone:'uc',carrier:'trunk',desk:'endpoint',people:'workforce',service:'queue',messages:'channel',cases:'crm',engage:'workflow',room:'room',archive:'archive',recorder:'recorder',speech:'processor',local:'infrastructure'};
    const projects=s.providerCampaign.projects.filter(p=>p.customerId===customer.id&&p.configSubmittedAt!==null);
    for(const project of projects){
      if(['local-deployment','migration-consolidated'].includes(project.operationId))expected.phone='dedicated';
      if(project.operationId==='migration')expected['migration-phone']='dedicated';
      if(project.operationId==='owned-site-operations')Object.assign(expected,providerRules.data.operations.find(op=>op.id===project.operationId).resourceKinds);
      if(project.productId)for(const command of providerProducts.recipes[project.productId]?.preparation?.commands||[]){if(command.type==='add'&&!(project.productId==='cisco-dedicated-uc'&&(project.recipeVersion??1)===1&&command.id==='dedicated-endpoint'))expected[command.id]=command.kind;}
    }
    if(JSON.stringify(Object.keys(child.resources).sort())!==JSON.stringify(Object.keys(expected).sort())||Object.entries(expected).some(([id,kind])=>child.resources[id]?.kind!==kind))fail('INVALID_PROVIDER_RESOURCE_AUTHORITY');
    const faults=Object.fromEntries(Object.keys(expected).map(id=>[id,null])),events=[];let connected=true;
    for(const incident of s.providerCampaign.incidents.filter(i=>i.customerId===customer.id&&i.kind!=='transport-domain')){
      const mission=providerRules.data.missions[customer.scenario],base=s.providerCampaign.contentVersion!=='provider-campaigns-1'&&mission.incidentVariants?mission.incidentVariants[s.providerCampaign.seed%mission.incidentVariants.length]:mission.incident,authored=customer.scenario==='smb'&&s.providerCampaign.openingVariant?providerVariants.incident(s.providerCampaign.openingVariant.id,base):base;
      if(!authored||incident.kind!==authored.kind||incident.resource!==authored.resource||incident.fault!==({boundary:'BOUNDARY_SUPPORT',outage:'OUTAGE',disconnection:'DISCONNECTED',capacity:'CAPACITY'})[authored.kind])fail('INVALID_PROVIDER_INCIDENT_AUTHORITY');
      if(incident.activatedAt!==null)events.push({at:incident.activatedAt,order:1,incident});
    }
    for(const project of projects.filter(p=>['repair','mitigate','service-repair'].includes(p.operationId)))events.push({at:project.configSubmittedAt,order:0,project});
    events.sort((a,b)=>a.at-b.at||a.order-b.order);
    for(const event of events){
      if(event.incident){const incident=event.incident,id=({processor:'speech',connectivity:'access'})[incident.resource]||incident.resource;if(incident.kind==='disconnection')connected=false;else if(incident.kind!=='boundary'&&!(id==='room'&&incident.fault==='CAPACITY'))faults[id]='OUTAGE';}
      else{const project=event.project,incidents=s.providerCampaign.incidents.filter(i=>i.customerId===customer.id&&i.kind!=='transport-domain'&&i.activatedAt!==null&&i.activatedAt<event.at&&i.acknowledgedAt!==null&&i.acknowledgedAt<event.at&&(i.resolvedAt===null||i.resolvedAt>=event.at)),resources=incidents.map(i=>({processor:'speech',connectivity:'access'})[i.resource]||i.resource);if(project.operationReceipt?.at!==event.at-1||JSON.stringify(project.operationReceipt.resources)!==JSON.stringify(resources))fail('INVALID_PROVIDER_INCIDENT_AUTHORITY');for(const incident of incidents){const id=({processor:'speech',connectivity:'access'})[incident.resource]||incident.resource;if(incident.kind==='disconnection')connected=true;else if(incident.kind!=='boundary'&&!(id==='room'&&incident.fault==='CAPACITY'))faults[id]=null;}}
    }
    if(child.connected!==connected||Object.entries(faults).some(([id,fault])=>child.resources[id].fault!==fault))fail('INVALID_PROVIDER_INCIDENT_AUTHORITY');
  }
  function validateProviderMeetingCapacity(s,customer,child){
    const profile=child.information?.meeting;if(!profile)return;
    if(['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion))for(const session of child.information.meetingSessions||[]){
      const fundedGenerations=s.providerCampaign.projects.filter(p=>p.customerId===customer.id&&p.configSubmittedAt!==null&&p.configSubmittedAt<=session.scheduledAt&&p.expectedGenerations.room).map(p=>p.expectedGenerations.room);
      const retiredGenerations=s.providerCampaign.projects.filter(p=>p.customerId===customer.id&&p.serviceRetirement?.effectiveAt<=session.scheduledAt&&p.serviceRetirement.expectedGenerations.room).map(p=>p.serviceRetirement.expectedGenerations.room);
      if(session.joinRoomGeneration!==Math.max(1,...fundedGenerations,...retiredGenerations))fail('INVALID_MEETING_JOIN_ADMISSION');
      let mode=catalogue.room.defaults.mode;
      const projects=s.providerCampaign.projects.filter(p=>p.customerId===customer.id&&p.configSubmittedAt!==null&&p.expectedGenerations.room<=session.joinRoomGeneration).sort((a,b)=>a.expectedGenerations.room-b.expectedGenerations.room);
      for(const project of projects){const definition=project.productId?providerProducts.recipes[project.productId]?.quote:providerRules.data.operations.find(o=>o.id===project.operationId);if(definition?.config?.room?.mode)mode=definition.config.room.mode;if(['room','distributor-room','integrator-room'].includes(project.operationId))mode='native';}
      if(session.joinMethod!==(mode==='guest'?'browser':mode==='bridge'?'bridge':'native'))fail('INVALID_MEETING_JOIN_ADMISSION');
    }

    // Provider room profiles inherit these admission limits. Only the authored
    // capacity incident and a paid response change them; product/profile changes
    // configure compatibility, not an unpurchased participant allowance.
    const initial=information.schemas.meeting.capacity,events=[],previous=[];
    for(const incident of s.providerCampaign.incidents.filter(i=>i.customerId===customer.id&&i.resource==='room'&&i.fault==='CAPACITY'&&i.activatedAt!==null))events.push({at:incident.activatedAt,order:1,incident});
    for(const [order,project] of s.providerCampaign.projects.entries())if(project.customerId===customer.id&&['repair','mitigate','service-repair'].includes(project.operationId)&&project.configSubmittedAt!==null&&project.operationReceipt?.resources?.includes('room'))events.push({at:project.configSubmittedAt,order:0,index:order,project});
    if(['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion))for(const [index,project] of s.providerCampaign.projects.entries())if(project.customerId===customer.id&&['room','browser-guest-room','distributor-room','integrator-room','ms-meetings-room','cisco-meetings-interoperability'].includes(project.operationId)&&project.configSubmittedAt!==null)events.push({at:project.configSubmittedAt,order:0,index,capacity:project.operationId==='browser-guest-room'?2:8});
    events.sort((a,b)=>a.at-b.at||a.order-b.order||(a.index||0)-(b.index||0));let capacity=initial;
    for(const event of events){previous.push(capacity);if(event.capacity!==undefined){capacity=event.capacity;continue;}if(event.incident){if(event.incident.receipt?.previousCapacity!==capacity)fail('INVALID_PROVIDER_MEETING_CAPACITY_AUTHORITY');capacity=0;}else{const incident=s.providerCampaign.incidents.find(i=>i.customerId===customer.id&&i.resource==='room'&&i.fault==='CAPACITY'&&i.activatedAt!==null&&i.activatedAt<event.at&&(i.resolvedAt===null||i.resolvedAt>=event.at));if(!incident||event.project.operationReceipt.at!==event.at-1)fail('INVALID_PROVIDER_MEETING_CAPACITY_AUTHORITY');capacity=incident.receipt.previousCapacity+(event.project.operationId==='mitigate'?1:0);}}
    if(profile.desired.capacity!==capacity||profile.desired.eventCapacity!==information.schemas.meeting.eventCapacity||profile.effective&&(profile.effective.eventCapacity!==information.schemas.meeting.eventCapacity||profile.provisioning.status==='ready'&&profile.effective.capacity!==capacity||profile.provisioning.status==='pending'&&![capacity,previous.at(-1)??initial].includes(profile.effective.capacity)))fail('INVALID_PROVIDER_MEETING_CAPACITY_AUTHORITY');
  }
  function validateProviderExitStorage(s){
    if(s.providerCampaign.serviceRetirementVersion===1)for(const customer of s.providerCampaign.customers.filter(c=>['exited','default'].includes(c.status))){const last=s.providerCampaign.projects.findLast(p=>p.customerId===customer.id&&p.operationId==='recording'&&p.status==='complete'),child=s.portfolio.customers.find(c=>c.id===customer.id)?.root;if(last&&!last.serviceRetirement&&!last.exitStorage&&child?.records.some(r=>!r.deleted))fail('INVALID_PROVIDER_EXIT_STORAGE_MISSING');}
    for(const project of s.providerCampaign.projects){const r=project.exitStorage;if(r===undefined)continue;const customer=s.providerCampaign.customers.find(c=>c.id===project.customerId),child=s.portfolio.customers.find(c=>c.id===project.customerId)?.root,keys=Object.keys(r||{}).filter(k=>k!=='storageReleasedAt').sort().join(',');
      if(s.providerCampaign.serviceRetirementVersion!==1||project.operationId!=='recording'||project.status!=='complete'||project.serviceRetirement||!['exited','default'].includes(customer?.status)||!r||keys!=='commitmentEndsAt,requestedAt,retainedPeriodCents,retainedResources,version'||r.version!==1||r.requestedAt!==customer.exitAt||r.commitmentEndsAt!==Math.max(customer.exitAt,project.completedAt+(project.minimumTermPeriods??providerRules.data.missions[customer.scenario].termPeriods)*60)||r.retainedPeriodCents!==providerServiceRetirement.RETAINED_RECORD_STORAGE_CENTS||JSON.stringify(r.retainedResources)!=='["archive"]'||s.providerCampaign.projects.findLast(p=>p.customerId===customer.id&&p.operationId==='recording'&&p.status==='complete')?.id!==project.id)fail('INVALID_PROVIDER_EXIT_STORAGE');
      if(r.storageReleasedAt!==undefined&&(!Number.isSafeInteger(r.storageReleasedAt)||r.storageReleasedAt<r.requestedAt||r.storageReleasedAt>s.clock||child.records.some(x=>!x.deleted&&x.createdAt<=r.storageReleasedAt)))fail('INVALID_PROVIDER_EXIT_STORAGE_RELEASE');
    }
  }
  function providerRetainedStorageAdvance(s){
    if(!s.providerCampaign)return;for(const customer of s.providerCampaign.customers.filter(c=>['exited','default'].includes(c.status))){for(const row of providerRetainedStorageOnExit(s,customer.id)){const project=s.providerCampaign.projects.find(p=>p.id===row.projectId);if(!project.serviceRetirement&&!project.exitStorage)project.exitStorage={version:1,requestedAt:customer.exitAt,commitmentEndsAt:row.startsAt,retainedPeriodCents:row.periodCents,retainedResources:row.retainedResources};}}for(const project of s.providerCampaign.projects){const r=project.serviceRetirement||project.exitStorage;if(!r?.retainedPeriodCents||r.storageReleasedAt!==undefined||r.storageTransferredAt!==undefined||s.clock<(r.effectiveAt??r.requestedAt))continue;const child=s.portfolio.customers.find(c=>c.id===project.customerId)?.root,replacement=s.providerCampaign.projects.find(p=>p.id!==project.id&&p.customerId===project.customerId&&p.operationId==='recording'&&p.status==='complete'&&p.acceptedAt>=r.requestedAt);if(replacement&&project.serviceRetirement){r.storageTransferredAt=replacement.completedAt;r.storageTransferProjectId=replacement.id;}else if(child&&!child.records.some(record=>!record.deleted))r.storageReleasedAt=s.clock;}
  }
  function validateProviderServiceBoundaryReceipt(s,project){
    const receipt=project.operationReceipt,plan=receipt?.plan,customer=s.providerCampaign.customers.find(c=>c.id===project.customerId),child=s.portfolio.customers.find(c=>c.id===customer?.portfolioId)?.root;
    if(!receipt||Object.keys(receipt).sort().join(',')!=='at,kind,plan'||receipt.kind!=='service-boundary'||receipt.at!==project.configSubmittedAt-1||plan?.customerId!==project.customerId)fail('INVALID_PROVIDER_SERVICE_BOUNDARY_RECEIPT');providerServiceBoundary.validatePlan(plan,s);
    const stages=['base','carrier','partner'].map(id=>s.providerCampaign.projects.find(p=>p.id===customer?.stages[id]?.projectId)),partner=stages[2];
    if(!child||plan.portfolioId!==customer.portfolioId||plan.tenant!==child.tenant||plan.jurisdiction!==child.jurisdiction||plan.acceptedRetailAt<customer.startedAt||plan.acceptedRetailAt>receipt.at||plan.acceptedRetailAt>customer.retailAgreement.at||plan.retailPriceCents>customer.retailAgreement.budgetCents||plan.acceptedRetailAt===customer.retailAgreement.at&&plan.retailPriceCents!==customer.retailAgreement.priceCents||stages.some(p=>!p||p.status!=='complete'||p.completedAt>receipt.at)||plan.responsibility.id!=='provider-responsibility-msp-'+customer.id||plan.responsibility.projectId!==partner.id||plan.responsibility.postingId!==partner.postingId||plan.responsibility.effectiveAt!==Math.max(...stages.map(p=>p.completedAt))||plan.dependencies.some(d=>!child.resources[d.id]||d.generation>child.resources[d.id].generation))fail('INVALID_PROVIDER_SERVICE_BOUNDARY_LINEAGE');
  }
  function providerRoomIntegrationHooks(){return {resourceReady:(root,id)=>{const copy=clone(root);if(copy.products)copy.products.integrations=copy.products.integrations.filter(edge=>edge.id!==providerRoomIntegration.EDGE_ID);return providerHooks().observe(copy,id);},featureStatus:(root,id,feature)=>products.featureStatus(root,id,feature,productHooks(root)),meetingPath:root=>transport.resourcePath(root,'identity','room','meeting')};}
  function providerRoomIntegrationTest(s,projectId,apply){
    const project=s.providerCampaign.projects.find(p=>p.id===projectId);
    if(!project||project.operationId!==providerRoomIntegration.OPERATION_ID||project.status!=='commissioning'||!project.operationReceipt)fail('PAID_ROOM_INTEGRATION_COMMISSIONING_REQUIRED');
    for(const command of providerRoomIntegration.testCommands(project.operationReceipt.plan))apply(s,project.customerId,command);
    if(!providerRoomIntegration.captureTest(s,projectId,providerRoomIntegrationHooks()))fail('ROOM_INTEGRATION_SCOPE_CHANGED');
  }
  function providerRoomIntegrationSummary(s,customerId){return {projects:s.providerCampaign.projects.filter(p=>p.customerId===customerId&&p.operationId===providerRoomIntegration.OPERATION_ID).map(project=>{const result=providerRoomIntegration.projectEvidence(s,project.id,providerRoomIntegrationHooks());return {projectId:project.id,customerId,status:project.status,ready:result.ready,testAvailable:project.status==='commissioning'&&!!project.operationReceipt,missing:result.missing,plan:clone(project.roomIntegrationPlan),test:clone(project.operationReceipt?.test||null),evidence:clone(project.operationReceipt?.evidence||null)};})};}
  function providerUcCcHooks(s,customerId,child){
    // Inspect the physical path and all other purchased integrations. The edge
    // being commissioned cannot be its own prerequisite for a paid retest.
    const resourceReady=(root,id)=>{const candidate=clone(root);if(candidate.products)candidate.products.integrations=candidate.products.integrations.filter(e=>e.id!==providerUcCcIntegration.EDGE_ID);return providerHooks().observe(candidate,id);};
    return {resourceReady,currentSupport:(state,customer,root)=>{const response=providerResponsibility.responsibilities(state,customer.id,{observeResource:resourceReady}),record=response.records?.find(r=>r.customerId===customer.id&&r.role==='msp'&&r.organisationId==='orchard-msp');return {ready:!!record,reason:record?null:'CURRENT_PAID_MSP_SUPPORT_REQUIRED',scope:record?{projectIds:record.evidence.stageProjects.map(p=>p.projectId),postingIds:record.evidence.stageProjects.map(p=>p.postingId),resources:[...record.scope].sort()}:null};},currentBoundary:(state,customer,root)=>{const scope=[];let ready=true;for(const resourceId of ['phone','recorder','archive','engage']){const contractId=root.boundaries?.bindings?.[resourceId];if(!contractId)continue;const contract=root.boundaries.contracts.find(c=>c.id===contractId),check=boundaryCheck(root,resourceId);scope.push({resourceId,contractId,generation:contract?.generation||0});if(!check?.eligible)ready=false;}return {ready,reason:ready?null:'CURRENT_BOUND_SERVICE_PATH_REQUIRED',scope};}};
  }
  function providerUcCcOperationReady(s,project){
    if(!s||!project)return false;
    const child=s.portfolio.customers.find(c=>c.id===project.customerId)?.root,result=providerUcCcIntegration.taskEvidence(s,project.id,providerUcCcHooks(s,project.customerId,child));
    if(result.status!=='ready')return false;project.operationReceipt.task=clone(result.evidence);return true;
  }
  function providerUcCcTest(s,projectId,apply){
    const project=s.providerCampaign.projects.find(p=>p.id===projectId);
    if(!project||!providerUcCcIntegration.OPERATION_IDS.includes(project.operationId)||project.status!=='commissioning'||!project.operationReceipt)fail('PAID_UC_CC_COMMISSIONING_PROJECT_REQUIRED');
    if(project.operationReceipt.test)fail('PAID_UC_CC_RETEST_REQUIRED');
    const child=s.portfolio.customers.find(c=>c.id===project.customerId)?.root,hooks=providerUcCcHooks(s,project.customerId,child),planned=providerUcCcIntegration.plan(s,projectId,hooks);
    if(planned.status!=='ready'||JSON.stringify(planned.plan.source)!==JSON.stringify(project.operationReceipt.plan.source)||JSON.stringify(planned.plan.target)!==JSON.stringify(project.operationReceipt.plan.target))fail('UC_CC_SCOPE_CHANGED_PAID_RETEST_REQUIRED');
    for(const command of providerUcCcIntegration.testCommands(project.operationReceipt.plan))apply(s,project.customerId,command);
    providerUcCcIntegration.attachTestSnapshot(s,projectId,hooks);
  }
  function providerServiceBoundaryHooks(){return {observeServiceResource:(child,id,ownBoundaryId)=>{
    // A purchased connection's assessment does not revoke the underlying cloud
    // licence. Otherwise installing an untested edge makes its own reviewed
    // boundary unavailable, so no paid initial test can ever be performed.
    // Actual delivered work still checks the edge through productGate normally.
    const physical=clone(child);if(physical.products)physical.products.integrations=physical.products.integrations.filter(e=>e.id!==providerUcCcIntegration.EDGE_ID);
    const observed=observe(physical,id),gate=productGate(physical,id),binding=physical.boundaries?.bindings?.[id],other=binding&&binding!==ownBoundaryId?boundaryCheck(physical,id):null;return {...observed,ready:observed.ready&&(!gate||gate.available)&&(!other||other.eligible)};
  }};}
  function providerServiceBoundaryObservations(s){
    if(!s.providerCampaign)return;
    for(const customer of s.providerCampaign.customers){const project=s.providerCampaign.projects.findLast(p=>p.customerId===customer.id&&p.operationId==='service-boundary-review'&&p.operationReceipt?.kind==='service-boundary'),child=s.portfolio.customers.find(c=>c.id===customer.id)?.root;if(!project||!child?.boundaries)continue;const result=providerServiceBoundary.observe(s,project.operationReceipt.plan,providerServiceBoundaryHooks());boundaries.command(child,result.command.command);}
  }
  function providerInterconnectHooks(){
    const childOf=(s,id)=>s.portfolio?.customers.find(c=>c.id===id)?.root;
    const configurationAt=(s,id,at)=>{try{const customer=s.providerCampaign.customers.find(c=>c.id===id),child=childOf(s,id);if(!customer||!child||at>child.clock)return null;const reader=providerConfigurationAuthority.configurationReaderAt(s.providerCampaign,customer,child,at,{catalogue}),phone=reader('phone'),trunk=reader('carrier'),carrier=providerConfigurationAuthority.carrierConfigurationAt(s.providerCampaign,customer,child,at,{catalogue});return carrier&&phone&&trunk?{carrier,phone:{generation:phone.generation,effective:phone.config},trunk:{generation:trunk.generation,effective:trunk.config}}:null;}catch{return null;}};
    const receiptOf=s=>s.providerCampaign.progressionReceipts?.receipts?.find(r=>r.sourceId===providerDedicatedInterconnect.SOURCE_ID);
    const validEarned=(s,r)=>!!r&&r.sourceEvidence?.receipt?.plan?.operationId===providerDedicatedInterconnect.DIRECT&&r.id==='provider-progression-receipt:'+providerDedicatedInterconnect.SOURCE_ID&&providerDedicatedInterconnect.validateEvidence(s,r.sourceEvidence?.customerId,r.sourceEvidence,providerInterconnectHooks(),{historical:true});
    return {customerRoot:childOf,configurationAt,
      supportReady:(s,id,at)=>{return providerSupportHistory.callingSupportAt(s,id,at,{catalogue,supportWorkOrigin:providerSupportWork.origin,ownedSiteHooks:providerOwnedSiteHooks(s)});},
      serviceReady:(s,id)=>{const c=s.providerCampaign.customers.find(c=>c.id===id),child=childOf(s,id);return !!c&&!!child&&['base','carrier','partner'].every(k=>c.stages[k]?.status==='effective')&&['identity','access','phone','carrier','desk','people','service','messages','cases','engage'].every(id=>providerHooks().observe(child,id)?.ready)&&child.operations?.carrier.provisioning.status==='ready'&&operations.inspect(child).carrier.length===0;},
      validatePaidProject:(s,p)=>{const terms=providerDedicatedInterconnect.terms(p.operationId),entry=s.business.ledger.find(e=>e.id===p.postingId),n=Number(p.postingId?.slice(6));return !!terms&&Object.keys(terms).every(k=>p[k]===terms[k])&&s.providerCampaign.projects.includes(p)&&(entry?entry.category==='cost'&&entry.cents===p.setupCents&&entry.projectId===p.id&&entry.customerId===p.customerId&&entry.reason==='provider-operation':Number.isSafeInteger(n)&&n>0&&n<=(s.business.ledgerPrunedThrough||0));},
      earnedReceipt:(s,id)=>{const r=receiptOf(s);return r?{...r,allowedMarkets:[r.sourceEvidence.market]}:null;},validateEarnedReceipt:(s,r)=>validEarned(s,receiptOf(s))&&receiptOf(s).id===r.id,
      validateManagedPurchase:(s,p,id,at,market)=>{const r=receiptOf(s);return !!r&&r.id===id&&r.at<=at&&r.sourceEvidence.market===market&&validEarned(s,r);}
    };
  }
  function providerExternalReachPinsFor(s,customerId,receipts=s.providerCampaign?.progressionReceipts?.receipts||[]){
    const receipt=receipts.find(r=>r.sourceId===providerExternalReach.SOURCE_ID&&r.customerIds.includes(customerId));return receipt?{version:1,receiptId:receipt.id,pins:providerExternalReach.retentionPins(receipt,customerId)}:undefined;
  }
  function providerInterconnectPinsFor(s,customerId,receipts=s.providerCampaign?.progressionReceipts?.receipts||[]){
    const receipt=receipts.find(r=>r.sourceId===providerDedicatedInterconnect.SOURCE_ID&&r.customerIds.includes(customerId));return receipt?{version:1,receiptId:receipt.id,pins:providerProgressionReceipts.dedicatedInterconnectRetentionPins(receipt,customerId)}:undefined;
  }
  function validateProviderInterconnects(s){
    const p=s.providerCampaign,hooks=providerInterconnectHooks();
    if(p.dedicatedInterconnectVersion!==undefined&&(p.dedicatedInterconnectVersion!==1||p.contentVersion!=='provider-campaigns-8'))fail('INVALID_PROVIDER_INTERCONNECT_VERSION');
    for(const project of p.projects){const pn=!!providerDedicatedInterconnect.terms(project.operationId);if(!pn){if(project.interconnectPlan!==undefined)fail('INVALID_PROVIDER_INTERCONNECT_PLAN');continue;}
      const plan=project.interconnectPlan,customer=p.customers.find(c=>c.id===project.customerId),child=hooks.customerRoot(s,project.customerId);
      if(!customer||plan?.portfolioId!==customer.portfolioId||plan?.market!==customer.market||plan?.tenant!==child?.tenant||plan?.operationId===providerDedicatedInterconnect.MANAGED&&!hooks.validateManagedPurchase(s,project,plan.earnedReceiptId,project.acceptedAt,customer.market))fail('INVALID_PROVIDER_INTERCONNECT_PLAN');
      if(p.dedicatedInterconnectVersion!==1||!providerDedicatedInterconnect.validPlan(plan)||plan.acceptedAt!==project.acceptedAt||plan.customerId!==project.customerId||plan.operationId!==project.operationId||JSON.stringify(hooks.configurationAt(s,project.customerId,project.acceptedAt))!==JSON.stringify(plan.previous))fail('INVALID_PROVIDER_INTERCONNECT_PLAN');
      if(project.configSubmittedAt!==null){if(JSON.stringify(project.operationReceipt?.plan)!==JSON.stringify(plan))fail('INVALID_PROVIDER_INTERCONNECT_PLAN');providerDedicatedInterconnect.validateReceipt(s,project,hooks);}
    }
    for(const customer of p.customers){const child=hooks.customerRoot(s,customer.id);if(JSON.stringify(child.providerInterconnectPins)!==JSON.stringify(providerInterconnectPinsFor(s,customer.id)))fail('INVALID_PROVIDER_INTERCONNECT_PINS');}
  }
  function providerRegionalPinsFor(s,customerId,receipts=s.providerCampaign?.progressionReceipts?.receipts||[]){
    const selected=receipts.filter(r=>Object.values(providerRegionalSupport.GOALS).includes(r.sourceId)&&r.customerIds.includes(customerId)).sort((a,b)=>a.sourceId.localeCompare(b.sourceId));
    if(!selected.length)return undefined;
    const pins=providerRegionalSupport.retentionPins(null,customerId);
    for(const receipt of selected){const retained=providerProgressionReceipts.regionalRetentionPins(receipt,customerId);for(const key of Object.keys(pins))pins[key].push(...retained[key]);}
    for(const key of Object.keys(pins))pins[key]=[...new Set(pins[key])].sort();
    return {version:2,receipts:selected.map(r=>({sourceId:r.sourceId,receiptId:r.id})),pins};
  }
  function validProviderRegionalPins(marker,expected){
    if(marker?.version===1&&expected){const legacy=clone(expected);legacy.version=1;delete legacy.pins.eventIds;return JSON.stringify(marker)===JSON.stringify(legacy);}
    return JSON.stringify(marker)===JSON.stringify(expected);
  }
  function providerCentralPinsFor(s,customerId,receipts=s.providerCampaign?.progressionReceipts?.receipts||[]){
    const selected=receipts.filter(r=>['progress.progression-level.5','progress.progression-level.6'].includes(r.sourceId)&&r.customerIds.includes(customerId)).sort((a,b)=>a.sourceId.localeCompare(b.sourceId));
    if(!selected.length)return undefined;
    const pins={interactionIds:[],caseIds:[],jobIds:[],processingJobIds:[],recordIds:[],incidentIds:[],projectIds:[]};
    for(const receipt of selected){const retained=providerCentralProgression.retentionPins(receipt.sourceEvidence,customerId);for(const key of Object.keys(pins))pins[key].push(...retained[key]);}
    for(const key of Object.keys(pins))pins[key]=[...new Set(pins[key])].sort();
    return {version:1,receipts:selected.map(r=>({sourceId:r.sourceId,receiptId:r.id})),pins};
  }
  function providerProgressionHooks(s,includeSamples=true){
    const historyHooksFor=state=>({catalogue,supportWorkOrigin:providerSupportWork.origin,ownedSiteHooks:providerOwnedSiteHooks(state)}),historyReaders=new WeakMap(),integrationReaders=new WeakMap();
    const historyReader=state=>{if(!historyReaders.has(state))historyReaders.set(state,providerSupportHistory.createReader(state,historyHooksFor(state)));return historyReaders.get(state);};
    // Claim validation uses an owned clone. Every reader and its historical
    // observations must belong to the state being validated, not the caller.
    const integrationReader=state=>{if(!integrationReaders.has(state))integrationReaders.set(state,providerRegionalIntegrations.createReader(state,historyHooksFor(state),(customer,child)=>providerUcCcHooks(state,customer.id,child),historyReader(state)));return integrationReaders.get(state);};
    return {regionalIntegrations:(state,id)=>integrationReader(state).current(id),integrationValidAt:(state,customer,edge,at)=>integrationReader(state).validAt(customer,edge,at),caseFollowupHooks:providerFollowupHooks,dedicatedInterconnectHooks:providerInterconnectHooks,supportWorkOrigin:providerSupportWork.origin,validateHistoricalSupportParticipant:(state,participant,at)=>historyReader(state).validateParticipant(participant,at),ownedSiteHooks:providerOwnedSiteHooks(s),wholesaleStatement:(state,customerId)=>providerWholesaleStatement(state,customerId),boundaryCheck:(child,resourceId)=>boundaryCheck(child,resourceId),customerRoot:(state,portfolioId)=>state.portfolio?.customers.find(c=>c.id===portfolioId)?.root,missionRules:providerRules.data.missions,capabilityHooks:progressionHooks(s),integrationHooks:(state,id,child)=>providerUcCcHooks(state,id,child),observeResource:(child,id)=>providerHooks().observe(child,id),supportSamples:includeSamples?providerProgressionFacts.decodeSupportObservation(s.providerCampaign?.supportObservation):[],providerQuote:(state,request)=>providerCampaign.quote(state,request,providerHooks())};}
  function providerExternalReachSummary(s,customerId,child){
    const report=providerExternalReach.evaluate(s,customerId,providerProgressionHooks(s));
    const delivered=s.providerCampaign.jobs.filter(job=>job.customerId===customerId&&job.channel==='voice'&&['completed','late'].includes(job.status)).map(job=>child.interactions.find(i=>i.id===job.interactionId)).filter(i=>i?.phase==='resolved'&&!i.probe&&i.trace.some(t=>t.code==='PROVIDER_EXTERNAL_ADMISSION'));
    const sessions=(child.information?.meetingSessions||[]).filter(session=>session.externalGuest).slice(-6);
    return {status:report.status,outbound:delivered.filter(i=>i.direction==='outbound').length,inbound:delivered.filter(i=>i.direction==='inbound').length,guests:sessions.filter(session=>session.status==='completed').length,sessions:sessions.map(session=>({id:session.id,status:session.status,observedMinutes:session.externalGuest.observedMinutes})),missing:report.missing};
  }
  function providerCustomerResponsibility(s,customerId){
    if(s.providerCampaign.commercialResponsibilityVersion!==1)return null;
    const hooks={observeResource:(root,resourceId)=>providerHooks().observe(root,resourceId)},qualification=providerResponsibility.qualification(s,customerId,'partner-qualification',hooks),ids=qualification.status==='active'?['room','distributor-room','integrator-room']:['room','partner-qualification','distributor-room','integrator-room'];
    return {version:1,clock:s.clock,qualification,readiness:providerResponsibility.qualificationReadiness(s,customerId,hooks),records:providerResponsibility.responsibilities(s,customerId,hooks).records,comparison:providerResponsibility.comparison(ids.map(id=>({id,quote:providerCampaign.quote(s,{action:'operation',operationId:id,customerId},providerHooks())})))};
  }
  const provider={rules:providerRules.data,policyPreview:providerPolicyPreview,quote:(s,q)=>providerCampaign.quote(s,q,providerHooks()),inspect:s=>{const model=providerCampaign.inspect(s,providerHooks());if(!model)return null;return {...model,incidents:model.incidents.map(i=>({...i,diagnoses:s.providerCampaign.projects.filter(p=>p.operationId===providerIncidentDiagnosis.OPERATION_ID&&p.config?.incidentId===i.id).map(p=>({projectId:p.id,status:p.status,completedAt:p.completedAt??null,evidence:clone(p.operationReceipt?.evidence||null)}))})),responsibility:providerResponsibility.inspect(s,{observeResource:(child,id)=>providerHooks().observe(child,id)}),progression:{...providerProgressionFacts.inspect(s,providerProgressionHooks(s)),claims:providerProgressionReceipts.inspect(s,providerProgressionHooks(s))},accruedPayrollCents:Math.floor(s.providerCampaign.payroll.personMinutes*s.business.workforce.hourlyCents/60)-s.providerCampaign.payroll.costCents,debt:s.business.loans.reduce((n,l)=>n+l.principal,0),automation:clone(s.providerAutomation||[]),customers:model.customers.map(c=>{const child=s.portfolio.customers.find(x=>x.id===c.id).root;return {...c,security:{...providerSecurity.currentStatus(s,c.id,child),abuse:(s.providerSecurityAbuse?.runs||[]).filter(run=>run.recipe.customerId===c.id).map(run=>({at:run.recipe.createdAt,status:run.evidence?'delivered':'waiting-for-delivery',filteredPackets:run.recipe.steps.nativeCommands[0].packets,blockedInteractionId:run.blockedInteractionId,eventIds:clone(run.eventIds),deliveredAt:run.evidence?.settlementAt??null,jobId:run.evidence?.jobId??null}))},ownedSiteActions:['provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion)?providerOwnedSiteActions(s,c.id):[],ownedSites:child.siteOperations?providerOwnedSites.inspect(s,c.id,providerOwnedSiteHooks(s)):null,siteResponses:s.providerCampaign.projects.filter(p=>p.customerId===c.id&&['site-recovery','managed-site-recovery','site-resource-migration'].includes(p.operationId)&&p.status==='commissioning').map(p=>{const x=child.siteOperations?.exercises.find(x=>x.id===p.operationReceipt?.exerciseId),m=child.siteOperations?.migrations.find(m=>m.id===p.operationReceipt?.migrationId),target=m&&child.siteOperations?.sites[m.toSite]?.effective?.transportSite;return {projectId:p.id,phase:x?.phase||m?.phase||null,abort:x?.status==='failed',recover:x?.status==='active'&&x.phase==='faulted'&&x.continuity.length>0&&x.continuity.every(r=>r.success),restore:x?.status==='active'&&x.phase==='restoring'&&!x.restoration,'retry-migration':m?.phase==='partial'&&!child.siteOperations.exercises.some(x=>x.status==='active')&&!!siteHooks().transportSite(child,target)?.ready&&!providerSiteMigrationBusy(child,p.config.resourceId)};}),resilienceWorkload:['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion)?{...clone(providerRules.data.resilienceSequence),dueCases:24,primaryFunded:s.providerCampaign.projects.some(p=>p.customerId===c.id&&p.operationId==='primary-upstream'&&p.status!=='cancelled'),sequences:s.providerCampaign.jobs.filter(j=>j.customerId===c.id&&j.resilienceSequence).map(j=>({jobId:j.id,status:j.status,caseId:j.caseId,deadlineAt:j.deadlineAt,windowStart:j.resilienceSequence.windowStart,phaseCount:j.resilienceSequence.phases.length,failure:j.failure}))}:null,transport:['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion)?providerResilience.inspect(s.providerCampaign,s.providerCampaign.customers.find(row=>row.id===c.id),child,{transport}):null,resilienceActions:['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion)?providerResilienceActions(s,c.id):[],meetingActions:['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion)?providerMeetingActions(s,c.id):[],requirements:clone(providerRules.data.missions[c.scenario].requirements),canReview:!!providerReviewCandidate(child),externalReach:c.scenario==='enterprise'&&s.providerCampaign.externalCollaborationVersion===1?providerExternalReachSummary(s,c.id,child):null,roomIntegration:providerRoomIntegrationSummary(s,c.id),serviceIntegration:{...providerUcCcIntegration.evaluate(s,c.id,providerUcCcHooks(s,c.id,child)),projects:s.providerCampaign.projects.filter(p=>p.customerId===c.id&&providerUcCcIntegration.OPERATION_IDS.includes(p.operationId)).map(p=>({projectId:p.id,status:p.status,plan:clone(p.operationReceipt?.plan||null),testAvailable:p.status==='commissioning'&&!!p.operationReceipt&&!p.operationReceipt.test,observation:providerUcCcIntegration.observe(s,p.id,providerUcCcHooks(s,c.id,child))}))},regionalSupport:s.providerCampaign.contentVersion==='provider-campaigns-8'?providerRegionalSupport.inspectCustomer(s,c.id,providerRegionalSupportHooks()):null,responsibility:providerCustomerResponsibility(s,c.id),wholesaleStatement:providerWholesaleStatement(s,c.id),services:c.services.map(r=>({...r,name:child.resources[r.id]?.name||(r.id==='migration-phone'?'Canopy coexistence platform':catalogue[r.kind]?.name||r.name),...(r.id==='room'?{meetingService:providerMeetingService(child)}:{}),...(r.id==='room'&&child.information?.meeting.effective?.platformDependency?{resources:[...(r.resources||[]),child.information.meeting.effective.platformDependency.resourceId],meetingDependency:clone(child.information.meeting.effective.platformDependency)}:{}),pressure:providerResourcePressure(child,r),storage:providerArchiveStorage(child,r)})),journeys:[...new Set([...s.providerCampaign.jobs.filter(j=>j.customerId===c.id&&j.followup&&j.status==='pending'),...s.providerCampaign.jobs.filter(j=>j.customerId===c.id&&j.followup&&j.status!=='pending').slice(-2),...s.providerCampaign.jobs.filter(j=>j.customerId===c.id).slice(-6)])].sort((a,b)=>a.arrivalAt-b.arrivalAt).map(j=>({id:j.id,channel:j.channel,arrivalAt:j.arrivalAt,deadlineAt:j.deadlineAt,status:j.status,failure:j.failure,completedAt:j.completedAt,interactionId:j.interactionId,...(j.followup?{followup:clone(j.followup),followupObservation:providerCaseFollowup.observe(s,j,providerFollowupHooks()),followupOffer:providerCampaign.quote(s,{action:j.followup.attempts.length?'retry-case-followup':'followup-case',customerId:c.id,jobId:j.id},providerHooks())}:{}),...(j.handoff?{handoff:clone(j.handoff)}:j.handoffPlan?{handoffOffer:providerCampaign.quote(s,{action:'handoff-case',customerId:c.id,jobId:j.id,connectorId:'social-messaging'},providerHooks())}:{}),lifecycle:providerJourneys.inspect(child,j,providerRules.data.plans[c.planId]),trace:clone(child.interactions.find(i=>i.id===j.interactionId)?.trace||[])})),demandMix:clone(s.providerCampaign.customers.find(x=>x.id===c.id).period.demandPlan?.result||null),workforce:workforce.inspect(child),reviews:clone(child.providerReviews||[]),products:child.products?products.inspect(child,productHooks(child)):null};})};}};
  function providerBoundaryObservations(s){
    if(!s.providerCustomer||!s.boundaries)return;
    const local=config(s,'local'),localReady=observe(s,'local').ready&&!!local?.licensing;if(s.providerGovernment&&s.connected)s.providerGovernment.lastConnectedAt=s.clock;
    for(const contract of s.boundaries.contracts.filter(c=>c.id.startsWith('provider-public-service-')))boundaries.command(s,{action:'observe',contract:contract.id,observed:{connected:s.connected,cloudLicenceAvailable:s.connected&&localReady,localLicenceGraceActive:!!s.providerGovernment&&s.providerGovernment.architectureId==='local-processing'&&localReady,localLicenceGraceExpiresAt:s.providerGovernment?.architectureId==='local-processing'?s.providerGovernment.lastConnectedAt+30:null,localServicesAvailable:localReady,localKeyCustodyAvailable:localReady&&!!local.certificates,adminPathAvailable:localReady&&observe(s,'identity').ready,adminPathLocation:s.jurisdiction}});
  }
  function lifecycleHooks(){return {
    inspectDeployment:(state,id)=>{const d=state.products?.deployments.find(x=>x.id===id);return {exists:!!d,effective:!!d?.effective&&d.provisioning.status==='ready',offerId:d?.effective?.offer,version:d?.effective?.productVersion,generation:d?.generation,features:d?.effective?.features||[],dependenciesReady:!!d?.effective&&d.effective.features.every(f=>products.featureStatus(state,id,f,productHooks(state)).available)};},
    authorizeSupportOwner:(state,ownerId,id)=>{const b=state.business,d=state.products?.deployments.find(x=>x.id===id),org=b?.organisations[ownerId];if(!org?.roles.some(r=>['msp','integrator','bpo'].includes(r))||!d?.effective)return false;const refs=[...new Set([...Object.values(d.effective.dependencies),...d.effective.bindings.flatMap(x=>x.resources)])];return refs.length>0&&refs.every(resource=>business.authorise(state,resource,'configure')&&business.authorise({...state,business:{...b,player:ownerId}},resource,'configure'));}
  };}
  function boundLifecycleDeployments(s,resources){return [...new Set((resources||[]).flatMap(id=>products.bindingsForResource(s,id).map(b=>b.deploymentId)))].sort();}
  function lifecycleCommercial(s,c){
    if(!s.specialistLifecycle||!['order','renew'].includes(c?.action))return;
    const contract=c.action==='renew'?s.business?.contracts.find(x=>x.id===c.contract):c;if(!contract)return;
    const owner=contract.supportOwner||s.business?.player;
    const ids=[...new Set([...boundLifecycleDeployments(s,contract.resources),...(contract.lifecycleDeployments||[])])];
    for(const id of contract.lifecycleDeployments||[])if(!s.products.deployments.find(d=>d.id===id)?.effective?.bindings.some(b=>b.resources.some(r=>contract.resources.includes(r))))fail('PRODUCT_LIFECYCLE_BINDING_REMOVED:'+id);
    for(const id of ids){const status=specialistLifecycle.deploymentStatus(s,id,lifecycleHooks()),record=s.specialistLifecycle.records.find(r=>r.id===status.evidenceId);if(!status.evidenceReady||status.axes?.support!=='supported'||record?.supportOwnerId!==owner||c.action==='order'&&status.axes.sale!=='available'||c.action==='renew'&&!status.renewalReadiness)fail('PRODUCT_LIFECYCLE_'+(c.action==='renew'?'RENEWAL':'SALE')+'_BLOCKED:'+id);}
  }
  function customerCommercial(s,c){
    if(!['order','renew'].includes(c?.action))return;
    const contract=c.action==='renew'?s.business?.contracts.find(x=>x.id===c.contract):c;
    if(!contract||contract.customerProfile===undefined)return;
    const profile=s.customerNeeds?.profiles.find(x=>x.id===contract.customerProfile);
    if(!profile?.effective||profile.segment!==s.scenario||(contract.customer||'customer')!=='customer'||contract.sell!==true)fail('CUSTOMER_PROFILE_SCOPE_REQUIRED');
    if(c.action==='renew'){
      const fit=customerNeeds.evaluate(s,profile.id,productServices(s));
      const failed=fit.criteria.filter(x=>x.status==='unmet');
      if(failed.length)fail('CUSTOMER_FIT_RENEWAL_BLOCKED:'+failed.map(x=>x.id).join(','));
    }
  }
  function sharedHooks(){return {
    authorize:state=>business.authorise(state,'phone','configure'),
    identity:(state,person)=>{const who=state.calling?.nodes.directory.effective?.identities.find(x=>x.canonical===person),directory=config(state,'identity');return who?{person:who.canonical,tenant:who.tenant,endpoint:who.endpoint,known:who.known,entitled:!!directory?.entitled.includes(person)}:null;},
    endpointReady:(state,who)=>who.known&&who.entitled&&state.resources[who.endpoint]?.kind==='endpoint'&&config(state,who.endpoint)?.identity===who.person&&config(state,who.endpoint)?.registered===true&&productServices(state)[who.endpoint]?.ready===true,
    interaction:(state,i)=>{const who=canonicalInfo(state,i.from);return {person:who?.person,tenant:who?.tenant,phase:i.phase,known:!!who,terminal:['resolved','failed'].includes(i.phase)};},
    federated:(state,from,to)=>state.calling?.nodes.directory.effective?.federation.some(e=>e.from===from&&e.to===to)===true,
    beforeAction:(state,i,action,actor)=>{if(i.phase!==({answer:'ringing',park:'shared-active',retrieve:'parked'}[action]))return false;return sharedReady(state,i,actor);}
  };}
  function sharedReady(s,i,actor){
    const phone=config(s,operations.platform(s,i.from));if(!phone?.signalling||!phone.mediaIn||!phone.mediaOut||!productServices(s)[operations.platform(s,i.from)]?.ready||phone.local&&!productServices(s).local?.ready)return false;
    const who=sharedHooks().identity(s,actor);if(!who||!sharedHooks().endpointReady(s,who))return false;
    if(s.calling){const q=calling.media(s.calling,i);if(!q.outbound||!q.inbound)return false;}
    if(s.transport){const from=s.transport.bindings[i.from]?i.from:'identity',path=transport.resourcePath(s,from,who.endpoint,'voice',i.id);if(!path.ready)return false;}
    return true;
  }
  function sharedCommand(s,q){
    if(!business.authorise(s,'phone','configure'))fail('DELEGATION_REQUIRED');
    if(q?.action==='start'){if(Object.keys(q).join(',')!=='action')fail('INVALID_SHARED_SERVICES_COMMAND');if(s.sharedServices)fail('SHARED_SERVICES_ALREADY_STARTED');if(!s.calling)fail('CALLING_PACK_REQUIRED');s.sharedServices=sharedServices.create(s);return;}
    const result=sharedServices.command(s,q,sharedHooks());
    if(['answer','park','retrieve'].includes(q?.action)){
      const i=s.interactions.find(x=>x.id===q.interactionId);if(i)event(s,i,'shared-service',result.code,{actor:q.actor,line:result.line||i.sharedLine});
      if(!result.allowed)return;
      if(q.action==='park'){i.phase='parked';i.due=result.due;event(s,i,'signalling','CALL_HELD',{slot:q.slot});}
      else{if(s.transport){transport.release(s,i.id);const from=s.transport.bindings[i.from]?i.from:'identity',path=transport.admit(s,i.id,from,result.endpoint,'voice');if(!path.ready)return finish(s,i,path.reason);}i.destination=result.endpoint;i.phase='shared-active';i.sharedActor=q.actor;i.due=s.clock+3;event(s,i,'signalling',q.action==='answer'?'200_OK':'CALL_RESUMED',{endpoint:result.endpoint});}
    }
  }
  function marketHooks(){return {
    validatePortfolio:root=>portfolio.validate(root.portfolio,portfolioHooks(root)),
    resourceReady:(state,id)=>productServices(state)[id]||{ready:false},
    integrationStatus:(state,id)=>{const edge=state.products?.integrations.find(x=>x.id===id);if(!edge)return {status:'missing'};const check=products.compatibilityStatus(state,id);if(check.status==='scenario-verified'&&!edge.features.every(f=>products.featureStatus(state,edge.source,f.sourceFeature,productHooks(state)).available&&products.featureStatus(state,edge.target,f.targetFeature,productHooks(state)).available))return {status:'blocked'};return check;},
    boundaryAssessment:(state,id)=>{const contract=state.boundaries?.contracts.find(x=>x.id===id);if(!contract?.effective)return {eligible:false};const flows=contract.effective.flows;return {profile:contract.effective.profile,resourceBindings:flows.map(f=>f.resource),eligible:flows.length>0&&flows.every(f=>boundaryCheck(state,f.resource)?.eligible===true)};}
  };}
  function campaignHooks(){return {
    configurationFingerprint:state=>campaignConfiguration(state),
    observeResource:(state,id)=>{const observation=observe(state,id),product=productGate(state,id),boundary=state.boundaries?.bindings[id]?boundaryCheck(state,id):null;return {ready:observation.ready&&(!product||product.available)&&(!boundary||boundary.eligible),reasons:[...observation.reasons,...(product&&!product.available?[product.reason]:[]),...(boundary&&!boundary.eligible?boundary.blocking.map(x=>x.code):[])]};},
    dispatchRootCommand:(state,command)=>dispatch(state,command),
    selectTrack:(state,track,context)=>{if(state.campaign.progress[state.scenario].windows.some(w=>w.status==='open'))fail('CAMPAIGN_WINDOW_OPEN');const next=context.targetSnapshot?validateState(clone(context.targetSnapshot.root)):create({scenario:track,jurisdiction:state.jurisdiction,mode:state.mode,seed:state.seed});next.revision=state.revision;next.commands=clone(state.commands);const receipts=new Map([...next.receipts,...state.receipts].map(r=>[r.id,r]));next.receipts=[...receipts.values()].slice(-1000);if(state.progression)next.progression=clone(state.progression);if(state.portfolio)next.portfolio=clone(state.portfolio);if(state.managedOperations)next.managedOperations=clone(state.managedOperations);if(state.marketQualification)next.marketQualification=clone(state.marketQualification);return next;}
  };}
  function mediaHooks(excludeInteractionId){return {
    excludeInteractionId,
    resourceExists:(state,id)=>!!state.resources[id],
    resourceReady:(state,id)=>productServices(state)[id]?.ready===true,
    routeAuthorized:(state,path,fromTenant,toTenant)=>fromTenant===toTenant||!!state.calling?.nodes.directory.effective?.federation.some(e=>e.from===fromTenant&&e.to===toTenant)
  };}
  function mediaRoute(s,i,target,platform,carrierRequired){
    const profile=(table,resourceId)=>{const rows=Object.values(table).filter(n=>(n.effective||n.desired).resourceId===resourceId);return rows.length===1?rows[0].id:null;},p=s.mediaNegotiation;
    const toEndpoint=profile(p.endpoints,target),carrierId=carrierRequired?profile(p.carriers,'carrier'):null;
    if(!toEndpoint||carrierRequired&&!carrierId)return null;
    if(i.direction==='inbound')return {direction:'inbound',carrierId,toEndpoint};
    const caller=s.calling?.nodes.directory.effective?.identities.find(x=>x.canonical===i.from),desks=Object.values(s.resources).filter(r=>r.kind==='endpoint'&&r.effective?.identity===i.from),source=caller?.endpoint||(desks.length===1?desks[0].id:platform),fromEndpoint=profile(p.endpoints,source);
    return fromEndpoint?{direction:carrierRequired?'outbound':'internal',fromEndpoint,toEndpoint,...(carrierRequired?{carrierId}:{})}:null;
  }
  function prepareMedia(s,i,target,platform,carrierRequired){
    if(!s.mediaNegotiation)return null;const path=mediaRoute(s,i,target,platform,carrierRequired);if(!path)return {status:'blocked',signalling:{ready:false},blockingReasons:['MEDIA_PROFILE_REQUIRED']};
    const result=mediaNegotiation.preflight(s,path,mediaHooks());for(const code of result.negotiation.offerTrace||[])event(s,i,'media-offer',code,{path:clone(path)});return result;
  }
  function carrierAdmitted(i){return i?.trace?.some(t=>t.code==='CARRIER_PATH_ADMITTED'&&['inbound','outbound'].includes(t.direction)||t.code==='CARRIER_MODEL_SELECTED'&&(!t.direction||t.direction==='inbound'))===true;}
  function carrierOccupancy(s,except){return s.interactions.filter(x=>x!==except&&x.channel==='voice'&&['queued','handling','ringing','shared-active','parked','connected'].includes(x.phase)&&carrierAdmitted(x)).length;}
  function admitMedia(s,i,result){
    if(!result)return true;
    i.media.out=i.media.out&&result.media?.fromTo===true;i.media.in=i.media.in&&result.media?.toFrom===true;event(s,i,'media','MEDIA_PATHS',i.media);
    event(s,i,'media','CODEC_NEGOTIATED',result.negotiation);
    if(result.status!=='ready'){event(s,i,'media','MEDIA_NEGOTIATION_FAILED',{reasons:result.blockingReasons});finish(s,i,result.blockingReasons[0]||'MEDIA_NEGOTIATION_FAILED');return false;}
    const reserved=mediaNegotiation.reserve(s,i.id,result.path,mediaHooks());if(!reserved.accepted){finish(s,i,reserved.result.blockingReasons[0]||'MEDIA_NEGOTIATION_FAILED');return false;}
    i.media.out=i.media.out&&result.media.fromTo;i.media.in=i.media.in&&result.media.toFrom;return true;
  }
  function providerSiteHooks(parent){
    const base=siteHooks(),projects=child=>parent.providerCampaign.projects.filter(p=>p.customerId===child.providerCustomer?.id&&providerOwnedSites.OPERATION_IDS.includes(p.operationId)&&!['blocked','cancelled'].includes(p.status));
    const funded=(child,operation)=>projects(child).findLast(p=>operation==='site-recovery'?['site-recovery','managed-site-recovery'].includes(p.operationId):p.operationId===operation);
    return {...base,
      authorize:(child,action,owner)=>owner==='orchard-msp'&&!!funded(child,action==='run-site-exercise'||action==='recover-site-exercise'||action==='restore-site-exercise'?'site-recovery':action.includes('migration')?'site-resource-migration':'owned-site-operations'),
      siteOwnership:(child,q)=>{const project=funded(child,'owned-site-operations'),node=child.siteOperations?.sites[q.site],cfg=node?.desired,physical=child.transport?.sites[q.transportSite];if(!project||!cfg||!physical?.effective||q.owner!=='orchard-msp'||q.ownership!=='provider')return null;const refs=[cfg.adminResource,cfg.backupResource,cfg.restoreResource,...cfg.endpointResources],paid=refs.every(id=>parent.providerCampaign.projects.some(p=>p.customerId===project.customerId&&p.resources.includes(id)&&p.configSubmittedAt!==null&&!['cancelled','blocked'].includes(p.status))||project.resources.includes(id)),local=refs.every(id=>child.resources[id]?.effective?.local===true&&child.resources[id].effective.region===physical.effective.region);return {site:q.site,owner:q.owner,ownership:q.ownership,local,controlled:paid,recordId:'ownership-'+q.site,generation:physical.generation};},
      injectFault:(child,q)=>{const project=funded(child,'site-recovery');if(!project||q.exerciseId!=='site-exercise-'+project.id||q.kind!==project.config?.kind||q.targetSite!==project.config?.targetSite)fail('PAID_SITE_RECOVERY_REQUIRED');if(child.transport.domains[q.domain]===true)fail('SITE_DOMAIN_ALREADY_FAILED');transport.command(child,{action:'domain',id:q.domain,failed:true},{...transportHooks(child),authorize:()=>true});return {id:q.domain,domain:q.domain,active:true};},
      clearFault:(child,id)=>{const project=funded(child,'site-recovery'),exercise=child.siteOperations.exercises.find(x=>x.id==='site-exercise-'+project?.id);if(exercise?.fault?.id!==id)fail('PAID_SITE_RECOVERY_REQUIRED');transport.command(child,{action:'domain',id,failed:false},{...transportHooks(child),authorize:()=>true});return child.transport.domains[id]===false;},
      journey:(child,q)=>providerOwnedSiteJourney(parent,child,q),
      restore:(child,q)=>{const project=funded(child,'site-recovery'),exercise=child.siteOperations.exercises.find(x=>x.id==='site-exercise-'+project?.id);if(!exercise||q.exerciseId!==exercise.id||q.backupSnapshotId!==exercise.backupSnapshot.snapshotId)fail('PAID_SITE_RESTORE_REQUIRED');const restore=base.resource(child,q.restoreResource);if(!restore?.ready||!restore.config.local||!restore.config.backup)fail('SITE_RESTORE_UNAVAILABLE');for(const snap of q.resources){const r=child.resources[snap.id];if(!r||JSON.stringify(snap)!==JSON.stringify(exercise.backupSnapshot.resources.find(x=>x.id===snap.id)))fail('SITE_RESTORE_SCOPE_MISMATCH');validateConfig(r.kind,snap.config);r.desired=clone(snap.config);r.generation++;r.provisioning={status:'pending',due:child.clock+1,generation:r.generation};}return {accepted:true,receiptId:'restore-receipt-'+child.nextId++,backupSnapshotId:q.backupSnapshotId,restoreResource:q.restoreResource,due:child.clock+1};},
      migrateResource:(child,q)=>{const project=funded(child,'site-resource-migration'),from=child.siteOperations.sites[q.fromSite],to=child.siteOperations.sites[q.toSite];if(providerSiteMigrationBusy(child,q.resource)||!project||project.config.resourceId!==q.resource||project.config.fromSite!==q.fromSite||project.config.toSite!==q.toSite||child.transport.bindings[q.resource]!==from?.effective?.transportSite||!base.transportSite(child,to?.effective?.transportSite)?.ready)return {success:false};transport.command(child,{action:'bind',resource:q.resource,site:to.effective.transportSite},{...transportHooks(child),authorize:()=>true});const person=config(child,q.resource)?.identity;if(person&&canonicalInfo(child,person))transport.command(child,{action:'bind',resource:person,site:to.effective.transportSite},{...transportHooks(child),authorize:()=>true});return {success:true,receiptId:'migration-receipt-'+child.nextId++,...q};}
    };
  }
  function siteHooks(){
    const resourceView=(s,id)=>{const r=s.resources[id];if(!r)return null;const o=observe(s,id);return {id,generation:r.generation,ready:r.provisioning.status==='ready'&&o.ready,available:o.ready,config:r.effective?clone(r.effective):null};};
    const siteView=(s,id)=>{const n=s.transport?.sites[id],c=n?.effective||n?.desired;if(!c)return null;const ready=transport.inspect(s).siteStatus[id]===true;return {id,ready,available:ready,power:ready,region:c.region,powerDomain:c.powerDomain||c.domain,failureDomain:c.domain,sharedDomains:[...new Set(Object.values(s.transport.links).filter(l=>l.effective&&[l.effective.from,l.effective.to].includes(id)).map(l=>l.effective.domain))]};};
    return {
      authorize:(s,action,owner)=>!!s.business?.organisations[owner]&&Object.keys(s.business.ownership).filter(id=>s.business.ownership[id]===owner).some(id=>business.authorise(s,id,'configure')),
      resource:resourceView,transportSite:siteView,
      siteOwnership:(s,q)=>{const n=s.siteOperations?.sites[q.site],c=n?.desired,ts=s.transport?.sites[q.transportSite];if(!c||!ts?.effective||!s.business)return null;const refs=[c.adminResource,...c.endpointResources,c.backupResource,c.restoreResource],owned=refs.every(id=>s.business.ownership[id]===q.owner),controlled=refs.every(id=>business.authorise(s,id,'configure')),local=refs.every(id=>s.resources[id]?.effective?.local===true&&s.resources[id].effective.region===ts.effective.region);if(q.ownership==='customer'&&!s.business.organisations[q.owner]?.roles.includes('customer')||q.ownership==='provider'&&!s.business.organisations[q.owner]?.roles.some(r=>['msp','integrator','carrier'].includes(r)))return null;return {site:q.site,owner:q.owner,ownership:q.ownership,local,controlled:owned&&controlled,recordId:'ownership-'+q.site,generation:ts.generation};},
      captureBackup:(s,q)=>{const r=resourceView(s,q.backupResource);if(!r?.ready||r.config.local!==true||!(s.resources[q.backupResource].kind==='archive'||s.resources[q.backupResource].kind==='infrastructure'&&r.config.backup))fail('SITE_BACKUP_UNAVAILABLE');return {success:true,snapshotId:'backup-'+s.nextId++,receiptId:'backup-receipt-'+s.nextId++,backupResource:q.backupResource,resources:clone(q.resources)};},
      injectFault:(s,q)=>{if(s.transport.domains[q.domain]===true)fail('SITE_DOMAIN_ALREADY_FAILED');transport.command(s,{action:'domain',id:q.domain,failed:true},transportHooks(s));return {id:q.domain,domain:q.domain,active:true};},
      clearFault:(s,id)=>{transport.command(s,{action:'domain',id,failed:false},transportHooks(s));return s.transport.domains[id]===false;},
      edgeInDomain:(s,id,domain)=>s.transport?.links[id]?.effective?.domain===domain,
      restore:(s,q)=>{const restore=resourceView(s,q.restoreResource);if(!restore?.ready||s.resources[q.restoreResource].kind!=='infrastructure'||!restore.config.backup||!restore.config.local)fail('SITE_RESTORE_UNAVAILABLE');for(const snap of q.resources){const r=s.resources[snap.id];if(!r||!business.authorise(s,snap.id,'configure'))fail('DELEGATION_REQUIRED');validateConfig(r.kind,snap.config);r.desired=clone(snap.config);r.generation++;r.provisioning={status:'pending',due:s.clock+1,generation:r.generation};}return {accepted:true,receiptId:'restore-receipt-'+s.nextId++,backupSnapshotId:q.backupSnapshotId,restoreResource:q.restoreResource,due:s.clock+1};},
      journey:(s,q)=>{const target=q.toResources[0],endpoint=config(s,target);if(s.resources[target]?.kind!=='endpoint'||!endpoint?.number)return {success:false};let from='+12125550199',direction='inbound',sourceResource='carrier';if(q.phase==='baseline'){const source=q.fromResources[0],conf=config(s,source);if(s.resources[source]?.kind!=='endpoint'||!conf?.identity)return {success:false};from=conf.identity;direction='outbound';sourceResource=s.transport.bindings[from]?from:'identity';}const sourceSite=s.transport.bindings[sourceResource],targetSite=s.transport.bindings[target];startInteraction(s,{channel:'voice',direction,from,to:endpoint.number,caseId:'site-probe-'+s.nextId,media:{encrypted:true}},{probe:true});const i=s.interactions.at(-1),path=i.trace.find(t=>t.code==='MEDIA_TRANSPORT_ADMITTED');return {success:i.phase==='resolved'&&i.outcome==='CONNECTED'&&i.destination===target,interactionId:i.id,sourceSite,targetSite,targetResource:i.destination,edges:path?.edges||[],interaction:clone(i)};},
      migrateResource:(s,q)=>{const from=s.siteOperations.sites[q.fromSite],to=s.siteOperations.sites[q.toSite];if(!business.authorise(s,q.resource,'migrate')||s.transport.bindings[q.resource]!==from.effective.transportSite||!siteView(s,to.effective.transportSite)?.ready)return {success:false};transport.command(s,{action:'bind',resource:q.resource,site:to.effective.transportSite},transportHooks(s));const person=config(s,q.resource)?.identity;if(person&&canonicalInfo(s,person))transport.command(s,{action:'bind',resource:person,site:to.effective.transportSite},transportHooks(s));return {success:true,receiptId:'migration-receipt-'+s.nextId++,...q};}
    };
  }
  function observeTransportPath(state,id,observation){
    const interaction=state.interactions.find(row=>row.id===id);if(!interaction)return;
    transport.validateObservation(observation);
    const signature=value=>JSON.stringify(value,(key,item)=>['at','sampledAt'].includes(key)?0:item);
    const previous=interaction.trace.findLast(row=>row.code==='MEDIA_TRANSPORT_OBSERVED');
    if(previous&&previous.observedTo===state.clock-1&&signature(previous.observation)===signature(observation)){
      previous.observedTo=state.clock;previous.observedMinutes++;
    }else event(state,interaction,'transport','MEDIA_TRANSPORT_OBSERVED',{observation:clone(observation),observedFrom:state.clock,observedTo:state.clock,observedMinutes:1});
  }
  function transportHooks(s){return {authorize:(state)=>business.authorise(state,'access','configure'),resourceExists:(state,id)=>!!state.resources[id]||!!canonicalInfo(state,id),bill:(state,invoice)=>business.externalCost(state,invoice),pathObserved:observeTransportPath,failed:(state,id,reason)=>{const i=state.interactions.find(x=>x.id===id);if(i){event(state,i,'transport',reason);finish(state,i,reason);}else transport.release(state,id);}};}
  function boundaryCheck(s,resourceId){
    if(!s.boundaries)return null;const key=s.boundaries.bindings[resourceId];
    if(!key)return ['government','defence'].includes(s.scenario)?{eligible:false,blocking:[{code:'BOUNDARY_CONTRACT_REQUIRED',path:resourceId}]}:null;
    const node=s.boundaries.contracts.find(x=>x.id===key),local=config(s,'local'),localReady=!!local&&observe(s,'local').ready&&['identity','dns','time','certificates','licensing'].every(k=>local[k]);
    const context={...s,boundaries:{...s.boundaries,contracts:s.boundaries.contracts.map(c=>c.id===key?{...c,observed:{...c.observed,connected:s.connected&&c.observed.connected,cloudLicenceAvailable:s.connected&&c.observed.cloudLicenceAvailable,localServicesAvailable:localReady&&c.observed.localServicesAvailable}}:c)}};
    const result=boundaries.evaluate(context,key),blocking=[...result.blocking];
    if(node.effective&&!node.effective.flows.some(f=>f.resource===resourceId))blocking.push({code:'BOUNDARY_RESOURCE_NOT_COVERED',path:resourceId});
    if(node.effective?.profile!==s.jurisdiction)blocking.push({code:'BOUNDARY_PROFILE_MISMATCH',path:resourceId});
    for(const flow of node.effective?.flows||[]){const r=s.resources[flow.resource],c=r?.effective;if(!c||!observe(s,flow.resource).ready)blocking.push({code:'BOUNDARY_RESOURCE_UNAVAILABLE',path:flow.resource});
      if(c){const locations=r.kind==='archive'?flow.storageRegions:flow.processingRegions;if(!locations.includes(c.region))blocking.push({code:'BOUNDARY_ACTUAL_LOCATION_MISMATCH',path:flow.resource});if(!s.connected&&!c.local)blocking.push({code:'BOUNDARY_EXTERNAL_RESOURCE',path:flow.resource});if(r.kind==='archive'&&c.access.some(role=>!flow.accessRoles.includes(role)))blocking.push({code:'BOUNDARY_ACTUAL_ACCESS_MISMATCH',path:flow.resource});}
    }
    return {...result,eligible:blocking.length===0,blocking};
  }
  function canonicalInfo(s,who){
    if(s.calling){const identities=s.calling.nodes.directory.effective?.identities||[],exact=identities.filter(x=>x.canonical===who),matches=exact.length?exact:identities.filter(x=>x.endpoint===who||x.number===who||x.aliases.includes(who));const found=matches.length===1?matches[0]:null;return found?.known?{person:found.canonical,tenant:found.tenant}:null;}
    return config(s,'identity')?.identities.includes(who)?{person:who,tenant:s.tenant||scenarioTenants[s.scenario]}:null;
  }
  function trustedCase(s,caseId){const entry=s.cases?.[caseId];if(!entry)return null;const identity=canonicalInfo(s,entry.identity);if(!identity||identity.person!==entry.identity||entry.tenant&&identity.tenant!==entry.tenant)return null;return {person:identity.person,tenant:entry.tenant||identity.tenant,caseId};}
  function channelContext(s,i,overrides={}){
    const bound=trustedCase(s,i.caseId),who=canonicalInfo(s,i.from),person=who?.person,tenant=who?.tenant;
    const account=overrides.account||i.account||'chatterleaf',purpose=overrides.purpose||i.purpose||'service',template=overrides.template||i.template||({chatterleaf:'service-outside-window',letterbox:'transaction-update',casechat:'case-update',workplace:'case-update'}[account]);
    if(!person||!tenant||!bound||bound.person!==person||bound.tenant!==tenant)return null;
    return {tenant,person,canonicalPerson:person,channel:'message',account,purpose,caseId:i.caseId,caseIdentity:bound.person,caseTenant:bound.tenant,authenticatedIdentity:person,template,at:s.clock};
  }
  function channelOperationHooks(s){if(!s.channels)return {};return {
    beforeAccept:(state,i)=>{const context=channelContext(state,i);if(!context)return {ok:false,retryable:false,reason:'CHANNEL_CASE_IDENTITY_UNAVAILABLE'};const check=channels.beforeAccept(state.channels,i,context);return {ok:check.eligible,retryable:['CHANNEL_PROVIDER_UNAVAILABLE','CHANNEL_PROVIDER_FAULT','CHANNEL_AUTHENTICATION_REQUIRED'].includes(check.reason),reason:check.reason};},
    accepted:(state,i,job)=>{const context=channelContext(state,i);if(!context)fail('CHANNEL_CASE_IDENTITY_UNAVAILABLE');channels.recordAcceptance(state.channels,i,context,job);event(state,i,'channel','CHANNEL_ACCEPTED',{job:job.id});},
    delivered:(state,i,job)=>{const accepted=state.channels.acceptances.find(x=>x.interaction===i.id);if(!accepted)fail('CHANNEL_ACCEPTANCE_REQUIRED');const context={tenant:accepted.tenant,person:accepted.person,canonicalPerson:accepted.person,channel:'message',account:accepted.channel,purpose:accepted.purpose,caseId:accepted.caseId,caseIdentity:accepted.person,caseTenant:accepted.tenant,authenticatedIdentity:accepted.person,template:accepted.template,at:state.clock};channels.recordDelivery(state.channels,i,context,job);event(state,i,'channel','CHANNEL_DELIVERY_RECORDED',{job:job.id});}
  };}
  function taskResource(s,integration){const supported={cases:['cases','crm'],engage:['engage','workflow'],room:['room','room']},rule=supported[integration];if(!rule)return null;const [id,kind]=rule;return s.resources[id]?.kind===kind?id:null;}
  function taskIntegrationReady(s,need){const route=need?.resolutionCriteria,resourceId=route&&taskResource(s,route.integration),resource=resourceId&&s.resources[resourceId];if(!resource||!observe(s,resourceId).ready)return false;if(resource.kind==='crm')return resource.effective?.identityMapping===true;if(resource.kind==='workflow')return resource.effective?.crm==='cases'&&resource.effective?.queue==='service'&&observe(s,'cases').ready&&observe(s,'service').ready;if(resource.kind==='room')return resource.effective?.calendar===true&&!!config(s,'identity')?.identities.includes(resource.effective?.account);return false;}
  function outcomeContext(s,i,need,technicalSuccess){
    const bound=trustedCase(s,i.caseId),who=canonicalInfo(s,i.from),identity=bound&&who&&bound.person===who.person&&bound.tenant===(i.tenant||who.tenant);
    return {actor:i.botAnswered?'bot':'human',technicalSuccess:!!technicalSuccess,taskIntegrationReady:taskIntegrationReady(s,need),contextRetained:!!bound&&!!identity,tenant:bound?.tenant||i.tenant||who?.tenant||need.tenant,person:bound?.person||who?.person||need.person,caseId:i.caseId,purpose:need.purpose,businessIntent:need.intent,identityVerified:!!identity};
  }
  function hasCustomerResolution(i){return !i.probe&&i.phase==='resolved'&&(!i.needId||i.needOutcome?.outcome==='resolved');}
  function qualityContract(s,contractId,historical=false){
    const c=s.business?.contracts.find(x=>x.id===contractId);if(!c)fail('QUALITY_CONTRACT_REQUIRED');
    const actor={...s,business:{...s.business,player:c.supportOwner}},scope=c.resources;
    const authorized=scope.every(id=>business.authorise(s,id,'configure')&&business.authorise(actor,id,'configure'))&&s.business.organisations[c.supportOwner]?.roles.some(role=>['msp','integrator','bpo'].includes(role));
    return {id:c.id,status:historical?c.status:c.status==='active'&&c.renewAt>s.clock&&c.sell&&c.price===0&&c.quantity===1&&authorized?'active':'blocked',offer:c.offer,unit:c.unit,currency:c.currency,customer:c.customer,supportOwner:c.supportOwner,resources:clone(c.resources)};
  }
  function qualityIntegrationContext(s,contractId){
    const contract=qualityContract(s,contractId),queues=contract.resources.filter(id=>s.resources[id]?.kind==='queue');if(queues.length!==1)fail('QUALITY_SERVICE_SCOPE_REQUIRED');
    const serviceResource=queues[0],services=productServices(s),node=id=>({generation:s.resources[id]?.generation||0,ready:services[id]?.ready===true});
    return {tenant:s.tenant||scenarioTenants[s.scenario],clock:s.clock,contract,contact:{generation:s.contact?.generation||0,ready:!!s.contact?.effective&&s.contact.provisioning.status==='ready'&&s.contact.provisioning.generation===s.contact.generation,serviceResource,serviceGeneration:node(serviceResource).generation,serviceReady:node(serviceResource).ready,supervisors:clone(s.contact?.effective?.supervisors||[])},recorder:node('recorder'),archive:node('archive')};
  }
  function qualityReviewContext(s,q){
    const tenant=s.tenant||scenarioTenants[s.scenario],historical=q.mode==='historical';if(q.tenant!==tenant)fail('QUALITY_TENANT_MISMATCH');
    let i=s.interactions.find(x=>x.id===q.interactionId);
    if(!i&&historical){
      const proof=q.review,number=Number(/^interaction-([1-9]\d*)$/.exec(q.interactionId)?.[1]||0),captured=proof?.interactionSnapshot;
      const retained=s.records.find(r=>r.id===proof?.recording?.id&&r.interaction===q.interactionId),assigned=s.workforceOps?.assignments.find(a=>a.id===proof?.agent?.assignmentId&&a.interaction===q.interactionId&&a.person===proof.agent.id);
      if(s.interactions.length===200&&number>0&&number<=(s.tracePrunedThrough||0)&&captured?.id===q.interactionId&&captured.tenant===tenant&&retained&&assigned&&s.cases[captured.caseId]?.identity===proof.caseIdentity)i={...clone(captured),from:proof.caseIdentity};
    }
    if(!i)fail('QUALITY_INTERACTION_UNAVAILABLE');
    const linked=s.cases[i.caseId],assignment=s.workforceOps?.assignments.find(x=>x.interaction===(i.workforceAssignment||i.id)&&x.person===i.agent);
    if(!linked||linked.identity!==i.from||linked.tenant!==tenant||!historical&&!linked.interactions.includes(i.id))fail('QUALITY_CASE_LINEAGE_REQUIRED');
    if(!assignment||assignment.channel!=='voice'||assignment.personSnapshot?.id!==i.agent)fail('QUALITY_ASSIGNMENT_REQUIRED');
    const contract=qualityContract(s,q.contractId,historical),services=productServices(s),supervisor=s.contact?.effective?.supervisors.includes(q.reviewer)===true;
    const recordings=i.records.map(id=>s.records.find(r=>r.id===id)).filter(r=>r?.kind==='recording').map(r=>{
      const reasons=[];if(r.interaction!==i.id)reasons.push('QUALITY_RECORDING_LINEAGE');if(r.deleted)reasons.push('QUALITY_RECORDING_DELETED');
      if(!Number.isSafeInteger(r.expiresAt)||r.expiresAt<=s.clock&&!r.held)reasons.push('QUALITY_RECORDING_EXPIRED');
      if(!information.canRead(s,r,q.reviewer,s.jurisdiction))reasons.push('QUALITY_RECORDING_ACCESS');
      if(!services.recorder?.ready||!services.archive?.ready)reasons.push('QUALITY_RECORDING_SERVICE_UNAVAILABLE');
      for(const id of ['recorder','archive']){const gate=boundaryCheck(s,id);if(gate&&!gate.eligible)reasons.push('QUALITY_RECORDING_BOUNDARY');}
      const record={id:r.id,kind:r.kind,interaction:r.interaction,createdAt:r.createdAt,expiresAt:r.expiresAt??null,held:!!r.held,deleted:!!r.deleted,region:r.region,captureRegion:r.captureRegion,access:clone(r.access),pack:r.pack||null,captureScope:r.captureScope||'complete',classification:r.classification??null,storage:r.storage?clone(r.storage):null};
      return {record,reviewAllowed:reasons.length===0,reasons};
    });
    return {tenant,clock:s.clock,contract,reviewer:{id:q.reviewer,supervisor,authorized:supervisor&&contract.status==='active'},interaction:{id:i.id,tenant:i.tenant,phase:i.phase,outcome:i.outcome||null,caseId:i.caseId,agent:i.agent,workforceAssignment:i.workforceAssignment,records:clone(i.records)},case:{id:i.caseId,tenant:linked.tenant,identity:linked.identity,interactions:clone(linked.interactions)},assignment:clone(assignment),recordings};
  }
  function workforceQualityHooks(){return {
    integrationContext:qualityIntegrationContext,reviewContext:qualityReviewContext,
    reviewCandidates:(s,q)=>q.tenant===(s.tenant||scenarioTenants[s.scenario])?s.interactions.filter(i=>i.channel==='voice'&&['resolved','failed'].includes(i.phase)).map(i=>i.id):[],
    settleReview:(s,q,review)=>{information.command(s,{action:'read',record:q.recordingId,role:q.reviewer,region:s.jurisdiction},informationHooks(s));return business.qualityUsage(s,q,review);},
    validateReceipt:(s,receipt,review)=>business.validateQualityReceipt(s,receipt,review)
  };}
  function workforceOfferContext(s){
    const roster=s.workforceOps?.roster.effective||[];
    return {clock:s.clock,tenant:s.tenant||scenarioTenants[s.scenario],people:roster.map(p=>p.id),knownPeople:[...new Set((s.workforceOps?.peopleHistory||[]).map(p=>p.id))],resourceGeneration:s.resources.people.generation,resourceReady:observe(s,'people').ready,
      forecast:request=>{
        const allowed=new Set(request.people),excludePeople=roster.filter(p=>!allowed.has(p.id)).map(p=>p.id);
        const sample=(s.workforceOps?.arrivals||[]).filter(x=>x.channel===request.channel&&x.skill===request.skill&&x.language===request.language).slice(-10),used=request.method==='last-period'?sample.slice(-1):sample;
        const sampleMinutes=used.reduce((n,x)=>n+(x.sampleMinutes||60),0),arrivals=sampleMinutes?Math.ceil(used.reduce((n,x)=>n+x.count,0)*request.horizon/sampleMinutes):0;
        let projectedWork=0;for(let offset=0;offset<request.horizon;offset++)projectedWork+=(workforce.allocation({...s,clock:s.clock+offset},{channel:request.channel,skill:request.skill,language:request.language,excludePeople}).throughput||0)/60;
        const projectedCapacity=Math.floor(projectedWork+1e-9);return {samples:used.length,arrivals,projectedCapacity,projectedGap:Math.max(0,arrivals-projectedCapacity)};
      }};
  }
  function workforceOfferAuthority(s){
    if(!s.business||!s.workforceOps)fail('WORKFORCE_OFFER_PREREQUISITES');
    if(!business.authorise(s,'people','configure'))fail('DELEGATION_REQUIRED');
    if(s.workforceOps.operator==='customer')fail('WORKFORCE_CUSTOMER_CONTROLLED');
    if(s.workforceOps.operator==='bpo'&&!s.workforceOps.agreements.some(a=>a.grantee==='orchard-msp'&&a.expires>s.clock&&a.resources.includes('workforce')&&a.actions.includes('configure')))fail('WORKFORCE_DELEGATION_REQUIRED');
  }
  function workforceHandle(s,i){return s.workforceOps.assignments.some(a=>a.interaction===i.id)?`${i.id}-assignment-${s.workforceOps.nextId}`:i.id;}
  function fingerprint(s){const text=JSON.stringify([s.connected,Object.values(s.resources).map(r=>[r.id,r.generation,r.effective,r.fault]),...(s.operations?[operations.fingerprint(s)]:[]),...(s.information?[information.fingerprint(s)]:[]),...(s.contact?[contact.fingerprint(s)]:[]),...(s.estate?[estate.fingerprint(s)]:[]),...(s.workforceOps?[workforce.fingerprint(s)]:[]),...(s.calling?[calling.fingerprint(s.calling)]:[]),...(s.products?[products.fingerprint(s)]:[]),...(s.channels?[channels.fingerprint(s.channels)]:[]),...(s.outcomes?[outcomes.fingerprint(s)]:[]),...(s.transport?[transport.fingerprint(s)]:[]),...(s.boundaries?[boundaries.fingerprint(s)]:[]),...(s.campaign?[campaign.fingerprint(s)]:[]),...(s.issueExercises?[issueExercises.fingerprint(s)]:[]),...(s.sharedServices?[sharedServices.fingerprint(s)]:[]),...(s.siteOperations?[siteOperations.configurationFingerprint(s)]:[]),...(s.mediaNegotiation?[mediaNegotiation.fingerprint(s)]:[]),...(s.productEvidence?[productEvidence.fingerprint(s)]:[]),...(s.speechModels?[speechModels.fingerprint(s)]:[]),...(s.customerNeeds?[customerNeeds.fingerprint(s)]:[]),...(s.workforceOffers?[workforceOffers.fingerprint(s.workforceOffers)]:[]),...(s.workforceQuality?[workforceQuality.fingerprint(s.workforceQuality)]:[])]);if(!s.providerCustomer)return text;let a=2166136261,b=2246822519;for(let n=0;n<text.length;n++){const c=text.charCodeAt(n);a=Math.imul(a^c,16777619);b=Math.imul(b^c,3266489917);}return 'provider-config-v1:'+ (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
  function calculate(s){
    const services=Object.fromEntries(Object.keys(s.resources).map(id=>[id,observe(s,id)]));
    const assessment=assess(s);return {revision:s.revision,clock:s.clock,services,providerCampaign:s.providerCampaign?provider.inspect(s):null,profit:s.totals.revenue-s.totals.cost,queue:s.interactions.filter(i=>['queued','handling','wrap'].includes(i.phase)).length,resolved:s.interactions.filter(hasCustomerResolution).length,assessment,productEvidence:s.productEvidence?productEvidence.inspect(s,productEvidenceHooks()):null,speechModels:s.speechModels?speechModels.inspect(s,speechHooks(s)):null,customerNeeds:s.customerNeeds?customerNeeds.inspect(s,services):null,managedOperations:s.managedOperations?managedOperations.inspect(s):null,mediaNegotiation:s.mediaNegotiation?mediaNegotiation.inspect(s):null,siteOperations:s.siteOperations?siteOperations.inspect(s,siteHooks()):null,specialistLifecycle:s.specialistLifecycle?specialistLifecycle.inspect(s,lifecycleHooks()):null,sharedServices:s.sharedServices?sharedServices.inspect(s):null,marketQualification:s.marketQualification?marketQualification.inspect(s,marketHooks()):null,admissionSecurity:s.admissionSecurity?admissionSecurity.inspect(s):null,serviceObservation:s.serviceObservation?serviceObservation.inspect(s,serviceObservationHooks()):null,portfolio:s.portfolio?portfolio.inspect(s.portfolio):null,business:business.calculate(s,assessment,services),operations:operations.inspect(s),information:information.inspect(s),contact:contact.inspect(s),estate:estate.inspect(s),workforce:workforce.inspect(s),workforceOffers:s.workforceOffers?workforceOffers.inspect(s.workforceOffers,workforceOfferContext(s)):null,workforceQuality:s.workforceQuality?workforceQuality.inspect(s.workforceQuality,s,workforceQualityHooks()):null,calling:s.calling?calling.inspect(s.calling):null,products:s.products?products.inspect(s):null,channels:s.channels?channels.inspect(s.channels):null,outcomes:s.outcomes?outcomes.inspect(s):null,transport:transport.inspect(s),campaign:s.campaign?campaign.inspect(s,campaignHooks()):null,progression:s.progression?progression.inspect(s,progressionHooks(s)):null,issueExercises:s.issueExercises?issueExercises.inspect(s):null,boundaries:s.boundaries?{...boundaries.inspect(s),enforcement:Object.fromEntries(Object.keys(s.boundaries.bindings).map(id=>[id,boundaryCheck(s,id)]))}:null};
  }
  function event(s,i,stage,code,detail={}){i.trace.push({at:s.clock,stage,code,synthetic:true,...detail});if(i.trace.length>80)i.trace.shift();}
  function finish(s,i,code,success=false){if(['resolved','failed'].includes(i.phase))return i;if(!success&&i.channel==='voice'&&['handling','wrap'].includes(i.phase)&&i.agent&&i.media?.out===true&&i.media?.in===true&&!i.records.some(id=>s.records.some(r=>r.id===id&&r.kind==='recording')))record(s,i,'partial');releaseCapture(s,i.id);if(i.capture?.status==="reserved"){i.capture.status="released";i.capture.endedAt=s.clock;}if(s.mediaNegotiation)mediaNegotiation.release(s,i.id);if(!success&&s.workforceOps&&i.agent)workforce.finish(s,i.workforceAssignment||i.id,config(s,i.worker)?.wrapMinutes||0);if(s.transport)transport.release(s,i.id);i.phase=success?'resolved':'failed';i.outcome=code;i.finishedAt=s.clock;event(s,i,'outcome',code);if(s.sharedServices)sharedServices.release(s,i.id,code,sharedHooks());if(s.admissionSecurity?.reservations.some(r=>r.interactionId===i.id)){const settlement=admissionSecurity.settle(s,i.id);event(s,i,'security','SECURITY_CALL_SETTLED',{cents:settlement.record.cents});}if(s.outcomes&&i.needId&&!i.needOutcome){const need=s.outcomes.needs.find(n=>n.id===i.needId);if(!need)fail('OUTCOMES_NEED_UNAVAILABLE');const interaction={id:i.id,needId:i.needId,caseId:i.caseId,channel:i.channel==='message'?'message':'voice',idempotencyKey:i.outcomeIdempotencyKey||i.id};const evaluation=outcomes.evaluate(s,interaction,outcomeContext(s,i,need,success));if(evaluation){const attempt=outcomes.settle(s,interaction,evaluation);if(attempt){i.needOutcome={outcome:attempt.outcome,reason:attempt.reason,attemptId:attempt.id};event(s,i,'customer-need',attempt.reason,{needId:need.id,attemptId:attempt.id,customerOutcome:attempt.outcome,technicalSuccess:attempt.technicalSuccess,...(attempt.handoffDestination?{handoffDestination:attempt.handoffDestination}:{})});}}}return i;}
  function captureRequired(s){return ['enterprise','government'].includes(s.scenario)||s.providerCustomer?.recording===true;}
  function reserveCapture(s,id,kind='interaction'){
    const rows=s.captureReservations||(s.captureReservations=[]),existing=rows.find(r=>r.id===id);
    if(existing)return {accepted:existing.kind===kind};
    const recorder=config(s,'recorder');
    if(['recorder','archive'].some(id=>{const gate=productGate(s,id);return gate&&!gate.available;}))return {accepted:false,reasons:['CAPTURE_PRODUCT_UNAVAILABLE']};
    if(!recorder||!observe(s,'recorder').ready||!recorder.consent||!recorder.identityMapping)return {accepted:false,reasons:['RECORDING_FAILED']};
    if(rows.length>=recorder.capacity)return {accepted:false,reasons:['RECORDING_CAPACITY']};
    rows.push({id,kind,startedAt:s.clock,resource:'recorder'});return {accepted:true};
  }
  function releaseCapture(s,id){if(s.captureReservations)s.captureReservations=s.captureReservations.filter(r=>r.id!==id);}
  function beginCapture(s,i){
    if(i.probe||!captureRequired(s)||i.capture)return;
    const result=reserveCapture(s,i.id);i.capture={status:result.accepted?'reserved':'denied',startedAt:s.clock};
    if(!result.accepted){i.capture.reason=result.reasons[0];i.obligations.push(i.capture.reason);event(s,i,'capture',i.capture.reason);}else{const gate=productGate(s,'recorder');if(gate?.available)event(s,i,'product','PRODUCT_FEATURE_ACCEPTED',{resource:'recorder',bindings:clone(gate.bindings)});}
  }
  function connectEndpoint(s,i){
    if(i.probe)return finish(s,i,'CONNECTED',true);
    beginCapture(s,i);i.phase='connected';i.connectedAt=s.clock;i.due=s.clock+i.durationMinutes;
    event(s,i,'conversation','CONVERSATION_STARTED',{durationMinutes:i.durationMinutes});return i;
  }
  function productPathReady(s,i,resources,recordAccepted=false){
    for(const resource of [...new Set(resources)]){const gate=productGate(s,resource);if(!gate)continue;if(!gate.available){event(s,i,'product','PRODUCT_FEATURE_BLOCKED',{deployment:gate.deploymentId,feature:gate.feature,resource,reason:gate.reason});finish(s,i,'PRODUCT_FEATURE_UNAVAILABLE');return false;}if(recordAccepted)event(s,i,'product','PRODUCT_FEATURE_ACCEPTED',{resource,bindings:clone(gate.bindings)});}
    return true;
  }
  function liveVoiceMedia(s,i){
    const path=i.voicePath;if(!path)return true;
    const phone=config(s,path.platform),carrier=path.carrier?config(s,path.carrier):null;
    if(!productPathReady(s,i,[path.platform,...(path.carrier?[path.carrier]:[]),...(phone?.local?['local']:[])]))return false;
    // Established media does not require a fresh signalling handshake.
    const base=!!phone&&observe(s,path.platform).ready&&observe(s,i.destination).ready&&(!path.carrier||observe(s,path.carrier).ready);
    const callingMedia=s.calling?calling.media(s.calling,i):{outbound:true,inbound:true};
    i.media={...i.media,out:base&&phone.mediaOut&&(!carrier||carrier.mediaOut)&&callingMedia.outbound,in:base&&phone.mediaIn&&(!carrier||carrier.mediaIn)&&callingMedia.inbound};
    if(!i.media.out||!i.media.in){finish(s,i,i.phase==='shared-active'?'SHARED_MEDIA_OR_ENDPOINT_UNAVAILABLE':!i.media.out&&!i.media.in?'MEDIA_LOST':'ONE_WAY_MEDIA');return false;}
    return true;
  }
  function record(s,i,captureScope='complete'){
    if(i.channel!=='voice')return;
    const mandatory=captureRequired(s),r=config(s,'recorder'),a=config(s,r?.archive);
    if(!mandatory)return;
    if(i.probe)return;
    if(i.capture?.status!=='reserved'||!s.captureReservations?.some(x=>x.id===i.id)){if(!i.obligations.includes('RECORDING_CAPACITY')&&!i.obligations.includes('RECORDING_FAILED'))i.obligations.push('RECORDING_FAILED');event(s,i,'record','CAPTURE_NOT_RESERVED');return;}
    for(const id of ['recorder','archive',...(s.scenario==='government'?['speech']:[])]){const gate=boundaryCheck(s,id);if(gate&&!gate.eligible){i.obligations.push('INFORMATION_BOUNDARY_FAILED');event(s,i,'boundary','INFORMATION_BOUNDARY_FAILED',{resource:id,blocking:gate.blocking});return;}}
    const storage=informationRecordStore.admission(s,{resourceId:r?.archive||'archive',region:a?.region,capacityUnits:a?.capacity||0,store:s.recordStore});
    if((s.information||s.recordStore)&&!storage.accepted){i.obligations.push(storage.reason);event(s,i,'record',storage.reason,{storage});return;}
    if(!observe(s,'recorder').ready||!r.consent||!r.identityMapping||r.capacity<1||!a||a.retentionDays<30||a.capacity<1||!a.access.includes('supervisor')||r.region!==s.jurisdiction||a.region!==s.jurisdiction){i.obligations.push('RECORDING_FAILED');event(s,i,'record','RECORDING_FAILED');return;}
    if(s.information){const boundary=s.information.boundary.effective;if(!boundary?.processRegions.includes(r.region)||!boundary.storageRegions.includes(a.region)){i.obligations.push('INFORMATION_CAPTURE_BOUNDARY');event(s,i,'record','INFORMATION_CAPTURE_BOUNDARY');return;}}
    const item={id:'record-'+s.nextId++,kind:'recording',interaction:i.id,parents:[],captureRegion:r.region,region:a.region,retentionDays:a.retentionDays,access:[...a.access],createdAt:s.clock,...(s.recordStore?{archiveId:r.archive}:{}),...(captureScope==='partial'?{captureScope:'partial'}:{})};
    s.records.push(item);i.records.push(item.id);event(s,i,'record','RECORDING_STORED',{record:item.id});
    if(s.information){const productSpeech=productGate(s,'speech');if(productSpeech&&!productSpeech.available){i.obligations.push('PRODUCT_PROCESSOR_UNAVAILABLE');event(s,i,'processing','PRODUCT_FEATURE_BLOCKED',{deployment:productSpeech.deploymentId,feature:productSpeech.feature,resource:'speech',reason:productSpeech.reason});}else {const admission=information.enqueue(s,item,speechModelContext(s),informationHooks(s));if(admission?.accepted===false)event(s,i,'processing','PROCESSING_ADMISSION_REFUSED',{record:item.id,reasons:clone(admission.reasons)});}}
    if(s.scenario==='government'&&!s.information){
      const p=config(s,'speech');
      const productSpeech=productGate(s,'speech');if(productSpeech&&!productSpeech.available){i.obligations.push('PRODUCT_PROCESSOR_UNAVAILABLE');event(s,i,'processing','PRODUCT_FEATURE_BLOCKED',{deployment:productSpeech.deploymentId,feature:productSpeech.feature,resource:'speech',reason:productSpeech.reason});return;}
      if(!p||!observe(s,'speech').ready||p.region!==s.jurisdiction||p.capacity<1||p.language!==i.language){i.obligations.push('PROCESSING_BOUNDARY');event(s,i,'processing','PROCESSING_BOUNDARY');return;}
      const derived={...item,id:'record-'+s.nextId++,kind:p.operation,parents:[item.id],region:p.region};s.records.push(derived);i.records.push(derived.id);event(s,i,'processing','ARTEFACT_CREATED',{record:derived.id,operation:p.operation});
    }
    if(!s.recordStore&&s.records.length>500)s.records.splice(0,s.records.length-500);
  }
  function route(s,i){
    const callingDirectory=s.calling?.nodes?.directory?.effective;
    const callerIdentity=callingDirectory?.identities.find(x=>x.canonical===i.from);
    const canonicalCaller=callerIdentity?.canonical||i.from;
    const platform=operations.platform(s,canonicalCaller),phone=config(s,platform),directory=config(s,phone?.directory),trunk=config(s,'carrier');
    if(!productPathReady(s,i,[platform,'identity','carrier',...(phone?.local?['local']:[])],true))return i;
    event(s,i,'intent','CALL_REQUEST',{from:i.from,dialled:i.dialled||i.to,platform,...(s.operations?{normalised:i.to}:{})});
    if(i.intent&&!s.calling)return finish(s,i,'CALLING_PACK_REQUIRED');
    const emitCalling=(detail)=>event(s,i,'calling',detail.code,detail);
    if(s.calling){
      const emergency=calling.emergency(s.calling,i,Object.fromEntries(Object.keys(s.resources).map(id=>[id,{available:observe(s,id).ready}])),emitCalling);
      if(emergency){i.emergency=emergency;return finish(s,i,emergency.outcome,emergency.outcome==='TEST_EMERGENCY_ROUTED');}
      if(!callerIdentity||!callerIdentity.known)return finish(s,i,'UNKNOWN_CALLER');
      const caller=calling.normalise(s.calling,callerIdentity.canonical,callerIdentity.canonical);if(!caller.ok)return finish(s,i,caller.code);
    }
    if(!phone||!observe(s,platform).ready||!directory?.identities.includes(canonicalCaller)||!directory.entitled.includes(canonicalCaller))return finish(s,i,'IDENTITY_OR_ENTITLEMENT');
    const productPhone=productGate(s,platform);if(productPhone&&!productPhone.available){event(s,i,'product','PRODUCT_FEATURE_BLOCKED',{deployment:productPhone.deploymentId,feature:productPhone.feature,resource:platform,reason:productPhone.reason});return finish(s,i,'PRODUCT_DEPLOYMENT_UNAVAILABLE');}
    let target;
    let callingRoute=null;
    if(s.calling){
      const statuses=Object.fromEntries(Object.values(s.resources).map(r=>{const c=config(s,r.id),busy=s.interactions.filter(x=>x!==i&&x.destination===r.id&&['queued','handling','wrap'].includes(x.phase)).length;return [r.id,{registered:r.kind!=='endpoint'||!!c?.registered,available:observe(s,r.id).ready,capacity:r.kind==='queue'?busy<(c?.capacity||0):true}];}));
      const servicePolicy=s.calling.nodes.services.effective,group=servicePolicy?.groups.find(g=>g.id===i.to);
      const shared=s.sharedServices?.lines[i.to];if(shared)i.sharedLine=i.to;let routeTarget=shared?((shared.effective||shared.desired).members.find(m=>m.permissions.includes('answer')&&s.sharedServices.presence[m.person]?.state==='available'&&sharedHooks().endpointReady(s,sharedHooks().identity(s,m.person)||{}))?.person||(shared.effective||shared.desired).owner):i.to;
      if(group){if(group.tenant!==callerIdentity.tenant&&!s.calling.nodes.directory.effective.federation.some(e=>e.from===callerIdentity.tenant&&e.to===group.tenant))return finish(s,i,'FEDERATION_REQUIRED');const reception=calling.reception(s.calling,group.id,statuses);event(s,i,'calling','RECEPTION_RESULT',reception);
        if(reception.outcome==='VOICEMAIL'){
          const mailbox=servicePolicy.mailboxes.find(m=>m.id===reception.mailbox),stored=mailbox?calling.voicemail(s.calling,{mailbox:mailbox.id,owner:mailbox.owner,sourceInteraction:i.id,content:`Synthetic message for ${group.id}`,at:s.clock}):{outcome:'MAILBOX_UNAVAILABLE'};
          event(s,i,'calling','VOICEMAIL_RESULT',stored);return finish(s,i,stored.outcome==='STORED'?'VOICEMAIL_STORED':stored.outcome,false);
        }
        if(reception.outcome!=='ANSWERED')return finish(s,i,'GROUP_NO_ANSWER');routeTarget=reception.identity;
      }
      callingRoute=calling.resolve(s.calling,i,routeTarget,statuses,emitCalling);if(callingRoute.terminal)return finish(s,i,callingRoute.outcome);
      if(callingRoute.endpoint)target=callingRoute.endpoint;
    }
    if(!target&&/^\d{1,5}$/.test(i.to)){
      const matches=Object.values(s.resources).filter(r=>r.kind==='endpoint'&&r.effective?.extension===i.to&&r.effective.scope===i.scope);
      if(matches.length!==1)return finish(s,i,matches.length?'AMBIGUOUS_EXTENSION':'UNKNOWN_EXTENSION');target=matches[0].id;
    }else if(!target){
      const number=i.to.replace(/[ ()-]/g,'');
      if(!/^\+[1-9]\d{5,14}$/.test(number))return finish(s,i,'INVALID_NUMBER');
      target=phone.routes.find(r=>number.startsWith(r.prefix))?.target;
      event(s,i,'routing','ORDERED_ROUTE',{normalised:number,target:target||null});
    }
    if(callingRoute?.kind==='public'){
      const number=callingRoute.target.replace(/[ ()-]/g,'');target=phone.routes.find(r=>number.startsWith(r.prefix))?.target;
      event(s,i,'routing','PUBLIC_NUMBER_ROUTE',{normalised:number,target:target||null,tenant:callingRoute.tenant});
    }
    // An explicit destination denial is meaningful even when no route grants reach.
    // Only denied public calls enter native admission here; allowed calls still wait
    // for routing, signalling and session capacity before creating a reservation.
    const securityDestination=callingRoute?.kind==='public'?callingRoute.target:i.to;
    if(s.admissionSecurity&&!callingRoute?.endpoint&&/^\+[1-9]\d{5,14}$/.test(securityDestination.replace(/[ ()-]/g,''))){
      const context={peerId:'synthetic-carrier',destination:securityDestination,method:'INVITE',messageBytes:128,messageValid:true,secondOffset:0};
      const preview=admissionSecurity.preflight(s,i,context);
      if(preview.reasons.some(reason=>reason.control==='destination'&&reason.code==='DESTINATION_NOT_ALLOWED')){
        const gate=admissionSecurity.admit(s,i,context);event(s,i,'security','SECURITY_CALL_BLOCKED',{reasons:gate.reasons,nativeEventId:gate.eventId});
        return finish(s,i,gate.reasons[0]?.code||'SECURITY_CALL_BLOCKED');
      }
    }
    if(!target||!s.resources[target]||!['endpoint','queue'].includes(s.resources[target].kind))return finish(s,i,'NO_ROUTE');
    const ingress=contact.ingress(s,i,target,event);if(ingress.error)return finish(s,i,ingress.error);target=ingress.target;
    const internalCalling=!!callingRoute?.endpoint;
    const operationInteraction={...i,from:canonicalCaller,to:callingRoute?.kind==='public'?callingRoute.target:i.to};
    const operationError=internalCalling?null:operations.call(s,operationInteraction,target,event);if(operationError)return finish(s,i,operationError);
    if(internalCalling&&s.operations)event(s,i,'routing','INTERNAL_EXTENSION',{carrierRequired:false,callingKind:'directory'});
    const carrierRequired=internalCalling?false:!s.operations||!/^\d{1,5}$/.test(i.to);
    if(!phone.signalling||carrierRequired&&(!trunk||!observe(s,'carrier').ready||!trunk.signalling))return finish(s,i,'SIGNALLING_FAILED');
    const active=carrierOccupancy(s,i);
    if(carrierRequired&&active>=trunk.capacity)return finish(s,i,'SESSION_CAPACITY');
    if(s.admissionSecurity&&carrierRequired){const gate=admissionSecurity.admit(s,i,{peerId:'synthetic-carrier',destination:operationInteraction.to,method:'INVITE',messageBytes:128,messageValid:true,secondOffset:0});event(s,i,'security',gate.allowed?'SECURITY_CALL_ADMITTED':'SECURITY_CALL_BLOCKED',{reasons:gate.reasons,nativeEventId:gate.eventId});if(!gate.allowed)return finish(s,i,gate.reasons[0]?.code||'SECURITY_CALL_BLOCKED');}
    const negotiated=prepareMedia(s,i,target,platform,carrierRequired);if(negotiated&&!negotiated.signalling.ready){event(s,i,'media','MEDIA_NEGOTIATION_FAILED',{reasons:negotiated.blockingReasons});return finish(s,i,negotiated.blockingReasons[0]);}
    event(s,i,'signalling','INVITE');if(!i.sharedLine)event(s,i,'signalling','200_OK');
    i.media={...(i.mediaInputs||{}),out:phone.mediaOut&&(!carrierRequired||trunk.mediaOut),in:phone.mediaIn&&(!carrierRequired||trunk.mediaIn)};if(!negotiated)event(s,i,'media','MEDIA_PATHS',i.media);
    if(!admitMedia(s,i,negotiated))return;
    if(!i.media.out||!i.media.in)return finish(s,i,'ONE_WAY_MEDIA');
    if(s.calling){const quality=calling.media(s.calling,i,emitCalling);i.callingMedia=quality;if(!quality.outbound||!quality.inbound)return finish(s,i,'CALLING_MEDIA_'+quality.failure);}
    if(!observe(s,target).ready)return finish(s,i,'DESTINATION_UNAVAILABLE');
    for(const id of [platform,...(carrierRequired?['carrier']:[])]){const gate=boundaryCheck(s,id);if(gate&&!gate.eligible){event(s,i,'boundary','CALL_BOUNDARY_FAILED',{resource:id,blocking:gate.blocking});return finish(s,i,'CALL_BOUNDARY_FAILED');}}
    if(s.transport){const from=s.transport.bindings[i.from]?i.from:'identity',path=transport.admit(s,i.id,from,target,'voice');event(s,i,'transport',path.ready?'MEDIA_TRANSPORT_ADMITTED':path.reason,{...path,sourceSite:s.transport.bindings[from],targetSite:s.transport.bindings[target]});if(!path.ready)return finish(s,i,path.reason);}
    if(carrierRequired&&!i.trace.some(t=>t.code==='CARRIER_PATH_ADMITTED'))event(s,i,'carrier','CARRIER_PATH_ADMITTED',{direction:'outbound',carrier:'carrier'});
    if(carrierRequired)providerExternalAdmission(s,i,'outbound',platform,target,canonicalCaller,operationInteraction.to);
    i.destination=target;i.voicePath={platform,carrier:carrierRequired?'carrier':null};beginCapture(s,i);
    if(i.sharedLine){const decision=sharedServices.ringing(s,i,i.sharedLine,{},sharedHooks());event(s,i,'shared-service',decision.code,{line:i.sharedLine,members:decision.members||[]});if(!decision.allowed)return finish(s,i,decision.code);i.phase='ringing';i.due=decision.due;event(s,i,'signalling','180_RINGING');return;}
    if(s.resources[target].kind==='endpoint'){
      if(!config(s,target).registered)return finish(s,i,'ENDPOINT_UNREGISTERED');
      return connectEndpoint(s,i);
    }
    i.phase='queued';event(s,i,'queue','ENQUEUED',{queue:target});
  }
  function providerExternalAdmission(s,i,direction,platform,target,identity,dialled){
    if(s.providerCustomer?.externalCollaborationVersion!==1||s.scenario!=='enterprise'||!s.operations)return;
    const policy=direction==='outbound'?s.operations.policies[identity]:null;
    const number=s.operations.numbers.find(n=>n.number===(direction==='outbound'?policy?.callerId:dialled)&&n.holder===identity&&n.status==='active');
    const route=config(s,platform)?.routes.find(r=>dialled.startsWith(r.prefix)),carrier=s.operations.carrier;
    if(!number||!route||!carrier.effective||!i.media?.in||!i.media?.out)return;
    event(s,i,'carrier','PROVIDER_EXTERNAL_ADMISSION',{version:1,customerId:s.providerCustomer.id,tenant:s.tenant,direction,at:s.clock,identity,number:clone(number),policy:policy?clone(policy):null,platform:{id:platform,generation:s.resources[platform].generation},carrier:{id:'carrier',generation:s.resources.carrier.generation,controlGeneration:carrier.generation,provider:carrier.effective.provider,model:carrier.effective.mode},route:{dialled,matchedPrefix:route.prefix,orderedTarget:route.target,effectiveTarget:target},media:{in:true,out:true}});
  }
  function inboundRoute(s,i){
    event(s,i,'intent','CALL_REQUEST',{direction:'inbound',from:i.from,dialled:i.to});
    const assigned=s.operations?.numbers.find(n=>n.number===i.to&&n.status==='active');
    if(!assigned)return finish(s,i,s.operations?'INBOUND_NUMBER_UNASSIGNED':'INBOUND_OPERATIONS_REQUIRED');
    const platform=operations.platform(s,assigned.holder),phone=config(s,platform),directory=config(s,phone?.directory),trunk=config(s,'carrier');
    if(!phone||!observe(s,platform).ready||!directory?.identities.includes(assigned.holder)||!directory.entitled.includes(assigned.holder))return finish(s,i,'INBOUND_HOLDER_OR_ENTITLEMENT');
    if(s.calling){const matches=s.calling.nodes.directory.effective?.identities.filter(x=>x.canonical===assigned.holder&&x.known)||[];if(matches.length!==1||matches[0].tenant!==(s.tenant||scenarioTenants[s.scenario]))return finish(s,i,'INBOUND_TENANT_SCOPE');}
    if(!productPathReady(s,i,[platform,'identity','carrier',...(phone?.local?['local']:[])],true))return i;
    event(s,i,'number','INBOUND_NUMBER_ACCEPTED',{number:assigned.number,holder:assigned.holder,provider:assigned.provider,tenant:s.tenant||scenarioTenants[s.scenario]});
    let target=phone.routes.find(r=>i.to.startsWith(r.prefix))?.target;
    event(s,i,'routing','ORDERED_INBOUND_ROUTE',{normalised:i.to,target:target||null,platform});
    if(!target||!['endpoint','queue'].includes(s.resources[target]?.kind))return finish(s,i,'NO_INBOUND_ROUTE');
    const ingress=contact.ingress(s,i,target,event);if(ingress.error)return finish(s,i,ingress.error);target=ingress.target;
    const operationError=operations.inboundCall(s,i,target,event);if(operationError)return finish(s,i,operationError);
    const product=productGate(s,platform);if(product&&!product.available)return finish(s,i,'PRODUCT_DEPLOYMENT_UNAVAILABLE');
    event(s,i,'permission','INBOUND_PERMISSION_ACCEPTED',{holder:assigned.holder,platform,generation:s.resources[platform].generation});
    if(!phone.signalling||!trunk||!observe(s,'carrier').ready||!trunk.signalling)return finish(s,i,'SIGNALLING_FAILED');
    const active=carrierOccupancy(s,i);
    if(active>=trunk.capacity)return finish(s,i,'SESSION_CAPACITY');
    if(s.admissionSecurity){const gate=admissionSecurity.admitInbound(s,i);event(s,i,'security',gate.code);if(!gate.allowed)return finish(s,i,gate.code);}
    const negotiated=prepareMedia(s,i,target,platform,true);if(negotiated&&!negotiated.signalling.ready){event(s,i,'media','MEDIA_NEGOTIATION_FAILED',{reasons:negotiated.blockingReasons});return finish(s,i,negotiated.blockingReasons[0]);}
    event(s,i,'signalling','INVITE');event(s,i,'signalling','200_OK');
    i.media={...(i.mediaInputs||{}),out:phone.mediaOut&&trunk.mediaOut,in:phone.mediaIn&&trunk.mediaIn};if(!negotiated)event(s,i,'media','MEDIA_PATHS',i.media);
    if(!admitMedia(s,i,negotiated))return;
    if(!i.media.out||!i.media.in)return finish(s,i,'ONE_WAY_MEDIA');
    if(s.calling){const quality=calling.media(s.calling,i,detail=>event(s,i,'calling',detail.code,detail));i.callingMedia=quality;if(!quality.outbound||!quality.inbound)return finish(s,i,'CALLING_MEDIA_'+quality.failure);}
    if(!observe(s,target).ready)return finish(s,i,'DESTINATION_UNAVAILABLE');
    for(const id of [platform,'carrier',target]){const gate=boundaryCheck(s,id);if(gate&&!gate.eligible)return finish(s,i,'CALL_BOUNDARY_FAILED');}
    if(s.transport){const path=transport.admit(s,i.id,'carrier',target,'voice');event(s,i,'transport',path.ready?'MEDIA_TRANSPORT_ADMITTED':path.reason,{...path,sourceSite:s.transport.bindings.carrier,targetSite:s.transport.bindings[target]});if(!path.ready)return finish(s,i,path.reason);}
    if(!i.trace.some(t=>t.code==='CARRIER_PATH_ADMITTED'))event(s,i,'carrier','CARRIER_PATH_ADMITTED',{direction:'inbound',carrier:'carrier'});
    providerExternalAdmission(s,i,'inbound',platform,target,assigned.holder,i.to);
    i.destination=target;i.voicePath={platform,carrier:'carrier'};beginCapture(s,i);
    if(s.resources[target].kind==='endpoint'){const endpoint=config(s,target);if(!endpoint.registered)return finish(s,i,'ENDPOINT_UNREGISTERED');if(!directory.identities.includes(endpoint.identity)||!directory.entitled.includes(endpoint.identity))return finish(s,i,'DESTINATION_ENTITLEMENT');return connectEndpoint(s,i);}
    i.phase='queued';event(s,i,'queue','ENQUEUED',{queue:target});
  }
  function startInteraction(s,c,internal={}){
    if(c.durationMinutes!==undefined&&(!Number.isInteger(c.durationMinutes)||c.durationMinutes<1||c.durationMinutes>120))fail('INVALID_CALL_DURATION');
    if(c.direction!==undefined&&(!['inbound','outbound'].includes(c.direction)||c.channel!=='voice')||c.direction==='inbound'&&(!/^\+[1-9]\d{5,14}$/.test(c.from)||!/^\+[1-9]\d{5,14}$/.test(c.to)||c.intent!==undefined||c.needId!==undefined))fail('INVALID_CALL_DIRECTION');
    if(c.choice!==undefined&&(typeof c.choice!=='string'||!/^\d?$/.test(c.choice)))fail('INVALID_IVR_CHOICE');
    if(!['voice','message'].includes(c.channel)||typeof c.from!=='string'||c.from.length>80||typeof c.to!=='string'||c.to.length>80||!isId(c.caseId)||!['en','ja','fr','de'].includes(c.language||'en')||c.intent!==undefined&&(c.intent!=='test-emergency'||c.channel!=='voice')||c.media!==undefined&&!validMediaInput(c.media)||c.account!==undefined&&(!channels.channels.includes(c.account)||c.channel!=='message')||c.purpose!==undefined&&!['service','transactional','promotional','appointment'].includes(c.purpose)||c.template!==undefined&&!isId(c.template)||c.needId!==undefined&&!isId(c.needId))fail('INVALID_INTERACTION');
    let need=null;if(c.needId){if(!s.outcomes)fail('OUTCOMES_NOT_STARTED');need=s.outcomes.needs.find(n=>n.id===c.needId);if(!need||need.status!=='open'||need.caseId!==c.caseId)fail('OUTCOMES_NEED_UNAVAILABLE');const resolved=canonicalInfo(s,c.from);const canonical=resolved?.canonical||resolved?.person,tenant=resolved?.tenant;if(!canonical||canonical!==need.person||tenant!==need.tenant)fail('OUTCOMES_NEED_IDENTITY_MISMATCH');const active=s.interactions.some(x=>x.needId===need.id&&!['resolved','failed'].includes(x.phase));if(active)fail('OUTCOMES_NEED_BUSY');if(internal.repeat){if(need.repeat.status!=='emitted'||need.repeat.pendingInteractionId!==internal.id||need.repeat.pendingKey!==internal.idempotencyKey)fail('REPEAT_SETTLEMENT_MISMATCH');}else if(need.repeat.status!=='none')fail('OUTCOMES_NEED_BUSY');}
    const account=c.account||'chatterleaf',purpose=c.purpose||'service',template=c.template||({chatterleaf:'service-outside-window',letterbox:'transaction-update',casechat:'case-update',workplace:'case-update'}[account]);
    const interactionId=internal.id||`interaction-${s.nextId++}`;
    const i={id:interactionId,channel:c.channel,...(c.channel==='voice'?{durationMinutes:c.durationMinutes||3}:{}),...(internal.probe?{probe:true}:{}),...(c.direction?{direction:c.direction}:{}),from:c.from,to:c.channel==='voice'&&!s.calling?operations.normalise(s,c.to):c.to,...(s.operations?{dialled:c.to}:{}),...(c.intent?{intent:c.intent}:{}),...(c.media?{mediaInputs:clone(c.media)}:{}),...(c.channel==='message'?{account,purpose,template}:{}),...(c.needId?{needId:c.needId,purpose}:{}),...(internal.repeat?{outcomeIdempotencyKey:internal.idempotencyKey,usageToken:internal.usageToken}:{}),scope:c.scope||'tenant',caseId:c.caseId,language:c.language||'en',phase:'arrival',startedAt:s.clock,fingerprint:fingerprint(s),trace:[],records:[],obligations:[],context:false};
    if(s.contact)i.choice=c.choice||'';
    if(s.interactions.length>=200){const j=s.interactions.findIndex(x=>['resolved','failed'].includes(x.phase)&&!s.providerSiteWork?.some(w=>w.interactionId===x.id)&&![...(s.providerCustodyPins?.pins?.interactionIds||[]),...(s.providerCentralPins?.pins?.interactionIds||[]),...(s.providerProgressionPins?.pins?.interactionIds||[]),...(s.providerRegionalPins?.pins?.interactionIds||[]),...(s.providerInterconnectPins?.pins?.interactionIds||[]),...(s.providerExternalReachPins?.pins?.interactionIds||[]),...(s.providerSupportPins?.interactionIds||[]),...(s.providerCaseHandoffPins?.interactionIds||[]),...(s.providerCaseFollowupPins?.interactionIds||[]),...(s.providerSecurityPins?.interactionIds||[])].includes(x.id));if(j<0)fail('TRACE_CAPACITY');const [removed]=s.interactions.splice(j,1),match=/^interaction-([1-9]\d*)$/.exec(removed?.id||'');if(match)s.tracePrunedThrough=Math.max(s.tracePrunedThrough||0,Number(match[1]));}
    s.interactions.push(i);
    if(c.direction==='inbound'){i.tenant=s.tenant||scenarioTenants[s.scenario];}
    else if(s.calling){
      const identities=s.calling.nodes.directory.effective?.identities||[],exact=identities.filter(x=>x.canonical===c.from),matches=exact.length?exact:identities.filter(x=>x.endpoint===c.from||x.number===c.from||x.aliases.includes(c.from));
      if(matches.length!==1)return finish(s,i,matches.length?'AMBIGUOUS_CALLER':'UNKNOWN_CALLER');
      if(!matches[0].known)return finish(s,i,'UNKNOWN_CALLER');
      if(matches[0].canonical!==c.from)i.requestedFrom=c.from;
      i.from=matches[0].canonical;i.tenant=matches[0].tenant;
    }else{const identity=canonicalInfo(s,i.from);if(identity){i.from=identity.person;i.tenant=identity.tenant;}else if(s.channels||s.outcomes)return finish(s,i,'UNKNOWN_CALLER');}
    if(need&&(i.from!==need.person||i.tenant!==need.tenant))fail('OUTCOMES_NEED_IDENTITY_MISMATCH');
    if(s.providerCustomer)i.providerContext={connected:s.connected};
    const crm=config(s,'cases');
    if(crm&&observe(s,'cases').ready&&crm.identityMapping){
      const prior=s.cases[c.caseId];
      if(prior&&(prior.identity!==i.from||prior.tenant&&i.tenant&&prior.tenant!==i.tenant))fail('CASE_IDENTITY_MISMATCH');
      if(!prior&&Object.keys(s.cases).length>=1000)fail('CASE_CAPACITY');
      s.cases[c.caseId]={identity:i.from,...(i.tenant?{tenant:i.tenant}:{}),interactions:[...(prior?.interactions||[]),i.id].slice(-30)};i.context=true;
    }
    event(s,i,'context',i.context?'CASE_LINKED':'CONTEXT_LOST',{caseId:c.caseId});
    if(s.providerCustomer&&i.channel==='message'&&i.account==='workplace'&&i.context&&s.channels)Object.assign(s,dispatchInternal(s,{type:'channels',command:{action:'open',tenant:i.tenant,person:i.from,channel:'workplace',purpose:i.purpose,caseId:i.caseId}},true,true,true));
    if(c.channel==='voice'){if(i.direction==='inbound')inboundRoute(s,i);else route(s,i);return;}
    if(!productPathReady(s,i,['engage','messages','cases','service'],true))return;
    const w=config(s,'engage'),ch=config(s,w?.channel);
    if(!w||!observe(s,'engage').ready||!ch?.approved||!s.operations&&!ch.templates.includes(w.template))return finish(s,i,'CHANNEL_OR_TEMPLATE');
    if(s.operations&&operations.enqueue(s,i,event,channelOperationHooks(s),finish))return;
    if(s.interactions.filter(x=>x.channel==='message'&&x.startedAt===s.clock&&x!==i&&x.outcome!=='RATE_LIMIT').length>=ch.rateLimit)return finish(s,i,'RATE_LIMIT');
    event(s,i,'delivery','WEBHOOK_ACCEPTED');
    business.meterResource(s,'message',1,['engage',w.channel,'cases']);
    if(w.botResolves){i.botAnswered=true;event(s,i,'automation','BOT_RESOLVED');return finish(s,i,'RESOLVED',true);}
    if(!w.handoff)return finish(s,i,'HANDOFF_LOOP');
    i.destination=w.queue;i.phase='queued';event(s,i,'handoff','HUMAN_HANDOFF',{queue:w.queue});
  }
  function validMediaInput(m){return !!m&&typeof m==='object'&&!Array.isArray(m)&&!Object.keys(m).some(k=>!['codec','encrypted','natOutbound','natInbound','latencyMs','jitterMs','lossPct'].includes(k))&&!Object.entries(m).some(([k,v])=>['encrypted','natOutbound','natInbound'].includes(k)?typeof v!=='boolean':k==='codec'?typeof v!=='string'||v.length>20:typeof v!=='number'||!Number.isFinite(v)||v<0||v>(k==='latencyMs'?5000:k==='jitterMs'?1000:100));}
  function channelAdminContext(s,person,caseId,channel,purpose){
    const info=canonicalInfo(s,person),bound=trustedCase(s,caseId);if(!info||!bound||info.person!==bound.person||info.tenant!==bound.tenant)return null;
    return {tenant:info.tenant,person:info.person,canonicalPerson:info.person,account:channel,channel,purpose,caseId,caseIdentity:bound.person,caseTenant:bound.tenant,authenticatedIdentity:info.person,template:({chatterleaf:'service-outside-window',letterbox:'transaction-update',casechat:'case-update',workplace:'case-update'}[channel]),at:s.clock};
  }
  function channelCommand(s,c){
    const q=c.command;if(!q||typeof q.action!=='string')fail('INVALID_CHANNEL_COMMAND');
    if(q.action==='start'){if(s.channels)fail('CHANNELS_ALREADY_STARTED');if(!business.authorise(s,'messages','configure'))fail('DELEGATION_REQUIRED');if(!s.operations)s.operations=operations.create(s);s.channels=channels.create(s);return;}
    if(!s.channels)fail('CHANNELS_NOT_STARTED');
    if(q.action==='delivery')fail('CHANNEL_RECEIPT_PARENT_ONLY');
    if(['configure','observe','permission','open','pause','resume','read'].includes(q.action)&&!business.authorise(s,'messages','configure'))fail('DELEGATION_REQUIRED');
    let context={};
    if(q.action==='permission'){
      const identity=canonicalInfo(s,q.person);if(!identity||identity.person!==q.person||identity.tenant!==q.tenant)fail('CHANNEL_PERMISSION_IDENTITY_MISMATCH');
    }else if(q.action==='open'){
      context=channelAdminContext(s,q.person,q.caseId,q.channel,q.purpose);if(!context||q.tenant!==context.tenant)fail('CHANNEL_CASE_IDENTITY_MISMATCH');
    }else if(q.action==='pause'||q.action==='resume'){
      const conv=s.channels.conversations.find(x=>x.id===q.conversation);if(!conv)fail('CHANNEL_CONVERSATION_BINDING');
      const person=q.person||conv.person;context=channelAdminContext(s,person,conv.caseId,conv.channel,conv.purpose);if(!context||conv.person!==context.person||conv.tenant!==context.tenant)fail('CHANNEL_CASE_IDENTITY_MISMATCH');
    }else if(q.action==='read'){
      const conv=s.channels.conversations.find(x=>x.id===q.conversation),accepted=s.channels.acceptances.find(x=>x.interaction===q.interaction&&x.conversation===q.conversation);
      if(!conv||!accepted||accepted.person!==conv.person||accepted.tenant!==conv.tenant||accepted.channel!==conv.channel||accepted.caseId!==conv.caseId)fail('CHANNEL_RECEIPT_PARENT_ONLY');
      context={tenant:accepted.tenant,person:accepted.person,canonicalPerson:accepted.person,channel:'message',account:accepted.channel,caseId:accepted.caseId};
    }
    channels.command(s.channels,q,context);
  }
  function outcomesCommand(s,c){
    const q=c.command;if(!q||typeof q.action!=='string')fail('INVALID_OUTCOMES_COMMAND');
    if(q.action==='start'){if(s.outcomes)fail('OUTCOMES_ALREADY_STARTED');if(!business.authorise(s,'cases','configure'))fail('DELEGATION_REQUIRED');s.outcomes=outcomes.create(s);return;}
    if(!s.outcomes)fail('OUTCOMES_NOT_STARTED');
    if(q.action==='need'){
      const bound=trustedCase(s,q.caseId),person=canonicalInfo(s,q.person);if(!bound||!person||bound.person!==q.person||bound.person!==person.person||bound.tenant!==q.tenant||person.tenant!==q.tenant)fail('OUTCOMES_CASE_IDENTITY_MISMATCH');
    }else if(q.action==='task-result'){
      const need=s.outcomes.needs.find(n=>n.id===q.needId),i=s.interactions.find(x=>x.id===q.interactionId);if(!need||!i||i.needId!==need.id||!['arrival','delivery','queued','handling','wrap'].includes(i.phase)||i.caseId!==need.caseId||i.from!==need.person||i.tenant!==need.tenant)fail('OUTCOMES_LIVE_INTERACTION_REQUIRED');
    }
    if(!business.authorise(s,'cases','configure'))fail('DELEGATION_REQUIRED');
    outcomes.command(s,q);
  }
  function advanceMinute(s,providerParent=null){
    s.clock++;
    if(s.providerCampaign)providerCampaign.beforeMinute(s,providerHooks());
    if(s.admissionSecurity)admissionSecurity.advance(s);
    for(const r of Object.values(s.resources))if(r.provisioning.status==='pending'&&r.provisioning.due<=s.clock){
      const errors=dependencies(s,r,r.desired);
      r.provisioning={...r.provisioning,status:errors.length?'failed':'ready',errors};
      if(!errors.length)r.effective=clone(r.desired);
    }
    if(s.providerCustomer&&!s.workforceOps&&s.resources.people.effective?.enabled)s.workforceOps=workforce.create(s);
    if(s.boundaries)boundaries.advance(s,s.clock);
    providerBoundaryObservations(s);
    if(s.productEvidence)productEvidence.advance(s,productEvidenceHooks());
    if(s.mediaNegotiation)mediaNegotiation.advance(s);
    if(s.customerNeeds)customerNeeds.advance(s);
    if(s.speechModels)speechModels.advance(s,speechHooks(s));
    if(s.products)products.advance(s,productHooks(s));
    if(s.providerCustomer)providerProductsAdvance(s);
    if(s.specialistLifecycle)specialistLifecycle.advance(s,lifecycleHooks());
    if(s.transport)transport.advance(s,transportHooks(s));
    if(s.channels)channels.advance(s.channels,s.clock);
    if(s.providerCustomer&&s.channels)for(const account of ['chatterleaf','workplace'])if(s.channels.accounts[account]?.provisioning.status==='ready')channels.command(s.channels,{action:'observe',channel:account,authenticated:observe(s,'identity').ready,providerAvailable:observe(s,'engage').ready&&observe(s,'messages').ready&&(s.connected||!!s.resources.messages.effective?.local),fault:null});

    if(s.operations)operations.advance(s,productServices(s),event,finish,(state,unit,amount)=>business.meterResource(state,unit,amount,['engage',config(state,'engage')?.channel,'cases'].filter(Boolean)),business.authorise,channelOperationHooks(s));
    for(const task of s.providerTasks||[])if(task.kind==='migration'&&task.status==='waiting'){const consolidated=task.mode==='consolidated',dedicated=task.mode==='product-dedicated',target=dedicated?'dedicated-platform':consolidated?'phone':'migration-phone';if(observe(s,target).ready&&(!dedicated||s.products?.deployments.some(d=>d.id==='d-cisco-dedicated-uc'&&d.provisioning.status==='ready'))){operations.command(s,{action:'migration',identities:dedicated?['alex']:consolidated?['alex','bea']:['bea'],target,cutoverAt:s.clock+(consolidated?1:2)},productServices(s),event,finish,channelOperationHooks(s));task.status='submitted';task.migrationId=s.operations.migrations.at(-1).id;}}
    if(s.contact)contact.advance(s,Object.fromEntries(Object.keys(s.resources).map(id=>[id,observe(s,id)])),event,startInteraction);
    if(s.workforceOps)workforce.advance(s);
    if(s.workforceQuality)workforceQuality.advance(s.workforceQuality,s.clock,s,workforceQualityHooks());
    if(s.workforceOffers)for(const invoice of workforceOffers.advance(s.workforceOffers,s.clock,workforceOfferContext(s)))business.externalCost(s,{id:invoice.id,currency:invoice.currency,cents:invoice.cents,reason:invoice.reason,source:'workforce-offers'});
    if(s.calling)calling.advance(s.calling,s.clock,(node,desired)=>{
      const refs=node==='directory'?['identity']:node==='services'?['service']:node==='media'?['phone']:['local','carrier'];
      return refs.every(id=>observe(s,id).ready)&&(!desired.routes||desired.routes.every(r=>observe(s,r.carrier).ready&&observe(s,r.localDependency).ready));
    });
    if(s.siteOperations)siteOperations.advance(s,providerParent?providerSiteHooks(providerParent):siteHooks());
    if(s.mediaNegotiation)for(const session of s.mediaNegotiation.sessions.filter(x=>x.status==='reserved')){
      const i=s.interactions.find(x=>x.id===session.interactionId);if(!i)continue;
      const currentTarget=s.mediaNegotiation.endpoints[session.route.toEndpoint]?.effective?.resourceId;
      let path=session.route;
      if(i.destination&&currentTarget!==i.destination){
        const targets=Object.values(s.mediaNegotiation.endpoints).filter(n=>n.effective?.resourceId===i.destination);
        if(targets.length!==1){finish(s,i,'MEDIA_REROUTE_UNAVAILABLE');continue;}
        path={...path,toEndpoint:targets[0].id};
      }
      const status=mediaNegotiation.preflight(s,path,mediaHooks(i.id));
      if(status.status!=='ready'){finish(s,i,status.blockingReasons[0]||'MEDIA_NEGOTIATION_FAILED');continue;}
      const negotiation=status.negotiation;
      if(path!==session.route||['codecFrom','codecTo','transcoderId'].some(k=>session[k]!==negotiation[k])||JSON.stringify(session.offerModes)!==JSON.stringify(negotiation.offerModes)){
        const changed=mediaNegotiation.reroute(s,i.id,path,mediaHooks(i.id));
        if(!changed.accepted){finish(s,i,'MEDIA_REROUTE_UNAVAILABLE');continue;}
        for(const code of negotiation.offerTrace)event(s,i,'media-offer',code,{path:clone(path),renegotiation:true});
        event(s,i,'media','CODEC_RENEGOTIATED',negotiation);
      }
    }
    if(s.estate)estate.advance(s,estateHooks(s));
    if(s.sharedServices){const step=sharedServices.advance(s,s.clock,sharedHooks());for(const expired of step.expired){const i=s.interactions.find(x=>x.id===expired.interactionId);if(i)finish(s,i,expired.reason);}}
    for(const reservation of [...(s.captureReservations||[])]){
      const recorder=config(s,'recorder');if(observe(s,'recorder').ready&&recorder?.consent&&recorder.identityMapping)continue;
      const interaction=s.interactions.find(i=>i.id===reservation.id);
      if(interaction){interaction.capture.status='interrupted';interaction.capture.endedAt=s.clock;interaction.obligations.push('CAPTURE_INTERRUPTED');event(s,interaction,'capture','CAPTURE_INTERRUPTED');}
      releaseCapture(s,reservation.id);
    }
    for(const i of s.interactions){
      if(i.channel==='voice'&&['queued','handling','connected','shared-active'].includes(i.phase)&&!liveVoiceMedia(s,i))continue;
      if(i.phase==='shared-active'){if(!sharedReady(s,i,i.sharedActor))finish(s,i,'SHARED_MEDIA_OR_ENDPOINT_UNAVAILABLE');else if(s.clock>=i.due){record(s,i);finish(s,i,'CONNECTED',true);}}
      if(i.phase==='handling'&&s.clock>=i.due){if(s.mediaNegotiation)mediaNegotiation.release(s,i.id);i.phase='wrap';let wrap=config(s,i.worker)?.wrapMinutes||0;if(s.providerCustomer&&wrap===0){const available=i.context&&['cases','engage'].every(resourceId=>providerHooks().observe(s,resourceId).ready);if(!available)wrap=1;event(s,i,'workflow',available?'AFTER_CALL_ASSISTANCE_APPLIED':'AFTER_CALL_ASSISTANCE_UNAVAILABLE',{caseId:i.caseId,resources:['cases','engage'],wrapMinutes:wrap});}i.due=s.clock+wrap;if(s.workforceOps)workforce.finish(s,i.workforceAssignment||i.id,wrap);event(s,i,'handling','WRAP_UP',{...(i.agent?{agent:i.agent}:{})});}
      if(i.phase==='wrap'&&s.clock>=i.due){record(s,i);finish(s,i,'RESOLVED',true);}
    }
    for(const i of contact.queued(s)){
      const q=config(s,i.destination),w=config(s,q?.workforce);
      if(!q||!w||!observe(s,i.destination).ready||[i.destination,q.workforce].some(id=>{const gate=productGate(s,id);return gate&&!gate.available;})){event(s,i,'queue','SERVICE_UNAVAILABLE');continue;}
      if(s.clock-(i.queueEnteredAt??i.startedAt)>q.maxWait){finish(s,i,q.callback?'CALLBACK_REQUIRED':'ABANDONED');continue;}
      const busy=s.interactions.filter(x=>x.worker===q.workforce&&['handling','wrap'].includes(x.phase));
      if(s.workforceOps){
        const skill=i.requiredSkill||q.skill,channel=i.channel==='message'?'digital':'voice',snapshot=workforce.effectiveCapacity(s,{channel,skill,language:i.language});
        if(!snapshot.people.length){event(s,i,'workforce',snapshot.reason==='ROSTER_NOT_EFFECTIVE'?'ROSTER_NOT_EFFECTIVE':'SKILL_OR_SHIFT',{skill,language:i.language});continue;}
        if(busy.filter(x=>x.destination===i.destination).length>=q.capacity){event(s,i,'workforce','QUEUE_SESSION_CAPACITY',{queue:i.destination,capacity:q.capacity});continue;}
        const assigned=workforce.admit(s,{interaction:workforceHandle(s,i),channel,skill,language:i.language});i.agent=assigned.person;i.workforceAssignment=assigned.interaction;
      }else{
        const shift=s.clock%1440;
        if(shift<w.shiftStart||shift>=w.shiftEnd||!w.skills.includes(i.requiredSkill||q.skill)||!w.languages.includes(i.language)){event(s,i,'workforce','SKILL_OR_SHIFT');continue;}
        const load=contact.occupied(s,q.workforce)+busy.reduce((a,x)=>a+(x.channel==='message'?1/w.digitalConcurrency:1),0),need=i.channel==='message'?1/w.digitalConcurrency:1;
        if(load+need>Math.min(w.people,w.entitlements)||busy.filter(x=>x.destination===i.destination).length>=q.capacity){event(s,i,'workforce','PEOPLE_OR_ENTITLEMENTS');continue;}
      }
      for(const resourceId of [i.destination,q.workforce]){const gate=productGate(s,resourceId);if(gate?.available)event(s,i,'product','PRODUCT_FEATURE_ACCEPTED',{resource:resourceId,bindings:clone(gate.bindings)});}
      const duration=s.providerCustomer?.externalCollaborationVersion===1&&i.channel==='voice'?Math.max(w.handlingMinutes,i.durationMinutes):w.handlingMinutes;
      i.phase='handling';i.worker=q.workforce;i.due=s.clock+duration+(i.context?0:2);event(s,i,'handling','AGENT_ASSIGNED',{...(i.agent?{agent:i.agent}:{}),...(s.providerCustomer?.externalCollaborationVersion===1&&i.channel==='voice'?{minimumConversationMinutes:i.durationMinutes,handlingMinutes:i.due-s.clock}:{})});
    }
    // Integer cents; one usage entry per simulation minute, never in calculate().
    const billableVoice=s.interactions.filter(i=>i.startedAt<s.clock).filter(i=>['handling','queued','shared-active','parked','connected'].includes(i.phase)&&i.channel==='voice').filter(i=>{if(!s.admissionSecurity?.reservations.some(r=>r.interactionId===i.id))return true;const gate=admissionSecurity.admitUsage(s,i.id);event(s,i,'security',gate.allowed?'SECURITY_USAGE_ADMITTED':'SECURITY_USAGE_BLOCKED',{reason:gate.reason||null,cents:gate.cents||0});if(!gate.allowed)finish(s,i,gate.reason);return gate.allowed;});
    const usage=billableVoice.length;
    const people=config(s,'people'),staff=people&&people.operator!=='customer'?people.people:0;
    const cost=usage*2+staff+Object.values(s.resources).filter(r=>r.effective?.enabled).length;
    const revenue=s.interactions.filter(i=>hasCustomerResolution(i)&&i.finishedAt===s.clock).length*150;
    s.ledger.push({id:'minute-'+s.clock,minute:s.clock,unit:'minute',usage,revenue,cost,...(s.admissionSecurity?{voiceInteractions:billableVoice.map(i=>i.id)}:{})});s.totals.revenue+=revenue;s.totals.cost+=cost;
    if(s.ledger.length>1440)s.ledger.shift();
    for(const i of billableVoice){i.usageMinutes=(i.usageMinutes||0)+1;const routed=i.trace.find(t=>t.code===(i.direction==='inbound'?'ORDERED_INBOUND_ROUTE':'CALL_REQUEST')&&t.platform);business.meterResource(s,'minute',1,[routed?.platform||'phone']);}
    for(const i of s.interactions)if(i.phase==='connected'&&s.clock>=i.due){record(s,i);finish(s,i,'CONNECTED',true);if(hasCustomerResolution(i)){s.ledger.at(-1).revenue+=150;s.totals.revenue+=150;}}
    if(s.information)information.advance(s,informationHooks(s),event,business.meterResource,s.speechModels?(context,request)=>speechModels.processingGate(s,{...context,...request},speechHooks(s)):undefined);
    if(s.business){const services=Object.fromEntries(Object.keys(s.resources).map(id=>[id,observe(s,id)]));
      const q=config(s,'service'),channel=scenarios[s.scenario].channel==='message'?'digital':'voice';
      const snapshot=s.workforceOps&&s.workforceOps.roster.effective?workforce.effectiveCapacity(s,{channel,skill:q?.skill||'service',language:q?.language||'en'}):null;
      const path=s.transport?transport.resourcePath(s,'identity','service',scenarios[s.scenario].channel==='message'?'message':'voice'):null;if(path&&!path.ready)for(const id of scenarios[s.scenario].channel==='message'?['engage','messages','cases']:['phone','carrier'])services[id]={ready:false,reasons:[path.reason]};business.advance(s,services,assess(s),snapshot?{throughput:snapshot.throughput,people:snapshot.people}:null,path?{...path,voiceKbps:transport.profiles.voice.kbps}:null);
    }
    if(s.outcomes){const scheduled=[];outcomes.advance(s,{configReady:()=>true,channelAvailable:(state,need,channel)=>{
      if(channel==='voice')return observe(s,'phone').ready&&observe(s,'service').ready;
      const original=s.interactions.find(i=>i.id===need.attempts.at(-1)?.interactionId);if(!s.channels)return !!original;
      const probe={id:`repeat-probe-${need.id}`,caseId:need.caseId,channel:'message'},context=original&&channelContext(s,{...original,caseId:need.caseId,channel:'message',purpose:original.purpose||'service'});return !!context&&channels.eligibility(s.channels,probe,context).eligible;
    },emitRepeat:(state,request)=>{
      const original=state.interactions.find(i=>i.id===request.repeatOfInteraction);if(!original)return null;const id=`interaction-${state.nextId++}`;scheduled.push({id,request,original});return {interactionId:id};
    }});
      for(const {id,request,original} of scheduled){const c={channel:request.channel,from:request.person,to:request.channel==='voice'?original.to:'service',caseId:request.caseId,language:original.language||'en',purpose:original.purpose||'service',needId:request.needId,...(request.channel==='message'?{account:original.account||'chatterleaf',template:original.template||({chatterleaf:'service-outside-window',letterbox:'transaction-update',casechat:'case-update',workplace:'case-update'}[original.account||'chatterleaf'])}:{})};startInteraction(s,c,{id,repeat:true,idempotencyKey:request.idempotencyKey,usageToken:request.usageToken});}
    }
    if(s.serviceObservation)serviceObservation.advance(s,serviceObservationHooks());
    providerServiceBoundaryObservations(s);
    if(s.portfolio)portfolio.advance(s.portfolio,portfolioHooks(s,!!s.providerCampaign));
    providerServiceBoundaryObservations(s);
    if(s.providerCampaign){providerOwnedSiteAdvance(s);providerCampaign.afterMinute(s,providerHooks());providerSecurityAbuseAdvance(s);syncProviderHandoffPins(s);syncProviderFollowupPins(s);providerOwnedSitePlatformAdvance(s);providerRetainedStorageAdvance(s);providerAutomationAdvance(s);const observation=s.providerCampaign.supportObservation;if(observation){s.providerCampaign.supportObservation=providerProgressionFacts.appendSupportObservation(observation,providerProgressionFacts.sampleSupport(s,providerProgressionHooks(s,false)));}}
    if(s.managedOperations)managedOperations.advance(s,managedHooks());
    if(s.marketQualification)marketQualification.advance(s,marketHooks());
    if(s.campaign)campaign.advance(s,campaignHooks());
  }
  function meeting(s){
    const c=config(s,'room'),d=config(s,c?.directory);
    const reasons=[];
    if(!c||!observe(s,'room').ready)reasons.push('ROOM_UNAVAILABLE');
    if(c){if(!c.calendar)reasons.push('CALENDAR');if(!d?.identities.includes(c.account))reasons.push('ROOM_ACCOUNT');if(c.firmware<2)reasons.push('FIRMWARE');if(!c.microphone||!c.camera)reasons.push('PERIPHERALS');if(c.mode!=='native'&&!c.interop)reasons.push('INTEROPERABILITY');}
    const roomBoundary=boundaryCheck(s,'room');if(roomBoundary&&!roomBoundary.eligible)reasons.push(...roomBoundary.blocking.map(x=>x.code+':'+x.path));
    if(s.transport){const path=transport.resourcePath(s,'identity','room','meeting');if(!path.ready)reasons.push(path.reason);}
    const productRoom=productGate(s,'room');if(productRoom&&!productRoom.available)reasons.push('PRODUCT_FEATURE_UNAVAILABLE:'+productRoom.feature+':'+productRoom.reason);
    return {at:s.clock,revision:s.revision,fingerprint:fingerprint(s),success:!reasons.length,reasons,synthetic:true};
  }
  function assess(s){
    const latest=s.interactions.at(-1),fresh=latest?.fingerprint===fingerprint(s);
    const checks={resolved:!!latest&&hasCustomerResolution(latest)&&fresh,context:!!latest?.context&&fresh,recording:!!latest?.records.some(id=>s.records.some(r=>r.id===id&&r.kind==='recording'&&!r.deleted))&&fresh,transcript:!!latest?.records.some(id=>s.records.some(r=>r.id===id&&r.kind==='transcription'&&!r.deleted))&&fresh,meeting:!!s.lastMeeting?.success&&s.lastMeeting.fingerprint===fingerprint(s),disconnected:!s.connected};
    const required=[...scenarios[s.scenario].required];
    if(s.information&&['enterprise','government'].includes(s.scenario)){checks.processing=!!latest&&s.information.jobs.some(j=>j.interaction===latest.id&&j.status==='complete');required.push('processing');}
    if(s.contact){checks.quality=contact.assess(s);required.push('quality');}
    return {passed:required.every(k=>checks[k])&&(!latest||latest.obligations.length===0),checks,missing:required.filter(k=>!checks[k])};
  }
  function validateState(s,providerParent=null){
    if(!s||s.app!==APP||s.v!==SCHEMA)fail('INCOMPATIBLE_SAVE','Original ISP saves are not communications exercises');
    if(s.providerCustodyPins!==undefined){const marker=s.providerCustodyPins;if(!s.providerCustomer||!marker||Object.keys(marker).sort().join(',')!=='pins,projectId,version'||marker.version!==1||!isId(marker.projectId)||!marker.pins||Object.keys(marker.pins).sort().join(',')!=='caseIds,interactionIds,processingJobIds,recordIds'||Object.values(marker.pins).some(ids=>!Array.isArray(ids)||ids.length>8||ids.some(id=>!isId(id))||new Set(ids).size!==ids.length))fail('INVALID_PROVIDER_CUSTODY_PINS');}
    if(s.providerSecurityAbuse!==undefined&&!s.providerCampaign)fail('INVALID_PROVIDER_SECURITY_ABUSE');
    if(s.providerSecurityPins!==undefined&&!s.providerCustomer)fail('INVALID_PROVIDER_SECURITY_PINS');
    if(s.providerCaseFollowupPins!==undefined){const m=s.providerCaseFollowupPins;if(!s.providerCustomer||!m||Object.keys(m).sort().join(',')!=='caseIds,interactionIds,version'||m.version!==1||['caseIds','interactionIds'].some(k=>!Array.isArray(m[k])||!m[k].length||m[k].length>2400||m[k].some(id=>!isId(id))||new Set(m[k]).size!==m[k].length))fail('INVALID_PROVIDER_CASE_FOLLOWUP_PINS');}
    if(s.providerCaseHandoffPins!==undefined){const m=s.providerCaseHandoffPins;if(!s.providerCustomer||!m||Object.keys(m).sort().join(',')!=='caseIds,interactionIds,version'||m.version!==1||['caseIds','interactionIds'].some(k=>!Array.isArray(m[k])||!m[k].length||m[k].length>2400||m[k].some(id=>!isId(id))||new Set(m[k]).size!==m[k].length))fail('INVALID_PROVIDER_CASE_HANDOFF_PINS');}
    if(s.providerSupportPins!==undefined){const marker=s.providerSupportPins;if(!s.providerCustomer||!marker||Object.keys(marker).sort().join(',')!=='caseIds,interactionIds,jobIds,version'||marker.version!==1||['caseIds','interactionIds','jobIds'].some(key=>!Array.isArray(marker[key])||marker[key].length<1||marker[key].length>2||marker[key].some(id=>!isId(id))||new Set(marker[key]).size!==marker[key].length))fail('INVALID_PROVIDER_SUPPORT_WORK');}
    if(s.providerInterconnectPins!==undefined){const marker=s.providerInterconnectPins;if(!s.providerCustomer||!marker||Object.keys(marker).sort().join(',')!=='pins,receiptId,version'||marker.version!==1||marker.receiptId!=='provider-progression-receipt:'+providerDedicatedInterconnect.SOURCE_ID||!marker.pins||Object.keys(marker.pins).sort().join(',')!=='caseIds,eventIds,interactionIds,jobIds'||Object.values(marker.pins).some(ids=>!Array.isArray(ids)||ids.length>2||ids.some(id=>!isId(id))||new Set(ids).size!==ids.length))fail('INVALID_PROVIDER_INTERCONNECT_PINS');}
    if(s.providerExternalReachPins!==undefined){const marker=s.providerExternalReachPins;if(!s.providerCustomer||!marker||Object.keys(marker).sort().join(',')!=='pins,receiptId,version'||marker.version!==1||marker.receiptId!=='provider-progression-receipt:'+providerExternalReach.SOURCE_ID||!marker.pins||Object.keys(marker.pins).sort().join(',')!=='caseIds,eventIds,interactionIds,jobIds'||Object.values(marker.pins).some(ids=>!Array.isArray(ids)||ids.length>2||ids.some(id=>!isId(id))||new Set(ids).size!==ids.length))fail('INVALID_PROVIDER_EXTERNAL_REACH_PINS');}
    if(s.providerRegionalPins!==undefined){const marker=s.providerRegionalPins,expectedKeys=Object.keys(providerRegionalSupport.retentionPins(null)).filter(key=>marker?.version!==1||key!=='eventIds').sort().join(',');if(!s.providerCustomer||!marker||Object.keys(marker).sort().join(',')!=='pins,receipts,version'||![1,2].includes(marker.version)||!Array.isArray(marker.receipts)||!marker.receipts.length||marker.receipts.length>4||marker.receipts.some(r=>!r||Object.keys(r).sort().join(',')!=='receiptId,sourceId'||!Object.values(providerRegionalSupport.GOALS).includes(r.sourceId)||r.receiptId!=='provider-progression-receipt:'+r.sourceId)||!marker.pins||Object.keys(marker.pins).sort().join(',')!==expectedKeys||Object.values(marker.pins).some(ids=>!Array.isArray(ids)||ids.length>256||ids.some(id=>!isId(id))||new Set(ids).size!==ids.length))fail('INVALID_PROVIDER_REGIONAL_PINS');}
    if(s.providerCentralPins!==undefined){const marker=s.providerCentralPins;if(!s.providerCustomer||!marker||Object.keys(marker).sort().join(',')!=='pins,receipts,version'||marker.version!==1||!Array.isArray(marker.receipts)||!marker.receipts.length||marker.receipts.length>2||marker.receipts.some(r=>!r||Object.keys(r).sort().join(',')!=='receiptId,sourceId'||!['progress.progression-level.5','progress.progression-level.6'].includes(r.sourceId)||r.receiptId!=='provider-progression-receipt:'+r.sourceId)||!marker.pins||Object.keys(marker.pins).sort().join(',')!=='caseIds,incidentIds,interactionIds,jobIds,processingJobIds,projectIds,recordIds'||Object.values(marker.pins).some(ids=>!Array.isArray(ids)||ids.length>64||ids.some(id=>!isId(id))||new Set(ids).size!==ids.length))fail('INVALID_PROVIDER_CENTRAL_PINS');}
    if(s.providerProgressionPins!==undefined){const marker=s.providerProgressionPins;if(!s.providerCustomer||!marker||Object.keys(marker).sort().join(',')!=='pins,receiptId,sourceId,version'||marker.version!==1||marker.sourceId!=='progress.goal.'+'ca'||marker.receiptId!=='provider-progression-receipt:'+marker.sourceId||!marker.pins||Object.keys(marker.pins).sort().join(',')!=='caseIds,incidentIds,interactionIds,jobIds,processingJobIds,projectIds,recordIds'||Object.values(marker.pins).some(ids=>!Array.isArray(ids)||ids.length>6||ids.some(id=>!isId(id))||new Set(ids).size!==ids.length))fail('INVALID_PROVIDER_PROGRESSION_PINS');}
    if(s.experience!==undefined&&(!s.experience||Object.keys(s.experience).sort().join(',')!=='custom,kind,version'||s.experience.version!==1||!['campaign','training','lab'].includes(s.experience.kind)||typeof s.experience.custom!=='boolean'))fail('INVALID_EXPERIENCE');
    if(s.experience?.kind==='campaign'&&!s.providerCampaign&&!s.providerCustomer)fail('CAMPAIGN_STATE_REQUIRED');
    if(s.providerCustomer&&(!isId(s.providerCustomer.id)||s.providerCustomer.version!==1||typeof s.providerCustomer.recording!=='boolean'||s.business||s.providerCampaign||s.experience?.kind!=='campaign'))fail('INVALID_PROVIDER_CUSTOMER');
    if(s.providerCustomer?.externalCollaborationVersion!==undefined&&s.providerCustomer.externalCollaborationVersion!==1)fail('INVALID_PROVIDER_EXTERNAL_COLLABORATION');
    if(s.providerCustomer)for(const session of s.information?.meetingSessions||[]){if(!session.externalGuest)continue;const booking=s.information.bookings.find(b=>b.id===session.bookingId),admission=providerGuestAdmission(s,booking,session);if(!admission.admitted||session.externalGuest.admissionId!==null&&session.externalGuest.admissionId!==admission.admissionId)fail('INVALID_PROVIDER_EXTERNAL_GUEST_ADMISSION');}
    if(s.providerGovernment!==undefined){const p=s.providerGovernment;if(!s.providerCustomer||Object.keys(p).sort().join(',')!=='architectureId,installedAt,lastConnectedAt,postingId,projectId,version'||p.version!==1||!governmentArchitectures.ids().includes(p.architectureId)||!Number.isSafeInteger(p.installedAt)||p.installedAt<0||p.installedAt>s.clock||!Number.isSafeInteger(p.lastConnectedAt)||p.lastConnectedAt<p.installedAt||p.lastConnectedAt>s.clock||!isId(p.projectId)||!isId(p.postingId))fail('INVALID_PROVIDER_GOVERNMENT');}
    if(s.providerResilience!==undefined&&!s.providerCustomer)fail('INVALID_PROVIDER_RESILIENCE_SCOPE');
    if(s.providerResilienceCase!==undefined){const m=s.providerResilienceCase;if(!s.providerCustomer||!s.providerResilience||m.version!==1||Object.keys(m).sort().join(',')!=='caseId,interactionIds,jobId,version'||!isId(m.jobId)||!isId(m.caseId)||!Array.isArray(m.interactionIds)||m.interactionIds.length<1||m.interactionIds.length>3||new Set(m.interactionIds).size!==m.interactionIds.length||m.interactionIds.some(id=>!s.interactions.some(i=>i.id===id&&i.caseId===m.caseId)))fail('INVALID_PROVIDER_RESILIENCE_CASE');}
    if(s.providerReviews!==undefined){if(!s.providerCustomer||!Array.isArray(s.providerReviews)||s.providerReviews.length>100||new Set(s.providerReviews.map(r=>r.interactionId)).size!==s.providerReviews.length)fail('INVALID_PROVIDER_REVIEWS');for(const r of s.providerReviews){const i=s.interactions.find(i=>i.id===r.interactionId),record=s.records.find(x=>x.id===r.recordingId),linked=s.cases[r.caseId];if(Object.keys(r).sort().join(',')!=='agent,at,basis,caseId,criteria,interactionId,postingId,projectId,recordingId,reviewer'||!i||!record||!linked||record.interaction!==i.id||record.kind!=='recording'||!record.access.includes('supervisor')||r.caseId!==i.caseId||r.agent!==i.agent||r.reviewer!=='supervisor'||r.basis!=='observed-service-review-v1'||!Number.isSafeInteger(r.at)||r.at<record.createdAt||r.at>s.clock||JSON.stringify(r.criteria)!==JSON.stringify({completeCapture:record.captureScope!=='partial',caseContinuity:linked.interactions.includes(i.id),delivered:i.phase==='resolved',noOutstandingObligation:i.obligations.length===0}))fail('INVALID_PROVIDER_REVIEWS');}}
    if(s.providerAutomation!==undefined){if(!s.providerCampaign||!Array.isArray(s.providerAutomation)||s.providerAutomation.length>20||new Set(s.providerAutomation.map(p=>p.customerId)).size!==s.providerAutomation.length)fail('INVALID_PROVIDER_AUTOMATION');for(const p of s.providerAutomation){if(p.config!==undefined){validateProviderStandingPolicy(s,p);continue;}const project=s.providerCampaign.projects.find(x=>x.id===p.projectId);if(Object.keys(p).sort().join(',')!=='actions,budgetCents,customerId,projectId,spentCents,status'||!project||project.customerId!==p.customerId||project.operationId!=='automation'||p.budgetCents!==16000||!['active','suspended','budget-exhausted'].includes(p.status)||!Array.isArray(p.actions)||p.actions.length>2||p.spentCents!==p.actions.reduce((n,a)=>n+a.cents,0)||p.spentCents>p.budgetCents)fail('INVALID_PROVIDER_AUTOMATION');for(const a of p.actions){const repair=s.providerCampaign.projects.find(x=>x.id===a.projectId);if(Object.keys(a).sort().join(',')!=='at,cents,incidentId,projectId'||!repair||repair.operationId!=='repair'||repair.customerId!==p.customerId||a.cents!==repair.setupCents||a.at!==repair.acceptedAt||!s.providerCampaign.incidents.some(i=>i.id===a.incidentId&&i.customerId===p.customerId))fail('INVALID_PROVIDER_AUTOMATION_LINEAGE');}}}
    if(s.providerProductTasks!==undefined&&(!s.providerCustomer||!Array.isArray(s.providerProductTasks)||s.providerProductTasks.length>14||new Set(s.providerProductTasks.map(t=>t.recipeId)).size!==s.providerProductTasks.length||s.providerProductTasks.some(t=>!t||Object.keys(t).sort().join(',')!=='createdAt,deploymentId,recipeId,status'||!providerProducts.recipes[t.recipeId]||t.deploymentId!=='d-'+t.recipeId||!['waiting','submitted'].includes(t.status)||!Number.isSafeInteger(t.createdAt)||t.createdAt>s.clock||t.status==='submitted'&&!s.products?.deployments.some(d=>d.id===t.deploymentId))))fail('INVALID_PROVIDER_PRODUCT_TASKS');
    if(s.providerQualification!==undefined){const q=s.providerQualification;if(!s.providerCustomer||Object.keys(q).sort().join(',')!=='at,eventId,expires,organisation,postingId,scenario'||q.organisation!=='orchard-msp'||q.scenario!==s.scenario||q.scenario!=='government'||!Number.isSafeInteger(q.at)||q.at>s.clock||q.expires!==q.at+600||!/^provider-project-[1-9]\d*$/.test(q.eventId)||!/^entry-[1-9]\d*$/.test(q.postingId))fail('INVALID_PROVIDER_QUALIFICATION');}
    if(s.providerTasks!==undefined&&(!s.providerCustomer||!Array.isArray(s.providerTasks)||s.providerTasks.length>20||s.providerTasks.some(t=>!t||Object.keys(t).sort().join(',')!==(t.mode===undefined?'createdAt,kind,migrationId,status':'createdAt,kind,migrationId,mode,status')||t.mode!==undefined&&!['consolidated','product-dedicated'].includes(t.mode)||t.mode==='product-dedicated'&&!s.providerProductTasks?.some(p=>p.recipeId==='cisco-dedicated-uc')||t.kind!=='migration'||!['waiting','submitted'].includes(t.status)||!Number.isSafeInteger(t.createdAt)||t.createdAt>s.clock||t.status==='submitted'&&!s.operations?.migrations.some(m=>m.id===t.migrationId))))fail('INVALID_PROVIDER_TASKS');
    if(s.providerCampaign&&(s.experience?.kind!=='campaign'||s.experience.custom||!s.business||!s.portfolio||!Number.isSafeInteger(s.providerRequestSequence)||s.providerRequestSequence<0))fail('INVALID_PROVIDER_ROOT');
    if(s.pack!==PACK||s.rules!=='fictional-boundaries-1')fail('CONTENT_PACK_UNAVAILABLE');
    if(!ownKey(scenarios,s.scenario)||!jurisdictions.includes(s.jurisdiction)||!['guided','assessed','sandbox'].includes(s.mode)||s.tenant!==undefined&&(!isId(s.tenant)||s.tenant.length>48)||s.customerName!==undefined&&(typeof s.customerName!=='string'||!s.customerName.trim()||s.customerName.length>100))fail('INVALID_SAVE_PROFILE');
    for(const k of ['clock','revision','nextId','seed'])if(!Number.isSafeInteger(s[k])||s[k]<0)fail('INVALID_SAVE_NUMBER',k);
    if(s.tracePrunedThrough!==undefined&&(!Number.isSafeInteger(s.tracePrunedThrough)||s.tracePrunedThrough<0||s.tracePrunedThrough>s.nextId-1))fail('INVALID_TRACE_PRUNE_WATERMARK');
    if(typeof s.connected!=='boolean'||!s.resources||typeof s.resources!=='object'||Array.isArray(s.resources)||Object.keys(s.resources).length>500)fail('INVALID_SAVE_RESOURCES');
    const required={identity:['directory'],access:['connectivity'],phone:['uc','dedicated'],carrier:['trunk'],desk:['endpoint'],people:['workforce'],service:['queue'],messages:['channel'],cases:['crm'],engage:['workflow'],room:['room'],archive:['archive'],recorder:['recorder'],speech:['processor'],local:['infrastructure']};
    for(const [id,kinds] of Object.entries(required))if(!ownKey(s.resources,id)||!kinds.includes(s.resources[id]?.kind))fail('MISSING_CORE_RESOURCE',id);
    for(const [id,r] of Object.entries(s.resources)){
      if(!isId(id)||r.id!==id||!ownKey(catalogue,r.kind))fail('INVALID_SAVE_RESOURCE');
      validateConfig(r.kind,r.desired);if(r.effective)validateConfig(r.kind,r.effective);
      if(!Number.isSafeInteger(r.generation)||!r.provisioning||!['pending','ready','failed'].includes(r.provisioning.status)||!Number.isSafeInteger(r.provisioning.due)||r.provisioning.generation!==r.generation)fail('INVALID_PROVISIONING');
      if(r.fault!==null&&!['OUTAGE','CERTIFICATE_EXPIRED'].includes(r.fault))fail('INVALID_FAULT');
    }
    for(const [k,max] of Object.entries({interactions:200,records:s.recordStore?4000:500,ledger:1440,commands:1000,receipts:1000}))if(!Array.isArray(s[k])||s[k].length>max)fail('INVALID_SAVE_COLLECTION',k);
    informationRecordStore.validate(s);
    if(!s.cases||typeof s.cases!=='object'||Array.isArray(s.cases)||Object.keys(s.cases).length>1000)fail('INVALID_CASES');
    if(!s.totals||!['revenue','cost'].every(k=>Number.isSafeInteger(s.totals[k])&&s.totals[k]>=0))fail('INVALID_TOTALS');
    for(const i of s.interactions)if(!i||!['voice','message'].includes(i.channel)||!['arrival','delivery','queued','handling','wrap','ringing','shared-active','parked','connected','resolved','failed'].includes(i.phase)||!Array.isArray(i.trace)||i.trace.length>80||!Array.isArray(i.records)||!Array.isArray(i.obligations)||!Number.isSafeInteger(i.startedAt)||typeof i.caseId!=='string'||i.mediaInputs!==undefined&&!validMediaInput(i.mediaInputs)||i.intent!==undefined&&!s.calling)fail('INVALID_INTERACTION_STATE');
    for(const i of s.interactions){
      if(i.probe!==undefined&&typeof i.probe!=='boolean')fail('INVALID_PROBE');
      if(i.phase==='connected'&&(i.channel!=='voice'||i.probe||!Number.isInteger(i.durationMinutes)||i.durationMinutes<1||i.durationMinutes>120||!Number.isSafeInteger(i.connectedAt)||i.connectedAt<i.startedAt||i.due!==i.connectedAt+i.durationMinutes||s.resources[i.destination]?.kind!=='endpoint'))fail('INVALID_CONNECTED_SESSION');
      if(i.usageMinutes!==undefined&&(!Number.isSafeInteger(i.usageMinutes)||i.usageMinutes<0))fail('INVALID_USAGE_HISTORY');
      if(!isId(i.id)||typeof i.from!=='string'||typeof i.to!=='string'||typeof i.fingerprint!=='string'||!isId(i.caseId)||i.records.some(x=>!isId(x))||i.obligations.some(x=>typeof x!=='string')||i.trace.some(t=>!t||!Number.isSafeInteger(t.at)||typeof t.stage!=='string'||typeof t.code!=='string'||t.synthetic!==true))fail('INVALID_INTERACTION_STATE');
      for(const row of i.trace){
        if(row.code==='MEDIA_TRANSPORT_ADMITTED'&&row.observation!==undefined){transport.validateObservation(row.observation);if(row.observation.interactionId!==i.id||row.observation.at!==row.at)fail('INVALID_TRANSPORT_OBSERVATION_TRACE');}
        if(row.code==='MEDIA_TRANSPORT_OBSERVED'){
          transport.validateObservation(row.observation);
          if(row.observation.interactionId!==i.id||row.observation.at!==row.at||row.observedFrom!==row.at||!Number.isSafeInteger(row.observedTo)||row.observedTo<row.observedFrom||row.observedTo>s.clock||row.observedMinutes!==row.observedTo-row.observedFrom+1)fail('INVALID_TRANSPORT_OBSERVATION_TRACE');
        }
      }
      if(['ringing','shared-active','parked'].includes(i.phase)&&(!s.sharedServices||!isId(i.sharedLine)||!Number.isSafeInteger(i.due)||!s.sharedServices.occupancy.some(o=>o.interactionId===i.id)))fail('INVALID_SHARED_INTERACTION');
      if(i.agent!==undefined&&(!isId(i.agent)||!s.workforceOps))fail('INVALID_WORKFORCE_ASSIGNMENT');
      if(i.tenant!==undefined&&!isId(i.tenant)||i.requestedFrom!==undefined&&(typeof i.requestedFrom!=='string'||i.requestedFrom.length>80))fail('INVALID_INTERACTION_IDENTITY');
      if(i.direction!==undefined&&(!['inbound','outbound'].includes(i.direction)||i.channel!=='voice')||i.direction==='inbound'&&(!/^\+[1-9]\d{5,14}$/.test(i.from)||!/^\+[1-9]\d{5,14}$/.test(i.to)||i.intent!==undefined||i.needId!==undefined))fail('INVALID_CALL_DIRECTION');
      if(i.direction==='inbound'&&i.phase!=='failed'&&(!i.trace.some(t=>t.code==='INBOUND_NUMBER_ACCEPTED'&&t.number===i.to)||!i.trace.some(t=>t.code==='ORDERED_INBOUND_ROUTE')||!i.trace.some(t=>t.code==='INBOUND_PERMISSION_ACCEPTED')))fail('INVALID_INBOUND_TRACE');
      if(i.intent!==undefined&&i.intent!=='test-emergency')fail('INVALID_INTERACTION_INTENT');
      if(i.account!==undefined&&(!channels.channels.includes(i.account)||i.channel!=='message')||i.purpose!==undefined&&!['service','transactional','promotional','appointment'].includes(i.purpose)||i.template!==undefined&&!isId(i.template)||i.needId!==undefined&&!isId(i.needId)||i.usageToken!==undefined&&!isId(i.usageToken)||i.outcomeIdempotencyKey!==undefined&&!isId(i.outcomeIdempotencyKey)||i.botAnswered!==undefined&&typeof i.botAnswered!=='boolean')fail('INVALID_INTERACTION_CHANNEL_CONTEXT');
      if(['handling','wrap'].includes(i.phase)&&(!Number.isSafeInteger(i.due)||s.resources[i.worker]?.kind!=='workforce'))fail('INVALID_HANDLING_STATE');
      if(['queued','handling','wrap'].includes(i.phase)&&s.resources[i.destination]?.kind!=='queue')fail('INVALID_QUEUE_STATE');
      if(i.needId){const n=s.outcomes?.needs.find(x=>x.id===i.needId),bound=s.cases[i.caseId];if(!n||!bound||i.caseId!==n.caseId||i.from!==n.person||i.tenant!==n.tenant||bound.identity!==n.person||bound.tenant!==n.tenant)fail('INVALID_INTERACTION_NEED_LINK');}
      if(i.needOutcome){const n=s.outcomes?.needs.find(x=>x.id===i.needId),a=n?.attempts.find(x=>x.id===i.needOutcome.attemptId&&x.interactionId===i.id);if(!a||i.needOutcome.outcome!==a.outcome||i.needOutcome.reason!==a.reason)fail('INVALID_INTERACTION_NEED_OUTCOME');}
    }
    for(const [id,c] of Object.entries(s.cases))if(!isId(id)||!c||typeof c.identity!=='string'||c.tenant!==undefined&&!isId(c.tenant)||!Array.isArray(c.interactions)||c.interactions.length>30||c.interactions.some(x=>!isId(x)))fail('INVALID_CASES');
    if(s.captureReservations!==undefined){
      if(!Array.isArray(s.captureReservations)||s.captureReservations.length>400||new Set(s.captureReservations.map(x=>x.id)).size!==s.captureReservations.length)fail('INVALID_CAPTURE_RESERVATIONS');
      for(const row of s.captureReservations){if(!row||!isId(row.id)||row.resource!=='recorder'||!['interaction','meeting'].includes(row.kind)||!Number.isSafeInteger(row.startedAt)||row.startedAt>s.clock)fail('INVALID_CAPTURE_RESERVATION');
        if(row.kind==='interaction'&&!s.interactions.some(i=>i.id===row.id&&!['resolved','failed'].includes(i.phase)&&i.capture?.status==='reserved'))fail('ORPHAN_CAPTURE_RESERVATION');
        if(row.kind==='meeting'&&!s.information?.meetingSessions?.some(x=>x.id===row.id&&['scheduled','active'].includes(x.status)&&x.reservationHeld&&!x.reservationReleased))fail('ORPHAN_MEETING_CAPTURE');
      }
    }
    for(const i of s.interactions)if(i.capture?.status==='reserved'&&!s.captureReservations?.some(r=>r.id===i.id&&r.kind==='interaction'))fail('MISSING_CAPTURE_RESERVATION');
    for(const r of s.records){
      const interaction=s.interactions.find(i=>i.id===r.interaction);
      if(r.captureScope!==undefined&&(r.captureScope!=='partial'||r.kind!=='recording'))fail('INVALID_CAPTURE_SCOPE');
      if(r.kind==='recording'&&!r.parents.length&&interaction?.phase==='failed'&&r.captureScope!=='partial')fail('INVALID_PARTIAL_CAPTURE');
      if(r.captureScope==='partial'&&interaction&&(!interaction.agent||interaction.channel!=='voice'||interaction.phase!=='failed'||interaction.finishedAt!==r.createdAt||!interaction.records.includes(r.id)))fail('INVALID_PARTIAL_CAPTURE');
    }
    for(const r of s.records)if(!r||!isId(r.id)||typeof r.kind!=='string'||!isId(r.interaction)||!Array.isArray(r.parents)||r.parents.some(x=>!isId(x))||!Array.isArray(r.access)||r.access.some(x=>typeof x!=='string')||!jurisdictions.includes(r.region)||!Number.isSafeInteger(r.createdAt))fail('INVALID_RECORD');
    for(const l of s.ledger)if(!l||l.id!=='minute-'+l.minute||l.unit!=='minute'||!['minute','usage','revenue','cost'].every(k=>Number.isSafeInteger(l[k])&&l[k]>=0))fail('INVALID_LEDGER');
    for(const receipt of s.receipts)if(!receipt||!isId(receipt.id)||typeof receipt.command!=='string')fail('INVALID_RECEIPT');
    if(s.lastMeeting!==null&&(!s.lastMeeting||typeof s.lastMeeting.success!=='boolean'||!Array.isArray(s.lastMeeting.reasons)||s.lastMeeting.reasons.some(x=>typeof x!=='string')||typeof s.lastMeeting.fingerprint!=='string'))fail('INVALID_MEETING');
    business.validate(s);operations.validate(s);information.validate(s);contact.validate(s);estate.validate(s);workforce.validate(s);
    if(!s.business&&(s.workforceOps?.commercialCoachingFrom!==undefined||s.workforceOps?.coaching.some(job=>job.commercialReceipt!==undefined)))fail('COACHING_BUSINESS_REQUIRED');
    if(s.workforceQuality){if(!s.business||!s.contact||!s.information||!s.workforceOps||s.workforceQuality.clock!==s.clock||s.workforceQuality.tenant!==(s.tenant||scenarioTenants[s.scenario]))fail('INVALID_QUALITY_ROOT');workforceQuality.validate(s.workforceQuality,s,workforceQualityHooks());if((s.business.qualityCharges||[]).length!==s.workforceQuality.reviews.length)fail('INVALID_QUALITY_BILLING_LINEAGE');}
    if(!s.workforceQuality&&s.business?.qualityCharges?.length)fail('INVALID_QUALITY_BILLING_LINEAGE');
    if(s.workforceOffers){if(!s.business||!s.workforceOps||s.workforceOffers.clock!==s.clock||s.workforceOffers.tenant!==(s.tenant||scenarioTenants[s.scenario]))fail('INVALID_WORKFORCE_OFFER_ROOT');workforceOffers.validate(s.workforceOffers,workforceOfferContext(s));const invoices=(s.business.externalInvoices||[]).filter(x=>x.source==='workforce-offers');if(invoices.length!==s.workforceOffers.nextInvoiceId-1||s.business.balance.cost<invoices.reduce((sum,i)=>sum+i.cents,0)||s.workforceOffers.costRecords.some(r=>!invoices.some(i=>i.id===r.id&&i.cents===r.cents)))fail('INVALID_WORKFORCE_OFFER_BILLING_LINEAGE');for(const invoice of invoices){const row=s.business.ledger.find(l=>l.id===invoice.entryId);if(row){if(row.externalId!==invoice.id||row.cents!==invoice.cents||row.currency!=='AUD'||row.category!=='cost'||row.unit!=='AUD-cent'||row.reason!=='workforce-offers:synthetic Queueberry workforce offer period')fail('INVALID_WORKFORCE_OFFER_BILLING_LINEAGE');}else if(Number(invoice.entryId.slice(6))>(s.business.ledgerPrunedThrough||0))fail('INVALID_WORKFORCE_OFFER_BILLING_LINEAGE');}}
    if(s.customerNeeds!==undefined)customerNeeds.validate(s);
    if(s.speechModels!==undefined){if(!s.products||!s.information)fail('SPEECH_MODELS_DEPENDENCIES_REQUIRED');speechModels.validate(s);}
    if(!s.workforceOffers&&s.business?.externalInvoices?.some(x=>x.source==='workforce-offers'))fail('INVALID_WORKFORCE_OFFER_BILLING_LINEAGE');
    if(s.calling!==undefined)calling.validate(s.calling);
    if(s.products!==undefined){products.validate(s);for(const d of s.products.deployments)for(const c of [d.desired,d.effective].filter(Boolean)){const deployment={id:d.id,desired:c,effective:c};for(const b of c.bindings)if(!productBindingInScope(s,deployment,b,false))fail('INVALID_PRODUCT_BINDING_SAVE');}}
    if(s.workforceOps){for(const a of s.workforceOps.assignments.filter(a=>['voice','digital'].includes(a.status)))if(!s.interactions.some(i=>i.phase==='handling'&&i.agent===a.person&&(i.workforceAssignment||i.id)===a.interaction))fail('ORPHAN_WORKFORCE_ASSIGNMENT');for(const i of s.interactions.filter(i=>i.agent&&['handling','wrap'].includes(i.phase)))if(!s.workforceOps.assignments.some(a=>a.interaction===(i.workforceAssignment||i.id)&&a.person===i.agent&&['voice','digital','wrap'].includes(a.status)))fail('INVALID_WORKFORCE_ASSIGNMENT');}
    if(s.channels!==undefined){if(!s.operations||s.channels.clock!==s.clock)fail('CHANNEL_OPERATIONS_REQUIRED');channels.validate(s.channels);for(const a of s.channels.acceptances){const job=s.operations.jobs.find(j=>j.id===a.parentJob);if(job&&(job.interaction!==a.interaction||job.status!=='accepted'&&job.status!=='delivered'||job.acceptedAt!==a.authorizedAt))fail('INVALID_CHANNEL_PARENT_ACCEPTANCE');}for(const receipt of s.channels.receipts.filter(r=>r.kind==='delivery')){const a=s.channels.acceptances.find(x=>x.interaction===receipt.interaction),job=a&&s.operations.jobs.find(j=>j.id===a.parentJob);if(!a||a.conversation!==null&&a.conversation!==receipt.conversation||a.caseId!==s.channels.conversations.find(c=>c.id===receipt.conversation)?.caseId||job&&(job.status!=='delivered'||job.receiptAt>receipt.at))fail('INVALID_CHANNEL_PARENT_DELIVERY');}}
    if(s.outcomes!==undefined){outcomes.validate(s);for(const n of s.outcomes.needs){const bound=s.cases[n.caseId];if(!bound||bound.identity!==n.person||bound.tenant!==n.tenant)fail('INVALID_OUTCOMES_CASE_LINK');if(n.repeat.status==='emitted'){const pending=s.interactions.find(i=>i.id===n.repeat.pendingInteractionId);if(!pending||pending.needId!==n.id||pending.caseId!==n.caseId||pending.from!==n.person||pending.tenant!==n.tenant||pending.outcomeIdempotencyKey!==n.repeat.pendingKey)fail('INVALID_REPEAT_INTERACTION_LINK');}}}
    transport.validateLeaseHistory(s);
    if(s.transport){transport.validate(s);if(s.providerCustomer){if(!s.providerResilience||s.transport.totalCosts!==0||s.transport.ledger.length)fail('INVALID_PROVIDER_TRANSPORT_TREASURY');}else if(!s.business)fail('TRANSPORT_BUSINESS_REQUIRED');for(const l of s.transport.ledger)if(!s.business.externalInvoices?.some(x=>(x.source===undefined||x.source==='transport')&&x.id===l.id&&x.cents===l.cents))fail('TRANSPORT_INVOICE_NOT_RECONCILED');if(s.business?.externalInvoices?.some(x=>(x.source===undefined||x.source==='transport')&&!s.transport.ledger.some(l=>l.id===x.id&&l.cents===x.cents)))fail('TRANSPORT_INVOICE_NOT_RECONCILED');for(const r of s.transport.reservations)if(!s.interactions.some(i=>i.id===r.id&&['queued','handling','wrap','ringing','shared-active','parked','connected'].includes(i.phase)))fail('TRANSPORT_RESERVATION_ORPHAN');}
    if(s.boundaries){boundaries.validate(s);if(s.boundaries.clock!==s.clock)fail('BOUNDARY_CLOCK_MISMATCH');}
    if(s.admissionSecurity){admissionSecurity.validate(s);for(const row of s.ledger)if(row.voiceInteractions!==undefined&&(!Array.isArray(row.voiceInteractions)||row.voiceInteractions.length!==row.usage||new Set(row.voiceInteractions).size!==row.usage||row.voiceInteractions.some(x=>!isId(x))))fail('INVALID_VOICE_LEDGER');}
    if(s.specialistLifecycle){if(!s.products||!s.business)fail('SPECIALIST_LIFECYCLE_DEPENDENCIES_REQUIRED');specialistLifecycle.validate(s);for(const contract of s.business.contracts)if(!Array.isArray(contract.lifecycleDeployments)||new Set(contract.lifecycleDeployments).size!==contract.lifecycleDeployments.length||contract.lifecycleDeployments.some(id=>!s.products.deployments.some(d=>d.id===id)))fail('INVALID_CONTRACT_LIFECYCLE_LINEAGE');}
    if(s.sharedServices){if(!s.calling)fail('CALLING_PACK_REQUIRED');sharedServices.validate(s,sharedHooks());}
    if(s.serviceObservation)serviceObservation.validate(s);
    if(s.portfolio){portfolio.validate(s.portfolio,portfolioHooks(s));if(JSON.stringify(s.portfolio).length>6000000)fail('PORTFOLIO_SAVE_LIMIT');}
    if(s.marketQualification)marketQualification.validate(s,{hooks:marketHooks()});
    if(s.issueExercises)issueExercises.validate(s);
    if(s.productEvidence){if(!s.products)fail('PRODUCT_EVIDENCE_PRODUCT_STATE_REQUIRED');productEvidence.validate(s);}
    if(s.mediaNegotiation)mediaNegotiation.validate(s);
    if(s.managedOperations){if(!s.portfolio)fail('MANAGED_OPERATIONS_PORTFOLIO_REQUIRED');managedOperations.validate(s);}
    if(s.siteOperations){if(!s.transport||!s.business&&!providerParent?.providerCampaign)fail('SITE_OPERATIONS_DEPENDENCIES_REQUIRED');siteOperations.validate(s);}
    if(s.progression){if(!s.campaign)fail('PROGRESSION_CAMPAIGN_REQUIRED');progression.validate(s);}
    if(s.campaign){campaign.validate(s);for(const snap of Object.values(s.campaign.snapshots))validateState(snap.root);}
    providerContinuity.validate(s);
    providerHistory.validate(s);
    if(s.providerCampaign){providerCampaign.validate(s,providerHooks());validateProviderSecurity(s);validateProviderSecurityAbuse(s);for(const project of s.providerCampaign.projects){if(project.operationId===providerRoomIntegration.OPERATION_ID){if(!providerRoomIntegration.validPlan(project.roomIntegrationPlan)||!providerRoomIntegration.validateProjectEvidence(s,project,providerRoomIntegrationHooks()).valid)fail('INVALID_PROVIDER_ROOM_INTEGRATION_PROJECT');}else if(project.roomIntegrationPlan!==undefined)fail('INVALID_PROVIDER_ROOM_INTEGRATION_PROJECT');}validateProviderDiagnoses(s);validateProviderInterconnects(s);providerCaseHandoff.validate(s,providerHandoffHooks());validateProviderFollowups(s);for(const customer of s.portfolio.customers)if(JSON.stringify(customer.root.providerCaseFollowupPins)!==JSON.stringify(providerFollowupPins(s,customer.id)))fail('INVALID_PROVIDER_CASE_FOLLOWUP_PINS');for(const customer of s.portfolio.customers)if(JSON.stringify(customer.root.providerCaseHandoffPins)!==JSON.stringify(providerHandoffPins(s,customer.id)))fail('INVALID_PROVIDER_CASE_HANDOFF_PINS');providerSupportWork.validate(s);validateProviderNamedSupport(s);validateProviderServiceRetirements(s);validateProviderExitStorage(s);for(const customer of s.providerCampaign.customers){const child=s.portfolio.customers.find(c=>c.id===customer.portfolioId).root;validateProviderResourceAuthority(s,customer,child);validateProviderMeetingCapacity(s,customer,child);providerCapacityAuthority.validateCustomer(s.providerCampaign,customer,child);providerConfigurationAuthority.validateCustomer(s.providerCampaign,customer,child,{catalogue});providerResilience.validateCustomer(s.providerCampaign,customer,child,providerResilienceHooks(s));providerLocalProgression.validateCustomer(s,customer.id,child);if(JSON.stringify(child.providerCustodyPins)!==JSON.stringify(expectedProviderCustodyPins(s,customer.id)))fail('INVALID_PROVIDER_CUSTODY_PINS');}for(const project of s.providerCampaign.projects.filter(p=>providerUcCcIntegration.OPERATION_IDS.includes(p.operationId)&&p.configSubmittedAt!==null)){if(!providerUcCcIntegration.validateProject(s,project.id,providerUcCcHooks(s,project.customerId,s.portfolio.customers.find(c=>c.id===project.customerId)?.root))||project.operationReceipt.submittedAt!==project.configSubmittedAt||project.status==='complete'&&!project.operationReceipt.task)fail('INVALID_PROVIDER_UC_CC_LINEAGE');}for(const project of s.providerCampaign.projects.filter(p=>p.operationId==='service-boundary-review'&&p.configSubmittedAt!==null)){validateProviderServiceBoundaryReceipt(s,project);}const progressionValidationHooks=providerProgressionHooks(s);providerProgressionReceipts.validate(s,progressionValidationHooks);for(const customer of s.providerCampaign.customers){const child=s.portfolio.customers.find(c=>c.id===customer.portfolioId).root,receipt=s.providerCampaign.progressionReceipts?.receipts?.find(r=>r.sourceId==='progress.goal.'+'ca'&&r.customerIds.includes(customer.id)),expected=receipt?{version:1,sourceId:receipt.sourceId,receiptId:receipt.id,pins:providerLocalProgression.retentionPins(receipt.sourceEvidence)}:undefined;if(JSON.stringify(child.providerProgressionPins)!==JSON.stringify(expected))fail('INVALID_PROVIDER_PROGRESSION_PINS');if(JSON.stringify(child.providerCentralPins)!==JSON.stringify(providerCentralPinsFor(s,customer.id)))fail('INVALID_PROVIDER_CENTRAL_PINS');if(!validProviderRegionalPins(child.providerRegionalPins,providerRegionalPinsFor(s,customer.id)))fail('INVALID_PROVIDER_REGIONAL_PINS');if(child.providerExternalReachPins!==undefined&&JSON.stringify(child.providerExternalReachPins)!==JSON.stringify(providerExternalReachPinsFor(s,customer.id)))fail('INVALID_PROVIDER_EXTERNAL_REACH_PINS');}validateProviderEarnedOperations(s);const observation=s.providerCampaign.supportObservation;if(observation!==undefined){const samples=providerProgressionFacts.decodeSupportObservation(observation);if(s.providerCampaign.contentVersion==='provider-campaigns-1'||s.providerCampaign.contentVersion==='provider-campaigns-8'&&observation.version!==3||samples.some((sample,i)=>sample.at>s.clock||i>0&&sample.at!==samples[i-1].at+1)||samples.length&&samples.at(-1).at!==s.clock||!providerProgressionFacts.validateSupportSamples(s,samples,progressionValidationHooks))fail('INVALID_PROVIDER_SUPPORT_OBSERVATION');}validateProviderContinuityLineage(s);for(const c of s.portfolio.customers){for(const deployment of c.root.products?.deployments||[]){const retired=deployment.retirementHistory?.at(-1);if(retired&&!deployment.retirement){const funded=s.providerCampaign.projects.findLast(p=>p.customerId===c.id&&'d-'+p.productId===deployment.id&&!p.retirement),receipt=funded?.operationReceipt;if(!funded||!receipt?.reinstated||funded.acceptedAt<retired.effectiveAt||receipt.generation!==deployment.generation||deployment.generation!==retired.generation+1||receipt.at!==funded.configSubmittedAt-1||receipt.at<funded.acceptedAt+funded.workMinutes-1)fail('INVALID_PROVIDER_RECOMMISSION_LINEAGE');}}const gov=c.root.providerGovernment;if(gov&&!s.providerCampaign.projects.some(p=>p.id===gov.projectId&&p.postingId===gov.postingId&&p.customerId===c.id&&p.operationId===(gov.architectureId==='local-processing'?'compliance-local':'compliance')&&p.configSubmittedAt===gov.installedAt+1))fail('INVALID_PROVIDER_GOVERNMENT_LINEAGE');for(const [receipt,operation] of [[c.root.workforceOps?.providerCover,'bpo'],...(c.root.workforceOps?.coaching||[]).map(j=>[j.providerReceipt,'coaching']),...(c.root.providerReviews||[]).map(r=>[r,'quality'])])if(receipt&&!s.providerCampaign.projects.some(p=>p.id===receipt.projectId&&p.postingId===receipt.postingId&&p.customerId===c.id&&p.operationId===operation))fail('INVALID_PROVIDER_WORKFORCE_LINEAGE');const q=c.root.providerQualification;if(q&&!s.providerCampaign.projects.some(p=>p.id===q.eventId&&p.customerId===c.id&&p.postingId===q.postingId&&providerProducts.recipes[p.operationId]?.preparation?.requests&&p.configSubmittedAt===q.at+1))fail('INVALID_PROVIDER_QUALIFICATION_LINEAGE');}}
    return s;
  }
  const commandFields={configure:['id','config'],add:['id','kind','config'],advance:['minutes'],interact:['durationMinutes','channel','direction','from','to','caseId','language','scope','choice','intent','media','account','purpose','template','needId'],fault:['id','fault'],connect:['connected'],meeting:[],migrate:['identities','target'],restore:['resources'],business:['command'],operations:['command'],information:['command'],contact:['command'],calling:['command'],estate:['command'],workforce:['command'],products:['command'],channels:['command'],outcomes:['command'],transport:['command'],boundaries:['command'],campaign:['command'],portfolio:['command'],'product-evidence':['command'],'media-negotiation':['command'],'managed-operations':['command'],'site-operations':['command'],'specialist-lifecycle':['command'],'shared-services':['command'],'market-qualification':['command'],'service-observation':['command'],'admission-security':['command'],progression:['command'],'issue-exercises':['command'],'speech-models':['command'],'customer-needs':['command'],'workforce-offers':['command'],'workforce-quality':['command']};
  commandFields['copy-to-lab']=['customerId'];commandFields.probe=commandFields.interact;commandFields.provider=['command'];
  function dispatch(state,command){return dispatchInternal(state,command,false);}
  function dispatchInternal(state,command,trusted,owned=false,inTick=false,providerParent=null){
    if(inTick&&(!trusted||!owned||command?.requestId))fail('INVALID_INTERNAL_TICK_COMMAND');
    if(!owned)validateState(state);
    if(!trusted&&(state.providerCustomer||state.providerCampaign&&!['provider','advance','copy-to-lab'].includes(command?.type)))fail('CAMPAIGN_AUTHORING_FORBIDDEN');
    if(!command||!ownKey(commandFields,command.type)||Object.keys(command).some(k=>!['type','expectedRevision','requestId',...commandFields[command.type]].includes(k)))fail('INVALID_COMMAND');
    if(command.requestId!==undefined&&(!isId(command.requestId)))fail('INVALID_REQUEST_ID');
    if(command.requestId){const prior=state.receipts.find(x=>x.id===command.requestId);if(prior){if(prior.command!==JSON.stringify({...command,expectedRevision:undefined}))fail('IDEMPOTENCY_CONFLICT');return clone(state);}}
    if(command.expectedRevision!==undefined&&command.expectedRevision!==state.revision)fail('STALE_COMMAND');
    if(state.providerCampaign&&command.requestId){const n=/^provider-(\d+)$/.exec(command.requestId);if(!n||!Number.isSafeInteger(Number(n[1]))||Number(n[1])<=state.providerRequestSequence)fail('EXPIRED_PROVIDER_REQUEST');}
    if(command.type==='copy-to-lab'){
      if(!state.providerCampaign||!isId(command.customerId))fail('PROVIDER_CUSTOMER_REQUIRED');const row=state.portfolio.customers.find(c=>c.id===command.customerId);if(!row)fail('UNKNOWN_PROVIDER_CUSTOMER');const lab=clone(row.root);lab.experience={version:1,kind:'lab',custom:true};lab.mode='sandbox';lab.labSource={kind:'provider-customer',customerId:row.id,at:state.clock,parentRevision:state.revision};
      for(const key of ['providerCustomer','providerArchive','providerContinuity','providerTasks','providerProductTasks','providerQualification','providerReviews','providerGovernment','providerResilience','providerResilienceCase','providerSupportPins','providerCaseHandoffPins','providerCaseFollowupPins','providerSecurityPins','providerInterconnectPins','providerExternalReachPins','providerProgressionPins','providerCentralPins','providerRegionalPins','providerCustodyPins','providerSiteWork'])delete lab[key];
      if(lab.transport&&!lab.business)lab.business=business.create(lab);
      if(lab.workforceOps){delete lab.workforceOps.providerCover;for(const job of lab.workforceOps.coaching)delete job.providerReceipt;}
      lab.revision++;lab.commands.push({at:lab.clock,revision:lab.revision,command:clone(command)});return validateState(lab);
    }
    const s=owned?{...state}:migrateBusinessSaves(clone(state)),c=command;
    if(s.providerCampaign&&c.requestId)s.providerRequestSequence=Number(c.requestId.slice(9));
    if(c.type==='configure'){
      const r=s.resources[c.id];if(!r||!c.config||typeof c.config!=='object'||Array.isArray(c.config))fail('UNKNOWN_RESOURCE');
      if(!business.authorise(s,c.id,'configure'))fail('DELEGATION_REQUIRED');
      if(!trusted&&r.kind==='workforce'&&r.desired.operator==='customer'&&Object.keys(c.config).some(k=>k!=='enabled'))fail('WORKFORCE_CUSTOMER_CONTROLLED');
      const desired={...r.desired,...clone(c.config)};validateConfig(r.kind,desired);r.desired=desired;r.generation++;r.provisioning={status:'pending',due:s.clock+1,generation:r.generation};
      if(s.operations&&r.id==='phone'&&c.config.carrierModel){const n=s.operations.carrier,mode={managed:'managed',direct:'operator',mobile:'mobile',gateway:'gateway'}[c.config.carrierModel];if(n.desired.mode!==mode){n.desired.mode=mode;n.generation++;n.provisioning={status:'pending',due:s.clock+1,generation:n.generation,errors:[]};}}
    }else if(c.type==='add'){
      if(s.resources[c.id]||Object.keys(s.resources).length>=500)fail('DUPLICATE_OR_LIMIT');s.resources[c.id]=resource(c.id,c.kind,c.config);s.resources[c.id].provisioning.due=s.clock+1;if(s.business)s.business.ownership[c.id]=s.business.player;
    }else if(c.type==='advance'){
      if(!Number.isInteger(c.minutes)||c.minutes<1||c.minutes>1440)fail('INVALID_DURATION');for(let n=0;n<c.minutes;n++){const p=s.providerCampaign,status=p?.status,incidents=new Set(p?.incidents.filter(i=>i.status==='active').map(i=>i.id)||[]),renewals=new Set(p?.customers.filter(x=>x.status==='renewal').map(x=>x.id)||[]);advanceMinute(s,providerParent);if(p&&(p.status!==status||p.incidents.some(i=>i.status==='active'&&!incidents.has(i.id))||p.customers.some(x=>x.status==='renewal'&&!renewals.has(x.id))))break;}
    }else if(c.type==='provider'){if(!s.providerCampaign)fail('PROVIDER_CAMPAIGN_REQUIRED');providerCampaign.command(s,c.command,providerHooks());}
    else if(c.type==='interact')startInteraction(s,c);
    else if(c.type==='probe'){if(c.channel!=='voice')fail('INVALID_PROBE_CHANNEL');startInteraction(s,c,{probe:true});}
    else if(c.type==='fault'){
      if(!s.resources[c.id]||![null,'OUTAGE','CERTIFICATE_EXPIRED'].includes(c.fault))fail('INVALID_FAULT');if(!business.authorise(s,c.id,'fault'))fail('DELEGATION_REQUIRED');s.resources[c.id].fault=c.fault;
    }else if(c.type==='connect'){
      if(typeof c.connected!=='boolean')fail('INVALID_CONNECTIVITY');s.connected=c.connected;
    }else if(c.type==='meeting')s.lastMeeting=meeting(s);
    else if(c.type==='migrate'){
      const target=s.resources[c.target];if(!target||!['uc','dedicated'].includes(target.kind)||!Array.isArray(c.identities)||!c.identities.length||c.identities.some(id=>!config(s,'identity')?.identities.includes(id)))fail('INVALID_COHORT');
      // Versioned change project: identities move only after the target is ready. Old routes stay effective until provisioning.
      if(!observe(s,c.target).ready)fail('TARGET_NOT_READY');
      for(const r of Object.values(s.resources).filter(r=>r.kind==='endpoint'&&c.identities.includes(r.desired.identity))){if(!business.authorise(s,r.id,'migrate'))fail('DELEGATION_REQUIRED');r.desired.scope=target.desired.extensionScope;r.generation++;r.provisioning={status:'pending',due:s.clock+1,generation:r.generation};}
    }else if(c.type==='restore'){
      if(!c.resources||typeof c.resources!=='object'||Array.isArray(c.resources))fail('INVALID_CHECKPOINT');
      for(const [id,conf] of Object.entries(c.resources)){const r=s.resources[id];if(!r)fail('UNKNOWN_RESOURCE');if(!business.authorise(s,id,'configure'))fail('DELEGATION_REQUIRED');validateConfig(r.kind,conf);if(r.kind==='workforce'&&r.desired.operator==='customer'&&Object.keys(conf).some(k=>k!=='enabled'&&JSON.stringify(conf[k])!==JSON.stringify(r.desired[k])))fail('WORKFORCE_CUSTOMER_CONTROLLED');r.desired=clone(conf);r.generation++;r.provisioning={status:'pending',due:s.clock+1,generation:r.generation};}
    }else if(c.type==='business'){lifecycleCommercial(s,c.command);customerCommercial(s,c.command);if(c.command?.action==='qualify'&&s.boundaries){for(const id of s.scenario==='government'?['phone','recorder','archive','speech']:['phone','room','local']){const gate=boundaryCheck(s,id);if(gate&&!gate.eligible)fail('BOUNDARY_QUALIFICATION_REQUIRED:'+id);}}business.command(s,c.command,Object.fromEntries(Object.keys(s.resources).map(id=>[id,observe(s,id)])),assess(s));if(s.specialistLifecycle&&c.command?.action==='order')specialistLifecycle.bindContract(s,s.business.contracts.at(-1),boundLifecycleDeployments(s,s.business.contracts.at(-1).resources));}
    else if(c.type==='operations'){
      if(!['receipt','inbound'].includes(c.command?.action)&&!business.authorise(s,'phone','configure'))fail('DELEGATION_REQUIRED');
      if(c.command?.action==='migration')for(const r of Object.values(s.resources).filter(r=>r.kind==='endpoint'&&c.command.identities?.includes(r.desired.identity)))if(!business.authorise(s,r.id,'migrate'))fail('DELEGATION_REQUIRED');
      if(c.command?.action==='rollback')for(const id of Object.keys(s.operations?.migrations.find(m=>m.id===c.command.migration)?.checkpoint||{}))if(!business.authorise(s,id,'configure'))fail('DELEGATION_REQUIRED');
      operations.command(s,c.command,productServices(s),event,finish,channelOperationHooks(s));
    }else if(c.type==='information'){
      if(['interface','revoke-interface','transfer'].includes(c.command?.action)){
        const node=s.information?.interfaces?.find(n=>n.id===(c.command.interfaceId||c.command.id));
        const resources=new Set([...(c.command.action==='interface'?[c.command.sourceResource,c.command.destinationResource]:[]),...[node?.desired,node?.effective].flatMap(n=>n?[n.sourceResource,n.destinationResource]:[])]);
        for(const id of resources)if(typeof id==='string'&&!business.authorise(s,id,'configure'))fail('DELEGATION_REQUIRED');
      }else{
        const resourceId=['book','cancel','join','schedule','cancel-session'].includes(c.command?.action)||c.command?.kind==='meeting'?'room':'archive';
        if(!business.authorise(s,resourceId,'configure'))fail('DELEGATION_REQUIRED');
      }
      information.command(s,c.command,informationHooks(s),meeting(s),event);
    }else if(c.type==='contact'){
      if(!business.authorise(s,'service','configure'))fail('DELEGATION_REQUIRED');
      if(c.command?.action==='transfer'&&!business.authorise(s,c.command.target,'configure'))fail('DELEGATION_REQUIRED');
      const before=c.command?.action==='transfer'?s.interactions.find(i=>i.id===c.command.interaction):null,sourcePhase=before?.phase,sourceWorker=before?.worker,sourceAssignment=before?.workforceAssignment||before?.id;
      contact.command(s,c.command,Object.fromEntries(Object.keys(s.resources).map(id=>[id,observe(s,id)])),event,finish);
      if(s.workforceOps&&before&&sourcePhase==='handling')workforce.finish(s,sourceAssignment,config(s,sourceWorker)?.wrapMinutes||0);
      if(s.workforceOps&&before&&c.command.mode==='warm'){
        const q=config(s,c.command.target),channel=before.channel==='message'?'digital':'voice',skill=before.requiredSkill||q.skill,request={channel,skill,language:before.language,excludePeople:before.agent?[before.agent]:[]},snapshot=workforce.effectiveCapacity(s,request);
        if(!snapshot.people.length)fail('WARM_TRANSFER_NO_AGENT');
        const assigned=workforce.admit(s,{...request,interaction:workforceHandle(s,before)});before.agent=assigned.person;before.workforceAssignment=assigned.interaction;
      }else if(s.workforceOps&&before&&c.command.mode==='cold'){delete before.agent;delete before.workforceAssignment;}
    }else if(c.type==='calling'){
      if(c.command?.action==='start'){if(s.calling)fail('CALLING_ALREADY_STARTED');if(!business.authorise(s,'phone','configure'))fail('DELEGATION_REQUIRED');s.calling=calling.create();for(const n of Object.values(s.calling.nodes))n.provisioning.due=s.clock+1;}
      else{if(!s.calling)fail('CALLING_NOT_STARTED');const resourceId=c.command?.type==='configure'?({directory:'identity',services:'service',media:'phone',emergency:'local'}[c.command.node]||'phone'):'phone';if(!business.authorise(s,resourceId,'configure'))fail('DELEGATION_REQUIRED');calling.command(s.calling,c.command);}
    }else if(c.type==='estate'){
      if(c.command?.action==='start'){if(s.estate)fail('ESTATE_ALREADY_STARTED');if(!business.authorise(s,'identity','configure'))fail('DELEGATION_REQUIRED');s.estate=estate.create(s);}
      else{if(!s.estate)fail('ESTATE_NOT_STARTED');if(!business.authorise(s,'identity','configure'))fail('DELEGATION_REQUIRED');if(c.command?.action==='transfer'&&s.boundaries){const gate=boundaryCheck(s,'archive'),key=s.boundaries.bindings.archive,policy=s.boundaries.contracts.find(x=>x.id===key)?.effective,flow=policy?.flows.find(f=>f.resource==='archive'),q=c.command;if(!gate?.eligible||!flow||(q.operation==='backup'?flow.backupRegions:flow.storageRegions).includes(q.destinationRegion)===false||!flow.adminLocations.includes(q.administratorRegion)||!flow.keyCustodyRegions.includes(q.keyRegion)||q.access?.some(x=>!flow.accessRoles.includes(x)))fail('BOUNDARY_TRANSFER_NOT_PERMITTED');}estate.command(s,c.command,estateHooks(s));}
    }else if(c.type==='workforce-quality'){
      if(!s.business||!s.contact||!s.information||!s.workforceOps)fail('QUALITY_PREREQUISITES_REQUIRED');
      if(c.command?.action==='start'){if(Object.keys(c.command).join(',')!=='action')fail('INVALID_QUALITY_COMMAND');if(s.workforceQuality)fail('QUALITY_ALREADY_STARTED');if(!s.business.organisations.queueberry)s.business.organisations.queueberry=clone(business.organisations.queueberry);s.workforceQuality=workforceQuality.create({tenant:s.tenant||scenarioTenants[s.scenario],clock:s.clock});}
      else{if(!s.workforceQuality)fail('QUALITY_NOT_STARTED');workforceQuality.command(s.workforceQuality,c.command,s,workforceQualityHooks());}
    }else if(c.type==='workforce-offers'){
      workforceOfferAuthority(s);
      if(c.command?.action==='start'){if(Object.keys(c.command).join(',')!=='action')fail('INVALID_WORKFORCE_OFFER_COMMAND');if(s.workforceOffers)fail('WORKFORCE_OFFERS_ALREADY_STARTED');if(!s.business.organisations.queueberry)s.business.organisations.queueberry=clone(business.organisations.queueberry);s.workforceOffers=workforceOffers.create({tenant:s.tenant||scenarioTenants[s.scenario],clock:s.clock});}
      else{if(!s.workforceOffers)fail('WORKFORCE_OFFERS_NOT_STARTED');workforceOffers.command(s.workforceOffers,c.command,workforceOfferContext(s));}
    }else if(c.type==='workforce'){
      if(c.command?.action==='start'){if(s.workforceOps)fail('WORKFORCE_ALREADY_STARTED');if(!business.authorise(s,'people','configure'))fail('DELEGATION_REQUIRED');s.workforceOps=workforce.create(s);}
      else{if(!s.workforceOps)fail('WORKFORCE_NOT_STARTED');if(['admit','finish'].includes(c.command?.action))fail('WORKFORCE_INTERNAL_ACTION');if(['roster','availability','presence','coach','agreement','staffing-forecast'].includes(c.command?.action)&&!business.authorise(s,'people','configure'))fail('DELEGATION_REQUIRED');workforce.command(s,c.command);if(c.command.action==='coach'&&s.business){const job=s.workforceOps.coaching.at(-1);if(s.workforceOps.commercialCoachingFrom===undefined)s.workforceOps.commercialCoachingFrom=job.id;job.commercialReceipt=business.workforceCoachingCost(s,job);}}
    }else if(c.type==='products'){
      if(c.command?.action==='start'){if(s.products)fail('PRODUCTS_ALREADY_STARTED');if(!business.authorise(s,'phone','configure'))fail('DELEGATION_REQUIRED');s.products=products.create(s);}
      else{if(!s.products)fail('PRODUCTS_NOT_STARTED');if(s.specialistLifecycle&&c.command?.action==='test-integration'){const edge=s.products.integrations.find(x=>x.id===c.command.id);if(edge&&[edge.source,edge.target].some(id=>{const status=specialistLifecycle.deploymentStatus(s,id,lifecycleHooks());return !status.evidenceReady||status.axes?.support!=='supported';}))fail('PRODUCT_LIFECYCLE_EVIDENCE_REQUIRED');}products.command(s,c.command,productHooks(s));}
    }else if(c.type==='customer-needs'){
      if(!business.authorise(s,'identity','configure'))fail('DELEGATION_REQUIRED');customerNeeds.command(s,c.command);
    }else if(c.type==='speech-models'){
      if(c.command?.action==='start'){if(Object.keys(c.command).join(',')!=='action')fail('INVALID_SPEECH_MODELS_COMMAND');if(s.speechModels)fail('SPEECH_MODELS_ALREADY_STARTED');if(!s.products||!s.information)fail('SPEECH_MODELS_DEPENDENCIES_REQUIRED');if(!business.authorise(s,'speech','configure'))fail('DELEGATION_REQUIRED');s.speechModels=speechModels.create(s);}
      else{if(!s.speechModels)fail('SPEECH_MODELS_NOT_STARTED');if(!business.authorise(s,'speech','configure'))fail('DELEGATION_REQUIRED');speechModels.command(s,c.command,speechHooks(s));}
    }else if(c.type==='channels')channelCommand(s,c);
    else if(c.type==='outcomes')outcomesCommand(s,c);
    else if(c.type==='product-evidence'){if(c.command?.action==='start'){if(Object.keys(c.command).join(',')!=='action')fail('INVALID_PRODUCT_EVIDENCE_COMMAND');if(s.productEvidence)fail('PRODUCT_EVIDENCE_ALREADY_STARTED');s.productEvidence=productEvidence.create(s);}else{const ref=c.command?.resourceId||s.productEvidence?.requests.find(r=>r.id===c.command?.id)?.desired.resourceId;if(!ref||!business.authorise(s,ref,'configure'))fail('DELEGATION_REQUIRED');productEvidence.command(s,c.command,productEvidenceHooks());}}
    else if(c.type==='media-negotiation'){if(!business.authorise(s,'phone','configure'))fail('DELEGATION_REQUIRED');if(c.command?.action==='start'){if(Object.keys(c.command).join(',')!=='action')fail('INVALID_MEDIA_NEGOTIATION_COMMAND');if(s.mediaNegotiation)fail('MEDIA_NEGOTIATION_ALREADY_STARTED');s.mediaNegotiation=mediaNegotiation.create(s);}else{const profile=c.command?.config,kind=c.command?.action;if(profile&&['endpoint','carrier'].includes(kind)){const r=s.resources[profile.resourceId];if(!r||!business.authorise(s,r.id,'configure')||kind==='carrier'&&r.kind!=='trunk'||kind==='endpoint'&&!['endpoint','uc','dedicated','queue'].includes(r.kind))fail('MEDIA_RESOURCE_SCOPE');if(kind==='endpoint'){const tenant=r.kind==='endpoint'&&s.calling?s.calling.nodes.directory.effective?.identities.find(x=>x.endpoint===r.id)?.tenant:(s.tenant||scenarioTenants[s.scenario]);if(profile.tenant!==tenant)fail('MEDIA_TENANT_SCOPE');}}mediaNegotiation.command(s,c.command,mediaHooks());}}
    else if(c.type==='managed-operations'){if(c.command?.action==='start'){if(Object.keys(c.command).join(',')!=='action')fail('INVALID_MANAGED_OPERATIONS_COMMAND');if(s.managedOperations)fail('MANAGED_OPERATIONS_ALREADY_STARTED');s.managedOperations=managedOperations.create(s);}else managedOperations.command(s,c.command,managedHooks());}
    else if(c.type==='site-operations'){if(c.command?.action==='start'){if(Object.keys(c.command).join(',')!=='action')fail('INVALID_SITE_OPERATIONS_COMMAND');if(s.siteOperations)fail('SITE_OPERATIONS_ALREADY_STARTED');if(!s.transport||!s.business&&!providerParent?.providerCampaign)fail('SITE_OPERATIONS_DEPENDENCIES_REQUIRED');s.siteOperations=siteOperations.create(s);}else siteOperations.command(s,c.command,providerParent?providerSiteHooks(providerParent):siteHooks());}
    else if(c.type==='specialist-lifecycle'){if(c.command?.action==='start'){if(Object.keys(c.command).join(',')!=='action')fail('INVALID_SPECIALIST_LIFECYCLE_COMMAND');if(s.specialistLifecycle)fail('SPECIALIST_LIFECYCLE_ALREADY_STARTED');if(!s.products||!s.business)fail('SPECIALIST_LIFECYCLE_DEPENDENCIES_REQUIRED');s.specialistLifecycle=specialistLifecycle.create(s);for(const contract of s.business.contracts)specialistLifecycle.bindContract(s,contract,boundLifecycleDeployments(s,contract.resources));}else specialistLifecycle.command(s,c.command,lifecycleHooks());}
    else if(c.type==='shared-services')sharedCommand(s,c.command);
    else if(c.type==='market-qualification'){if(c.command?.action==='start'){if(Object.keys(c.command).join(',')!=='action')fail('INVALID_MARKET_QUALIFICATION_COMMAND');if(s.marketQualification)fail('MARKET_QUALIFICATION_ALREADY_STARTED');s.marketQualification=marketQualification.create(s,marketHooks());}else marketQualification.command(s,c.command,marketHooks());}
    else if(c.type==='admission-security'){if(!business.authorise(s,'carrier','configure'))fail('DELEGATION_REQUIRED');if(c.command?.action==='start'){if(Object.keys(c.command).join(',')!=='action')fail('INVALID_ADMISSION_SECURITY_COMMAND');if(s.admissionSecurity)fail('ADMISSION_SECURITY_ALREADY_STARTED');if(s.interactions.some(i=>i.channel==='voice'&&!['resolved','failed'].includes(i.phase)))fail('SECURITY_ACTIVE_CALLS');s.admissionSecurity=admissionSecurity.create(s);}else admissionSecurity.command(s,c.command);}
    else if(c.type==='service-observation'){if(c.command?.action==='start'){if(Object.keys(c.command).join(',')!=='action')fail('INVALID_SERVICE_OBSERVATION_COMMAND');if(s.serviceObservation)fail('SERVICE_OBSERVATION_ALREADY_STARTED');s.serviceObservation=serviceObservation.create(s);}else serviceObservation.command(s,c.command,serviceObservationHooks());}
    else if(c.type==='portfolio'){if(c.command?.action==='start'){if(Object.keys(c.command).join(',')!=='action')fail('INVALID_PORTFOLIO_COMMAND');if(s.portfolio)fail('PORTFOLIO_ALREADY_STARTED');s.portfolio=portfolio.create({clock:s.clock});}else portfolio.command(s.portfolio,c.command,portfolioHooks(s));}
    else if(c.type==='campaign'){if(c.command?.action==='start'){if(s.campaign)fail('CAMPAIGN_ALREADY_STARTED');s.campaign=campaign.create(s);}else campaign.command(s,c.command,campaignHooks());}
    else if(c.type==='progression'){if(c.command?.action==='start'){if(Object.keys(c.command).join(',')!=='action')fail('INVALID_PROGRESSION_COMMAND');if(s.progression)fail('PROGRESSION_ALREADY_STARTED');s.progression=progression.create(s);}else progression.command(s,c.command,progressionHooks(s));}
    else if(c.type==='issue-exercises'){if(c.command?.action==='start'){if(Object.keys(c.command).join(',')!=='action')fail('INVALID_ISSUE_EXERCISE_COMMAND');if(s.issueExercises)fail('ISSUE_EXERCISES_ALREADY_STARTED');s.issueExercises=issueExercises.create(s);}else issueExercises.command(s,c.command,{dispatchRootCommand:(state,command)=>dispatch(state,command)});}
    else if(c.type==='transport'){if(!business.authorise(s,'access','configure'))fail('DELEGATION_REQUIRED');if(c.command?.action==='start'){if(s.transport)fail('TRANSPORT_ALREADY_STARTED');if(!s.business)s.business=business.create(s);s.transport=transport.create(s);}else transport.command(s,c.command,transportHooks(s));}
    else if(c.type==='boundaries'){if(!business.authorise(s,'archive','configure'))fail('DELEGATION_REQUIRED');if(c.command?.action==='start'){if(s.boundaries)fail('BOUNDARIES_ALREADY_STARTED');s.boundaries=boundaries.create(s);}else boundaries.command(s,c.command);}
    if(s.marketQualification)marketQualification.observe(s,marketHooks());
    if(!inTick){s.revision++;
    s.commands.push({at:s.clock,revision:s.revision,command:clone(c),...(c.type==='transport'&&c.command?.action==='lease-revoke'?{scope:s.tenant||s.scenario,transportGeneration:s.transport.links[c.command.link].generation}:{})});if(s.commands.length>1000)s.commands.shift();}
    if(c.requestId){s.receipts.push({id:c.requestId,command:JSON.stringify({...c,expectedRevision:undefined})});if(s.receipts.length>1000)s.receipts.shift();}
    if(s.providerContinuity)providerContinuity.advance(s);
    providerHistory.compact(s);
    return owned?s:validateState(s,providerParent);
  }
  function reference(s){
    const commands=[];
    if(s.scenario==='smb')commands.push({type:'configure',id:'people',config:{people:2}});
    if(s.scenario==='enterprise')commands.push({type:'configure',id:'recorder',config:{identityMapping:true}},{type:'configure',id:'room',config:{calendar:true}});
    if(s.scenario==='government')commands.push({type:'configure',id:'speech',config:{region:s.jurisdiction}});
    if(s.scenario==='defence')commands.push({type:'configure',id:'local',config:{licensing:true}},{type:'connect',connected:false});
    commands.push({type:'advance',minutes:1},{type:'interact',channel:scenarios[s.scenario].channel,from:'alex',to:'+61255500201',caseId:'reference-case'},{type:'advance',minutes:5},{type:'meeting'});
    return commands;
  }
  // Migrate only owned, structurally validated roots; validation itself stays read-only.
  function migrateBusinessSaves(s){if(s.providerCustomer?.externalCollaborationVersion===1&&s.recordStore===undefined)s.recordStore=informationRecordStore.create();if(s.experience===undefined)s.experience={version:1,kind:s.mode==='sandbox'?'lab':'training',custom:s.mode==='sandbox'};business.migrateLegacy(s);if(s.portfolio)s.portfolio=portfolio.migrateKnown(s.portfolio);for(const row of s.portfolio?.customers||[])migrateBusinessSaves(row.root);for(const snap of Object.values(s.campaign?.snapshots||{}))migrateBusinessSaves(snap.root);if(s.providerCampaign)for(const customer of s.providerCampaign.customers){const child=s.portfolio.customers.find(row=>row.id===customer.portfolioId)?.root,marker=providerExternalReachPinsFor(s,customer.id);if(child&&marker&&child.providerExternalReachPins===undefined)child.providerExternalReachPins=marker;if(child?.providerRegionalPins?.version===1)child.providerRegionalPins=providerRegionalPinsFor(s,customer.id);}return s;}
  function restore(text){if(typeof text!=='string'||text.length>8e6)fail('INVALID_SAVE_SIZE');const s=validateState(JSON.parse(text));return validateState(migrateBusinessSaves(s));}
  const workerSource=()=>providerSecurity.source()+providerIncidentSequence.source()+providerRoomIntegration.source()+providerIncidentDiagnosis.source()+providerFollowupRetryArchive.source()+providerCaseFollowup.source()+providerDedicatedInterconnect.source()+providerCaseHandoff.source()+providerJourneys.source()+providerIntegrationAssurance.source()+providerSupportWork.source()+providerResilience.source()+providerResilienceSequence.source()+providerResilienceProgression.source()+providerLocalProgression.source()+providerCentralProgression.source()+providerOwnedSiteCustody.source()+providerOwnedSiteMission.source()+providerOwnedSites.source()+providerRegionalSupport.source()+providerRegionalIntegrations.source()+providerWorkforceHistory.source()+providerSupportHistory.source()+providerConfigurationAuthority.source()+providerCapacityAuthority.source()+providerUcCcIntegration.source()+providerServiceRetirement.source()+providerServiceBoundary.source()+providerChangePreview.source()+providerResponsibility.source()+providerExternalReach.source()+providerProgressionFacts.source()+providerProgressionReceipts.source()+providerVariants.source()+governmentArchitectures.source()+providerPolicy.source()+providerContinuity.source()+providerDemand.source()+providerHistory.source()+providerProducts.source()+providerRules.source()+providerCampaign.source()+workforceQuality.source()+workforceOffers.source()+customerNeeds.source()+speechModels.source()+productEvidence.source()+managedOperations.source()+mediaNegotiation.source()+capabilityProgression.source()+siteOperations.source()+callingAchievements.source()+specialistLifecycle.source()+sharedServices.source()+marketQualification.source()+admissionSecurity.source()+serviceObservation.source()+portfolio.source()+issueExercises.source()+progression.source()+campaign.source()+transport.source()+boundaries.source()+estate.source()+workforce.source()+calling.source()+products.source()+channels.source()+outcomes.source()+contact.source()+information.source()+operations.source()+business.source()+`const SOC=(${socKernel.toString()})();onmessage=e=>{const {id,state,command}=e.data;try{postMessage({id,revision:state.revision,state:SOC.dispatch(state,command)});}catch(error){postMessage({id,revision:state.revision,error:error.message});}};`;
  return {APP,PACK,SCHEMA,provider,units,catalogue,scenarios,jurisdictions,create,resource,validateConfig,validateState,observe,calculate,dispatch,assess,reference,restore,meeting,workerSource,business,operations,information,contact,estate,workforce,workforceOffers,workforceQuality,calling,products,channels,outcomes,transport,boundaries,campaign,progression,issueExercises,portfolio,serviceObservation,admissionSecurity,sharedServices,marketQualification,specialistLifecycle,siteOperations,capabilityProgression,callingAchievements,productEvidence,managedOperations,mediaNegotiation,speechModels,customerNeeds};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC;
