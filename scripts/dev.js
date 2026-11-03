#!/usr/bin/env node
// Development server: http://localhost:8080 (PORT=… to change). The page is assembled from src/ on every
// request, static files come straight from site/, and the browser reloads itself when you save a file.
// The page is not version-stamped, so the game runs in dev mode (IS_DEV) like a local copy always has.
// No dependencies: plain node:http. For the production build as GitHub Pages will serve it: npm run serve.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { assemble, ROOT } = require('./lib/page');

const PORT = process.env.PORT === undefined ? 8080 : Number(process.env.PORT);
const HOST = process.env.HOST || '127.0.0.1';
if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) throw new Error('PORT must be an integer from 0 to 65535.');
const SITE = path.join(ROOT, 'site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json' };
const RELOAD = '<script>new EventSource("/__dev").onmessage=()=>location.reload()</script>';
const clients = new Set();

function page() {
  const { html, map } = assemble();
  // Errors report a line of the assembled page; the console also says which file under src/ that is.
  const hint = `<script>addEventListener('error',e=>{const n=e.lineno,m=n&&(${JSON.stringify(map)}).find(m=>n>=m.from&&n<=m.to);if(m)console.warn('↑ src/'+m.file+':'+(n-m.from+1))});</script>`;
  return html.replace('</body>', `${hint}${RELOAD}</body>`);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/__dev') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
    res.write(': hi\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  try {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'content-type': TYPES['.html'], 'cache-control': 'no-store' });
      return res.end(page());
    }
    if (['/LICENSE','/NOTICE','/THIRD_PARTY_NOTICES.md'].includes(url.pathname)) {
      res.writeHead(200, {'content-type':'text/plain; charset=utf-8','cache-control':'no-store'});
      return res.end(fs.readFileSync(path.join(ROOT,url.pathname.slice(1))));
    }
    const file = path.join(SITE, path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\]|\.\.)+/, ''));
    if (!file.startsWith(SITE + path.sep) || !fs.statSync(file, { throwIfNoEntry: false })?.isFile()) {
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      return res.end(fs.readFileSync(path.join(SITE, '404.html')));
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(String(e && e.stack || e));
  }
});
server.on('error', error => { console.error(`Series of Calls dev server could not listen on ${HOST}:${PORT}: ${error.code || error.message}. Run in a terminal that permits localhost serving.`); process.exitCode = 1; });
server.listen(PORT, HOST, () => {
console.log(`Series of Calls (dev): http://${HOST}:${server.address().port}/ — edits in src/ and site/ reload the page`);

let timer = null;
for (const dir of ['src', 'site']) {
  fs.watch(path.join(ROOT, dir), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => { for (const c of clients) c.write('data: reload\n\n'); }, 100);
  });
}
});
