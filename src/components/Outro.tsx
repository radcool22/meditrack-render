import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Outro: React.FC<{ sourceLabel: string }> = ({ sourceLabel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20 } });
  const opacity = interpolate(enter, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: "rgba(11, 15, 26, 0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 32, color: "#7ab8ff", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
          Source
        </div>
        <div style={{ fontSize: 54, color: "#ffffff", fontWeight: 700, marginTop: 20, fontFamily: "ui-monospace, monospace" }}>
          {sourceLabel}
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 60,
            padding: "28px 48px",
            background: "#4a7cff",
            borderRadius: 999,
            fontSize: 40,
            color: "#ffffff",
            fontWeight: 700,
          }}
        >
          View source query →
        </div>
      </div>
    </AbsoluteFill>
  );
};
