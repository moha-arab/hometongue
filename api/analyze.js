// HomeTongue — /api/analyze
// Accepts { audio: <base64>, mime } or { text } and returns a dialect verdict.
// Pipeline: Groq whisper-large-v3 (transcription) -> Claude (hierarchical dialect classification).
import Anthropic from '@anthropic-ai/sdk';
import { mintToken } from './feedback.js';
import { SHARED_METHOD, resolveLanguage, isoCode } from './languages.js';

export const config = { maxDuration: 60 };

// The schema is per-language: each entry declares the countries and regions we're
// willing to name, so Claude can never return a country that language isn't spoken in.
function buildSchema(lang) {
  const countries = { type: 'string', enum: lang.countries };
  return {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['dialect', 'msa', 'unclear'] },
      region: { type: 'string', enum: lang.regions },
      top_country: countries,
      confidence: { type: 'integer', description: 'Country-level confidence 0-100, honestly calibrated' },
      city: { type: 'string', description: "Sub-country locale guess in English, e.g. 'Aleppo', 'Beirut', 'Upper Egypt', 'Medellin', 'Quebec City'. Empty string when the transcript does not support one." },
      city_confidence: { type: 'integer', description: '0-100 for the city/sub-region guess; 0 when city is empty' },
      ranked: {
        type: 'array',
        description: 'Up to 4 candidate countries, best first, weight 0-100',
        items: {
          type: 'object',
          properties: { code: countries, weight: { type: 'integer' } },
          required: ['code', 'weight'],
          additionalProperties: false,
        },
      },
      evidence: {
        type: 'array',
        description: 'Up to 8 giveaway words/phrases actually present in the transcript',
        items: {
          type: 'object',
          properties: {
            word: { type: 'string', description: `The ${lang.name} word/phrase from the transcript` },
            gloss: { type: 'string', description: "Short English gloss, e.g. \"hassa — 'now', Jordanian giveaway\"" },
          },
          required: ['word', 'gloss'],
          additionalProperties: false,
        },
      },
      note: { type: 'string', description: 'One or two honest, friendly sentences about the verdict, in English. Mention close calls and what pointed to the city guess.' },
    },
    required: ['kind', 'region', 'top_country', 'confidence', 'city', 'city_confidence', 'ranked', 'evidence', 'note'],
    additionalProperties: false,
  };
}

function buildSystemPrompt(lang) {
  return `You are the dialect engine of HomeTongue, an app that guesses where someone is from by how they speak. This speaker is speaking ${lang.name}. You are an expert ${lang.name} dialectologist. Work hierarchically: region -> country -> city/sub-region, with honestly calibrated confidence at each level.

${SHARED_METHOD}

Note: for this language, "kind=msa" means ${lang.standardLabel} — the neutral register with no regional markers.

## Marker playbook for ${lang.name} (not exhaustive — use your full knowledge)
${lang.playbook}`;
}

function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 8 * 1024 * 1024) reject(new Error('too_large')); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

async function callWhisper(bytes, mime, ext, { language, prompt }) {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mime || 'audio/webm' }), ext);
  form.append('model', 'whisper-large-v3');
  form.append('temperature', '0');
  form.append('response_format', 'verbose_json'); // segments carry confidence for hallucination filtering
  if (language) form.append('language', language);
  if (prompt) form.append('prompt', prompt);

  const resp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw Object.assign(new Error(`transcription failed: ${resp.status} ${detail.slice(0, 200)}`), { code: 'asr_failed' });
  }
  return resp.json();
}

// Whisper's prompt is decoding CONTEXT, not an instruction, so each language primes it
// with a SAMPLE of the colloquial register we want back. But that means Whisper can
// continue the sample instead of transcribing, and hand us our own prompt as "speech" —
// measured on 2 of 8 clips with the old instruction-style prompt. Drop any segment that
// quotes it back.
function echoFragments(lang) {
  return lang.asrPrompt.split(/[.،؟?!。]/).map((s) => s.trim()).filter((s) => s.length > 12);
}

// Whisper dreams platform boilerplate when fed silence or noise — scrub the classics.
const BOILERPLATE = [
  'اشتركوا في القناة', 'اشترك في القناة', 'لا تنسوا الاشتراك', 'لا تنسى الاشتراك', 'فعلوا الجرس',
  'شكرا للمشاهدة', 'شكرا على المشاهدة', 'شكراً للمشاهدة', 'نانسي قنقر', 'ترجمة',
  'thanks for watching', 'subscribe to', 'like and subscribe', '请不吝点赞', '字幕由',
  'sous-titres', 'subtítulos', 'legendas', 'субтитры',
];
function isHallucination(text, echoes) {
  const t = text.trim();
  if (!t) return true;
  if (echoes.some((p) => t.includes(p))) return true; // it read our own prompt back to us
  if (t.length > 80) return false; // real speech segments are rarely pure boilerplate at length
  const low = t.toLowerCase();
  return BOILERPLATE.some((p) => low.includes(p));
}

