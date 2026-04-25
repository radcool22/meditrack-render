import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Header: React.FC<{
  title: string;
  author: string;
  source: string;
}> = ({ title, author, source }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const y = interpolate(enter, [0, 1], [-20, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: 80,
        left: 60,
        right: 60,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          fontSize: 26,
          color: "#7ab8ff",
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 16,
        }}
      >
        Brief
      </div>
      <div style={{ fontSize: 56, color: "#ffffff", fontWeight: 700, lineHeight: 1.15 }}>
        {title}
      </div>
      <div style={{ fontSize: 28, color: "#9aa4b8", marginTop: 20, fontWeight: 500 }}>
        {author}
      </div>
      <div style={{ fontSize: 22, color: "#5d6578", marginTop: 6, fontFamily: "ui-monospace, monospace" }}>
        {source}
      </div>
    </div>
  );
};
