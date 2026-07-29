import * as fs from "node:fs";
import { renderFromBundle } from "./renderVideo";

// Standalone entrypoint forked as a separate OS process by
// server/pipeline/renderIsolated.ts. Runs only the Chromium-touching part of
// a render, so a Remotion/Chromium crash can only take down this process,
// never the parent (HTTP server + BullMQ worker).

async function main() {
  const [serveUrl, payloadPath, outputPath] = process.argv.slice(2);

  if (!serveUrl || !payloadPath || !outputPath) {
    throw new Error(
      "Usage: renderVideo.child <serveUrl> <payload.json> <output.mp4>",
    );
  }

  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf-8"));
  const result = await renderFromBundle(serveUrl, payload, outputPath);

  process.send?.({ ok: true, durationSec: result.durationSec });
  process.exit(0);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[render-child] ${message}`);
  process.send?.({ ok: false, message });
  process.exit(1);
});
