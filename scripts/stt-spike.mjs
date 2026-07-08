#!/usr/bin/env node
/**
 * STT Accuracy Validation Spike Runner
 *
 * Usage:
 *   node scripts/stt-spike.mjs --check
 *     Verifies API connectivity for Sarvam AI and ElevenLabs (no audio needed).
 *
 *   node scripts/stt-spike.mjs --file <path> --lang <hi-IN|gu-IN|en-IN> --ref "<transcript>"
 *     Tests a single audio file against both providers and prints WER + latency.
 *
 *   node scripts/stt-spike.mjs --run <test-cases.json>
 *     Runs a batch of test cases and prints a summary table.
 *     JSON format: [{ "file": "...", "language": "hi-IN", "category": "pure-hindi", "reference": "..." }]
 *
 * Environment variables (from .env.local):
 *   SARVAM_API_KEY
 *   ELEVENLABS_API_KEY
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Load env from .env.local
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(projectRoot, '.env.local');
  if (!existsSync(envPath)) {
    console.error('ERROR: .env.local not found. Copy .env.example and fill in keys.');
    process.exit(1);
  }
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const SARVAM_KEY = process.env.SARVAM_API_KEY ?? '';
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY ?? '';

// ---------------------------------------------------------------------------
// WER (Word Error Rate) calculator
// ---------------------------------------------------------------------------
function normalise(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // strip punctuation, keep unicode letters
    .split(/\s+/)
    .filter(Boolean);
}

function werLevenshtein(refWords, hypWords) {
  const m = refWords.length;
  const n = hypWords.length;
  if (m === 0) return hypWords.length === 0 ? 0 : 1;

  // dp[i][j] = edit distance between refWords[0..i-1] and hypWords[0..j-1]
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (refWords[i - 1] === hypWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n] / m;
}

export function calculateWER(reference, hypothesis) {
  const refWords = normalise(reference);
  const hypWords = normalise(hypothesis);
  const wer = werLevenshtein(refWords, hypWords);
  return {
    wer: Math.min(wer, 1),
    wordAccuracy: Math.max(0, (1 - wer) * 100),
    referenceWords: refWords.length,
    hypothesisWords: hypWords.length,
  };
}

// ---------------------------------------------------------------------------
// Sarvam AI STT
// ---------------------------------------------------------------------------
function audioMimeType(fileName) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const map = { m4a: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', webm: 'audio/webm', flac: 'audio/flac' };
  return map[ext] ?? 'audio/wav';
}

async function sarvamTranscribe(audioBuffer, fileName, languageCode) {
  const form = new FormData();
  form.append('file', new Blob([audioBuffer], { type: audioMimeType(fileName) }), fileName);
  form.append('language_code', languageCode);
  form.append('model', 'saarika:v2');

  const start = Date.now();
  const res = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: { 'api-subscription-key': SARVAM_KEY },
    body: form,
  });
  const latencyMs = Date.now() - start;

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sarvam AI ${res.status}: ${body}`);
  }
  const data = await res.json();
  return { transcript: data.transcript ?? '', latencyMs };
}

async function sarvamCheckConnectivity() {
  // Send a request with no file — expect 400/422 (bad request) not 401/403 (auth failure)
  const form = new FormData();
  form.append('language_code', 'hi-IN');
  form.append('model', 'saarika:v2');

  const res = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: { 'api-subscription-key': SARVAM_KEY },
    body: form,
  });

  if (res.status === 401 || res.status === 403) {
    return { ok: false, reason: `Auth failed (${res.status}) — check SARVAM_API_KEY` };
  }
  if (res.status >= 500 || res.status === 429) {
    return { ok: false, reason: `API error (${res.status}) — server-side problem or rate limit` };
  }
  // 400/422 = reached the API and auth passed, just missing the file
  return { ok: true, status: res.status };
}

// ---------------------------------------------------------------------------
// ElevenLabs STT
// ---------------------------------------------------------------------------
async function elevenLabsTranscribe(audioBuffer, fileName) {
  const form = new FormData();
  form.append('audio', new Blob([audioBuffer], { type: audioMimeType(fileName) }), fileName);
  form.append('model_id', 'scribe_v1');

  const start = Date.now();
  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_KEY },
    body: form,
  });
  const latencyMs = Date.now() - start;

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${body}`);
  }
  const data = await res.json();
  return { transcript: data.text ?? '', latencyMs };
}

async function elevenLabsCheckConnectivity() {
  const form = new FormData();
  form.append('model_id', 'scribe_v1');

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_KEY },
    body: form,
  });

  if (res.status === 401 || res.status === 403) {
    return { ok: false, reason: `Auth failed (${res.status}) — check ELEVENLABS_API_KEY` };
  }
  if (res.status >= 500 || res.status === 429) {
    return { ok: false, reason: `API error (${res.status}) — server-side problem or rate limit` };
  }
  return { ok: true, status: res.status };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
async function runCheck() {
  console.log('\n=== STT API Connectivity Check ===\n');

  if (!SARVAM_KEY) {
    console.log('❌ Sarvam AI   — SARVAM_API_KEY is not set');
  } else {
    process.stdout.write('   Sarvam AI   — checking... ');
    try {
      const result = await sarvamCheckConnectivity();
      if (result.ok) {
        console.log(`✅ Connected (got HTTP ${result.status} — auth passed)`);
      } else {
        console.log(`❌ ${result.reason}`);
      }
    } catch (e) {
      console.log(`❌ Network error: ${e.message}`);
    }
  }

  if (!ELEVENLABS_KEY) {
    console.log('❌ ElevenLabs  — ELEVENLABS_API_KEY is not set');
  } else {
    process.stdout.write('   ElevenLabs  — checking... ');
    try {
      const result = await elevenLabsCheckConnectivity();
      if (result.ok) {
        console.log(`✅ Connected (got HTTP ${result.status} — auth passed)`);
      } else {
        console.log(`❌ ${result.reason}`);
      }
    } catch (e) {
      console.log(`❌ Network error: ${e.message}`);
    }
  }

  console.log('\nWER self-test (known sample):');
  const { wer, wordAccuracy } = calculateWER(
    'आज मैंने राहुल से मुलाकात की',
    'आज मैंने राहुल से मुलाकात की'
  );
  console.log(`  Perfect match → WER=${(wer * 100).toFixed(1)}%  Accuracy=${wordAccuracy.toFixed(1)}% (expected: 100%)`);

  const { wordAccuracy: acc2 } = calculateWER(
    'hello world this is a test',
    'hello world this is a taste'
  );
  console.log(`  One word off  → Accuracy=${acc2.toFixed(1)}% (expected: ~83.3%)\n`);
}

async function runSingle(filePath, languageCode, reference) {
  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    console.error(`ERROR: File not found: ${absPath}`);
    process.exit(1);
  }
  const audioBuffer = readFileSync(absPath);
  const fileName = absPath.split('/').pop();

  console.log(`\n=== Testing: ${fileName} (${languageCode}) ===\n`);

  // Sarvam AI
  process.stdout.write('Sarvam AI   — transcribing... ');
  try {
    const { transcript, latencyMs } = await sarvamTranscribe(audioBuffer, fileName, languageCode);
    const { wordAccuracy } = calculateWER(reference, transcript);
    console.log(`done (${(latencyMs / 1000).toFixed(2)}s)`);
    console.log(`  Transcript : "${transcript}"`);
    console.log(`  Reference  : "${reference}"`);
    console.log(`  Accuracy   : ${wordAccuracy.toFixed(1)}%`);
  } catch (e) {
    console.log(`FAILED — ${e.message}`);
  }

  // ElevenLabs
  process.stdout.write('ElevenLabs  — transcribing... ');
  try {
    const { transcript, latencyMs } = await elevenLabsTranscribe(audioBuffer, fileName);
    const { wordAccuracy } = calculateWER(reference, transcript);
    console.log(`done (${(latencyMs / 1000).toFixed(2)}s)`);
    console.log(`  Transcript : "${transcript}"`);
    console.log(`  Reference  : "${reference}"`);
    console.log(`  Accuracy   : ${wordAccuracy.toFixed(1)}%`);
  } catch (e) {
    console.log(`FAILED — ${e.message}`);
  }
  console.log();
}

async function runBatch(testCasesPath) {
  const absPath = resolve(testCasesPath);
  if (!existsSync(absPath)) {
    console.error(`ERROR: Test cases file not found: ${absPath}`);
    process.exit(1);
  }
  const cases = JSON.parse(readFileSync(absPath, 'utf8'));
  console.log(`\n=== Batch Run: ${cases.length} test cases ===\n`);

  const results = [];
  for (const tc of cases) {
    const audioPath = resolve(dirname(absPath), tc.file);
    if (!existsSync(audioPath)) {
      console.warn(`SKIP: ${tc.file} — file not found`);
      results.push({ ...tc, sarvam: null, elevenlabs: null });
      continue;
    }
    const audioBuffer = readFileSync(audioPath);
    const fileName = tc.file.split('/').pop();

    let sarvamResult = null;
    let elevenResult = null;

    try {
      const { transcript, latencyMs } = await sarvamTranscribe(audioBuffer, fileName, tc.language);
      const { wordAccuracy } = calculateWER(tc.reference, transcript);
      sarvamResult = { transcript, latencyMs, wordAccuracy };
    } catch (e) {
      sarvamResult = { error: e.message };
    }

    try {
      const { transcript, latencyMs } = await elevenLabsTranscribe(audioBuffer, fileName);
      const { wordAccuracy } = calculateWER(tc.reference, transcript);
      elevenResult = { transcript, latencyMs, wordAccuracy };
    } catch (e) {
      elevenResult = { error: e.message };
    }

    results.push({ ...tc, sarvam: sarvamResult, elevenlabs: elevenResult });
    process.stdout.write('.');
  }

  console.log('\n\n--- Results ---\n');
  console.log(
    'Category'.padEnd(24) +
    'Sarvam Acc%'.padEnd(14) +
    'Sarvam Lat'.padEnd(12) +
    'EL Acc%'.padEnd(14) +
    'EL Lat'
  );
  console.log('-'.repeat(76));

  let sarvamTotal = 0;
  let sarvamCount = 0;
  let elTotal = 0;
  let elCount = 0;

  for (const r of results) {
    const sarvamAcc = r.sarvam?.wordAccuracy != null ? `${r.sarvam.wordAccuracy.toFixed(1)}%` : 'ERROR';
    const sarvamLat = r.sarvam?.latencyMs != null ? `${(r.sarvam.latencyMs / 1000).toFixed(2)}s` : '-';
    const elAcc = r.elevenlabs?.wordAccuracy != null ? `${r.elevenlabs.wordAccuracy.toFixed(1)}%` : 'ERROR';
    const elLat = r.elevenlabs?.latencyMs != null ? `${(r.elevenlabs.latencyMs / 1000).toFixed(2)}s` : '-';

    console.log(
      r.category.padEnd(24) +
      sarvamAcc.padEnd(14) +
      sarvamLat.padEnd(12) +
      elAcc.padEnd(14) +
      elLat
    );

    if (r.sarvam?.wordAccuracy != null) { sarvamTotal += r.sarvam.wordAccuracy; sarvamCount++; }
    if (r.elevenlabs?.wordAccuracy != null) { elTotal += r.elevenlabs.wordAccuracy; elCount++; }
  }

  console.log('-'.repeat(76));
  const sarvamAvg = sarvamCount ? (sarvamTotal / sarvamCount).toFixed(1) : 'N/A';
  const elAvg = elCount ? (elTotal / elCount).toFixed(1) : 'N/A';
  console.log(`${'OVERALL AVERAGE'.padEnd(24)}${(sarvamAvg + '%').padEnd(14)}${''.padEnd(12)}${(elAvg + '%').padEnd(14)}`);
  console.log();
  console.log(`Gate: Sarvam AI ≥90% → ${sarvamAvg !== 'N/A' && parseFloat(sarvamAvg) >= 90 ? '✅ PASS' : '❌ FAIL (blocks Epic 2)'}`);
  console.log(`Gate: Combined  ≥95% → ${sarvamAvg !== 'N/A' && elAvg !== 'N/A' && (parseFloat(sarvamAvg) + parseFloat(elAvg)) / 2 >= 95 ? '✅ PASS' : '❌ FAIL'}`);
  console.log();
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

if (args.includes('--check')) {
  await runCheck();
} else if (args.includes('--run')) {
  const idx = args.indexOf('--run');
  const path = args[idx + 1];
  if (!path) { console.error('Usage: --run <test-cases.json>'); process.exit(1); }
  await runBatch(path);
} else if (args.includes('--file')) {
  const fileIdx = args.indexOf('--file');
  const langIdx = args.indexOf('--lang');
  const refIdx = args.indexOf('--ref');
  const filePath = args[fileIdx + 1];
  const lang = langIdx !== -1 ? args[langIdx + 1] : 'hi-IN';
  const ref = refIdx !== -1 ? args[refIdx + 1] : '';
  if (!filePath || !ref) {
    console.error('Usage: --file <path> --lang <hi-IN|gu-IN|en-IN> --ref "<transcript>"');
    process.exit(1);
  }
  await runSingle(filePath, lang, ref);
} else {
  console.log(`
STT Accuracy Spike Runner

Usage:
  node scripts/stt-spike.mjs --check
    Verify API connectivity (no audio needed)

  node scripts/stt-spike.mjs --file <path> --lang <hi-IN|gu-IN|en-IN> --ref "<transcript>"
    Test a single audio file

  node scripts/stt-spike.mjs --run <test-cases.json>
    Run a batch from a JSON file

See scripts/stt-test-cases.example.json for the batch format.
`);
}
