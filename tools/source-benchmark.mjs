// Source BENCHMARK clips — labelled from the source video, gated blind on quality only.
//
//   node tools/source-benchmark.mjs                 all targets in tools/targets-syria.json
//   node tools/source-benchmark.mjs Tartus          one label
//
// WHY THIS IS NOT tools/source-clips.mjs
// That tool gates candidates by asking Guess Me where the speaker is from and keeping the
// ones it agrees with. That is the right gate for GAME content — it rejects impressionists —
// but any clip chosen that way is worthless for measuring the model, because the model
// selected it on the exact variable being scored. Everything it produces is stamped
// evalExclude: true for that reason.
//
// This tool exists because the Syria route cannot be measured. The benchmark holds two Syrian
// clips and the general prompt already scores 0.45 km and 1.3 km on them, so there is no
// headroom and no way to tell whether the specialist notes help. Fixing that needs Syrian
// clips the model had no hand in choosing.
//
// THE GATE NEVER ASKS WHERE ANYONE IS FROM. It asks whether there is connected Arabic speech
// from one main speaker, whether the recording is natural rather than a lesson or a dub or an
// impression, how clean the audio is, and whether the speaker announces their own city — that
// last one flags a leak, since a clip only placeable because someone says "I am from Homs" is
// not testing an ear. None of those answers depend on the location, so accepting a clip
// cannot bias the score.
//
// THE LABEL COMES FROM THE VIDEO, not from the model: a street interview filmed in Tartus, a
// channel based in Deir ez-Zor. That is exactly how the existing 111-clip benchmark was built.
// It is not infallible — a visitor can appear in a local street interview — so every accepted
// clip records its title, channel and the query that found it, and stays reviewable.
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
const { MODEL } = await import(pathToFileURL(path.join(ROOT, 'api/prompt.js')).href);
const { ffmpegPath } = await import(pathToFileURL(path.join(ROOT, 'tools/ffmpeg-path.mjs')).href);
const FF = ffmpegPath().exe;

const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-bench-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WINDOW_S = 24;

// Deliberately says nothing about geography. Read it back before changing it: the moment this
// prompt can influence which locations get in, the resulting set stops being a benchmark.
const GATE_SYSTEM = `You are checking whether an audio clip is usable as a test recording of natural speech.

Do NOT guess or state where the speaker is from. That is not your job here and saying it would
spoil the test this clip is being collected for. Ignore any accent or regional cues entirely.

Answer only:
- is there connected human speech in Arabic, from one clearly dominant speaker, for most of the clip?
- is it natural, unscripted speech — an interview, a conversation, a vlog — rather than a
  language lesson, a news anchor reading copy, a dubbed or voice-over track, singing, a
  dramatic performance, or someone deliberately imitating an accent?
- is the dominant voice a REPORTER OR NARRATOR addressing the camera, rather than an ordinary
  person answering or chatting? Reporters speak in a trained register that hides where they
  grew up, so answer true for any piece-to-camera, voice-over, or professional presenting,
  even when the recording is otherwise natural.
- how clean is the audio, 1 (unusable) to 5 (clear)?
- does the speaker say out loud which city, town or region they are from, or is that stated
  about them? Answer true if a listener would learn their home from the words alone.
- roughly how many seconds of usable speech are there?`;

const GATE_SCHEMA = {
  type: 'object',
  properties: {
    arabic_speech: { type: 'boolean', description: 'connected Arabic speech from one dominant speaker' },
    natural: { type: 'boolean', description: 'unscripted; not a lesson, dub, song, performance or imitation' },
    reporter_voice: { type: 'boolean', description: 'true if the dominant voice is a reporter or narrator presenting, not an ordinary person talking' },
    audio_quality: { type: 'integer', description: '1 unusable to 5 clear' },
    speaker_count: { type: 'integer', description: 'how many people speak' },
    states_origin: { type: 'boolean', description: 'true if the words reveal where the speaker is from' },
    speech_seconds: { type: 'integer', description: 'approximate seconds of usable speech' },
    reject_reason: { type: 'string', description: 'short reason if unusable, else empty' },
  },
  required: ['arabic_speech', 'natural', 'audio_quality', 'states_origin'],
};

function ytSearch(query, n = 8) {
  try {
    const out = execFileSync('yt-dlp', [
      `ytsearch${n}:${query}`, '--flat-playlist', '--dump-json', '--no-warnings', '--skip-download',
    ], { encoding: 'utf8', timeout: 90000, maxBuffer: 32 * 1024 * 1024 });
    return out.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      .filter((v) => v.id && v.duration && v.duration > 60 && v.duration < 5400)
      .map((v) => ({ id: v.id, title: v.title || '', duration: v.duration, channel: v.channel || v.uploader || '' }));
  } catch { return []; }
}

