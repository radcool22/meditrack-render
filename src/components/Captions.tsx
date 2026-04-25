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

  return (
    <div
      style={{
        position: "absolute",
        bottom: 180,
        left: 60,
        right: 60,
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.7)",
          padding: "28px 36px",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            fontSize: 44,
            color: "#ffffff",
            fontWeight: 600,
            lineHeight: 1.25,
            textAlign: "center",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "6px 10px",
          }}
        >
          {words.map((word, i) => {
            // Global frame at which this word starts entering.
            const wordStartFrame = beatStart + i * staggerInterval;
            // Clamp so the spring doesn't evaluate at negative frame values
            // before this word's turn — it would produce a flash at frame 0.
            const wordFrame = Math.max(0, frame - wordStartFrame);
            const enter = spring({
              frame: wordFrame,
              fps,
              config: { damping: 18, stiffness: 200 },
            });
            const opacity = interpolate(enter, [0, 1], [0, 1]);
            const scale = interpolate(enter, [0, 1], [0.92, 1.0]);

            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity,
                  transform: `scale(${scale})`,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
