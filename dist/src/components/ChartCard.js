"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartCard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const theme_1 = require("../theme");
// ─── shared card shell geometry ───────────────────────────────────────────────
const CARD_TOP = 520;
const CARD_LEFT = 60;
const CARD_RIGHT = 60;
const CARD_HEIGHT = 720;
const ChartCard = ({ spec }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    if (spec.kind === "bar") {
        return (0, jsx_runtime_1.jsx)(BarChart, { spec: spec, frame: frame, fps: fps });
    }
    // bigNumber and line share a single entrance spring
    const enter = (0, remotion_1.spring)({ frame, fps, config: { damping: 18, stiffness: 140 } });
    const opacity = (0, remotion_1.interpolate)(enter, [0, 1], [0, 1]);
    const scale = (0, remotion_1.interpolate)(enter, [0, 1], [0.96, 1]);
    const rotation = spec.kind === "bigNumber" ? (spec.rotation ?? 1) : (spec.rotation ?? -1);
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            position: "absolute",
            top: CARD_TOP,
            left: CARD_LEFT,
            right: CARD_RIGHT,
            height: CARD_HEIGHT,
            background: theme_1.theme.cardBg,
            borderRadius: theme_1.theme.cardBorderRadius,
            padding: theme_1.theme.cardPadding,
            boxShadow: `8px 8px 0 ${theme_1.theme.shadowOffset}`,
            transform: `rotate(${rotation}deg) scale(${scale})`,
            opacity,
        }, children: [spec.kind === "bigNumber" && (0, jsx_runtime_1.jsx)(BigNumber, { spec: spec }), spec.kind === "line" && (0, jsx_runtime_1.jsx)(LineChart, { spec: spec })] }));
};
exports.ChartCard = ChartCard;
// ─── bigNumber ─────────────────────────────────────────────────────────────────
const BigNumber = ({ spec }) => {
    const color = spec.trend === "down" ? theme_1.theme.danger
        : spec.trend === "up" ? theme_1.theme.success
            : theme_1.theme.cardText;
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                    fontSize: theme_1.theme.sizes.disclaimer, // 32px — per build-plan bigNumber spec
                    fontWeight: 700,
                    color: theme_1.theme.cardMuted,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                }, children: spec.label }), (0, jsx_runtime_1.jsx)("div", { style: {
                    fontSize: theme_1.theme.sizes.heroNumeral,
                    fontWeight: 800,
                    color,
                    lineHeight: 1,
                    marginTop: 24,
                    letterSpacing: -10,
                }, children: spec.value }), spec.unit && ((0, jsx_runtime_1.jsx)("div", { style: {
                    fontSize: theme_1.theme.sizes.cardMeta,
                    fontWeight: 600,
                    color: theme_1.theme.cardMuted,
                    marginTop: 8,
                }, children: spec.unit })), spec.delta && ((0, jsx_runtime_1.jsx)("div", { style: {
                    display: "inline-flex",
                    alignSelf: "flex-start",
                    alignItems: "center",
                    background: spec.trend === "down" ? theme_1.theme.dangerSoft
                        : spec.trend === "flat" ? theme_1.theme.barTrackBg
                            : "rgba(16,185,129,0.15)",
                    borderRadius: 18,
                    padding: "22px 32px",
                    marginTop: 32,
                }, children: (0, jsx_runtime_1.jsx)("span", { style: {
                        fontSize: theme_1.theme.sizes.cardLabel,
                        fontWeight: 800,
                        color: spec.trend === "down" ? theme_1.theme.dangerDeep
                            : spec.trend === "flat" ? theme_1.theme.cardText
                                : theme_1.theme.success,
                    }, children: spec.delta }) }))] }));
};
// ─── bar — stacked mini-cards ──────────────────────────────────────────────────
const BarChart = ({ spec, frame, fps }) => {
    const max = Math.max(...spec.data.map((d) => d.value));
    const rotations = spec.rotations ?? [-1, 1, -1];
    return ((0, jsx_runtime_1.jsx)("div", { style: {
            position: "absolute",
            top: CARD_TOP,
            left: CARD_LEFT,
            right: CARD_RIGHT,
            display: "flex",
            flexDirection: "column",
            gap: 24,
        }, children: spec.data.map((row, i) => {
            // Each row springs in independently with a 12-frame stagger
            const rowEnter = (0, remotion_1.spring)({ frame: frame - i * 12, fps, config: { damping: 18, stiffness: 140 } });
            const rowOpacity = (0, remotion_1.interpolate)(rowEnter, [0, 1], [0, 1]);
            const rowScale = (0, remotion_1.interpolate)(rowEnter, [0, 1], [0.94, 1]);
            const rotation = rotations[i] ?? 0;
            const color = row.status === "danger" ? theme_1.theme.danger : theme_1.theme.success;
            const fillPct = (row.value / max) * 100;
            return ((0, jsx_runtime_1.jsxs)("div", { style: {
                    background: theme_1.theme.cardBg,
                    borderRadius: 24,
                    padding: `${theme_1.theme.cardPaddingTight}px 32px`,
                    boxShadow: `6px 6px 0 ${theme_1.theme.shadowOffset}`,
                    transform: `rotate(${rotation}deg) scale(${rowScale})`,
                    opacity: rowOpacity,
                }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 16,
                        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 16 }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: theme_1.theme.sizes.cardLabel }, children: row.emoji }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: theme_1.theme.sizes.cardLabel, fontWeight: 800, color: theme_1.theme.cardText }, children: row.label })] }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 56, fontWeight: 900, color }, children: row.displayValue })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                            width: "100%",
                            height: 22,
                            background: theme_1.theme.barTrackBg,
                            borderRadius: 11,
                        }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                width: `${fillPct}%`,
                                height: "100%",
                                background: color,
                                borderRadius: 11,
                            } }) })] }, i));
        }) }));
};
// ─── line ──────────────────────────────────────────────────────────────────────
const LineChart = ({ spec }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const progress = (0, remotion_1.spring)({ frame, fps, config: { damping: 20, stiffness: 80 } });
    const W = 880, H = 360, PAD = 40;
    const ys = spec.data.map((d) => d.y);
    const max = Math.max(...ys);
    const min = Math.min(...ys);
    const range = max - min || 1;
    const points = spec.data.map((d, i) => ({
        x: PAD + (i / (spec.data.length - 1)) * (W - PAD * 2),
        y: PAD + (1 - (d.y - min) / range) * (H - PAD * 2),
        label: d.x,
        value: d.y,
    }));
    const visibleCount = Math.max(1, Math.floor(progress * (points.length - 1)) + 1);
    const visible = points.slice(0, visibleCount);
    const linePath = visible.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = `${linePath} L ${visible[visible.length - 1].x} ${H} L ${visible[0].x} ${H} Z`;
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "column", height: "100%" }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { fontSize: 36, fontWeight: 800, color: theme_1.theme.cardText, marginBottom: 16 }, children: [spec.titleEmoji, " ", spec.title] }), (0, jsx_runtime_1.jsxs)("svg", { viewBox: `0 0 ${W} ${H}`, style: { width: "100%", flex: 1 }, children: [(0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsxs)("linearGradient", { id: "areaGrad", x1: "0", y1: "0", x2: "0", y2: "1", children: [(0, jsx_runtime_1.jsx)("stop", { offset: "0%", stopColor: theme_1.theme.danger, stopOpacity: "0.3" }), (0, jsx_runtime_1.jsx)("stop", { offset: "100%", stopColor: theme_1.theme.danger, stopOpacity: "0" })] }) }), (0, jsx_runtime_1.jsx)("path", { d: areaPath, fill: "url(#areaGrad)" }), (0, jsx_runtime_1.jsx)("path", { d: linePath, fill: "none", stroke: theme_1.theme.danger, strokeWidth: 8, strokeLinecap: "round", strokeLinejoin: "round" }), points.map((p, i) => {
                        if (i >= visibleCount)
                            return null;
                        const isHl = i === spec.highlight;
                        return ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("circle", { cx: p.x, cy: p.y, r: isHl ? 22 : 8, fill: isHl ? theme_1.theme.danger : theme_1.theme.cardText }), isHl && ((0, jsx_runtime_1.jsx)("text", { x: p.x, y: p.y - 36, textAnchor: "middle", fill: theme_1.theme.danger, fontSize: 40, fontWeight: 900, children: p.value })), (0, jsx_runtime_1.jsx)("text", { x: p.x, y: H - 6, textAnchor: "middle", fill: theme_1.theme.axisLabel, fontSize: 32, fontWeight: 700, children: p.label })] }, i));
                    })] })] }));
};