async function embeddable(id) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
      { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const j = await r.json();
    return { title: j.title, author: j.author_name };
  } catch { return null; }
}

// International news channels are excluded outright. Their reporters are trained out of a
// regional accent and are usually not from the place they are standing in — the first smoke
// test accepted a BBC piece about a DAMASCUS neighbourhood off a Tartus query, which is
// exactly the label noise this whole file exists to avoid. Local channels are fine.
// Matched against the CHANNEL only. These words are far too common in ordinary Arabic titles
// — الشارع العربي, أخبار الحي — to be safe as title filters.
const NEWSROOM = new RegExp([
  'bbc', 'aljazeera', 'al jazeera', 'الجزيرة', 'العربية', 'العربي', 'سكاي نيوز', 'skynews',
  'sky news', 'france ?24', 'فرانس', '\\bdw\\b', 'الحدث', 'الشرق', 'رويترز', 'reuters', 'afp',
  'الميادين', 'روسيا اليوم', 'rt arabic', 'trt', 'المشهد', 'الحرة', 'alhurra', 'سبوتنيك',
  'الإخبارية', 'الاخبارية', 'نيوز', 'news', 'قناة', 'تلفزيون', 'فضائية', 'tv\\b',
].join('|'), 'i');

// Matched against the TITLE. The audio gate cannot see any of this: a presenter breaking down
// live is unscripted, emotional, single-speaker, clean audio — it passed every question the
// gate asks and is still worthless, because a broadcaster's register hides where they grew up.
// That clip is exactly why this exists.
const BROADCAST = new RegExp([
  'مذيع', 'مذيعة', 'نشرة', 'مراسل', 'تقرير', 'بث مباشر', 'على الهواء', 'استوديو',
  'برنامج', 'حلقة', 'ضيف', 'الوزير', 'وزير', 'رئيس', 'مؤتمر صحفي', 'تصريح', 'خطاب',
  'انchor', 'live broadcast', 'press conference',
].join('|'), 'i');

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
    if (process.env.DEBUG_SOURCE) {
      console.log('     fetch error:', String(e.stderr || e.message).split(/\r?\n/).filter(Boolean).slice(-2).join(' | ').slice(0, 240));
    }
    return null;
  }
}

function wipe(id) {
  for (const f of fs.readdirSync(WORK)) if (f.startsWith(id)) fs.rmSync(path.join(WORK, f), { force: true });
}

async function gate(file) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: GATE_SYSTEM }] },
          contents: [{ role: 'user', parts: [
            { inlineData: { mimeType: 'audio/mpeg', data: fs.readFileSync(file).toString('base64') } },
            { text: 'Is this clip usable as a test recording of natural speech?' },
          ] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: GATE_SCHEMA },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (r.status === 429 || r.status === 503 || r.status === 400) { await sleep(6000); continue; }
      if (!r.ok) return null;
      const j = await r.json();
      return JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '');
    } catch { await sleep(3000); }
  }
  return null;
}

const IMPOSTOR = new RegExp([
  'accent challenge', 'imitat', 'imitan', 'impression', 'impersonat', 'parod',
  'trying to speak', 'teaching', 'lesson', 'tutorial', 'learn ', 'how to speak',
  'ai voice', 'text to speech', 'تعلم', 'درس', 'دروس', 'تقليد', 'يقلد', 'مسلسل',
  'أغنية', 'اغنية', 'مدبلج', 'دبلجة', 'الفرق بين اللهجات', 'تحدي اللهجات',
].join('|'), 'i');

const only = process.argv[2];
const targets = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/targets-syria.json'), 'utf8'))
  .filter((t) => (only && !only.startsWith('--') ? t.label.toLowerCase().includes(only.toLowerCase()) : true));

// Resumable. Sampling three windows per video at roughly 40 s each makes a full twelve-target
// run hours long, and losing all of it to one timeout or one 403 storm is not acceptable.
// Every invocation reloads what is already decided, skips those videos, and skips labels that
// have already met their quota — so this can simply be run again until it stops finding things.
const OUT = path.join(ROOT, 'data', 'benchmark-candidates.json');
const prior = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { accepted: [], rejected: [] };
const accepted = prior.accepted || [];
const rejected = prior.rejected || [];
const decided = new Set([...accepted, ...rejected].map((r) => r.id.replace(/^yt-/, '')));
if (decided.size) console.log(`resuming — ${accepted.length} accepted, ${rejected.length} rejected already decided`);

const save = () => fs.writeFileSync(OUT, JSON.stringify({ gate: 'blind-quality-only', model: MODEL, accepted, rejected }, null, 2));

