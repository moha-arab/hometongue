// Local dev server — mirrors Vercel: serves static files + mounts /api/analyze.
// Run: node dev-server.js  (reads .env for GEMINI_API_KEY)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8123;

// tiny .env loader (no dependency)
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch { /* no .env — fallback mode only */ }

const { default: analyze } = await import('./api/analyze.js');
const { default: feedback } = await import('./api/feedback.js');
const { default: scores } = await import('./api/scores.js');
const { default: clipReport } = await import('./api/clip-report.js');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.wav': 'audio/wav',
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/analyze') return analyze(req, res);
  if (url.pathname === '/api/feedback') return feedback(req, res);
  if (url.pathname === '/api/clip-report') return clipReport(req, res);
  if (url.pathname === '/api/scores') return scores(req, res);

  // NOTHING DOTTED IS SERVED. This handed out any file under the project root to anyone who
  // asked, and the project root contains .env — the live Gemini key and the Supabase SERVICE
  // key, which bypasses row-level security on every table. `curl localhost:8123/.env` from any
  // machine on the same wifi was enough. It binds to all interfaces, so a campus network, a
  // café or a shared flat is a full credential disclosure for a file nobody thinks of as
  // published. Also covers .git, .vercel and anything else dotted that shows up later.
  if (url.pathname.split('/').some((seg) => seg.startsWith('.'))) {
    res.writeHead(404); return res.end('not found');
  }

  let file = path.normalize(path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  // Range support: <audio> seeking needs it (Vercel/CDN give it for free in prod)
  const type = MIME[path.extname(file)] || 'application/octet-stream';
  const total = fs.statSync(file).size;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range) {
    const start = range[1] ? parseInt(range[1], 10) : Math.max(0, total - parseInt(range[2], 10));
    const end = range[1] && range[2] ? Math.min(parseInt(range[2], 10), total - 1) : total - 1;
    if (start >= total || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${total}` });
      return res.end();
    }
    res.writeHead(206, {
      'Content-Type': type, 'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': end - start + 1,
    });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': total });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`hometongue dev server: http://localhost:${PORT} (gemini key: ${!!process.env.GEMINI_API_KEY})`));
