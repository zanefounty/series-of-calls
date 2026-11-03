const test=require('node:test');
const assert=require('node:assert/strict');
const MCP=require('../scripts/calls-mcp');

let serial=0;
function request(method,params={},id=++serial){return MCP.handle({jsonrpc:'2.0',id,method,params});}
function tool(name,args={},id=++serial){return request('tools/call',{name,arguments:args},id).result;}
function value(result){assert.ok(result?.content?.[0]?.type==='text',JSON.stringify(result));return JSON.parse(result.content[0].text);}
function state(){return value(tool('export_exercise'));}

test('AC-SOC-353 MCP initializes by protocol negotiation and rejects malformed JSON-RPC envelopes',()=>{
 for(const version of MCP.PROTOCOL_VERSIONS){const r=request('initialize',{protocolVersion:version,capabilities:{},clientInfo:{name:'fixture',version:'1'},_meta:{}},`init-${version}`);assert.equal(r.result.protocolVersion,version);assert.equal(r.result.capabilities.tools.listChanged,false);assert.equal(r.result.serverInfo.name,'series-of-calls');}
 assert.equal(request('initialize',{protocolVersion:'future-version'},'future').result.protocolVersion,MCP.PROTOCOL_VERSIONS[0]);
 assert.deepEqual(MCP.handle(null),{jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid Request'}});
 assert.equal(MCP.handle({jsonrpc:'1.0',id:1,method:'ping'}).error.code,-32600);
 assert.equal(MCP.handle({jsonrpc:'1.0',id:{bad:true},method:'ping'}).id,null);
 assert.equal(MCP.handle({jsonrpc:'2.0',id:{bad:true},method:'ping'}).error.code,-32600);
 assert.equal(MCP.handle({jsonrpc:'2.0',id:2,method:'ping',params:[]}).error.code,-32600);
 assert.equal(MCP.handle({jsonrpc:'2.0',id:2,method:'ping',params:null}).error.code,-32600);
 assert.equal(MCP.handle({jsonrpc:'2.0',id:2,method:'ping',unexpected:true}).error.code,-32600);
 assert.deepEqual(request('ping',{_meta:{}},'ping-meta').result,{});
 assert.equal(request('initialize',{protocolVersion:'2025-11-25',unknown:true},'bad-init').error.code,-32602);
 assert.equal(request('no_such_method',{},'unknown').error.code,-32601);
 assert.equal(MCP.handleLine('{').error.code,-32700);
 assert.equal(MCP.handleLine('null').error.code,-32600);
 assert.equal(MCP.handle([]).error.code,-32600);
});

test('AC-SOC-354 tool list schemas describe the five implemented tools and reject invalid arguments',()=>{
 const listed=request('tools/list',{},'list').result.tools;
 assert.deepEqual(listed.map(t=>t.name),['new_exercise','inspect','command','export_exercise','import_exercise']);
 MCP.tools[0].name='mutated-export';assert.deepEqual(request('tools/list',{},'list-after-mutation').result.tools.map(t=>t.name),['new_exercise','inspect','command','export_exercise','import_exercise']);
 const create=listed.find(t=>t.name==='new_exercise').inputSchema;
 assert.equal(create.additionalProperties,false);assert.equal(create.properties.scenario.type,'string');assert.deepEqual(create.properties.scenario.enum,['smb','enterprise','government','defence']);
 assert.equal(listed.find(t=>t.name==='command').inputSchema.required.includes('command'),true);
 assert.deepEqual(listed.find(t=>t.name==='import_exercise').inputSchema.required,['json']);
 const before=state();
 for(const [name,args] of [['inspect',{extra:true}],['export_exercise',{extra:true}],['new_exercise',{unknown:true}],['new_exercise',{scenario:'real-world'}],['new_exercise',{scenario:['smb']}],['new_exercise',{mode:3}],['command',{command:null}],['import_exercise',{json:{}}]])assert.equal(tool(name,args).isError,true,`${name} accepts ${JSON.stringify(args)}`);
 assert.deepEqual(state(),before,'invalid inputs must leave the session root unchanged');
 assert.equal(request('tools/call',{name:'missing_tool',arguments:{}},'tool-missing').result.isError,true);
 assert.equal(request('tools/call',{name:'inspect',arguments:[],unexpected:true},'bad-call').error.code,-32602);
 assert.equal(request('tools/call',{name:'inspect',arguments:{},_meta:{}},'call-meta').result.isError,undefined);
});

test('AC-SOC-355 new exercises cover all four scenario tracks and round trip through validated export/import',()=>{
 const scenarios=['smb','enterprise','government','defence'],jurisdictions=['AU','US','JP','EU'];
 for(let n=0;n<scenarios.length;n++){
  const scenario=scenarios[n],jurisdiction=jurisdictions[n];
  tool('new_exercise',{scenario,jurisdiction,mode:'assessed'});
  let s=state();assert.equal(s.app,'series-of-calls');assert.equal(s.pack,'soc-foundation-1');assert.equal(s.v,1);assert.equal(s.scenario,scenario);assert.equal(s.jurisdiction,jurisdiction);assert.equal(s.mode,'assessed');
  const serialized=JSON.stringify(s);assert.equal(tool('import_exercise',{json:serialized}).isError,undefined);assert.deepEqual(state(),s);
 }
});

test('AC-SOC-356 validated commands are atomic, revision checked and idempotent on retry',()=>{
 tool('new_exercise',{scenario:'smb'});
 let r=value(tool('command',{command:{type:'advance',minutes:1,expectedRevision:0,requestId:'tick-one'}}));
 assert.equal(r.state.clock,1);assert.equal(r.state.revision,1);
 const retry=value(tool('command',{command:{type:'advance',minutes:1,expectedRevision:0,requestId:'tick-one'}}));assert.equal(retry.state.clock,1);assert.equal(retry.state.revision,1);
 const before=state();
 assert.equal(tool('command',{command:{type:'advance',minutes:1,expectedRevision:0}}).isError,true);
 assert.equal(tool('command',{command:{type:'not-a-command'}}).isError,true);
 assert.deepEqual(state(),before,'rejected commands must not replace the live root');
});

test('AC-SOC-357 invalid imports are atomic and tool notifications never execute mutations',()=>{
 tool('new_exercise',{scenario:'defence',jurisdiction:'EU'});const before=state();
 for(const json of ['{','{}',JSON.stringify({app:'series-of-tubes',S:{}}), 'x'.repeat(8000001)])assert.equal(tool('import_exercise',{json}).isError,true);
 assert.equal(MCP.handle({jsonrpc:'2.0',method:'tools/call',params:{name:'new_exercise',arguments:{scenario:'enterprise'}}}),undefined);
 assert.equal(MCP.handle({jsonrpc:'2.0',method:'notifications/initialized',params:{}}),undefined);
 assert.deepEqual(state(),before,'notification-shaped tool calls must be ignored');
 assert.equal(MCP.handle({jsonrpc:'2.0',id:4,method:'notifications/initialized'}).error.code,-32600);
});


test('AC-SOC-406 MCP discovers the speech pack and enforces its prerequisite and save boundaries',()=>{
 tool('new_exercise',{scenario:'enterprise'});const before=state();
 assert.equal(value(tool('inspect')).packs.speechModels.version,'soc-speech-models-1');
 assert.equal(tool('command',{command:{type:'speech-models',command:{action:'start'}}}).isError,true);assert.deepEqual(state(),before);
 for(const type of ['products','information','speech-models'])assert.equal(tool('command',{command:{type,command:{action:'start'}}}).isError,undefined);
 const saved=state();assert.equal(saved.speechModels.pack,'soc-speech-models-1');assert.equal(value(tool('inspect')).observed.speechModels.pack,saved.speechModels.pack);
 assert.equal(tool('import_exercise',{json:JSON.stringify(saved)}).isError,undefined);assert.deepEqual(state(),saved);
});
