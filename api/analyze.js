// HomeTongue — /api/analyze
// Accepts { audio: <base64>, mime } or { text } and returns a dialect verdict.
// Pipeline: Groq whisper-large-v3 (transcription) -> Claude (hierarchical dialect classification).
import Anthropic from '@anthropic-ai/sdk';
import { mintToken } from './feedback.js';

export const config = { maxDuration: 60 };

const COUNTRY_CODES = ['eg', 'sd', 'sy', 'lb', 'jo', 'ps', 'iq', 'sa', 'kw', 'ae', 'ye', 'ly', 'tn', 'dz', 'ma', 'none'];
const REGION_CODES = ['egyptian', 'levantine', 'iraqi', 'gulf', 'yemeni', 'sudanese', 'maghrebi', 'msa', 'none'];

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['dialect', 'msa', 'unclear'] },
    region: { type: 'string', enum: REGION_CODES },
    top_country: { type: 'string', enum: COUNTRY_CODES },
    confidence: { type: 'integer', description: 'Country-level confidence 0-100, honestly calibrated' },
    city: { type: 'string', description: "Sub-country locale guess in English, e.g. 'Aleppo', 'Beirut', 'Hijaz (Jeddah/Mecca)', 'Upper Egypt', 'Mosul'. Empty string when the transcript does not support one." },
    city_confidence: { type: 'integer', description: '0-100 for the city/sub-region guess; 0 when city is empty' },
    ranked: {
      type: 'array',
      description: 'Up to 4 candidate countries, best first, weight 0-100',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string', enum: COUNTRY_CODES },
          weight: { type: 'integer' },
        },
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
          word: { type: 'string', description: 'The Arabic word/phrase from the transcript' },
          gloss: { type: 'string', description: "Short English gloss, e.g. \"hassa — 'now', Jordanian giveaway\"" },
        },
        required: ['word', 'gloss'],
        additionalProperties: false,
      },
    },
    note: { type: 'string', description: 'One or two honest, friendly sentences about the verdict (English, may include Arabic words). Mention close calls and what pointed to the city guess.' },
  },
  required: ['kind', 'region', 'top_country', 'confidence', 'city', 'city_confidence', 'ranked', 'evidence', 'note'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are the dialect engine of HomeTongue, an app that guesses which Arabic dialect someone speaks from an ASR transcript of their free speech. You are an expert Arabic dialectologist. Work hierarchically: region -> country -> city/sub-region, with honestly calibrated confidence at each level.

## Method
1. Scan the transcript for dialect markers: function words, negation, demonstratives, interrogatives, tense/aspect prefixes, intensifiers, loanwords, and phonology that survives in spelling.
2. Weigh markers by distinctiveness (اكو pins Iraq; وين only excludes Egypt). Multiple weak markers from one area beat one ambiguous marker.
3. Decide region, then country, then city ONLY if specific evidence exists.

## Marker playbook (not exhaustive — use your full knowledge)
EGYPT: دلوقتي النهارده امبارح ازيك ازاي عايز/عاوز اوي كده مفيش ايه فين بقى خالص برضه لسه طب يسطا. Negation مش + ماعرفش pattern. Sub-Egypt: Cairo default; صعيدي (Upper Egypt) if جيت/گال spellings for قلت/قال or يا خال; Alexandria hard to spot in text — leave city empty unless clear.
SUDAN: زول كيفن شنو ياخي سمح قدر كده. Often misread as Egyptian — زول/كيفن decides.
LEVANT NORTH (sy, lb): هلق/هلأ شو كتير منيح هيك هون بدي مبارح لسا.
  - Lebanese: هيدا/هيدي/هول, French/English loans (ميرسي بونجور بليز اوكي), خيي, بعدني. Beirut: هيدا + heavy French mix. Tripoli/North: قاف sometimes kept.
  - Syrian: هاد/هي هالـ شلون (Damascus + Aleppo + east), مو. Damascus: هلق كتير شو خبرك. Aleppo: شلون ايمتى Turkish loans (دوغري), ليكو. Coastal (Latakia/Tartus): قاف kept sometimes, لكان. Deir ez-Zor leans Iraqi (اكو may appear!).
LEVANT SOUTH (jo, ps): هسا/هسه اشي زلمة فش بحكي عنجد ولك قديش هاد.
  - Jordanian: هسا زلمة يا زلمه; Bedouin/Hourani: هاظ گال/جال spellings, يا خوي. Amman West = soft urban (قاف as ء); East Amman/Irbid/Karak = گ for قاف.
  - Palestinian: قديش زي كيفك; rural: تش for ك (كيفتش/عندتش = STRONG rural Palestine); Gaza mixes Egyptian (ازيك احنا بتاع); 48/Israel Palestinians: Hebrew loans (بسيدر رمزور مزغان) = near-certain 48. Jerusalem/Nablus urban: قاف as ء.
IRAQ: اكو ماكو شكو هوايه خوش يمعود فدوه هسه شلون وياك زين چ/تش spellings (شلونچ شلونتش عندچ). دا + present (دا اروح).
  - Baghdad default. Mosul (Maslawi/qeltu): قاف KEPT + no گ + وين قلتُ style. Basra/South: چا يمعود اني. Kurdish-area Arabic: lighter markers.
GULF: زين وايد/واجد ابي/ابغى الحين توه سالفة شنو عاد يالله بعد.
  - Saudi Najd (Riyadh/Qassim): وش ابغى الحين كذا توني وشلون. Hijaz (Jeddah/Mecca/Medina): ايش دحين مره ايوه جاي (دحين + مره = strong Hijaz). Eastern Province leans Gulf/Kuwaiti. Southern (Asir/Jazan) leans Yemeni (عاد ايش قد).
  - Kuwait: شلونك شنو چذي/جذي عندچ وايد صج. UAE: شحالك وايد عساك الريال بغيت. Qatar/Bahrain: شنو شفيك وايد (Bahrain: شبيك). Oman: عاد توني بغيت وين "شو" sometimes — عماني often softer; واجد over وايد.
YEMEN: ايش عاد قد + verb (قد كلمته), معك خير, شتي/تشتي (Sanaani "you want" = STRONG Yemen), با + verb future. Sanaa: تشتي/شتي. Aden: انتو ايش + softer.
MAGHREB (ma, dz, tn, ly): واش بزاف دابا مزيان زوين غادي كيفاش علاش وقتاش شحال راني/راك درك برشا باهي فما يزي توا هلبة شن.
  - Morocco: دابا بزاف واش مزيان غادي ديال (ديال = strong Morocco). Casablanca/Rabat default; north (Tangier) has Spanish loans.
  - Algeria: درك/ضرك مليح برك وقتاش كاين بزاف واش. Algiers default; Oran: Spanish loans (بلاصة common Algeria-wide though).
  - Tunisia: برشا باهي فما شنوة/شنية يزي توا نجم + verb (نجم = can, strong Tunisia).
  - Libya: هلبة شن توا واجد يا خوي.
LIBYA/EGYPT border, SUDAN/EGYPT: use decisive markers only.

## Phonology visible in spelling (weigh heavily when present)
- قاف written as ء/ا (اللي بيألك for يقول): urban Levant/Egypt. As گ or ج (گلت/جلت for قلت): Bedouin, Jordan rural, Iraq, Gulf, Upper Egypt. Kept as ق: Maghreb, Mosul, coastal Syria minorities, Druze.
- ك written as چ/تش (feminine or general): Iraq + Gulf feminine (عندچ), rural Palestinian (كيفتش).
- ج written as ي (رياجيل -> ريايل, رجال -> ريال): Gulf. ج as گ: Egypt usually re-normalized by ASR — don't rely on it.
- ث/ذ preserved (هاذا مثل): Bedouin/Iraq/Gulf/Tunisia. Merged to ت/د/س/ز: urban Levant/Egypt.
- Place self-references ("هون بعمان", "احنا في جدة") are legitimate evidence — use them, but say so in the note.

## ASR reality (Groq whisper-large-v3)
- The transcript is machine-made: it normalizes dialect toward MSA/Egyptian, drops final vowels, and respells markers inconsistently (هسا/هسه/هسّا are the same word; هلق/هلأ/هلا get confused). Treat spelling variants generously.
- ABSENCE of city-level markers is normal in 20 seconds of ASR text and is NOT evidence against a city — it just means you leave city empty.
- Short garbled transcripts: prefer kind=unclear over guessing.

## Calibration rules (strict)
- region: needs >=2 solid markers for confidence >=80.
- country confidence: 90+ only for multi-marker unmistakable cases; 70-89 strong; 50-69 moderate (say what would flip it in the note); <50 = admit it's a lean. Within-region splits (jo vs ps, sy vs lb, gulf states) are genuinely hard: when markers are shared, split ranked weights accordingly and say so.
- city: give one ONLY when specific evidence exists (a marker from the playbook, a phonological spelling, or a place self-reference). Name that evidence in the note. city_confidence is usually 25-55; go higher only for near-certain signals (بسيدر, تشتي, ديال + دابا cluster, place self-reference). No evidence = city:"" and city_confidence:0. NEVER pick a city just because it's the capital.
- kind=msa when it's فصحى with no real dialect markers: playful note inviting them to talk like they talk with friends. kind=unclear when too little signal.
- evidence must quote strings actually present in the transcript. Never invent.
- The note is user-facing product copy: warm, brief, human, honest about uncertainty — never robotic, never fake-confident.`;

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

async function transcribe(audioB64, mime) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw Object.assign(new Error('GROQ_API_KEY not configured'), { code: 'no_groq_key' });

  const bytes = Buffer.from(audioB64, 'base64');
  if (bytes.length < 1000) throw Object.assign(new Error('audio too short'), { code: 'audio_too_short' });
  if (bytes.length > 6 * 1024 * 1024) throw Object.assign(new Error('audio too large'), { code: 'audio_too_large' });

  const ext = (mime || '').includes('mp4') ? 'audio.mp4' : (mime || '').includes('mpeg') ? 'audio.mp3' : (mime || '').includes('ogg') ? 'audio.ogg' : (mime || '').includes('wav') ? 'audio.wav' : 'audio.webm';
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mime || 'audio/webm' }), ext);
  form.append('model', 'whisper-large-v3');
  form.append('language', 'ar');
  form.append('temperature', '0');
  form.append('response_format', 'verbose_json'); // segments carry confidence for hallucination filtering
  // Style prompt: biases decoding toward colloquial verbatim transcription instead of MSA cleanup.
  form.append('prompt', 'حكي عفوي باللهجة العامية، مكتوب متل ما انقال بدون تصحيح للفصحى.');

  const resp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}` },
    body: form,
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw Object.assign(new Error(`transcription failed: ${resp.status} ${detail.slice(0, 200)}`), { code: 'asr_failed' });
  }
  const data = await resp.json();
  const segments = Array.isArray(data.segments) ? data.segments : null;
  if (!segments) return (data.text || '').trim();
  const kept = segments.filter((s) =>
    !(s.no_speech_prob > 0.5) && !(s.avg_logprob < -1.2) && !isHallucination(s.text || ''));
  return kept.map((s) => (s.text || '').trim()).join(' ').trim();
}

