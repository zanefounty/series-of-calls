const test=require('node:test');
const assert=require('node:assert/strict');
const SP=require('../scripts/mcp');

let serial=0;
const request=(method,params={},id=++serial)=>SP.handle({jsonrpc:'2.0',id,method,params});
const tool=(name,args={},id=++serial)=>request('tools/call',{name,arguments:args},id);
const text=result=>JSON.parse(result.result.content[0].text);

test('AC-SOC-358 legacy SP MCP rejects invalid envelopes and preserves its unknown-tool error code',()=>{
 assert.equal(SP.handle(null).error.code,-32600);
 assert.equal(SP.handle([]).error.code,-32600);
 assert.equal(SP.handle({jsonrpc:'1.0',id:1,method:'ping'}).error.code,-32600);
 assert.equal(SP.handle({jsonrpc:'2.0',id:{bad:true},method:'ping'}).id,null);
 assert.equal(SP.handle({jsonrpc:'2.0',id:1,method:'ping',params:null}).error.code,-32600);
 assert.equal(SP.handle({jsonrpc:'2.0',id:1,method:'ping',extra:true}).error.code,-32600);
 assert.equal(request('tools/call',{name:'unknown'},{bad:true}).error.code,-32600);
 assert.equal(request('tools/call',{name:'unknown'},'unknown-tool').error.code,-32602);
 assert.equal(request('resources/list',{},'unknown-method').error.code,-32601);
 assert.equal(SP.handleLine('{').error.code,-32700);
 assert.equal(SP.handleLine('null').error.code,-32600);
});

test('AC-SOC-359 id-less tool calls and notifications never mutate the loaded SP game or write stdout',()=>{
 const started=tool('new_game',{city:'nyc',name:'Protocol Fixture',seed:18});assert.equal(started.result.isError,undefined);
 const before=text(tool('status')).home;assert.equal(before,'New York');
 assert.equal(tool('status',{extra:true}).result.isError,true);
 assert.equal(tool('new_game',{city:'sin',extra:'unsupported'}).result.isError,true);
 assert.equal(tool('city',{}).result.isError,true);
 assert.equal(text(tool('status')).home,before,'schema failures must happen before the action runs');
 const writes=[],original=process.stdout.write;
 process.stdout.write=function(chunk,...args){writes.push(String(chunk));return true;};
 let ignored,notification;
 try{
  ignored=SP.handle({jsonrpc:'2.0',method:'tools/call',params:{name:'new_game',arguments:{city:'sin',name:'Must Not Start'}}});
  notification=SP.handle({jsonrpc:'2.0',method:'notifications/initialized'});
 }finally{process.stdout.write=original;}
 assert.equal(ignored,undefined);assert.equal(notification,undefined);assert.deepEqual(writes,[]);
 assert.equal(text(tool('status')).home,before);
 const nullId=SP.handle({jsonrpc:'2.0',id:null,method:'tools/call',params:{name:'new_game',arguments:{city:'sin'}}});
 assert.equal(nullId.error.code,-32600);assert.equal(text(tool('status')).home,before);
 assert.equal(SP.handle({jsonrpc:'2.0',id:10,method:'notifications/initialized'}).error.code,-32600);
});

test('AC-SOC-360 SP initialization negotiates supported versions and tool errors remain in-band',()=>{
 for(const protocolVersion of SP.VERSIONS){const r=request('initialize',{protocolVersion,capabilities:{},clientInfo:{name:'sp-fixture',version:'1'}});assert.equal(r.result.protocolVersion,protocolVersion);assert.equal(r.result.serverInfo.name,'series-of-calls-sp');}
 assert.equal(request('initialize',{protocolVersion:'future'}).result.protocolVersion,SP.VERSIONS[0]);
 assert.equal(tool('network',{network:'not-a-network'}).result.isError,true);
 assert.equal(tool('status').result.isError,undefined);
});
