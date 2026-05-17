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
exports.generateVoice = void 0;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const os = __importStar(require("node:os"));
const node_crypto_1 = require("node:crypto");
const node_child_process_1 = require("node:child_process");
const elevenlabs_js_1 = require("@elevenlabs/elevenlabs-js");
const env_1 = require("../env");
const errors_1 = require("./errors");
// Persistent cache dir — survives across jobs
const TTS_CACHE_DIR = path.join(os.tmpdir(), "tts-cache");
fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });
function cacheKey(voiceId, text) {
    return (0, node_crypto_1.createHash)("sha256").update(`${voiceId}:${text}`).digest("hex");
}
function getDurationMs(filePath) {
    const raw = (0, node_child_process_1.execSync)(`ffprobe -v quiet -show_entries format=duration -of csv="p=0" "${filePath}"`, { encoding: "utf-8" });
    return Math.round(parseFloat(raw.trim()) * 1000);
}
async function collectBuffer(response) {
    if (Buffer.isBuffer(response))
        return response;
    if (response instanceof Uint8Array)
        return Buffer.from(response);
    const chunks = [];
    for await (const chunk of response) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}
async function generateVoice(beats, jobDir) {
    const e = (0, env_1.env)();
    const voiceId = e.ELEVENLABS_VOICE_ID_HI;
    const client = new elevenlabs_js_1.ElevenLabsClient({ apiKey: e.ELEVENLABS_API_KEY });
    const beatAudios = [];
    for (let i = 0; i < beats.length; i++) {
        const text = beats[i].caption;
        const hash = cacheKey(voiceId, text);
        const cached = path.join(TTS_CACHE_DIR, `${hash}.mp3`);
        const beatPath = path.join(jobDir, `beat-${i}.mp3`);
        if (fs.existsSync(cached)) {
            console.log(`[voice] Beat ${i}: cached (${hash.slice(0, 8)}…)`);
            fs.copyFileSync(cached, beatPath);
        }
        else {
            console.log(`[voice] Beat ${i}: calling ElevenLabs…`);
            let audio = null;
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const response = await client.textToSpeech.convert(voiceId, {
                        text,
                        modelId: "eleven_multilingual_v2",
                    });
                    audio = await collectBuffer(response);
                    break;
                }
                catch (err) {
                    if (attempt === 0) {
                        console.warn(`[voice] Beat ${i}: retry in 2s…`);
                        await new Promise((r) => setTimeout(r, 2000));
                    }
                    else {
                        throw new errors_1.PipelineError("tts_failed", `ElevenLabs failed for beat ${i}: ${err instanceof Error ? err.message : String(err)}`);
                    }
                }
            }
            fs.writeFileSync(cached, audio);
            fs.copyFileSync(cached, beatPath);
            console.log(`[voice] Beat ${i}: saved (${hash.slice(0, 8)}…)`);
        }
        const durationMs = getDurationMs(beatPath);
        beatAudios.push({ index: i, audioPath: beatPath, durationMs });
    }
    // Concatenate with 200ms silence between beats
    const masterPath = path.join(jobDir, "master.mp3");
    if (beatAudios.length === 1) {
        fs.copyFileSync(beatAudios[0].audioPath, masterPath);
    }
    else {
        const inputs = [];
        const labels = [];
        let idx = 0;
        for (let i = 0; i < beatAudios.length; i++) {
            inputs.push(`-i "${beatAudios[i].audioPath}"`);
            labels.push(`[${idx}:a]`);
            idx++;
            if (i < beatAudios.length - 1) {
                inputs.push("-f lavfi -t 0.2 -i anullsrc=r=44100:cl=mono");
                labels.push(`[${idx}:a]`);
                idx++;
            }
        }
        const filter = `${labels.join("")}concat=n=${labels.length}:v=0:a=1[out]`;
        (0, node_child_process_1.execSync)(`ffmpeg -y ${inputs.join(" ")} -filter_complex "${filter}" -map "[out]" -q:a 2 "${masterPath}"`, { stdio: "pipe" });
    }
    const totalDurationMs = getDurationMs(masterPath);
    return {
        masterAudioPath: masterPath,
        beatAudios: beatAudios.map(({ index, durationMs }) => ({
            index,
            durationMs,
        })),
        totalDurationMs,
    };
}
exports.generateVoice = generateVoice;
