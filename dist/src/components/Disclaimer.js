"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Disclaimer = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const theme_1 = require("../theme");
// Render-template invariant — present on every frame, cannot be disabled by props.
// Never make this conditional. Never scope it to a beat or sequence.
// See CLAUDE.md §2.1.4.
const Disclaimer = ({ text }) => ((0, jsx_runtime_1.jsxs)("div", { style: {
        position: "absolute",
        top: 220, // just below header
        left: 60,
        right: 60,
        display: "flex",
        alignItems: "center",
        gap: 18,
        background: "rgba(255,255,255,0.10)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 18,
        padding: "18px 26px",
    }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: theme_1.theme.textOnBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 26,
                fontWeight: 800,
                color: theme_1.theme.bg,
            }, children: "i" }), (0, jsx_runtime_1.jsx)("span", { style: {
                fontSize: theme_1.theme.sizes.disclaimer,
                fontWeight: 500,
                color: theme_1.theme.textOnBg,
                lineHeight: 1.4,
            }, children: text })] }));
exports.Disclaimer = Disclaimer;
