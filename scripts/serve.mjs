import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpeg':'image/jpeg','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.woff2':'font/woff2','.ico':'image/x-icon'};
http.createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const retired=pathname.match(/^\/(en\/|ru\/)?(?:bernu-ballites|telpas-nodarbibam)(?:\/index\.html|\/)?$/);
    if(retired){res.writeHead(301,{Location:'/'+(retired[1]||'')+'telpa/'+new URL(req.url,'http://localhost').search});res.end();return;}
    let file = path.resolve(root,'.'+pathname);
    if (!file.startsWith(root+path.sep) && file!==root) throw new Error('Invalid path');
    if (pathname.split('/').some(p=>p.startsWith('.')||['node_modules','content','scripts','tests'].includes(p))) throw new Error('Private path');
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
}).listen(Number(process.env.PORT||4174),'127.0.0.1',()=>console.log('ROOM Jūrmala at http://127.0.0.1:'+(process.env.PORT||4174)));
