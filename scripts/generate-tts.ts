/**
 * generate-tts.ts — Generate ElevenLabs Hindi TTS for the MediTrack sample render.
 *
 * Usage:  npm run tts
 *         npx tsx scripts/generate-tts.ts [--input=path/to/payload.json]
 *
 * Env:    ELEVENLABS_API_KEY  and  ELEVENLABS_VOICE_ID  in .env.local
 *
 * Output: public/audio/sample.mp3           — concatenated beat audio
 *         public/audio/sample.manifest.json — per-beat timing offsets
 *
 * Requires ffmpeg + ffprobe on PATH (for concatenation and duration probing).
 */

import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { config } from "dotenv";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// ── Env ─────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, "..");
config({ path: path.join(ROOT, ".env.local") });

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
if (!API_KEY) {
  console.error("✗ Missing ELEVENLABS_API_KEY in .env.local");
  process.exit(1);
}
if (!VOICE_ID) {
  console.error("✗ Missing ELEVENLABS_VOICE_ID in .env.local");
  process.exit(1);
}

// ── Paths ───────────────────────────────────────────────────────────────────
const AUDIO_DIR = path.join(ROOT, "public", "audio");
const CACHE_DIR = path.join(AUDIO_DIR, ".cache");
const OUTPUT_MP3 = path.join(AUDIO_DIR, "sample.mp3");
const MANIFEST = path.join(AUDIO_DIR, "sample.manifest.json");
const DATA_FILE = path.join(ROOT, "src", "data", "sampleMediTrack.ts");
const PAUSE_MS = 200; // silence between beats

fs.mkdirSync(CACHE_DIR, { recursive: true });

// ── Preflight ───────────────────────────────────────────────────────────────
try {
  execSync("ffmpeg -version", { stdio: "ignore" });
  execSync("ffprobe -version", { stdio: "ignore" });
} catch {
  console.error("✗ ffmpeg / ffprobe not found on PATH — install them first.");
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function cacheKey(voiceId: string, text: string): string {
  return createHash("sha256").update(`${voiceId}:${text}`).digest("hex");
}

function getDurationMs(file: string): number {
  const raw = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv="p=0" "${file}"`,
    { encoding: "utf-8" },
  );
  return Math.round(parseFloat(raw.trim()) * 1000);
}

/** Collect an SDK response (Buffer | Uint8Array | AsyncIterable) into a Buffer. */
async function collectBuffer(response: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(response)) return response;
  if (response instanceof Uint8Array) return Buffer.from(response);
  const chunks: Buffer[] = [];
  for await (const chunk of response as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// ── Load payload ────────────────────────────────────────────────────────────

async function loadPayload() {
  const inputArg = process.argv.find((a) => a.startsWith("--input="));
  if (inputArg) {
    const p = path.resolve(inputArg.split("=")[1]);
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  }
  // Default: dynamically import the TS data file (tsx handles this)
  const mod = await import(DATA_FILE);
  return mod.sampleMediTrack;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const payload = await loadPayload();
  const beats: { caption: string }[] = payload.beats;

  console.log(
    `Generating TTS for ${beats.length} beats (voice ${VOICE_ID!.slice(0, 8)}…)\n`,
  );

  const client = new ElevenLabsClient({ apiKey: API_KEY });

  // ── 1. Per-beat audio with caching ────────────────────────────────────────
  const beatFiles: string[] = [];

  for (let i = 0; i < beats.length; i++) {
    const text = beats[i].caption;
    const h = cacheKey(VOICE_ID!, text);
    const cached = path.join(CACHE_DIR, `${h}.mp3`);

    if (fs.existsSync(cached)) {
      console.log(`  Beat ${i}: cached  (${h.slice(0, 8)}…)`);
    } else {
      console.log(`  Beat ${i}: calling ElevenLabs…`);
      const response = await client.textToSpeech.convert(VOICE_ID!, {
        text,
        model_id: "eleven_multilingual_v2",
      });
      fs.writeFileSync(cached, await collectBuffer(response));
      console.log(`  Beat ${i}: saved   (${h.slice(0, 8)}…)`);
    }

    beatFiles.push(cached);
  }

  // ── 2. Concatenate with silence padding ───────────────────────────────────
  console.log("\nConcatenating…");

  if (beatFiles.length === 1) {
    fs.copyFileSync(beatFiles[0], OUTPUT_MP3);
  } else {
    const inputs: string[] = [];
    const labels: string[] = [];
    let idx = 0;

    for (let i = 0; i < beatFiles.length; i++) {
      inputs.push(`-i "${beatFiles[i]}"`);
      labels.push(`[${idx}:a]`);
      idx++;

      if (i < beatFiles.length - 1) {
        inputs.push(
          `-f lavfi -t ${PAUSE_MS / 1000} -i anullsrc=r=44100:cl=mono`,
        );
        labels.push(`[${idx}:a]`);
        idx++;
      }
    }

    const filter = `${labels.join("")}concat=n=${labels.length}:v=0:a=1[out]`;
    execSync(
      `ffmpeg -y ${inputs.join(" ")} -filter_complex "${filter}" -map "[out]" -q:a 2 "${OUTPUT_MP3}"`,
      { stdio: "pipe" },
    );
  }

  // ── 3. Manifest with precise per-beat offsets ─────────────────────────────
  let offsetMs = 0;
  const manifestBeats = beatFiles.map((f, i) => {
    const dur = getDurationMs(f);
    const entry = {
      index: i,
      text: beats[i].caption,
      startMs: offsetMs,
      endMs: offsetMs + dur,
    };
    offsetMs += dur + (i < beatFiles.length - 1 ? PAUSE_MS : 0);
    return entry;
  });

  const manifest = {
    voiceId: VOICE_ID,
    totalDurationMs: getDurationMs(OUTPUT_MP3),
    pauseBetweenBeatsMs: PAUSE_MS,
    beats: manifestBeats,
  };

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log("Wrote manifest.");

  // ── 4. Patch sampleMediTrack.ts audioUrl ──────────────────────────────────
  let src = fs.readFileSync(DATA_FILE, "utf-8");

  if (/audioUrl:\s*""/.test(src)) {
    if (!src.includes("staticFile")) {
      src = `import { staticFile } from "remotion";\n` + src;
    }
    src = src.replace(
      /audioUrl:\s*"".*$/m,
      "audioUrl:         staticFile('audio/sample.mp3'),",
    );
    fs.writeFileSync(DATA_FILE, src);
    console.log("Patched sampleMediTrack.ts → staticFile('audio/sample.mp3')");
  } else {
    console.log("sampleMediTrack.ts audioUrl already set — skipping.");
  }

  // ── 5. Summary ────────────────────────────────────────────────────────────
  const totalS = (manifest.totalDurationMs / 1000).toFixed(1);
  console.log(`\n✓ Done — ${totalS}s of audio across ${beats.length} beats`);
  console.log(`  MP3:      public/audio/sample.mp3`);
  console.log(`  Manifest: public/audio/sample.manifest.json`);

  // Warn if audio exceeds the composition duration
  const lastBeat = payload.beats[payload.beats.length - 1];
  const compositionMs = ((lastBeat?.endFrame ?? 300) / 30) * 1000;
  if (manifest.totalDurationMs > compositionMs) {
    console.warn(
      `\n⚠  Audio (${totalS}s) exceeds composition (${(compositionMs / 1000).toFixed(1)}s).`,
    );
    console.warn(
      "   Consider extending beat endFrames or trimming captions.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
