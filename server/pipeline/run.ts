import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { renderVideo } from "../../src/render/renderVideo";
import { uploadToR2 } from "./upload";
import { postCallback } from "./callback";
import type { RenderJobData } from "../types";

export async function runPipeline(data: RenderJobData): Promise<void> {
  const { jobId, reportId, callbackUrl, payload } = data;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "meditrack-"));
  const mp4Path = path.join(tmpDir, `${jobId}.mp4`);

  try {
    // 1. Render video (real — uses Remotion)
    console.log(`[pipeline] Rendering ${reportId}…`);
    const { durationSec } = await renderVideo(payload, mp4Path);

    // 2. Upload to R2
    console.log("[pipeline] Uploading to R2…");
    const videoUrl = await uploadToR2(reportId, jobId, mp4Path);

    // 3. Callback — success
    console.log(`[pipeline] Callback → ${callbackUrl}`);
    await postCallback(callbackUrl, {
      jobId,
      reportId,
      status: "completed",
      videoUrl,
      durationSec,
    });
  } catch (err) {
    // Callback — failure
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline] Failed: ${message}`);
    await postCallback(callbackUrl, {
      jobId,
      reportId,
      status: "failed",
      error: "render_failed",
      message,
    });
    throw err; // Re-throw so BullMQ marks the job as failed
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