for (const t of targets) {
  console.log(`\n── ${t.label}  (want ${t.want || 2})`);
  if (accepted.filter((a) => a.label === t.label).length >= (t.want || 2)) { console.log('   already satisfied'); continue; }
  const seen = new Set();
  for (const q of t.queries) {
    if (accepted.filter((a) => a.label === t.label).length >= (t.want || 2)) break;
    const hits = ytSearch(q);
    if (!hits.length) console.log(`   · no results for "${q}"`);
    for (const v of hits) {
      if (accepted.filter((a) => a.label === t.label).length >= (t.want || 2)) break;
      if (seen.has(v.id) || decided.has(v.id)) continue;
      seen.add(v.id);
      if (IMPOSTOR.test(v.title)) { rejected.push({ id: v.id, label: t.label, title: v.title, why: 'title suggests lesson or imitation' }); continue; }
      if (NEWSROOM.test(v.channel)) {
        rejected.push({ id: v.id, label: t.label, title: v.title, why: `broadcaster channel (${v.channel})` });
        console.log(`   ✗ ${v.title.slice(0, 44)} — broadcaster: ${v.channel.slice(0, 20)}`);
        continue;
      }
      if (BROADCAST.test(v.title)) {
        rejected.push({ id: v.id, label: t.label, title: v.title, why: 'title indicates broadcast or official speech' });
        console.log(`   ✗ ${v.title.slice(0, 52)} — broadcast title`);
        continue;
      }
      const emb = await embeddable(v.id);
      if (!emb) { rejected.push({ id: v.id, label: t.label, title: v.title, why: 'not embeddable' }); continue; }

      // One window at 35% lands on b-roll, music stings and titles often enough that half the
      // smoke-test rejections were "no connected Arabic speech" from videos full of speech.
      // Sample three points across the video before giving up on it.
      let g = null; let start = 0; let lastWhy = 'audio fetch failed';
      for (const frac of [0.35, 0.6, 0.15]) {
        start = Math.max(20, Math.floor(v.duration * frac));
        const file = grabWindow(v.id, start);
        await sleep(1200);                    // yt-dlp starts returning 403 when hit hard
        if (!file) { wipe(v.id); continue; }
        const res = await gate(file);
        wipe(v.id);
        if (!res) { lastWhy = 'gate gave no answer'; continue; }
        // Only a dead window is worth retrying elsewhere in the same video; a reporter or a
        // lesson is a property of the whole thing.
        if (res.arabic_speech || res.reporter_voice === true || res.natural === false) { g = res; break; }
        lastWhy = 'no connected Arabic speech in any sampled window';
      }
      if (!g) { rejected.push({ id: v.id, label: t.label, title: v.title, why: lastWhy }); continue; }

      const why = !g.arabic_speech ? 'no connected Arabic speech'
        : !g.natural ? `not natural speech${g.reject_reason ? ` — ${g.reject_reason}` : ''}`
        : g.reporter_voice ? 'reporter or narrator, not an ordinary speaker'
        : (g.audio_quality || 0) < 3 ? `audio quality ${g.audio_quality}/5`
        : g.states_origin ? 'speaker states their own origin — would leak the answer'
        : (g.speaker_count || 1) > 3 ? `${g.speaker_count} speakers — too crowded`
        : (g.speech_seconds || 99) < 8 ? `only ~${g.speech_seconds}s of speech`
        : null;
      if (why) {
        rejected.push({ id: v.id, label: t.label, title: v.title, why });
        console.log(`   ✗ ${v.title.slice(0, 52)} — ${why}`);
        continue;
      }
      accepted.push({
        id: `yt-${v.id}`, kind: 'yt', videoId: v.id, label: t.label, lang: 'Arabic',
        lat: t.lat, lng: t.lng, r: t.r || 60, start, gain: 100,
        deck: 'syria',
        hint: 'Streamed from YouTube — the creator gets the view.',
        // Everything needed to audit the label later without re-running anything.
        source: { title: emb.title, author: emb.author, query: q, frac: Math.round((start / v.duration) * 100),
                  quality: g.audio_quality, speakers: g.speaker_count, speech_s: g.speech_seconds },
      });
      console.log(`   ✓ ${v.title.slice(0, 52)}  [q${g.audio_quality} · ${emb.author}]`);
      save();
    }
    save();   // rejections cost a download too; do not pay for them twice on a resume
  }
}

fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ gate: 'blind-quality-only', model: MODEL, accepted, rejected }, null, 2));
console.log(`\naccepted ${accepted.length}, rejected ${rejected.length}`);
console.log(`audio left on disk: ${fs.existsSync(WORK) ? 'SOME — BUG' : 0}`);
console.log(`wrote ${path.relative(ROOT, OUT)}`);
