import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { renderVideo } from "../../src/render/renderVideo";
import { startAssetServer } from "./local-asset-server";
import { SafetyError, ScriptError, PipelineError } from "./errors";
import { checkSafetyGates } from "./safety";
import { generateScript } from "./script";
import { lintScript } from "./lint";
import { generateVoice } from "./voice";
import { recomputeTiming } from "./timing";
import { uploadToR2 } from "./upload";
import { postCallback } from "./callback";
import type { RenderJobData } from "../types";

export async function runPipeline(data: RenderJobData): Promise<void> {
  const { jobId, reportId, callbackUrl, patient, report, findings } = data;
  const jobDir = fs.mkdtempSync(path.join(os.tmpdir(), `meditrack-${jobId.slice(0, 8)}-`));
  const mp4Path = path.join(jobDir, `${jobId}.mp4`);

  try {
    // 1. Safety gates — before any LLM spend
    console.log(`[pipeline] Safety gates for ${reportId}…`);
    checkSafetyGates(patient);

    // 2. Script generation (OpenAI)
    console.log("[pipeline] Generating script…");
    const script = await generateScript(patient, report, findings);

    // 3. Script lint (safety checks)
    console.log("[pipeline] Linting script…");
    lintScript(script, findings);

    // 4. TTS (ElevenLabs)
    console.log("[pipeline] Generating voice…");
    const voice = await generateVoice(script.beats, jobDir);

    // 5. Timing recomputation — overrides LLM frame guesses with real audio durations
    console.log("[pipeline] Recomputing timing…");
    const payload = recomputeTiming(script, voice, voice.masterAudioPath);

    // 6. Render — serve job audio via local HTTP for Remotion
    let durationSec: number;
    const assetServer = await startAssetServer(jobDir);
    try {
      payload.audioUrl = `${assetServer.url}/master.mp3`;
      console.log(`[pipeline] Rendering ${reportId}…`);
      ({ durationSec } = await renderVideo(payload, mp4Path));
    } finally {
      await assetServer.close();
    }

    // 7. Upload to R2
    console.log("[pipeline] Uploading to R2…");
    const videoUrl = await uploadToR2(reportId, jobId, mp4Path);

    // 8. Callback — success
    console.log(`[pipeline] Callback → ${callbackUrl}`);
    await postCallback(callbackUrl, {
      jobId,
      reportId,
      status: "completed",
      videoUrl,
      durationSec,
    });
  } catch (err) {
    // Determine error code for structured callback
    let code = "render_failed";
    if (
      err instanceof SafetyError ||
      err instanceof ScriptError ||
      err instanceof PipelineError
    ) {
      code = err.code;
    }

    const message = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline] Failed (${code}): ${message}`);

    await postCallback(callbackUrl, {
      jobId,
      reportId,
      status: "failed",
      error: code,
      message,
    });

    throw err; // Re-throw so BullMQ marks the job as failed
  } finally {
    // Clean up job temp dir — TTS cache (/tmp/tts-cache/) is preserved
    try {
      fs.rmSync(jobDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.warn(`[pipeline] Cleanup failed for ${jobDir}: ${cleanupErr}`);
    }
  }
}
