// Local dev server — mirrors Vercel: serves static files + mounts /api/analyze.
// Run: node dev-server.js  (reads .env for GROQ_API_KEY / ANTHROPIC_API_KEY)
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

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/analyze') return analyze(req, res);
  if (url.pathname === '/api/feedback') return feedback(req, res);
  if (url.pathname === '/api/scores') return scores(req, res);

  let file = path.normalize(path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`hometongue dev server: http://localhost:${PORT} (keys: groq=${!!process.env.GROQ_API_KEY} anthropic=${!!process.env.ANTHROPIC_API_KEY})`));
