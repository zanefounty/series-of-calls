/* Every URL is scoped to this application, including project-path hosting. */
const CACHE='series-of-calls-__VERSION__-__BUILD_HASH__';
const BASE=self.registration.scope;
const CORE=['./','index.html','site.webmanifest','favicon.svg','images/launch-640.webp','images/launch-1280.webp','images/smb-640.webp','images/smb-1280.webp','images/enterprise-640.webp','images/enterprise-1280.webp','images/government-640.webp','images/government-1280.webp','images/defence-640.webp','images/defence-1280.webp','images/sp-640.webp','images/sp-1280.webp','apple-touch-icon.png','icon-192.png','icon-512.png','icon-maskable-512.png','favicon.ico','i18n/it.js?v=__VERSION__','i18n/pt.js?v=__VERSION__','i18n/fr.js?v=__VERSION__','i18n/es.js?v=__VERSION__','i18n/de.js?v=__VERSION__'].map(p=>new URL(p,BASE).href);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('series-of-calls-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url);if(req.method!=='GET'||!url.href.startsWith(BASE)||url.pathname.endsWith('/version.json'))return;
 e.respondWith(caches.open(CACHE).then(async cache=>{
  const cached=await cache.match(req);if(cached)return cached;
  if(req.mode==='navigate'){
   const shell=await cache.match(new URL('index.html',BASE).href)||await cache.match(BASE);
   if(shell)return shell;
  }
  try{const response=await fetch(req);if(response.ok)await cache.put(req,response.clone());return response;}
  catch(error){return Response.error();}
 }));
});
