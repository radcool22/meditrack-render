"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Background = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const theme_1 = require("../theme");
const Background = () => {
    const frame = (0, remotion_1.useCurrentFrame)();
    // Amber radial highlight drifts slowly across the canvas over 10 s (300 frames).
    // Moves from upper-left to lower-right — stays out of the hot-zone centre.
    const x = (0, remotion_1.interpolate)(frame, [0, 300], [25, 65]); // % horizontal
    const y = (0, remotion_1.interpolate)(frame, [0, 300], [15, 55]); // % vertical
    return ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: { backgroundColor: theme_1.theme.bg }, children: (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                background: `radial-gradient(ellipse 55% 35% at ${x}% ${y}%, ${theme_1.theme.bgGradientAccent} 0%, transparent 70%)`,
            } }) }));
};
exports.Background = Background;
