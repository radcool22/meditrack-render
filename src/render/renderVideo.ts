import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { MediTrackPayload } from "../data/sampleMediTrack";

// Cache the Remotion bundle — expensive to create, reused across renders.
let bundlePromise: Promise<string> | null = null;

function getBundle(): Promise<string> {
  if (!bundlePromise) {
    const entryPoint = path.join(process.cwd(), "src/index.ts");
    console.log(`[render] Bundling from ${entryPoint}…`);
    bundlePromise = bundle({ entryPoint });
  }
  return bundlePromise;
}

export async function renderVideo(
  payload: MediTrackPayload,
  outputPath: string,
): Promise<{ durationSec: number }> {
  const bundled = await getBundle();
  const inputProps = { payload };

  const composition = await selectComposition({
    serveUrl: bundled,
    id: "MediTrack",
    inputProps,
  });

  // Duration from payload beats, falling back to composition default
  const lastBeat = payload.beats[payload.beats.length - 1];
  const durationInFrames = lastBeat?.endFrame ?? composition.durationInFrames;

  await renderMedia({
    composition: { ...composition, durationInFrames },
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    crf: 22,
  });

  return { durationSec: durationInFrames / composition.fps };
}
