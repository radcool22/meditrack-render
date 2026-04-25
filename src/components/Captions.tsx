import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type CaptionsProps = {
  text: string;
  beatStart: number; // global frame at which the active beat begins
  beatEnd: number;   // global frame at which the active beat ends
};

export const Captions: React.FC<CaptionsProps> = ({ text, beatStart, beatEnd }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = text.split(/\s+/).filter(Boolean);
  // Spread word entries so the last word lands ~3 frames before the beat ends.
  // Single-word beats skip staggering entirely (interval = 0).
  const staggerInterval =
    words.length > 1 ? (beatEnd - beatStart - 3) / (words.length - 1) : 0;

  // Shared base style applied identically to both layers of each word.
  // Must match exactly so stroke and fill render at the same geometry.
  const layerStyle = {
    fontSize: 72,
    fontWeight: 900,
    textTransform: "uppercase" as const,
    lineHeight: 1.2,
    whiteSpace: "nowrap" as const,
    color: "white" as const,
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 350,
        left: 60,
        right: 60,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px 16px",
        }}
      >
        {words.map((word, i) => {
          const wordStartFrame = beatStart + i * staggerInterval;
          const wordFrame = Math.max(0, frame - wordStartFrame);
          // Template spring: high damping (200) + short durationInFrames (5)
          // snaps in sharply rather than lingering.
          const enter = spring({
            frame: wordFrame,
            fps,
            config: { damping: 200 },
            durationInFrames: 5,
          });
          const opacity     = interpolate(enter, [0, 1], [0, 1]);
          const scaleV      = interpolate(enter, [0, 1], [0.8, 1]);
          const translateYV = interpolate(enter, [0, 1], [50, 0]);

          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                position: "relative",
                opacity,
                transform: `scale(${scaleV}) translateY(${translateYV}px)`,
              }}
            >
              {/* Layer 1 — stroke: thick black outline painted behind the fill.
                  Dual-layer technique from the template; prevents stroke from
                  encroaching on the white letterforms. */}
              <span style={{ ...layerStyle, position: "absolute", top: 0, left: 0, WebkitTextStroke: "16px black" }}>
                {word}
              </span>
              {/* Layer 2 — fill: clean white text on top, no stroke. */}
              <span style={{ ...layerStyle, position: "relative" }}>
                {word}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};
