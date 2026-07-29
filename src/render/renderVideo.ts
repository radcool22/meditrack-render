import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { MediTrackPayload } from "../data/sampleMediTrack";

// Cache the Remotion bundle — expensive to create, reused across renders.
let bundlePromise: Promise<string> | null = null;

export function getBundle(): Promise<string> {
  if (!bundlePromise) {
    const entryPoint = path.join(process.cwd(), "src/index.ts");
    console.log(`[render] Bundling from ${entryPoint}…`);
    bundlePromise = bundle({ entryPoint });
  }
  return bundlePromise;
}

// The Chromium-touching part, split out so it can be run in an isolated
// child process (see renderVideo.child.ts) without re-bundling per job.
export async function renderFromBundle(
  serveUrl: string,
  payload: MediTrackPayload,
  outputPath: string,
): Promise<{ durationSec: number }> {
  const inputProps = { payload };

  const composition = await selectComposition({
    serveUrl,
    id: "MediTrack",
    inputProps,
  });

  // Duration from payload beats, falling back to composition default
  const lastBeat = payload.beats[payload.beats.length - 1];
  const durationInFrames = lastBeat?.endFrame ?? composition.durationInFrames;

  await renderMedia({
    composition: { ...composition, durationInFrames },
    serveUrl,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    crf: 22,
  });

  return { durationSec: durationInFrames / composition.fps };
}

export async function renderVideo(
  payload: MediTrackPayload,
  outputPath: string,
): Promise<{ durationSec: number }> {
  const bundled = await getBundle();
  return renderFromBundle(bundled, payload, outputPath);
}
