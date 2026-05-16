import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ChartSpec } from "../data/sampleMediTrack";
import { theme } from "../theme";

// ─── shared card shell geometry ───────────────────────────────────────────────
const CARD_TOP    = 520;
const CARD_LEFT   = 60;
const CARD_RIGHT  = 60;
const CARD_HEIGHT = 720;

// ─── status → color mapping (shared by bigNumber, scorecard, combinedSparkline) ─
function statusColor(status?: string): string {
  switch (status) {
    case "critical":
    case "high":
    case "low":
      return theme.danger;
    case "borderline":
      return theme.borderline;
    case "normal":
      return theme.success;
    default:
      return theme.cardText;
  }
}

export const ChartCard: React.FC<{ spec: ChartSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (spec.kind === "bar") {
    return <BarChart spec={spec} frame={frame} fps={fps} />;
  }
  if (spec.kind === "scorecard") {
    return <Scorecard spec={spec} frame={frame} fps={fps} />;
  }
  if (spec.kind === "combinedSparkline") {
    if (spec.history.length < 2) {
      console.warn("[ChartCard] combinedSparkline received insufficient history; falling back to bigNumber layout");
      return <ChartCard spec={{
        kind: "bigNumber",
        label: spec.label,
        value: spec.value,
        unit: spec.unit,
        status: spec.status,
        rotation: spec.rotation,
      }} />;
    }
    return <CombinedSparkline spec={spec} frame={frame} fps={fps} />;
  }

  // bigNumber and line share a single entrance spring
  const enter   = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const scale   = interpolate(enter, [0, 1], [0.96, 1]);
  const rotation = spec.kind === "bigNumber" ? (spec.rotation ?? 1) : (spec.rotation ?? -1);

  return (
    <div
      style={{
        position: "absolute",
        top: CARD_TOP,
        left: CARD_LEFT,
        right: CARD_RIGHT,
        height: CARD_HEIGHT,
        background: theme.cardBg,
        borderRadius: theme.cardBorderRadius,
        padding: theme.cardPadding,
        boxShadow: `8px 8px 0 ${theme.shadowOffset}`,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        opacity,
      }}
    >
      {spec.kind === "bigNumber" && <BigNumber spec={spec} />}
      {spec.kind === "line"      && <LineChart spec={spec} />}
    </div>
  );
};

