// Static server for the production build under a /fiador/ subpath. Node built-ins only.
// Usage: node demo/serve.mjs [port]   (default 5231; never 5190, 5192 or 5173)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '.serve');
const port = Number(process.argv[2] ?? 5231);
if ([5190, 5192, 5173].includes(port)) throw new Error(`port ${port} is reserved`);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://x');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') { res.writeHead(302, { location: '/fiador/' }); res.end(); return; }
    let file = normalize(join(root, rel));
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end('forbidden'); return; }
    let s = await stat(file).catch(() => null);
    if (s?.isDirectory()) {
      if (!rel.endsWith('/')) { res.writeHead(301, { location: `${rel}/${url.search}` }); res.end(); return; }
      file = join(file, 'index.html');
      s = await stat(file).catch(() => null);
    }
    if (!s) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(String(err));
  }
}).listen(port, '127.0.0.1', () => console.log(`serving ${root} at http://127.0.0.1:${port}/fiador/`));
