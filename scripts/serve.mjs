import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openEventStore, EventError } from './event-store.mjs';
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpeg':'image/jpeg','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.woff2':'font/woff2','.ico':'image/x-icon'};
export async function createLocalServer({ root = process.cwd(), dataFile = process.env.ROOM_EVENTS_FILE || path.resolve(root, '../roomjurmala-data/events.json') } = {}) {
  root = path.resolve(root);
  dataFile = path.resolve(dataFile);
  if (dataFile === root || dataFile.startsWith(root + path.sep)) throw new Error('Event storage must be outside the served website directory.');
  const store = await openEventStore(dataFile, path.join(root, 'content/events-seed.json'));
  function json(res, status, body) {
    res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'});
    res.end(JSON.stringify(body));
  }
  return http.createServer(async (req,res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // This development server intentionally never exposes unauthenticated admin access to a network.
  const allowedHosts = [`127.0.0.1:${req.socket.localPort}`, `localhost:${req.socket.localPort}`];
  if (!allowedHosts.includes(req.headers.host)) return json(res, 403, {error:'Atver administrāciju lokālajā adresē.'});
  const origin = 'http://' + req.headers.host;
  let requestPath;
  try { requestPath = new URL(req.url, origin).pathname; }
  catch { return json(res, 400, {error:'Nederīga adrese.'}); }
  if (requestPath.startsWith('/api/')) {
    try {
      const imageMatch = requestPath.match(/^\/api\/events\/([a-zA-Z0-9-]+)\/image$/);
      if (req.method === 'GET' && imageMatch) {
        const bytes = await store.image(imageMatch[1]);
        res.writeHead(200, {'Content-Type':'image/jpeg','Cache-Control':'no-store','Content-Disposition':'inline; filename="room-jurmala-pasakums.jpg"'}); res.end(bytes); return;
      }
      if (req.method === 'GET' && requestPath === '/api/session') return json(res, 200, {authenticated:true,local:true,csrf:''});
      if (req.method === 'GET' && requestPath === '/api/events') return json(res, 200, {events:store.list()});
      if (!['POST', 'PATCH'].includes(req.method)) return json(res, 405, {error:'Darbība nav pieejama.'});
      if (req.headers.origin !== origin || req.headers['x-room-admin'] !== '1'
        || req.headers['content-type']?.split(';')[0] !== 'application/json') return json(res, 403, {error:'Pārlādē administrācijas lapu un mēģini vēlreiz.'});
      let body = '';
      req.setEncoding('utf8');
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > (req.method === 'POST' && requestPath === '/api/events' ? 2850000 : 12000)) throw new EventError('Ievadītais teksts ir pārāk garš.', 413);
      }
      let input;
      try { input = JSON.parse(body); } catch { throw new EventError('Neizdevās nolasīt ievadīto informāciju.'); }
      if (req.method === 'POST' && requestPath === '/api/events/cancel-all') return json(res, 200, await store.cancelAll(input));
      if (req.method === 'POST' && requestPath === '/api/events') return json(res, 201, {event:await store.create(input)});
      const match = requestPath.match(/^\/api\/events\/([a-zA-Z0-9-]+)$/);
      if (req.method === 'PATCH' && match && ['archive','unarchive','delete'].includes(input?.action)) return json(res,200,await store.archive(match[1],input));
      if (req.method === 'PATCH' && match) return json(res, 200, {event:await store.change(match[1], input)});
      return json(res, 404, {error:'Darbība nav atrasta.'});
    } catch (error) {
      if (!(error instanceof EventError)) console.error('Event request failed', error);
      return json(res, error.status || 500, {error:error.status ? error.message : 'Neizdevās saglabāt. Mēģini vēlreiz.', fields:error.fields});
    }
  }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const retired=pathname.match(/^\/(en\/|ru\/)?(?:bernu-ballites|telpas-nodarbibam)(?:\/index\.html|\/)?$/);
    if(retired){res.writeHead(301,{Location:'/'+(retired[1]||'')+'telpa/'+new URL(req.url,'http://localhost').search});res.end();return;}
    let file = path.resolve(root,'.'+pathname);
    if (!file.startsWith(root+path.sep) && file!==root) throw new Error('Invalid path');
    if (pathname.split('/').some(p=>p.startsWith('.')||['node_modules','content','scripts','tests','data','work'].includes(p))) throw new Error('Private path');
    if (pathname === '/admin') { res.writeHead(302, {Location:'/admin/'}); res.end(); return; }
    if (pathname.startsWith('/admin/')) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'");
    }
    if ((await stat(file)).isDirectory()) file=path.join(file,'index.html');
    const data=await readFile(file);
    const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
    if (range) {
      const start=Number(range[1]), end=Math.min(range[2]?Number(range[2]):data.length-1,data.length-1);
      if(start>end){res.writeHead(416,{'Content-Range':'bytes */'+data.length});res.end();return;}
      res.writeHead(206,{...headers,'Content-Range':'bytes '+start+'-'+end+'/'+data.length,'Content-Length':end-start+1});
      res.end(req.method==='HEAD'?undefined:data.subarray(start,end+1));
    } else {res.writeHead(200,{...headers,'Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);}
  } catch {res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createLocalServer();
  server.listen(Number(process.env.PORT||4174),'127.0.0.1',()=>console.log('ROOM Jūrmala at http://127.0.0.1:'+(process.env.PORT||4174)));
}