// ─── bigNumber ─────────────────────────────────────────────────────────────────
const BigNumber: React.FC<{ spec: Extract<ChartSpec, { kind: "bigNumber" }> }> = ({ spec }) => {
  // When both status and trend are present, prefer status (R2 convention).
  // Legacy payloads that only set trend still work via the fallback branch.
  const color = spec.status
    ? statusColor(spec.status)
    : spec.trend === "down" ? theme.danger
    : spec.trend === "up"   ? theme.success
    : theme.cardText;

  // Delta pill colors — same status-first, trend-fallback logic
  const pillBg = spec.status === "high" || spec.status === "low" || spec.status === "critical"
    ? theme.dangerSoft
    : spec.status === "borderline" ? theme.borderlineSoft
    : spec.status === "normal" ? "rgba(16,185,129,0.15)"
    : spec.trend === "down" ? theme.dangerSoft
    : spec.trend === "flat" ? theme.barTrackBg
    : "rgba(16,185,129,0.15)";

  const pillText = spec.status === "high" || spec.status === "low" || spec.status === "critical"
    ? theme.dangerDeep
    : spec.status === "borderline" ? theme.borderlineDeep
    : spec.status === "normal" ? theme.success
    : spec.trend === "down" ? theme.dangerDeep
    : spec.trend === "flat" ? theme.cardText
    : theme.success;

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
      {/* Label */}
      <div
        style={{
          fontSize: theme.sizes.disclaimer, // 32px — per build-plan bigNumber spec
          fontWeight: 700,
          color: theme.cardMuted,
          letterSpacing: 2,
          textTransform: "uppercase" as const,
        }}
      >
        {spec.label}
      </div>

      {/* Hero numeral — critical gets larger to convey urgency */}
      <div
        style={{
          fontSize: spec.status === "critical" ? 280 : theme.sizes.heroNumeral,
          fontWeight: 800,
          color,
          lineHeight: 1,
          marginTop: 24,
          letterSpacing: -10,
        }}
      >
        {spec.value}
      </div>

      {/* Unit */}
      {spec.unit && (
        <div
          style={{
            fontSize: theme.sizes.cardMeta,
            fontWeight: 600,
            color: theme.cardMuted,
            marginTop: 8,
          }}
        >
          {spec.unit}
        </div>
      )}

      {/* Delta pill */}
      {spec.delta && (
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            alignItems: "center",
            background: pillBg,
            borderRadius: 18,
            padding: "22px 32px",
            marginTop: 32,
          }}
        >
          <span
            style={{
              fontSize: theme.sizes.cardLabel,
              fontWeight: 800,
              color: pillText,
            }}
          >
            {spec.delta}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── scorecard ────────────────────────────────────────────────────────────────
const Scorecard: React.FC<{
  spec: Extract<ChartSpec, { kind: "scorecard" }>;
  frame: number;
  fps: number;
}> = ({ spec, frame, fps }) => {
  const enter   = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const scale   = interpolate(enter, [0, 1], [0.96, 1]);
  const rotation = spec.rotation ?? 0;

  const MAX_ROWS = 8;
  const visible = spec.items.slice(0, MAX_ROWS);
  const overflow = spec.items.length - MAX_ROWS;

  return (
    <div
      style={{
        position: "absolute",
        top: CARD_TOP,
        left: CARD_LEFT,
        right: CARD_RIGHT,
        background: theme.cardBg,
        borderRadius: theme.cardBorderRadius,
        padding: 44,
        boxShadow: `8px 8px 0 ${theme.shadowOffset}`,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        opacity,
      }}
    >
      {/* Title */}
      {spec.title && (
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: theme.cardText,
            marginBottom: 24,
          }}
        >
          {spec.title}
        </div>
      )}

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {visible.map((item, i) => {
          const rowEnter = spring({ frame: frame - i * 6, fps, config: { damping: 18, stiffness: 140 } });
          const rowOpacity = interpolate(rowEnter, [0, 1], [0, 1]);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                opacity: rowOpacity,
              }}
            >
              {/* Status dot */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: statusColor(item.status),
                  flexShrink: 0,
                }}
              />
              {/* Label */}
              <span style={{ fontSize: 44, fontWeight: 600, color: theme.cardText, flex: 1 }}>
                {item.label}
              </span>
              {/* Value */}
              {item.displayValue && (
                <span style={{ fontSize: 40, fontWeight: 700, color: theme.cardMuted }}>
                  {item.displayValue}
                </span>
              )}
            </div>
          );
        })}

        {/* Overflow indicator */}
        {overflow > 0 && (
          <div style={{ fontSize: 28, fontWeight: 500, color: theme.cardMuted, textAlign: "center", marginTop: 8 }}>
            +{overflow} और values
          </div>
        )}
      </div>
    </div>
  );
};

