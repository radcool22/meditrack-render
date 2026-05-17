"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Character = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const remotion_1 = require("remotion");
const media_utils_1 = require("@remotion/media-utils");
const theme_1 = require("../theme");
// Character-specific palette — will move to theme.ts once the design stabilises (§10).
const SKIN = '#D4A574';
const SKIN_SHADOW = '#B08860';
const HAIR = '#3D2914';
const COAT = '#f0f1f3';
const COAT_EDGE = '#dcdee2';
const MOUTH_OPEN = '#C06040';
const Character = ({ audioUrl, lookAt = 'viewer', centered = false }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    // ── Audio data for talking animation ──────────────────────────────────────
    const [audioData, setAudioData] = (0, react_1.useState)(null);
    const [handle] = (0, react_1.useState)(() => audioUrl ? (0, remotion_1.delayRender)('Loading audio for Character') : null);
    (0, react_1.useEffect)(() => {
        if (!audioUrl || handle === null)
            return;
        (0, media_utils_1.getAudioData)(audioUrl)
            .then((data) => {
            setAudioData(data);
            (0, remotion_1.continueRender)(handle);
        })
            .catch(() => (0, remotion_1.continueRender)(handle));
    }, [audioUrl, handle]);
    // ── Ambient: breathing ────────────────────────────────────────────────────
    // scaleY 0.98–1.0, period 120 frames (4 s)
    const breathe = 0.99 + 0.01 * Math.sin((frame * 2 * Math.PI) / 120);
    // ── Ambient: blink ────────────────────────────────────────────────────────
    // Every ~180 frames (6 s), 4-frame closure
    const blinkPhase = frame % 180;
    const eyeScaleY = blinkPhase < 4
        ? (0, remotion_1.interpolate)(blinkPhase, [0, 2, 4], [1, 0, 1], {
            extrapolateRight: 'clamp',
        })
        : 1;
    // ── Ambient: idle sway ────────────────────────────────────────────────────
    // ±1°, period 180 frames (6 s)
    const sway = Math.sin((frame * 2 * Math.PI) / 180);
    // ── Talking: mouth amplitude ──────────────────────────────────────────────
    let mouthOpen = 0;
    if (audioData) {
        const viz = (0, media_utils_1.visualizeAudio)({
            fps,
            frame,
            audioData,
            numberOfSamples: 16,
        });
        const avg = viz.reduce((sum, v) => sum + v, 0) / viz.length;
        mouthOpen = Math.min(1, avg * 3); // scale up for visible mouth movement
    }
    // ── lookAt tilt ───────────────────────────────────────────────────────────
    // 'chart' → tilt 5° left (charts are on the left side of the canvas)
    const tilt = lookAt === 'chart' ? -5 : 0;
    // ── Eye colour: slightly darker when talking ──────────────────────────────
    const eyeColor = mouthOpen > 0.1 ? '#1a0f08' : '#2D1810';
    return ((0, jsx_runtime_1.jsx)("div", { style: {
            position: 'absolute',
            bottom: theme_1.theme.safeBottom,
            ...(centered
                ? { left: '50%', marginLeft: -130 } // 260px width / 2
                : { right: 60 }),
            width: 260,
            height: theme_1.theme.sizes.characterHeight,
            transform: `${centered ? 'scale(1.2) ' : ''}scaleY(${breathe}) rotate(${sway + tilt}deg)`,
            transformOrigin: 'bottom center',
        }, children: (0, jsx_runtime_1.jsxs)("svg", { viewBox: "0 0 240 480", width: 260, height: theme_1.theme.sizes.characterHeight, fill: "none", children: [(0, jsx_runtime_1.jsxs)("g", { id: "body", children: [(0, jsx_runtime_1.jsx)("path", { d: "M 75 210 Q 75 200 85 200 L 155 200 Q 165 200 165 210 L 175 440 Q 175 465 145 465 L 95 465 Q 65 465 65 440 Z", fill: COAT, stroke: COAT_EDGE, strokeWidth: 1.5 }), (0, jsx_runtime_1.jsx)("path", { d: "M 98 200 L 120 248", stroke: COAT_EDGE, strokeWidth: 2 }), (0, jsx_runtime_1.jsx)("path", { d: "M 142 200 L 120 248", stroke: COAT_EDGE, strokeWidth: 2 }), (0, jsx_runtime_1.jsx)("rect", { x: 45, y: 228, width: 32, height: 90, rx: 16, fill: COAT, stroke: COAT_EDGE, strokeWidth: 1.5 }), (0, jsx_runtime_1.jsx)("rect", { x: 163, y: 228, width: 32, height: 90, rx: 16, fill: COAT, stroke: COAT_EDGE, strokeWidth: 1.5 }), (0, jsx_runtime_1.jsx)("path", { d: "M 100 200 C 100 238 120 248 120 254", stroke: theme_1.theme.accentAmber, strokeWidth: 4, strokeLinecap: "round" }), (0, jsx_runtime_1.jsx)("path", { d: "M 140 200 C 140 238 120 248 120 254", stroke: theme_1.theme.accentAmber, strokeWidth: 4, strokeLinecap: "round" }), (0, jsx_runtime_1.jsx)("circle", { cx: 120, cy: 262, r: 10, fill: theme_1.theme.accentAmber }), (0, jsx_runtime_1.jsx)("circle", { cx: 120, cy: 262, r: 5, fill: theme_1.theme.accentAmberDeep })] }), (0, jsx_runtime_1.jsxs)("g", { id: "head", children: [(0, jsx_runtime_1.jsx)("rect", { x: 106, y: 184, width: 28, height: 24, rx: 10, fill: SKIN }), (0, jsx_runtime_1.jsx)("circle", { cx: 120, cy: 120, r: 70, fill: SKIN }), (0, jsx_runtime_1.jsx)("path", { d: "M 50 115 C 50 45 190 45 190 115 C 185 80 160 55 120 50 C 80 55 55 80 50 115 Z", fill: HAIR }), (0, jsx_runtime_1.jsx)("ellipse", { cx: 53, cy: 125, rx: 10, ry: 22, fill: HAIR }), (0, jsx_runtime_1.jsx)("ellipse", { cx: 187, cy: 125, rx: 10, ry: 22, fill: HAIR }), (0, jsx_runtime_1.jsx)("circle", { cx: 78, cy: 148, r: 12, fill: "rgba(255,140,120,0.25)" }), (0, jsx_runtime_1.jsx)("circle", { cx: 162, cy: 148, r: 12, fill: "rgba(255,140,120,0.25)" }), (0, jsx_runtime_1.jsx)("path", { d: "M 84 100 Q 96 93 108 100", stroke: HAIR, strokeWidth: 3, strokeLinecap: "round" }), (0, jsx_runtime_1.jsx)("path", { d: "M 132 100 Q 144 93 156 100", stroke: HAIR, strokeWidth: 3, strokeLinecap: "round" })] }), (0, jsx_runtime_1.jsxs)("g", { id: "eyes", transform: `translate(120 118) scale(1 ${eyeScaleY}) translate(-120 -118)`, children: [(0, jsx_runtime_1.jsx)("ellipse", { cx: 96, cy: 118, rx: 12, ry: 14, fill: "white" }), (0, jsx_runtime_1.jsx)("circle", { cx: 99, cy: 120, r: 6, fill: eyeColor }), (0, jsx_runtime_1.jsx)("circle", { cx: 101, cy: 117, r: 2.5, fill: "white" }), (0, jsx_runtime_1.jsx)("ellipse", { cx: 144, cy: 118, rx: 12, ry: 14, fill: "white" }), (0, jsx_runtime_1.jsx)("circle", { cx: 147, cy: 120, r: 6, fill: eyeColor }), (0, jsx_runtime_1.jsx)("circle", { cx: 149, cy: 117, r: 2.5, fill: "white" })] }), (0, jsx_runtime_1.jsx)("g", { id: "mouth", children: mouthOpen < 0.1 ? ((0, jsx_runtime_1.jsx)("path", { d: "M 108 150 Q 120 160 132 150", stroke: SKIN_SHADOW, strokeWidth: 3, strokeLinecap: "round" })) : ((0, jsx_runtime_1.jsx)("ellipse", { cx: 120, cy: 153, rx: (0, remotion_1.interpolate)(mouthOpen, [0, 1], [6, 14]), ry: (0, remotion_1.interpolate)(mouthOpen, [0, 1], [2, 10]), fill: MOUTH_OPEN, stroke: SKIN_SHADOW, strokeWidth: 1.5 })) })] }) }));
};
exports.Character = Character;
