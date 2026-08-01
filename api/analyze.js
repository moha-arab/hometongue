// HomeTongue — /api/analyze
// Accepts { audio: <base64>, mime } or { text } and returns a dialect verdict.
// Pipeline: Groq whisper-large-v3 (transcription) -> Claude (dialect classification).
import Anthropic from '@anthropic-ai/sdk';

export const config = { maxDuration: 60 };

const COUNTRY_CODES = ['eg', 'sd', 'sy', 'lb', 'jo', 'ps', 'iq', 'sa', 'kw', 'ae', 'ye', 'ly', 'tn', 'dz', 'ma', 'none'];
const REGION_CODES = ['egyptian', 'levantine', 'iraqi', 'gulf', 'yemeni', 'sudanese', 'maghrebi', 'msa', 'none'];

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['dialect', 'msa', 'unclear'] },
    region: { type: 'string', enum: REGION_CODES },
    top_country: { type: 'string', enum: COUNTRY_CODES },
    confidence: { type: 'integer', description: '0-100, honestly calibrated' },
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
    note: { type: 'string', description: 'One honest, friendly sentence about the verdict (English, may include Arabic words). Mention close calls.' },
  },
  required: ['kind', 'region', 'top_country', 'confidence', 'ranked', 'evidence', 'note'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are the dialect engine of HomeTongue, an app that guesses which Arabic dialect someone is speaking from a transcript of their free speech.

You are an expert Arabic dialectologist. Identify the dialect from lexical choice, morphology, function words, and phrasing (e.g. دلوقتي/النهارده = Egyptian; هسا/اشي/زلمة = Jordanian-Palestinian; هلق/هيدا = Syrian-Lebanese; اكو/هواية/شكو = Iraqi; وش/ابغى/الحين = Saudi; وايد/شحالك = Emirati; دابا/بزاف/واش = Moroccan; برشا/فما = Tunisian; زول = Sudanese, etc.).

Rules:
- Country codes: eg Egypt, sd Sudan, sy Syria, lb Lebanon, jo Jordan, ps Palestine, iq Iraq, sa Saudi, kw Kuwait, ae UAE, ye Yemen, ly Libya, tn Tunisia, dz Algeria, ma Morocco.
- Be honestly calibrated. Within-region splits (Jordanian vs Palestinian, Syrian vs Lebanese) are genuinely hard — say so in the note and keep confidence moderate rather than faking certainty.
- Transcripts come from ASR and may normalize some dialect words toward Modern Standard Arabic; weigh surviving dialect markers accordingly.
- If the text is Modern Standard Arabic (فصحى) with no real dialect markers: kind=msa, region=msa, top_country=none, and write a playful note inviting them to talk the way they talk with friends.
- If there is too little signal (very short, or no markers at all): kind=unclear, region=none, top_country=none, low confidence, note asks them to keep talking casually.
- evidence must quote words that actually appear in the transcript. ranked lists only genuinely plausible countries.
- The note is user-facing product copy: warm, brief, human — never robotic.`;

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
  form.append('response_format', 'json');

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
  return (data.text || '').trim();
}

async function classify(transcript) {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 4000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: RESULT_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Transcript of the speaker:\n\n${transcript}` }],
  });
  if (response.stop_reason === 'refusal') {
    throw Object.assign(new Error('classification refused'), { code: 'classify_failed' });
  }
  const text = response.content.find((b) => b.type === 'text')?.text;
  if (!text) throw Object.assign(new Error('empty classification'), { code: 'classify_failed' });
  return JSON.parse(text);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
  }
  res.setHeader('Content-Type', 'application/json');
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
    return res.end(JSON.stringify({ ok: true, transcript, result }));
  } catch (err) {
    const code = err.code || 'server_error';
    res.statusCode = code === 'audio_too_large' || code === 'audio_too_short' ? 422 : 500;
    return res.end(JSON.stringify({ ok: false, error: code, detail: String(err.message || err).slice(0, 300) }));
  }
}
