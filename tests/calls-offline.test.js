const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('project-scoped cache serves navigation offline and preserves other application caches',async()=>{
 const handlers={},stores=new Map(),base='https://example.invalid/series-of-calls/';let online=true;
 const key=x=>typeof x==='string'?x:x.url;
 const caches={async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);},async open(name){if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return {
  async addAll(urls){for(const u of urls){assert.ok(u.startsWith(base));store.set(u,new Response('shell '+u));}},
  async put(req,res){store.set(key(req),res.clone());},async match(req){return store.get(key(req))?.clone();}
 };}};
 stores.set('unrelated-app',new Map());stores.set('series-of-calls-old',new Map());
 const context={URL,Response,caches,fetch:async req=>{if(!online)throw new Error('offline');return new Response('network '+key(req));},self:{registration:{scope:base},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,fn)=>handlers[name]=fn}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../site/sw.js'),'utf8').replaceAll('__VERSION__','test'),context);
 let work;handlers.install({waitUntil:p=>work=p});await work;handlers.activate({waitUntil:p=>work=p});await work;
 assert.equal(stores.has('unrelated-app'),true);assert.equal(stores.has('series-of-calls-old'),false);
 const fetchEvent=(url,mode='cors')=>{let response;handlers.fetch({request:{url,method:'GET',mode},respondWith:p=>response=p});return response;};
 assert.match(await (await fetchEvent(base+'index.html')).text(),/^network /);
 online=false;assert.match(await (await fetchEvent(base+'index.html')).text(),/^network /);
 assert.match(await (await fetchEvent(base+'lesson/deep','navigate')).text(),/^network /);
 assert.equal(fetchEvent('https://example.invalid/another-app/'),undefined);
 assert.equal(fetchEvent(base+'version.json'),undefined,'release checks must not be answered by stale cached metadata');
 assert.equal((await fetchEvent(base+'missing.js')).type,'error');
});
