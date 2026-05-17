"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleMediTrack = void 0;
const remotion_1 = require("remotion");
// ─── Sample payload — Priya lipid profile, 8 beats, ~33s ────────────────────
exports.sampleMediTrack = {
    patientFirstName: "Priya",
    reportType: "Lipid Profile",
    reportDate: "18 Oct 2025",
    lang: "hi",
    disclaimer: "यह medical advice नहीं है। Doctor से consult करें।",
    hasCriticalValue: false,
    audioUrl: (0, remotion_1.staticFile)('audio/sample.mp3'),
    avatarName: "डॉ. Asha",
    avatarRole: "MediTrack AI",
    beats: [
        {
            // Beat 1 · Greeting + scorecard overview
            startFrame: 0,
            endFrame: 135,
            caption: "नमस्ते Priya जी, यह आपकी Dr. Lal PathLabs की lipid profile report का summary है",
            chart: {
                kind: "scorecard",
                title: "Lipid Profile — 4 values",
                items: [
                    { label: "LDL", status: "high", displayValue: "142 mg/dL" },
                    { label: "Total Cholesterol", status: "normal", displayValue: "178 mg/dL" },
                    { label: "HDL", status: "normal", displayValue: "52 mg/dL" },
                    { label: "Triglycerides", status: "normal", displayValue: "124 mg/dL" },
                ],
                rotation: -1,
            },
            lookAt: "chart",
        },
        {
            // Beat 2 · Headline finding — LDL
            startFrame: 135,
            endFrame: 240,
            caption: "आपका LDL cholesterol 142 है — यह normal range से ऊपर है",
            chart: {
                kind: "bigNumber",
                label: "LDL CHOLESTEROL",
                value: "142",
                unit: "mg/dL",
                status: "high",
                trend: "up",
                delta: "↑ above normal range",
                rotation: -2,
            },
            lookAt: "chart",
        },
        {
            // Beat 3 · LDL trend over 6 months
            startFrame: 240,
            endFrame: 375,
            caption: "पिछले 6 महीनों में यह बढ़ता जा रहा है",
            chart: {
                kind: "combinedSparkline",
                label: "LDL CHOLESTEROL",
                value: "142",
                unit: "mg/dL",
                status: "high",
                history: [
                    { x: "May", y: 118 },
                    { x: "Jun", y: 124 },
                    { x: "Jul", y: 130 },
                    { x: "Aug", y: 138 },
                    { x: "Sep", y: 142 },
                    { x: "Oct", y: 142 },
                ],
                rotation: -1,
            },
            lookAt: "chart",
        },
        {
            // Beat 4 · Other findings — all normal
            startFrame: 375,
            endFrame: 510,
            caption: "बाकी values जैसे HDL, triglycerides normal range में हैं",
            chart: {
                kind: "bar",
                data: [
                    { emoji: "✓", label: "Total cholesterol", value: 178, displayValue: "178 mg/dL", status: "success" },
                    { emoji: "✓", label: "HDL", value: 52, displayValue: "52 mg/dL", status: "success" },
                    { emoji: "✓", label: "Triglycerides", value: 124, displayValue: "124 mg/dL", status: "success" },
                ],
                rotations: [-1, 1, -1],
            },
            lookAt: "chart",
        },
        {
            // Beat 5 · Why it matters
            startFrame: 510,
            endFrame: 615,
            caption: "LDL ज़्यादा होने से heart health पर असर पड़ सकता है",
            chart: null,
            lookAt: "viewer",
        },
        {
            // Beat 6 · Specific lifestyle action
            startFrame: 615,
            endFrame: 780,
            caption: "कोई बड़ी बात नहीं है — अगले 4-6 हफ़्ते oily food कम करें और रोज़ 20 minute walk करें",
            chart: null,
            lookAt: "viewer",
        },
        {
            // Beat 7 · Doctor recommendation
            startFrame: 780,
            endFrame: 885,
            caption: "3 महीने बाद यह value दोबारा check करवा लीजिए",
            chart: null,
            lookAt: "viewer",
        },
        {
            // Beat 8 · Closing scorecard
            startFrame: 885,
            endFrame: 1005,
            caption: "यह था आपकी report का summary — Doctor से ज़रूर मिलें",
            chart: {
                kind: "scorecard",
                title: "Summary",
                items: [
                    { label: "LDL", status: "high", displayValue: "142 mg/dL" },
                    { label: "Total Cholesterol", status: "normal", displayValue: "178 mg/dL" },
                    { label: "HDL", status: "normal", displayValue: "52 mg/dL" },
                    { label: "Triglycerides", status: "normal", displayValue: "124 mg/dL" },
                ],
                rotation: 1,
            },
            lookAt: "chart",
        },
    ],
};
