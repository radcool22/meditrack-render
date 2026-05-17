"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderVideo = void 0;
const node_path_1 = __importDefault(require("node:path"));
const bundler_1 = require("@remotion/bundler");
const renderer_1 = require("@remotion/renderer");
// Cache the Remotion bundle — expensive to create, reused across renders.
let bundlePromise = null;
function getBundle() {
    if (!bundlePromise) {
        const entryPoint = node_path_1.default.join(process.cwd(), "src/index.ts");
        console.log(`[render] Bundling from ${entryPoint}…`);
        bundlePromise = (0, bundler_1.bundle)({ entryPoint });
    }
    return bundlePromise;
}
async function renderVideo(payload, outputPath) {
    const bundled = await getBundle();
    const inputProps = { payload };
    const composition = await (0, renderer_1.selectComposition)({
        serveUrl: bundled,
        id: "MediTrack",
        inputProps,
    });
    // Duration from payload beats, falling back to composition default
    const lastBeat = payload.beats[payload.beats.length - 1];
    const durationInFrames = lastBeat?.endFrame ?? composition.durationInFrames;
    await (0, renderer_1.renderMedia)({
        composition: { ...composition, durationInFrames },
        serveUrl: bundled,
        codec: "h264",
        outputLocation: outputPath,
        inputProps,
        crf: 22,
    });
    return { durationSec: durationInFrames / composition.fps };
}
exports.renderVideo = renderVideo;
