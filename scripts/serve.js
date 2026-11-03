#!/usr/bin/env node
/* Dependency-free preview of the compiled GitHub Pages project path. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.xml':'application/xml; charset=utf-8','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
function handler(directory,{basePath='/series-of-calls/'}={}){
 const root=fs.realpathSync(directory);if(!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(basePath))throw Error('Invalid preview base path');
 return (req,res)=>{
  const end=(status,text,headers={})=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store',...headers});res.end(req.method==='HEAD'?undefined:text);};
  if(!['GET','HEAD'].includes(req.method))return end(405,'Use GET or HEAD.',{Allow:'GET, HEAD'});
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return end(400,'Invalid URL.');}
  if(pathname.includes('\0')||pathname.includes('\\'))return end(400,'Invalid path.');
  if(basePath!=='/'&&(pathname==='/'||pathname===basePath.slice(0,-1)))return end(302,'Open the project preview.',{Location:basePath});
  if(!pathname.startsWith(basePath))return end(404,'Not found.');
  const relative=pathname.slice(basePath.length)||'index.html',file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep))return end(404,'Not found.');
  let actual;try{actual=fs.realpathSync(file);if(!actual.startsWith(root+path.sep)||!fs.statSync(actual).isFile())return end(404,'Not found.');}catch{return end(404,'Not found.');}
  const body=fs.readFileSync(actual);res.writeHead(200,{'Content-Type':MIME[path.extname(actual)]||(path.basename(actual)==='LICENSE'||path.basename(actual)==='NOTICE'?'text/plain; charset=utf-8':'application/octet-stream'),'Content-Length':body.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
 };
}
function start({directory=path.join(ROOT,'_site'),port=8080,host='127.0.0.1',basePath='/series-of-calls/'}={}){
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('PORT must be an integer from 0 to 65535.');
 if(!fs.existsSync(path.join(directory,'index.html')))throw Error('Compiled site not found. Run npm run build first.');
 const server=http.createServer(handler(directory,{basePath}));
 server.on('error',error=>{console.error(`Series of Calls preview could not listen on ${host}:${port}: ${error.code||error.message}. ${['EPERM','EACCES'].includes(error.code)?'This session denies the required socket; run in a terminal that permits localhost serving.':''}`.trim());process.exitCode=1;});
 server.listen(port,host,()=>console.log(`Series of Calls preview: http://${host}:${server.address().port}${basePath}`));return server;
}
module.exports={handler,start};
if(require.main===module){try{start({port:process.env.PORT===undefined?8080:Number(process.env.PORT),host:process.env.HOST||'127.0.0.1'});}catch(error){console.error(error.message);process.exitCode=1;}}
