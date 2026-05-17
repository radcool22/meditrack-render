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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateScript = void 0;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const openai_1 = __importDefault(require("openai"));
const zod_1 = require("zod");
const env_1 = require("../env");
const errors_1 = require("./errors");
// Read prompt once on module load
const PROMPT_PATH = path.join(process.cwd(), "prompts/draft_script.md");
let PROMPT_TEXT;
try {
    PROMPT_TEXT = fs.readFileSync(PROMPT_PATH, "utf-8");
}
catch (err) {
    if (err.code === "ENOENT") {
        console.error(`[script] FATAL: prompts/draft_script.md not found at ${PROMPT_PATH}.\n` +
            "This file must exist at build time and be copied into the runtime image.\n" +
            "Check the Dockerfile COPY directives.");
    }
    throw err;
}
// ── Zod schema for LLM output ───────────────────────────────────────────────
const medicalStatus = zod_1.z.enum(["normal", "borderline", "high", "low", "critical"]);
const chartSpecSchema = zod_1.z.discriminatedUnion("kind", [
    zod_1.z.object({
        kind: zod_1.z.literal("bigNumber"),
        label: zod_1.z.string(),
        value: zod_1.z.string(),
        unit: zod_1.z.string().optional(),
        delta: zod_1.z.string().optional(),
        trend: zod_1.z.enum(["up", "down", "flat"]).optional(),
        status: medicalStatus.optional(),
        rotation: zod_1.z.number().optional(),
    }),
    zod_1.z.object({
        kind: zod_1.z.literal("bar"),
        data: zod_1.z.array(zod_1.z.object({
            label: zod_1.z.string(),
            emoji: zod_1.z.string(),
            value: zod_1.z.number(),
            displayValue: zod_1.z.string(),
            status: zod_1.z.enum(["success", "danger"]),
        })),
        rotations: zod_1.z.array(zod_1.z.number()).optional(),
    }),
    zod_1.z.object({
        kind: zod_1.z.literal("line"),
        title: zod_1.z.string(),
        titleEmoji: zod_1.z.string(),
        data: zod_1.z.array(zod_1.z.object({ x: zod_1.z.string(), y: zod_1.z.number() })),
        highlight: zod_1.z.number().optional(),
        rotation: zod_1.z.number().optional(),
    }),
    zod_1.z.object({
        kind: zod_1.z.literal("scorecard"),
        title: zod_1.z.string().optional(),
        items: zod_1.z.array(zod_1.z.object({
            label: zod_1.z.string(),
            status: medicalStatus,
            displayValue: zod_1.z.string().optional(),
        })).min(1),
        rotation: zod_1.z.number().optional(),
    }),
    zod_1.z.object({
        kind: zod_1.z.literal("combinedSparkline"),
        label: zod_1.z.string(),
        value: zod_1.z.string(),
        unit: zod_1.z.string(),
        status: medicalStatus,
        history: zod_1.z.array(zod_1.z.object({ x: zod_1.z.string(), y: zod_1.z.number() })).min(2),
        rotation: zod_1.z.number().optional(),
    }),
]);
const scriptOutputSchema = zod_1.z.object({
    patientFirstName: zod_1.z.string(),
    reportType: zod_1.z.string(),
    reportDate: zod_1.z.string(),
    lang: zod_1.z.literal("hi"),
    hasCriticalValue: zod_1.z.boolean(),
    beats: zod_1.z
        .array(zod_1.z.object({
        startFrame: zod_1.z.number(),
        endFrame: zod_1.z.number(),
        caption: zod_1.z.string(),
        chart: chartSpecSchema.nullable().optional(),
        lookAt: zod_1.z.enum(["chart", "viewer"]).optional(),
    }))
        .min(1),
});
function stripCodeFences(text) {
    return text
        .replace(/^```(?:json)?\s*\n?/gm, "")
        .replace(/\n?```\s*$/gm, "")
        .trim();
}
async function generateScript(patient, report, findings) {
    const e = (0, env_1.env)();
    const openai = new openai_1.default({ apiKey: e.OPENAI_API_KEY });
    const userContent = JSON.stringify({ patient, report, findings });
    const messages = [
        { role: "system", content: PROMPT_TEXT },
        { role: "user", content: userContent },
    ];
    for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt === 1) {
            messages.push({
                role: "system",
                content: "Your previous response was not valid JSON. Return ONLY a JSON object, no prose, no markdown.",
            });
        }
        const response = await openai.chat.completions.create({
            model: e.OPENAI_MODEL,
            response_format: { type: "json_object" },
            temperature: 0.3,
            messages,
        });
        const raw = response.choices[0]?.message?.content;
        if (!raw) {
            if (attempt === 1) {
                throw new errors_1.ScriptError("script_generation_failed", "LLM returned empty response after retry");
            }
            continue;
        }
        const cleaned = stripCodeFences(raw);
        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        }
        catch {
            if (attempt === 1) {
                throw new errors_1.ScriptError("script_generation_failed", "LLM did not return parseable JSON after retry");
            }
            continue;
        }
        // Backup safety check — LLM may return specialist_required
        if (typeof parsed === "object" &&
            parsed !== null &&
            parsed.error === "specialist_required") {
            throw new errors_1.SafetyError("specialist_required", String(parsed.message || "Specialist required"));
        }
        const validated = scriptOutputSchema.safeParse(parsed);
        if (!validated.success) {
            if (attempt === 1) {
                const details = validated.error.issues
                    .map((i) => `${i.path.join(".")}: ${i.message}`)
                    .join("; ");
                throw new errors_1.ScriptError("script_generation_failed", `LLM output did not match expected schema: ${details}`);
            }
            continue;
        }
        return validated.data;
    }
    throw new errors_1.ScriptError("script_generation_failed", "Script generation failed after all attempts");
}
exports.generateScript = generateScript;
