// Find and vet new Pin It clips.
//
//   node tools/source-clips.mjs french          fill one deck
//   node tools/source-clips.mjs --targets targets.json
//
// Nothing is downloaded permanently and nothing is re-hosted. Candidates are YouTube videos
// played through the IFrame embed, so the creator keeps the view and the attribution. Audio
// is fetched transiently only to vet the clip and deleted immediately afterwards.
//
// THE GATE IS THE PRODUCT'S OWN MODEL. Guess Me places speakers to a 44 km median, so the
// strongest possible test of "is this person really from Lagos" is to hand the audio to the
// same model, blind, and see whether it independently says Lagos. That kills the failure mode
// that ruined the first attempt at this deck: actors performing an accent. An impressionist
// doing Jamaican does not survive a model that has heard real Jamaicans.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { SYSTEM, SCHEMA, MODEL } = await import(pathToFileURL(path.join(ROOT, 'api/prompt.js')).href);
const { ffmpegPath } = await import(pathToFileURL(path.join(ROOT, 'tools/ffmpeg-path.mjs')).href);
const FF = ffmpegPath().exe;

const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-source-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Deliberately loose. The gate exists to reject impressionists, wrong languages and absurd
// mismatches — not to enforce agreement. A clip the model finds hard is good content and a
// standing record of a weak spot; rejecting it would hide the weakness instead of showing it.
const ACCEPT_KM = 1500;
const WINDOW_S = 22;

function km(aLat, aLng, bLat, bLng) {
  const R = 6371; const rad = (x) => (x * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2
    + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function ytSearch(query, n = 6) {
  try {
    const out = execFileSync('yt-dlp', [
      `ytsearch${n}:${query}`, '--flat-playlist', '--dump-json',
      '--no-warnings', '--skip-download',
    ], { encoding: 'utf8', timeout: 90000, maxBuffer: 32 * 1024 * 1024 });
    return out.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      .filter((v) => v.id && v.duration && v.duration > 60 && v.duration < 3600)
      .map((v) => ({ id: v.id, title: v.title || '', duration: v.duration, channel: v.channel || v.uploader || '' }));
  } catch { return []; }
}

// oEmbed is the only reliable check that a video can actually be played off-site. Plenty of
// otherwise perfect clips are embed-disabled and would show a dead frame in the game.
async function embeddable(id) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
      { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const j = await r.json();
    return { title: j.title, author: j.author_name, authorUrl: j.author_url };
  } catch { return null; }
}

// Transient: fetch, vet, delete. The bytes exist only long enough to answer one question.
function grabWindow(id, startS) {
  const raw = path.join(WORK, `${id}.m4a`);
  const cut = path.join(WORK, `${id}.mp3`);
  try {
    execFileSync('yt-dlp', [
      `https://www.youtube.com/watch?v=${id}`, '-f', 'bestaudio[abr<128]/bestaudio',
      '-o', raw, '--no-warnings', '--no-playlist',
      '--download-sections', `*${startS}-${startS + WINDOW_S + 4}`,
      '--force-keyframes-at-cuts', '--ffmpeg-location', path.dirname(FF),
    ], { stdio: 'pipe', timeout: 180000 });
    const found = fs.readdirSync(WORK).find((f) => f.startsWith(id) && !f.endsWith('.mp3'));
    if (!found) return null;
    execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(WORK, found),
      '-t', String(WINDOW_S), '-ac', '1', '-ar', '16000', '-b:a', '48k', cut], { stdio: 'pipe' });
    return fs.existsSync(cut) ? cut : null;
  } catch (e) {
    // Silently swallowing this cost a whole run: 60 candidates all reported "audio fetch
    // failed" with no way to tell whether it was yt-dlp, ffmpeg, or my own arguments.
    if (process.env.DEBUG_SOURCE) {
      const msg = String(e.stderr || e.message).split(/\r?\n/).filter(Boolean);
      console.log('     fetch error:', msg.slice(-3).join(' | ').slice(0, 300));
    }
    return null;
  }
}

function wipe(id) {
  for (const f of fs.readdirSync(WORK)) if (f.startsWith(id)) fs.rmSync(path.join(WORK, f), { force: true });
}