// ─── combinedSparkline ────────────────────────────────────────────────────────
const CombinedSparkline: React.FC<{
  spec: Extract<ChartSpec, { kind: "combinedSparkline" }>;
  frame: number;
  fps: number;
}> = ({ spec, frame, fps }) => {
  const enter   = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const scale   = interpolate(enter, [0, 1], [0.96, 1]);
  const rotation = spec.rotation ?? 0;
  const color = statusColor(spec.status);

  // Sparkline geometry
  const W = 340, H = 200, PAD = 20;
  const ys = spec.history.map((d) => d.y);
  const max = Math.max(...ys);
  const min = Math.min(...ys);
  const range = max - min || 1;

  const points = spec.history.map((d, i) => ({
    x: PAD + (i / (spec.history.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (d.y - min) / range) * (H - PAD * 2),
    label: d.x,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const lastPt = points[points.length - 1];

  return (
    <div
      style={{
        position: "absolute",
        top: CARD_TOP,
        left: CARD_LEFT,
        right: CARD_RIGHT,
        height: CARD_HEIGHT,
        background: theme.cardBg,
        borderRadius: theme.cardBorderRadius,
        padding: 44,
        boxShadow: `8px 8px 0 ${theme.shadowOffset}`,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        opacity,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {/* Left half — value */}
      <div style={{ flex: "0 0 58%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 600, color: theme.cardText, letterSpacing: 2, textTransform: "uppercase" as const }}>
          {spec.label}
        </div>
        <div style={{ fontSize: 200, fontWeight: 800, color, lineHeight: 1, marginTop: 16, letterSpacing: -8 }}>
          {spec.value}
        </div>
        <div style={{ fontSize: 32, fontWeight: 500, color: theme.cardMuted, marginTop: 8 }}>
          {spec.unit}
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, alignSelf: "stretch", background: theme.barTrackBg, margin: "0 20px" }} />

      {/* Right half — sparkline */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%" }}>
          <path d={linePath} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          {/* Current value dot */}
          <circle cx={lastPt.x} cy={lastPt.y} r={12} fill={color} />
        </svg>
        {/* X-axis labels — every other point */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: `0 ${PAD}px` }}>
          {points.map((p, i) =>
            i % 2 === 0 ? (
              <span key={i} style={{ fontSize: 18, fontWeight: 500, color: theme.cardMuted }}>
                {p.label}
              </span>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
      </div>
    </div>
  );
};

// ─── bar — stacked mini-cards ──────────────────────────────────────────────────
const BarChart: React.FC<{
  spec: Extract<ChartSpec, { kind: "bar" }>;
  frame: number;
  fps: number;
}> = ({ spec, frame, fps }) => {
  const max = Math.max(...spec.data.map((d) => d.value));
  const rotations = spec.rotations ?? [-1, 1, -1];

  return (
    <div
      style={{
        position: "absolute",
        top: CARD_TOP,
        left: CARD_LEFT,
        right: CARD_RIGHT,
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {spec.data.map((row, i) => {
        // Each row springs in independently with a 12-frame stagger
        const rowEnter   = spring({ frame: frame - i * 12, fps, config: { damping: 18, stiffness: 140 } });
        const rowOpacity = interpolate(rowEnter, [0, 1], [0, 1]);
        const rowScale   = interpolate(rowEnter, [0, 1], [0.94, 1]);
        const rotation   = rotations[i] ?? 0;
        const color      = row.status === "danger" ? theme.danger : theme.success;
        const fillPct    = (row.value / max) * 100;

        return (
          <div
            key={i}
            style={{
              background: theme.cardBg,
              borderRadius: 24,
              padding: `${theme.cardPaddingTight}px 32px`,
              boxShadow: `6px 6px 0 ${theme.shadowOffset}`,
              transform: `rotate(${rotation}deg) scale(${rowScale})`,
              opacity: rowOpacity,
            }}
          >
            {/* Top row: emoji + label (left) + display value (right) */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: theme.sizes.cardLabel }}>{row.emoji}</span>
                <span style={{ fontSize: theme.sizes.cardLabel, fontWeight: 800, color: theme.cardText }}>
                  {row.label}
                </span>
              </div>
              <span style={{ fontSize: 56, fontWeight: 900, color }}>
                {row.displayValue}
              </span>
            </div>

            {/* Bar track */}
            <div
              style={{
                width: "100%",
                height: 22,
                background: theme.barTrackBg,
                borderRadius: 11,
              }}
            >
              <div
                style={{
                  width: `${fillPct}%`,
                  height: "100%",
                  background: color,
                  borderRadius: 11,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── line ──────────────────────────────────────────────────────────────────────
const LineChart: React.FC<{ spec: Extract<ChartSpec, { kind: "line" }> }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });

  const W = 880, H = 360, PAD = 40;
  const ys    = spec.data.map((d) => d.y);
  const max   = Math.max(...ys);
  const min   = Math.min(...ys);
  const range = max - min || 1;

  const points = spec.data.map((d, i) => ({
    x: PAD + (i / (spec.data.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (d.y - min) / range) * (H - PAD * 2),
    label: d.x,
    value: d.y,
  }));

  const visibleCount = Math.max(1, Math.floor(progress * (points.length - 1)) + 1);
  const visible      = points.slice(0, visibleCount);
  const linePath     = visible.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath     = `${linePath} L ${visible[visible.length - 1].x} ${H} L ${visible[0].x} ${H} Z`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ fontSize: 36, fontWeight: 800, color: theme.cardText, marginBottom: 16 }}>
        {spec.titleEmoji} {spec.title}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", flex: 1 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={theme.danger} stopOpacity="0.3" />
            <stop offset="100%" stopColor={theme.danger} stopOpacity="0"   />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke={theme.danger} strokeWidth={8}
              strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => {
          if (i >= visibleCount) return null;
          const isHl = i === spec.highlight;
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={isHl ? 22 : 8}
                      fill={isHl ? theme.danger : theme.cardText} />
              {isHl && (
                <text x={p.x} y={p.y - 36} textAnchor="middle"
                      fill={theme.danger} fontSize={40} fontWeight={900}>
                  {p.value}
                </text>
              )}
              <text x={p.x} y={H - 6} textAnchor="middle"
                    fill={theme.axisLabel} fontSize={32} fontWeight={700}>
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
