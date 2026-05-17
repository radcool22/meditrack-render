"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const renderVideo_1 = require("./renderVideo");
async function main() {
    const [inputPath, outputPath] = process.argv.slice(2);
    if (!inputPath || !outputPath) {
        console.error("Usage: render:cli <input.json|input.ts> <output.mp4>");
        process.exit(1);
    }
    let payload;
    if (inputPath.endsWith(".json")) {
        payload = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf-8"));
    }
    else {
        const mod = await Promise.resolve(`${path.resolve(inputPath)}`).then(s => __importStar(require(s)));
        payload = mod.sampleMediTrack ?? mod.default;
    }
    if (!payload) {
        console.error("Could not load payload from", inputPath);
        process.exit(1);
    }
    console.log("Rendering…");
    const result = await (0, renderVideo_1.renderVideo)(payload, path.resolve(outputPath));
    console.log(`✓ Done. Duration: ${result.durationSec}s → ${outputPath}`);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
