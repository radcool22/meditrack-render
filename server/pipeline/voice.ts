import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { env } from "../env";
import { log } from "../log";
import { PipelineError } from "./errors";

// Persistent cache dir — survives across jobs
const TTS_CACHE_DIR = path.join(os.tmpdir(), "tts-cache");
fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });

function cacheKey(voiceId: string, text: string): string {
  return createHash("sha256").update(`${voiceId}:${text}`).digest("hex");
}

function getDurationMs(filePath: string): number {
  const exists = fs.existsSync(filePath);
  const size = exists ? fs.statSync(filePath).size : 0;
  let firstBytes = "";
  if (exists && size > 0) {
    firstBytes = fs.readFileSync(filePath).slice(0, 16).toString("hex");
  }
  log("info", "Pre-ffprobe diagnostic", {
    path: filePath,
    exists,
    sizeBytes: size,
    first16BytesHex: firstBytes,
  });

  const raw = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv="p=0" "${filePath}"`,
    { encoding: "utf-8" },
  );
  return Math.round(parseFloat(raw.trim()) * 1000);
}

async function collectBuffer(response: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(response)) return response;
  if (response instanceof Uint8Array) return Buffer.from(response);
  const chunks: Buffer[] = [];
  for await (const chunk of response as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export type VoiceResult = {
  masterAudioPath: string;
  beatAudios: Array<{ index: number; durationMs: number }>;
  totalDurationMs: number;
};

export async function generateVoice(
  beats: Array<{ caption: string }>,
  jobDir: string,
): Promise<VoiceResult> {
  const e = env();
  const voiceId = e.ELEVENLABS_VOICE_ID_HI;
  const client = new ElevenLabsClient({ apiKey: e.ELEVENLABS_API_KEY });

  const beatAudios: Array<{
    index: number;
    audioPath: string;
    durationMs: number;
  }> = [];

  for (let i = 0; i < beats.length; i++) {
    const text = beats[i].caption;
    const hash = cacheKey(voiceId, text);
    const cached = path.join(TTS_CACHE_DIR, `${hash}.mp3`);
    const beatPath = path.join(jobDir, `beat-${i}.mp3`);

    if (fs.existsSync(cached)) {
      console.log(`[voice] Beat ${i}: cached (${hash.slice(0, 8)}…)`);
      fs.copyFileSync(cached, beatPath);
    } else {
      console.log(`[voice] Beat ${i}: calling ElevenLabs…`);

      let audio: Buffer | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await client.textToSpeech.convert(voiceId, {
            text,
            modelId: "eleven_multilingual_v2",
          });
          audio = await collectBuffer(response);
          break;
        } catch (err) {
          if (attempt === 0) {
            console.warn(`[voice] Beat ${i}: retry in 2s…`);
            await new Promise((r) => setTimeout(r, 2000));
          } else {
            throw new PipelineError(
              "tts_failed",
              `ElevenLabs failed for beat ${i}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }

      fs.writeFileSync(cached, audio!);
      fs.copyFileSync(cached, beatPath);
      console.log(`[voice] Beat ${i}: saved (${hash.slice(0, 8)}…)`);
    }

    const durationMs = getDurationMs(beatPath);
    beatAudios.push({ index: i, audioPath: beatPath, durationMs });
  }

  // Concatenate with 200ms silence between beats
  const masterPath = path.join(jobDir, "master.mp3");

  if (beatAudios.length === 1) {
    fs.copyFileSync(beatAudios[0].audioPath, masterPath);
  } else {
    const inputs: string[] = [];
    const labels: string[] = [];
    let idx = 0;

    for (let i = 0; i < beatAudios.length; i++) {
      inputs.push(`-i "${beatAudios[i].audioPath}"`);
      labels.push(`[${idx}:a]`);
      idx++;
      if (i < beatAudios.length - 1) {
        inputs.push("-f lavfi -t 0.2 -i anullsrc=r=44100:cl=mono");
        labels.push(`[${idx}:a]`);
        idx++;
      }
    }

    const filter = `${labels.join("")}concat=n=${labels.length}:v=0:a=1[out]`;
    execSync(
      `ffmpeg -y ${inputs.join(" ")} -filter_complex "${filter}" -map "[out]" -q:a 2 "${masterPath}"`,
      { stdio: "pipe" },
    );
  }

  const totalDurationMs = getDurationMs(masterPath);

  return {
    masterAudioPath: masterPath,
    beatAudios: beatAudios.map(({ index, durationMs }) => ({
      index,
      durationMs,
    })),
    totalDurationMs,
  };
}
