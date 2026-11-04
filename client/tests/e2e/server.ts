// 테스트용 정적 서버: client/public 서빙, /api/* 는 404
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type {AddressInfo} from 'node:net';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
const ROOT = path.resolve(__dirname, '../../public');

export async function startServer(): Promise<{url: string; close: () => Promise<void>}> {
  const srv = http.createServer((req, res) => {
    const p = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = path.join(ROOT, p === '/' ? 'index.html' : p);
    if (p.startsWith('/api/') || !file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream'});
    fs.createReadStream(file).pipe(res);
  });
  await new Promise<void>(r => srv.listen(0, '127.0.0.1', r));
  const port = (srv.address() as AddressInfo).port;
  return {url: `http://127.0.0.1:${port}`, close: () => new Promise(r => srv.close(() => r()))};
}
