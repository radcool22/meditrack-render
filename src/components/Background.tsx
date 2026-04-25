import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  // Slow drift — gradient angle cycles over the full 10s
  const angle = interpolate(frame, [0, 300], [135, 225]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, #0b0f1a 0%, #111a2e 50%, #0b0f1a 100%)`,
      }}
    >
      {/* Subtle grain — softens the flat gradient */}
      <AbsoluteFill
        style={{
          opacity: 0.04,
          background:
            "repeating-linear-gradient(45deg, #ffffff 0 1px, transparent 1px 4px)",
          mixBlendMode: "overlay",
        }}
      />
    </AbsoluteFill>
  );
};
