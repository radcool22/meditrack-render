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
exports.lintScript = void 0;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const errors_1 = require("./errors");
// Load banned meds list once on module load
const BANNED_MEDS_PATH = path.join(process.cwd(), "server/safety/banned-meds.txt");
let BANNED_MEDS;
try {
    BANNED_MEDS = fs
        .readFileSync(BANNED_MEDS_PATH, "utf-8")
        .split("\n")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
}
catch (err) {
    if (err.code === "ENOENT") {
        console.error(`[lint] FATAL: banned-meds.txt not found at ${BANNED_MEDS_PATH}.\n` +
            "This file must exist at build time and be copied into the runtime image.\n" +
            "Check the Dockerfile COPY directives.");
    }
    throw err;
}
/**
 * Extract user-facing text strings from a chart spec.
 * Excludes structural fields (rotation, startFrame, endFrame, highlight, etc.).
 */
function extractChartText(chart) {
    if (!chart)
        return [];
    const texts = [];
    if (chart.kind === "bigNumber") {
        texts.push(chart.value);
        if (chart.delta)
            texts.push(chart.delta);
    }
    else if (chart.kind === "bar") {
        for (const row of chart.data) {
            texts.push(String(row.value), row.displayValue);
        }
    }
    else if (chart.kind === "line") {
        for (const point of chart.data) {
            texts.push(String(point.y));
        }
    }
    return texts;
}
function lintScript(script, findings) {
    const captions = script.beats.map((b) => b.caption);
    const allCaptionText = captions.join(" ");
    // ── Rule 1: Banned diagnostic phrasing ────────────────────────────────────
    const diagnosticPatterns = [
        /aapko\s+.{1,30}\s+hai/gi,
        /आपको\s+.{1,30}\s+है/gi,
        /\bdiagnos[ei]s?\b/gi,
        /\bcondition\b/gi,
    ];
    for (const pattern of diagnosticPatterns) {
        const match = allCaptionText.match(pattern);
        if (match) {
            throw new errors_1.ScriptError("script_safety_violation", `Banned diagnostic phrase: "${match[0]}"`);
        }
    }
    // ── Rule 2: Banned medication mentions ────────────────────────────────────
    for (const med of BANNED_MEDS) {
        const regex = new RegExp(`\\b${med}\\b`, "i");
        for (const caption of captions) {
            if (regex.test(caption)) {
                throw new errors_1.ScriptError("script_safety_violation", `Banned medication mention: ${med}`);
            }
        }
        for (const beat of script.beats) {
            const chartJson = JSON.stringify(beat.chart);
            if (regex.test(chartJson)) {
                throw new errors_1.ScriptError("script_safety_violation", `Banned medication mention in chart: ${med}`);
            }
        }
    }
    // ── Rule 3: Required doctor recommendation ────────────────────────────────
    const hasAbnormal = findings.some((f) => ["high", "low", "critical_high", "critical_low"].includes(f.status));
    if (hasAbnormal) {
        const hasDoctorMention = captions.some((c) => /doctor/i.test(c));
        if (!hasDoctorMention) {
            throw new errors_1.ScriptError("script_safety_violation", "Abnormal finding present but no doctor recommendation in script");
        }
    }
    // ── Rule 4: Number grounding ──────────────────────────────────────────────
    // Collect all valid numbers from findings
    const groundedNumbers = new Set();
    for (const f of findings) {
        groundedNumbers.add(f.value);
        if (f.referenceRange.low !== null)
            groundedNumbers.add(f.referenceRange.low);
        if (f.referenceRange.high !== null)
            groundedNumbers.add(f.referenceRange.high);
        if (f.history) {
            for (const h of f.history)
                groundedNumbers.add(h.value);
        }
    }
    for (const beat of script.beats) {
        // Check caption numbers
        const captionNums = beat.caption.match(/\d+(\.\d+)?/g) || [];
        for (const numStr of captionNums) {
            const num = parseFloat(numStr);
            if (!groundedNumbers.has(num)) {
                throw new errors_1.ScriptError("script_number_hallucination", `Number ${numStr} in caption does not match any finding`);
            }
        }
        // Check user-facing chart values
        const chartTexts = beat.chart ? extractChartText(beat.chart) : [];
        for (const text of chartTexts) {
            const nums = String(text).match(/\d+(\.\d+)?/g) || [];
            for (const numStr of nums) {
                const num = parseFloat(numStr);
                if (!groundedNumbers.has(num)) {
                    throw new errors_1.ScriptError("script_number_hallucination", `Number ${numStr} in chart does not match any finding`);
                }
            }
        }
    }
    console.log("[lint] ok");
}
exports.lintScript = lintScript;
