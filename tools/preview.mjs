import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../_site');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.pdf': 'application/pdf', '.xml': 'application/xml' };
http.createServer((request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    let target = path.resolve(root, '.' + pathname);
    if (!target.startsWith(root + path.sep) && target !== root) throw new Error('Outside preview');
    if (fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    const headers = { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' };
    // QA-only switch: the browser receives identical HTML but cannot run scripts.
    if (url.searchParams.get('scripts') === 'off') headers['Content-Security-Policy'] = "script-src 'none'";
    response.writeHead(200, headers);
    fs.createReadStream(target).pipe(response);
  } catch (error) { response.writeHead(404); response.end('Not found'); }
}).listen(8080, '127.0.0.1', () => console.log('Local preview: http://127.0.0.1:8080/'));
