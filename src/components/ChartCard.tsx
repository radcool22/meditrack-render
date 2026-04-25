import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ChartSpec } from "../data/sampleBrief";

// Vertical-first: big numbers are huge, bars are horizontal (fit narrow width),
// lines are tall-not-wide. Every chart enters with a spring.

const cardStyle: React.CSSProperties = {
  position: "absolute",
  top: 520,
  left: 60,
  right: 60,
  height: 720,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 32,
  padding: 48,
  backdropFilter: "blur(20px)",
};

export const ChartCard: React.FC<{ spec: ChartSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const scale = interpolate(enter, [0, 1], [0.96, 1]);

  return (
    <div style={{ ...cardStyle, opacity, transform: `scale(${scale})` }}>
      {spec.kind === "bigNumber" && <BigNumber spec={spec} />}
      {spec.kind === "bar" && <BarChart spec={spec} />}
      {spec.kind === "line" && <LineChart spec={spec} />}
    </div>
  );
};

const BigNumber: React.FC<{ spec: Extract<ChartSpec, { kind: "bigNumber" }> }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(frame % 60, [0, 30, 60], [1, 1.02, 1]);
  const color = spec.trend === "down" ? "#ff6b6b" : spec.trend === "up" ? "#4ade80" : "#ffffff";

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
      <div style={{ fontSize: 32, color: "#9aa4b8", fontWeight: 500 }}>{spec.label}</div>
      <div
        style={{
          fontSize: 260,
          fontWeight: 800,
          color,
          lineHeight: 1,
          marginTop: 24,
          transform: `scale(${pulse})`,
          letterSpacing: -4,
        }}
      >
        {spec.value}
      </div>
      {spec.delta && (
        <div style={{ fontSize: 36, color, fontWeight: 600, marginTop: 24 }}>
          {spec.trend === "down" ? "▼" : "▲"} {spec.delta}
        </div>
      )}
    </div>
  );
};

const BarChart: React.FC<{ spec: Extract<ChartSpec, { kind: "bar" }> }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(...spec.data.map((d) => d.value));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40, justifyContent: "center", height: "100%" }}>
      <div style={{ fontSize: 32, color: "#9aa4b8", fontWeight: 500, marginBottom: 16 }}>
        Conversion by device
      </div>
      {spec.data.map((d, i) => {
        const grow = spring({ frame: frame - i * 8, fps, config: { damping: 18 } });
        const width = interpolate(grow, [0, 1], [0, (d.value / max) * 100]);
        const isHighlight = i === spec.highlight;
        return (
          <div key={d.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 34, color: "#ffffff", fontWeight: 600 }}>{d.label}</span>
              <span style={{ fontSize: 34, color: isHighlight ? "#ff6b6b" : "#ffffff", fontWeight: 700 }}>
                {d.value}%
              </span>
            </div>
            <div style={{ width: "100%", height: 24, background: "rgba(255,255,255,0.08)", borderRadius: 12 }}>
              <div
                style={{
                  width: `${width}%`,
                  height: "100%",
                  background: isHighlight
                    ? "linear-gradient(90deg, #ff6b6b, #ff8e8e)"
                    : "linear-gradient(90deg, #4a7cff, #7ab8ff)",
                  borderRadius: 12,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LineChart: React.FC<{ spec: Extract<ChartSpec, { kind: "line" }> }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });

  const w = 880;
  const h = 460;
  const padding = 40;
  const max = Math.max(...spec.data.map((d) => d.y));
  const min = Math.min(...spec.data.map((d) => d.y));
  const range = max - min || 1;

  const points = spec.data.map((d, i) => {
    const x = padding + (i / (spec.data.length - 1)) * (w - padding * 2);
    const y = padding + (1 - (d.y - min) / range) * (h - padding * 2);
    return { x, y, label: d.x, value: d.y };
  });

  const pathLen = points.length - 1;
  const visibleCount = Math.max(1, Math.floor(progress * pathLen) + 1);
  const visiblePoints = points.slice(0, visibleCount);
  const pathD = visiblePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ fontSize: 32, color: "#9aa4b8", fontWeight: 500, marginBottom: 12 }}>
        Mobile checkout latency (ms)
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", flex: 1 }}>
        <path d={pathD} fill="none" stroke="#ff6b6b" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => {
          const visible = i < visibleCount;
          if (!visible) return null;
          const isHighlight = i === spec.highlight;
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={isHighlight ? 16 : 8} fill={isHighlight ? "#ff6b6b" : "#ffffff"} />
              {isHighlight && (
                <text x={p.x} y={p.y - 30} textAnchor="middle" fill="#ff6b6b" fontSize={28} fontWeight={700}>
                  {p.value}ms
                </text>
              )}
              <text x={p.x} y={h - 8} textAnchor="middle" fill="#9aa4b8" fontSize={24}>
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