// Whisper dreams YouTube boilerplate when fed silence/noise — scrub the classics.
const BOILERPLATE = [
  'اشتركوا في القناة', 'اشترك في القناة', 'لا تنسوا الاشتراك', 'لا تنسى الاشتراك', 'فعلوا الجرس',
  'شكرا للمشاهدة', 'شكرا على المشاهدة', 'شكراً للمشاهدة', 'نانسي قنقر', 'ترجمة',
  'thanks for watching', 'subscribe to', 'like and subscribe',
];
function isHallucination(text) {
  const t = text.trim();
  if (!t) return true;
  if (t.length > 80) return false; // real speech segments are rarely pure boilerplate at length
  const low = t.toLowerCase();
  return BOILERPLATE.some((p) => low.includes(p));
}

async function classify(transcript) {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 6000,
    output_config: { effort: 'high', format: { type: 'json_schema', schema: RESULT_SCHEMA } },
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Transcript of the speaker:\n\n${transcript}` }],
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
    if (!transcript && body.audio) {
      transcript = await transcribe(body.audio, body.mime);
    }
    if (!transcript || transcript.length < 4) {
      res.statusCode = 422;
      return res.end(JSON.stringify({ ok: false, error: 'no_speech', detail: 'No usable speech detected.' }));
    }
    const result = await classify(transcript);
    return res.end(JSON.stringify({ ok: true, transcript, result, fb_token: mintToken() }));
  } catch (err) {
    const code = err.code || 'server_error';
    res.statusCode = code === 'audio_too_large' || code === 'audio_too_short' ? 422 : 500;
    return res.end(JSON.stringify({ ok: false, error: code, detail: String(err.message || err).slice(0, 300) }));
  }
}