async function askModel(file) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [
            { inlineData: { mimeType: 'audio/mpeg', data: fs.readFileSync(file).toString('base64') } },
            { text: 'Where did this person grow up?' },
          ] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (r.status === 429 || r.status === 503) { await sleep(8000); continue; }
      if (!r.ok) return null;
      const j = await r.json();
      const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
      return JSON.parse(t);
    } catch { await sleep(3000); }
  }
  return null;
}

// A title that gives the answer away is a leak: the player sees nothing, but if a clip is
// only placeable because the speaker announces their city, it is not testing an ear.
// Word boundaries let an impressionist straight through: imitat never matches the
// Portuguese "IMITANDO" or the Spanish "imitando", and one such clip was accepted before this
// was caught. Match stems without a trailing boundary, and cover the other languages the decks
// actually use rather than only English.
const IMPOSTOR = new RegExp([
  'accent challenge', 'imitat', 'imitan', 'imita\b', 'impression', 'impersonat', 'parod',
  'sotaques', 'sotaque[s]? d[eo]', 'acentos', 'imitando', 'haciendo el acento',
  'trying to speak', 'teaching', 'lesson', 'tutorial', 'learn ', 'how to speak',
  'ai voice', 'text to speech', 'dublagem', 'doblaje', 'пародия', 'акценты',
].join('|'), 'i');

const targets = JSON.parse(fs.readFileSync(process.argv[3] || path.join(ROOT, 'tools/targets.json'), 'utf8'))
  .filter((t) => (process.argv[2] && !process.argv[2].startsWith('--') ? t.deck === process.argv[2] : true));

const accepted = [];
const rejected = [];

for (const t of targets) {
  console.log(`\n── ${t.deck} · ${t.label}`);
  const seen = new Set();
  for (const q of t.queries) {
    if (accepted.filter((a) => a.label === t.label).length >= (t.want || 1)) break;
    for (const v of ytSearch(q)) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      if (IMPOSTOR.test(v.title)) { rejected.push({ id: v.id, label: t.label, why: 'title suggests imitation or lesson' }); continue; }
      const emb = await embeddable(v.id);
      if (!emb) { rejected.push({ id: v.id, label: t.label, why: 'not embeddable' }); continue; }

      const start = Math.max(30, Math.floor(v.duration * 0.35));
      const file = grabWindow(v.id, start);
      if (!file) { rejected.push({ id: v.id, label: t.label, why: 'audio fetch failed' }); continue; }

      const g = await askModel(file);
      wipe(v.id);
      if (!g || typeof g.lat !== 'number') { rejected.push({ id: v.id, label: t.label, why: 'model gave no answer' }); continue; }

      const d = km(t.lat, t.lng, g.lat, g.lng);
      if (d > ACCEPT_KM) {
        rejected.push({ id: v.id, label: t.label, why: `model heard ${g.place} — ${Math.round(d)} km away` });
        console.log(`   ✗ ${v.title.slice(0, 46)} — heard ${g.place} (${Math.round(d)} km)`);
        continue;
      }
      accepted.push({
        id: `yt-${v.id}`, kind: 'yt', videoId: v.id, label: t.label, lang: t.lang,
        lat: t.lat, lng: t.lng, r: t.r || 120, start, gain: 100,
        hint: 'Streamed from YouTube — the creator gets the view.',
        gate: { model: MODEL, heard: g.place, offBy: Math.round(d), confidence: g.confidence,
                evidence: (g.evidence || []).slice(0, 3), title: emb.title, author: emb.author },
      });
      console.log(`   ✓ ${v.title.slice(0, 46)} — heard ${g.place} (${Math.round(d)} km)`);
      if (accepted.filter((a) => a.label === t.label).length >= (t.want || 1)) break;
    }
  }
}

fs.rmSync(WORK, { recursive: true, force: true });
const out = path.join(ROOT, 'data', 'sourced-clips.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ accepted, rejected }, null, 2));
console.log(`\naccepted ${accepted.length}, rejected ${rejected.length}`);
console.log(`audio files left on disk: ${fs.existsSync(WORK) ? 'SOME — BUG' : 0}`);
console.log(`wrote ${path.relative(ROOT, out)} — review, then merge into js/clips.js`);
