"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const theme_1 = require("../theme");
const Header = ({ reportType, reportDate }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const enter = (0, remotion_1.spring)({ frame, fps, config: { damping: 200 } });
    const opacity = (0, remotion_1.interpolate)(enter, [0, 1], [0, 1]);
    const y = (0, remotion_1.interpolate)(enter, [0, 1], [-20, 0]);
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            position: "absolute",
            top: theme_1.theme.safeTop,
            left: 60,
            right: 60,
            opacity,
            transform: `translateY(${y}px)`,
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                    fontSize: theme_1.theme.sizes.wordmark,
                    fontWeight: 800,
                    color: theme_1.theme.textOnBg,
                    lineHeight: 1,
                }, children: ["MediTrack", (0, jsx_runtime_1.jsx)("span", { style: { color: theme_1.theme.danger }, children: "." })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                    fontSize: theme_1.theme.sizes.disclaimer,
                    fontWeight: 500,
                    color: theme_1.theme.textOnBgDim,
                    marginTop: 14,
                }, children: reportType }), (0, jsx_runtime_1.jsx)("div", { style: {
                    fontSize: theme_1.theme.sizes.disclaimer,
                    fontWeight: 500,
                    color: theme_1.theme.textOnBgDim,
                    marginTop: 4,
                }, children: reportDate })] }));
};
exports.Header = Header;
