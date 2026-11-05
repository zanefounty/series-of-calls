const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');

test('project-scoped cache serves cached app pages before network and preserves uncached network behavior',{timeout:3000},async()=>{
 const handlers={},stores=new Map(),base='https://example.invalid/series-of-calls/';let fetchMode='online';const fetchCalls=[];
 const key=x=>typeof x==='string'?x:x.url;
 const caches={async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);},async open(name){if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return {
  async addAll(urls){for(const u of urls){assert.ok(u.startsWith(base));store.set(u,new Response('shell '+u));}},
  async put(req,res){store.set(key(req),res.clone());},async match(req){return store.get(key(req))?.clone();}
 };}};
 stores.set('unrelated-app',new Map());stores.set('series-of-calls-old',new Map());
 const context={URL,Response,caches,fetch:async req=>{fetchCalls.push(key(req));if(fetchMode==='hang')return new Promise(()=>{});if(fetchMode==='offline')throw new Error('offline');return new Response('network '+key(req));},self:{registration:{scope:base},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,fn)=>handlers[name]=fn}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../site/sw.js'),'utf8').replaceAll('__VERSION__','test'),context);
 let work;handlers.install({waitUntil:p=>work=p});await work;handlers.activate({waitUntil:p=>work=p});await work;
 assert.equal(stores.has('unrelated-app'),true);assert.equal(stores.has('series-of-calls-old'),false);
 const fetchEvent=(url,mode='cors',method='GET')=>{let response;handlers.fetch({request:{url,method,mode},respondWith:p=>response=p});return response;};
 const quickly=async promise=>{
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('cached response waited for network')),250);})]);}
  finally{clearTimeout(timer);}
 };

 // Installed application pages and assets win immediately, even if a network
 // request would remain unresolved rather than fail promptly.
 fetchMode='hang';const beforeCached=fetchCalls.length;
 assert.equal(await quickly(fetchEvent(base+'index.html').then(response=>response.text())),'shell '+base+'index.html');
 assert.equal(await quickly(fetchEvent(base).then(response=>response.text())),'shell '+base);
 assert.equal(await quickly(fetchEvent(base+'i18n/it.js?v=test').then(response=>response.text())),'shell '+base+'i18n/it.js?v=test');
 assert.equal(await quickly(fetchEvent(base+'training/lesson/intro','navigate').then(response=>response.text())),'shell '+base+'index.html');
 assert.equal(fetchCalls.length,beforeCached,'cache hits and navigation fallback do not start a network request');

 // An uncached asset can still load online and becomes available from cache
 // on later requests. A genuinely uncached offline asset fails without a hang.
 fetchMode='online';
 const asset=base+'assets/new-release.js';
 assert.equal(await (await fetchEvent(asset)).text(),'network '+asset);
 fetchMode='hang';
 assert.equal(await quickly(fetchEvent(asset).then(response=>response.text())),'network '+asset);
 fetchMode='offline';
 assert.equal((await fetchEvent(base+'assets/not-cached.js')).type,'error');

 // Requests outside the app scope, non-GET requests, and version metadata are
 // deliberately left to the browser/network for fresh release information.
 const beforeUnhandled=fetchCalls.length;
 assert.equal(fetchEvent('https://example.invalid/another-app/'),undefined);
 assert.equal(fetchEvent(base+'index.html','cors','POST'),undefined);
 assert.equal(fetchEvent(base+'version.json'),undefined,'release checks must not be answered by stale cached metadata');
 assert.equal(fetchCalls.length,beforeUnhandled);
});
