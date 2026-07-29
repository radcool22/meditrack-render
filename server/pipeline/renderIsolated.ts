import { fork, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { getBundle } from "../../src/render/renderVideo";
import type { MediTrackPayload } from "../../src/data/sampleMediTrack";
import { PipelineError } from "./errors";
import { log } from "../log";

// Comfortably under the BullMQ job lock duration (10 min, see worker.ts) so a
// hung render is killed and failed before the job lock itself expires.
const RENDER_CHILD_TIMEOUT_MS = 8 * 60 * 1000;

const isProd = process.env.NODE_ENV === "production";

function resolveChildScript(): { execPath: string; modulePath: string } {
  if (isProd) {
    return {
      execPath: process.execPath,
      modulePath: path.join(
        process.cwd(),
        "dist/src/render/renderVideo.child.js",
      ),
    };
  }
  return {
    execPath: path.join(process.cwd(), "node_modules/.bin/tsx"),
    modulePath: path.join(process.cwd(), "src/render/renderVideo.child.ts"),
  };
}

type ChildMessage =
  | { ok: true; durationSec: number }
  | { ok: false; message: string };

// Runs the Remotion/Chromium render in a separate OS process. If that
// process crashes, hangs, or gets OOM-killed, this rejects with a normal
// PipelineError instead of taking down the caller — the whole point being
// that a bad render can never again kill the worker that owns the queue.
export async function renderVideoIsolated(
  payload: MediTrackPayload,
  outputPath: string,
): Promise<{ durationSec: number }> {
  const serveUrl = await getBundle();

  const payloadPath = path.join(
    path.dirname(outputPath),
    "render-input.json",
  );
  fs.writeFileSync(payloadPath, JSON.stringify(payload));

  const { execPath, modulePath } = resolveChildScript();

  return new Promise((resolve, reject) => {
    let settled = false;

    const child: ChildProcess = fork(
      modulePath,
      [serveUrl, payloadPath, outputPath],
      { execPath, stdio: ["ignore", "inherit", "inherit", "ipc"] },
    );

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      log("error", "Render child timed out — killing", { pid: child.pid });
      child.kill("SIGKILL");
      reject(
        new PipelineError(
          "render_timeout",
          `Render exceeded ${RENDER_CHILD_TIMEOUT_MS}ms and was killed`,
        ),
      );
    }, RENDER_CHILD_TIMEOUT_MS);

    child.on("message", (msg: ChildMessage) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (msg.ok) {
        resolve({ durationSec: msg.durationSec });
      } else {
        reject(new PipelineError("render_failed", msg.message));
      }
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(
        new PipelineError(
          "render_failed",
          `Failed to start render process: ${err.message}`,
        ),
      );
    });

    child.on("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(
        new PipelineError(
          "render_failed",
          `Render process exited unexpectedly (code=${code}, signal=${signal})`,
        ),
      );
    });
  });
}
