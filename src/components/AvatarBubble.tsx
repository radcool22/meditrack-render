import { OffthreadVideo, useCurrentFrame, interpolate } from "remotion";

// The HeyGen MP4 arrives as a portrait-oriented talking head.
// We mask it into a circle and park it in the lower area so it never covers data.
// CRITICAL: muted — master audio is our ElevenLabs WAV at the composition level.

export const AvatarBubble: React.FC<{ videoUrl: string }> = ({ videoUrl }) => {
  const size = 280;
  const frame = useCurrentFrame();
  // Gentle idle float to prevent the bubble from feeling pasted-on
  const float = interpolate(frame % 120, [0, 60, 120], [0, -6, 0]);

  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 360,
    right: 60,
    width: size,
    height: size,
    borderRadius: "50%",
    overflow: "hidden",
    border: "4px solid rgba(255,255,255,0.9)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    transform: `translateY(${float}px)`,
  };

  if (!videoUrl) {
    // Sample/preview path. In production this branch never runs — the render
    // worker hard-fails if the avatar MP4 is missing (CLAUDE.md §7.7).
    return (
      <div style={wrapperStyle}>
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #4a7cff 0%, #7ab8ff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 110,
            fontWeight: 700,
            color: "#ffffff",
          }}
        >
          PS
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <OffthreadVideo src={videoUrl} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};
