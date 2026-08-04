// Fetch a short window of a YouTube video's audio, transiently.
//
// Shared by tools/source-benchmark.mjs and tools/eval-benchmark.mjs so the two cannot drift.
// That drift has already cost this project one whole eval run: api/analyze.js and
// tools/eval.mjs each kept their own copy of the prompt, the schemas desynced, and every
// confidence number in a 137-clip run was junk.
//
// NOTHING IS STORED AND NOTHING IS RE-HOSTED. The bytes exist inside a temp directory only
// long enough to answer one question about them, and the caller deletes them immediately.
// Clips are played in the app through the YouTube IFrame embed, so the creator keeps the view
// and the attribution.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { ffmpegPath } = await import(pathToFileURL(path.join(ROOT, 'tools/ffmpeg-path.mjs')).href);
const FF = ffmpegPath().exe;

export function makeWorkDir(tag = 'ht-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), tag));
}

export function grabWindow(work, id, startS, windowS = 24) {
  const raw = path.join(work, `${id}.m4a`);
  const cut = path.join(work, `${id}.mp3`);
  try {
    execFileSync('yt-dlp', [
      `https://www.youtube.com/watch?v=${id}`, '-f', 'bestaudio[abr<128]/bestaudio',
      '-o', raw, '--no-warnings', '--no-playlist',
      '--download-sections', `*${startS}-${startS + windowS + 4}`,
      '--force-keyframes-at-cuts', '--ffmpeg-location', path.dirname(FF),
    ], { stdio: 'pipe', timeout: 180000 });
    const found = fs.readdirSync(work).find((f) => f.startsWith(id) && !f.endsWith('.mp3'));
    if (!found) return null;
    execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(work, found),
      '-t', String(windowS), '-ac', '1', '-ar', '16000', '-b:a', '48k', cut], { stdio: 'pipe' });
    return fs.existsSync(cut) ? cut : null;
  } catch (e) {
    // Swallowing this once cost a whole run: sixty candidates all reported "audio fetch
    // failed" with no way to tell yt-dlp from ffmpeg from my own arguments.
    if (process.env.DEBUG_SOURCE) {
      console.log('     fetch error:', String(e.stderr || e.message).split(/\r?\n/).filter(Boolean).slice(-2).join(' | ').slice(0, 240));
    }
    return null;
  }
}

export function wipe(work, id) {
  for (const f of fs.readdirSync(work)) if (f.startsWith(id)) fs.rmSync(path.join(work, f), { force: true });
}

export function km(aLat, aLng, bLat, bLng) {
  const R = 6371; const rad = (x) => (x * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2
    + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
