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
exports.runPipeline = void 0;
const fs = __importStar(require("node:fs"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const renderVideo_1 = require("../../src/render/renderVideo");
const local_asset_server_1 = require("./local-asset-server");
const errors_1 = require("./errors");
const safety_1 = require("./safety");
const script_1 = require("./script");
const lint_1 = require("./lint");
const voice_1 = require("./voice");
const timing_1 = require("./timing");
const upload_1 = require("./upload");
const callback_1 = require("./callback");
const log_1 = require("../log");
async function runPipeline(data) {
    const { jobId, reportId, callbackUrl, patient, report, findings } = data;
    const jobDir = fs.mkdtempSync(path.join(os.tmpdir(), `meditrack-${jobId.slice(0, 8)}-`));
    const mp4Path = path.join(jobDir, `${jobId}.mp4`);
    try {
        // 1. Safety gates — before any LLM spend
        (0, log_1.log)("info", "Safety gates", { jobId, reportId });
        (0, safety_1.checkSafetyGates)(patient);
        // 2. Script generation (OpenAI)
        (0, log_1.log)("info", "Generating script", { jobId, reportId });
        const script = await (0, script_1.generateScript)(patient, report, findings);
        // 3. Script lint (safety checks)
        (0, log_1.log)("info", "Linting script", { jobId, reportId });
        (0, lint_1.lintScript)(script, findings);
        // 4. TTS (ElevenLabs)
        (0, log_1.log)("info", "Generating voice", { jobId, reportId });
        const voice = await (0, voice_1.generateVoice)(script.beats, jobDir);
        // 5. Timing recomputation — overrides LLM frame guesses with real audio durations
        (0, log_1.log)("info", "Recomputing timing", { jobId, reportId });
        const payload = (0, timing_1.recomputeTiming)(script, voice, voice.masterAudioPath);
        // 6. Render — serve job audio via local HTTP for Remotion
        let durationSec;
        const assetServer = await (0, local_asset_server_1.startAssetServer)(jobDir);
        try {
            payload.audioUrl = `${assetServer.url}/master.mp3`;
            (0, log_1.log)("info", "Rendering", { jobId, reportId });
            ({ durationSec } = await (0, renderVideo_1.renderVideo)(payload, mp4Path));
        }
        finally {
            await assetServer.close();
        }
        // 7. Upload to R2
        (0, log_1.log)("info", "Uploading to R2", { jobId, reportId });
        const videoUrl = await (0, upload_1.uploadToR2)(reportId, jobId, mp4Path);
        // 8. Callback — success
        (0, log_1.log)("info", "Callback", { jobId, reportId, callbackUrl });
        await (0, callback_1.postCallback)(callbackUrl, {
            jobId,
            reportId,
            status: "completed",
            videoUrl,
            durationSec,
        });
    }
    catch (err) {
        // Determine error code for structured callback
        let code = "render_failed";
        if (err instanceof errors_1.SafetyError ||
            err instanceof errors_1.ScriptError ||
            err instanceof errors_1.PipelineError) {
            code = err.code;
        }
        const message = err instanceof Error ? err.message : String(err);
        (0, log_1.log)("error", "Pipeline failed", { jobId, reportId, code, message });
        await (0, callback_1.postCallback)(callbackUrl, {
            jobId,
            reportId,
            status: "failed",
            error: code,
            message,
        });
        throw err; // Re-throw so BullMQ marks the job as failed
    }
    finally {
        // Clean up job temp dir — TTS cache (/tmp/tts-cache/) is preserved
        try {
            fs.rmSync(jobDir, { recursive: true, force: true });
        }
        catch (cleanupErr) {
            (0, log_1.log)("warn", "Cleanup failed", { jobId, dir: jobDir });
        }
    }
}
exports.runPipeline = runPipeline;
