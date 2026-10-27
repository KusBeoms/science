/* 별의 성장일기 로컬 서버 — 의존성 없는 정적 서버 + 최고 기록 API.
   Live Server와 달리 파일 변경을 감시하지 않으므로 빌드/편집 중에도 게임이 저절로
   새로고침되지 않는다. 필요할 때만 브라우저에서 직접 새로고침한다.
     npm start            → http://127.0.0.1:5173
     PORT=8080 npm start  → 포트 변경 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 5173;
const HOST = '127.0.0.1'; // 이 컴퓨터에서만 접속
const DATA_DIR = path.join(ROOT, 'data');
const BEST_FILE = path.join(DATA_DIR, 'best.json');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.map': 'application/json',
};
// 서버가 내주면 안 되는 것들(소스 전체를 열람시킬 이유는 없다)
const BLOCKED = /^\/(server\.js|package(-lock)?\.json|tsconfig\.json|data(\/|$)|node_modules(\/|$)|\.)/;

function readBest() {
  try {
    const j = JSON.parse(fs.readFileSync(BEST_FILE, 'utf8'));
    return { steps: Math.max(0, Number(j.steps) || 0), mass: Math.max(0, Number(j.mass) || 0) };
  } catch { return { steps: 0, mass: 0 }; }
}

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function handleBest(req, res) {
  if (req.method === 'GET') return send(res, 200, JSON.stringify(readBest()), TYPES['.json']);
  if (req.method !== 'POST') return send(res, 405, 'Method Not Allowed');
  // 다른 웹페이지가 로컬 서버로 기록을 위조해 보내지 못하게 같은 출처만 받는다
  const origin = req.headers.origin;
  if (origin && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return send(res, 403, 'Forbidden');
  let raw = '';
  req.on('data', (c) => { raw += c; if (raw.length > 1024) req.destroy(); });
  req.on('end', () => {
    try {
      const j = JSON.parse(raw);
      const cur = readBest();
      // 기록은 오르기만 한다 — 어떤 값이 와도 낮아지지 않고, 숫자가 아니면 무시한다
      const next = {
        steps: Math.max(cur.steps, Number.isFinite(j.steps) ? Math.min(100000, Math.floor(j.steps)) : 0),
        mass: Math.max(cur.mass, Number.isFinite(j.mass) ? Math.min(200, j.mass) : 0),
      };
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(BEST_FILE, JSON.stringify(next));
      send(res, 200, JSON.stringify(next), TYPES['.json']);
    } catch { send(res, 400, 'Bad Request'); }
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let p;
  try { p = decodeURIComponent(url.pathname); } catch { return send(res, 400, 'Bad Request'); }
  if (p === '/api/best') return handleBest(req, res);
  if (p === '/') p = '/index.html';
  if (BLOCKED.test(p)) return send(res, 404, 'Not Found');
  const file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT + path.sep)) return send(res, 403, 'Forbidden');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not Found');
    send(res, 200, buf, TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
  });
}).listen(PORT, HOST, () => console.log('별의 성장일기 → http://' + HOST + ':' + PORT));
