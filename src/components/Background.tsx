import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  // Amber radial highlight drifts slowly across the canvas over 10 s (300 frames).
  // Moves from upper-left to lower-right — stays out of the hot-zone centre.
  const x = interpolate(frame, [0, 300], [25, 65]); // % horizontal
  const y = interpolate(frame, [0, 300], [15, 55]); // % vertical

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* 15% opacity amber radial — supports without competing with the cards */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 55% 35% at ${x}% ${y}%, ${theme.bgGradientAccent} 0%, transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};
