"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediTrack = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const theme_1 = require("../theme");
const Background_1 = require("../components/Background");
const Header_1 = require("../components/Header");
const ChartCard_1 = require("../components/ChartCard");
const Character_1 = require("../components/Character");
const Captions_1 = require("../components/Captions");
const Disclaimer_1 = require("../components/Disclaimer");
const MediTrack = ({ payload }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const activeBeat = payload.beats.find((b) => frame >= b.startFrame && frame < b.endFrame) ??
        payload.beats[payload.beats.length - 1];
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
            backgroundColor: theme_1.theme.bg,
            fontFamily: "Inter, 'Noto Sans Devanagari', system-ui, sans-serif",
        }, children: [(0, jsx_runtime_1.jsx)(Background_1.Background, {}), (0, jsx_runtime_1.jsx)(Header_1.Header, { reportType: payload.reportType, reportDate: payload.reportDate, patientFirstName: payload.patientFirstName }), payload.beats.map((beat, i) => {
                const HALF = 3; // frames on each side of the boundary
                const isFirst = i === 0;
                const isLast = i === payload.beats.length - 1;
                // Extend each sequence to cover the transition bleed
                const seqFrom = isFirst ? beat.startFrame : beat.startFrame - HALF;
                const seqEnd = isLast ? beat.endFrame : beat.endFrame + HALF;
                // — Incoming transition: this card slides in from the right —
                const inStart = beat.startFrame - HALF;
                const inEnd = beat.startFrame + HALF;
                const inActive = !isFirst && frame >= inStart && frame <= inEnd;
                // — Outgoing transition: this card slides out to the left —
                const outStart = beat.endFrame - HALF;
                const outEnd = beat.endFrame + HALF;
                const outActive = !isLast && frame >= outStart && frame <= outEnd;
                let translateX = 0;
                let blurPx = 0;
                if (inActive) {
                    const p = (0, remotion_1.interpolate)(frame, [inStart, inEnd], [0, 1], {
                        easing: remotion_1.Easing.out(remotion_1.Easing.cubic),
                        extrapolateLeft: "clamp", extrapolateRight: "clamp",
                    });
                    translateX = (0, remotion_1.interpolate)(p, [0, 1], [1080, 0]); // 1080px = full canvas width
                    blurPx = frame <= beat.startFrame
                        ? (0, remotion_1.interpolate)(frame, [inStart, beat.startFrame], [0, 12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                        : (0, remotion_1.interpolate)(frame, [beat.startFrame, inEnd], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                }
                else if (outActive) {
                    const p = (0, remotion_1.interpolate)(frame, [outStart, outEnd], [0, 1], {
                        easing: remotion_1.Easing.in(remotion_1.Easing.cubic),
                        extrapolateLeft: "clamp", extrapolateRight: "clamp",
                    });
                    translateX = (0, remotion_1.interpolate)(p, [0, 1], [0, -1080]);
                    blurPx = frame <= beat.endFrame
                        ? (0, remotion_1.interpolate)(frame, [outStart, beat.endFrame], [0, 12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                        : (0, remotion_1.interpolate)(frame, [beat.endFrame, outEnd], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                }
                return ((0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: seqFrom, durationInFrames: seqEnd - seqFrom, children: (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                            transform: `translateX(${translateX}px)`,
                            filter: blurPx > 0 ? `blur(${blurPx}px)` : "none",
                        }, children: beat.chart ? (0, jsx_runtime_1.jsx)(ChartCard_1.ChartCard, { spec: beat.chart }) : null }) }, i));
            }), (0, jsx_runtime_1.jsx)(Character_1.Character, { audioUrl: payload.audioUrl, lookAt: activeBeat.lookAt, centered: !activeBeat.chart }), (0, jsx_runtime_1.jsx)(Captions_1.Captions, { text: activeBeat.caption, beatStart: activeBeat.startFrame, beatEnd: activeBeat.endFrame, lang: payload.lang }), (0, jsx_runtime_1.jsx)(Disclaimer_1.Disclaimer, { text: payload.disclaimer }), payload.audioUrl ? (0, jsx_runtime_1.jsx)(remotion_1.Audio, { src: payload.audioUrl }) : null] }));
};
exports.MediTrack = MediTrack;
