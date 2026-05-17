"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Captions = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const theme_1 = require("../theme");
const Captions = ({ text, beatStart, beatEnd, lang }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const words = text.split(/\s+/).filter(Boolean);
    // ─── TIMING LOGIC PRESERVED VERBATIM ─────────────────────────────────────
    // Spread word entries so the last word lands ~3 frames before the beat ends.
    // Single-word beats skip staggering entirely (interval = 0).
    const staggerInterval = words.length > 1 ? (beatEnd - beatStart - 3) / (words.length - 1) : 0;
    // ─────────────────────────────────────────────────────────────────────────
    // Index of the most recently started word; -1 if none has started yet.
    let currentWordIndex = -1;
    for (let i = 0; i < words.length; i++) {
        if (frame >= beatStart + i * staggerInterval)
            currentWordIndex = i;
    }
    return ((0, jsx_runtime_1.jsx)("div", { style: {
            position: "absolute",
            bottom: 460, // above character + player chrome — CLAUDE.md §5.3
            left: 60,
            right: 60,
        }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "flex-end",
                gap: "8px 16px",
            }, children: words.map((word, i) => {
                // ─── TIMING LOGIC PRESERVED VERBATIM ───────────────────────────
                const wordStartFrame = beatStart + i * staggerInterval;
                const wordFrame = Math.max(0, frame - wordStartFrame);
                const enter = (0, remotion_1.spring)({
                    frame: wordFrame,
                    fps,
                    config: { damping: 200 },
                    durationInFrames: 5,
                });
                const baseOpacity = (0, remotion_1.interpolate)(enter, [0, 1], [0, 1]);
                const scaleV = (0, remotion_1.interpolate)(enter, [0, 1], [0.8, 1]);
                const translateYV = (0, remotion_1.interpolate)(enter, [0, 1], [50, 0]);
                // ───────────────────────────────────────────────────────────────
                const isPast = i < currentWordIndex;
                const isCurrent = i === currentWordIndex;
                // Devanagari conjuncts break with rotation — Latin words get micro-rotation.
                const isDevanagari = /[\u0900-\u097F]/.test(word);
                const rotationDeg = lang === 'hi' && isDevanagari
                    ? 0
                    : ((i * 137) % 200 - 100) / 100 * 1.2;
                const fontSize = isPast ? theme_1.theme.sizes.captionPast : theme_1.theme.sizes.captionCurrent;
                const fontWeight = isPast ? 800 : 900;
                const color = isCurrent ? theme_1.theme.accentAmber : theme_1.theme.textOnBg;
                const opacity = isPast ? baseOpacity * 0.65 : baseOpacity;
                return ((0, jsx_runtime_1.jsx)("span", { style: {
                        display: "inline-block",
                        opacity,
                        transform: `scale(${scaleV}) translateY(${translateYV}px) rotate(${rotationDeg}deg)`,
                    }, children: (0, jsx_runtime_1.jsx)("span", { style: {
                            fontSize,
                            fontWeight,
                            color,
                            letterSpacing: -1.5,
                            textTransform: isDevanagari ? undefined : "uppercase",
                            lineHeight: 1.2,
                            WebkitTextStroke: "6px #000",
                            paintOrder: "stroke fill",
                            display: "block",
                        }, children: word }) }, i));
            }) }) }));
};
exports.Captions = Captions;
