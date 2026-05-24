import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { UnrecoverableError } from "bullmq";
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
import { log } from "../log";
import type { RenderJobData } from "../types";

export async function runPipeline(data: RenderJobData): Promise<void> {
  const { jobId, reportId, callbackUrl, patient, report, findings } = data;
  const jobDir = fs.mkdtempSync(path.join(os.tmpdir(), `meditrack-${jobId.slice(0, 8)}-`));
  const mp4Path = path.join(jobDir, `${jobId}.mp4`);

  try {
    // 1. Safety gates — before any LLM spend
    log("info", "Safety gates", { jobId, reportId });
    checkSafetyGates(patient);

    // 2. Script generation (OpenAI)
    log("info", "Generating script", { jobId, reportId });
    const script = await generateScript(patient, report, findings);

    log("info", "Script captions", {
      jobId,
      captions: script.beats.map((b, i) => ({ idx: i, caption: b.caption })),
    });

    // 3. Script lint (safety checks)
    log("info", "Linting script", { jobId, reportId });
    lintScript(script, findings);

    // 4. TTS (ElevenLabs)
    log("info", "Generating voice", { jobId, reportId });
    const voice = await generateVoice(script.beats, jobDir);

    // 5. Timing recomputation — overrides LLM frame guesses with real audio durations
    log("info", "Recomputing timing", { jobId, reportId });
    const payload = recomputeTiming(script, voice, voice.masterAudioPath);

    // 6. Render — serve job audio via local HTTP for Remotion
    let durationSec: number;
    const assetServer = await startAssetServer(jobDir);
    try {
      payload.audioUrl = `${assetServer.url}/master.mp3`;
      log("info", "Rendering", { jobId, reportId });
      ({ durationSec } = await renderVideo(payload, mp4Path));
    } finally {
      await assetServer.close();
    }

    // 7. Upload to R2
    log("info", "Uploading to R2", { jobId, reportId });
    const videoUrl = await uploadToR2(reportId, jobId, mp4Path);

    // 8. Callback — success
    log("info", "Callback", { jobId, reportId, callbackUrl });
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
    log("error", "Pipeline failed", { jobId, reportId, code, message });

    await postCallback(callbackUrl, {
      jobId,
      reportId,
      status: "failed",
      error: code,
      message,
    });

    // Non-retryable errors: safety gates, lint violations, number hallucinations.
    // These will fail identically on retry — don't waste API spend.
    if (err instanceof SafetyError || err instanceof ScriptError) {
      throw new UnrecoverableError(`${code}: ${message}`);
    }
    throw err; // Retryable: tts_failed, render_failed (may be transient)
  } finally {
    // Clean up job temp dir — TTS cache (/tmp/tts-cache/) is preserved
    try {
      fs.rmSync(jobDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      log("warn", "Cleanup failed", { jobId, dir: jobDir });
    }
  }
}