function joinSegments(data, echoes) {
  const segments = Array.isArray(data.segments) ? data.segments : null;
  if (!segments) return (data.text || '').trim();
  const kept = segments.filter((s) =>
    !(s.no_speech_prob > 0.5) && !(s.avg_logprob < -1.2) && !isHallucination(s.text || '', echoes));
  return kept.map((s) => (s.text || '').trim()).join(' ').trim();
}

// Two passes. The first has no language and no prompt, so Whisper is free to identify the
// language itself and there is nothing for it to echo. The second re-runs with that
// language's colloquial prime, which is what keeps dialect markers from being tidied into
// the standard register. Costs about two extra seconds; worth it, since the prime is the
// difference between بيت and المنزل.
async function transcribe(audioB64, mime) {
  const bytes = Buffer.from(audioB64, 'base64');
  if (bytes.length < 2000) throw Object.assign(new Error('audio too short'), { code: 'audio_too_short' });
  if (bytes.length > 6 * 1024 * 1024) throw Object.assign(new Error('audio too large'), { code: 'audio_too_large' });

  const ext = (mime || '').includes('mp4') ? 'audio.mp4'
    : (mime || '').includes('mpeg') ? 'audio.mp3'
      : (mime || '').includes('ogg') ? 'audio.ogg'
        : (mime || '').includes('wav') ? 'audio.wav' : 'audio.webm';

  const first = await callWhisper(bytes, mime, ext, {});
  const detected = (first.language || '').toLowerCase();
  const lang = resolveLanguage(detected);
  if (!lang) {
    throw Object.assign(new Error(`no playbook for "${detected}"`), { code: 'unsupported_language', detected });
  }

  const second = await callWhisper(bytes, mime, ext, { language: isoCode(detected), prompt: lang.asrPrompt })
    .catch(() => null); // if the primed pass fails, the plain one is still usable
  const echoes = echoFragments(lang);
  const primed = second ? joinSegments(second, echoes) : '';
  const plain = joinSegments(first, echoes);

  // The prime can occasionally cost us the whole transcript; keep whichever is real.
  return { transcript: primed.length >= plain.length * 0.6 && primed ? primed : plain, lang, detected };
}

async function classify(transcript, lang) {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 6000,
    output_config: { effort: 'high', format: { type: 'json_schema', schema: buildSchema(lang) } },
    system: [{ type: 'text', text: buildSystemPrompt(lang), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Transcript of the speaker:

${transcript}` }],
  });
  if (response.stop_reason === 'refusal') {
    throw Object.assign(new Error('classification refused'), { code: 'classify_failed' });
  }
  const text = response.content.find((b) => b.type === 'text')?.text;
  if (!text) throw Object.assign(new Error('empty classification'), { code: 'classify_failed' });
  return JSON.parse(text);
}

// Per-instance rate limit — a speed bump against credit-burning scripts, not a wall.
const buckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const b = buckets.get(ip) || { count: 0, reset: now + 3600_000 };
  if (now > b.reset) { b.count = 0; b.reset = now + 3600_000; }
  b.count += 1;
  buckets.set(ip, b);
  if (buckets.size > 5000) buckets.clear();
  return b.count > 30;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
  }
  res.setHeader('Content-Type', 'application/json');

  const origin = req.headers.origin || '';
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  let originHost = '';
  try { originHost = origin ? new URL(origin).host : ''; } catch { /* malformed */ }
  if (!originHost || originHost !== host) {
    res.statusCode = 403;
    return res.end(JSON.stringify({ ok: false, error: 'bad_origin' }));
  }
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    res.statusCode = 429;
    return res.end(JSON.stringify({ ok: false, error: 'rate_limited', detail: 'Slow down a little — try again in a bit.' }));
  }

  try {
    const body = await readJsonBody(req);
    let transcript = (body.text || '').trim();
    let lang = null;
    let detected = '';

    if (transcript) {
      // Typed input has no audio to identify, so the client says which language it is.
      // The type box is still Arabic-only, hence the default.
      detected = (body.lang || 'ar').toLowerCase();
      lang = resolveLanguage(detected);
      if (!lang) {
        res.statusCode = 422;
        return res.end(JSON.stringify({ ok: false, error: 'unsupported_language', detected }));
      }
    } else if (body.audio) {
      ({ transcript, lang, detected } = await transcribe(body.audio, body.mime));
    }

    if (!transcript || transcript.length < 4) {
      res.statusCode = 422;
      return res.end(JSON.stringify({ ok: false, error: 'no_speech', detail: 'No usable speech detected.' }));
    }
    const result = await classify(transcript, lang);
    return res.end(JSON.stringify({
      ok: true,
      transcript,
      result,
      language: { code: detected, name: lang.name, native: lang.native, dir: lang.dir },
      fb_token: mintToken(),
    }));
  } catch (err) {
    const code = err.code || 'server_error';
    res.statusCode = code === 'audio_too_large' || code === 'audio_too_short' || code === 'unsupported_language' ? 422 : 500;
    return res.end(JSON.stringify({
      ok: false,
      error: code,
      detected: err.detected,
      detail: String(err.message || err).slice(0, 300),
    }));
  }
}
