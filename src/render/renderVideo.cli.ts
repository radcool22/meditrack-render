import * as fs from "node:fs";
import * as path from "node:path";
import { renderVideo } from "./renderVideo";

async function main() {
  const [inputPath, outputPath] = process.argv.slice(2);

  if (!inputPath || !outputPath) {
    console.error("Usage: render:cli <input.json|input.ts> <output.mp4>");
    process.exit(1);
  }

  let payload;
  if (inputPath.endsWith(".json")) {
    payload = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf-8"));
  } else {
    const mod = await import(path.resolve(inputPath));
    payload = mod.sampleMediTrack ?? mod.default;
  }

  if (!payload) {
    console.error("Could not load payload from", inputPath);
    process.exit(1);
  }

  console.log("Rendering…");
  const result = await renderVideo(payload, path.resolve(outputPath));
  console.log(`✓ Done. Duration: ${result.durationSec}s → ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
