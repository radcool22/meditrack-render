import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const Header: React.FC<{
  reportType: string;
  reportDate: string;
  patientFirstName: string;
}> = ({ reportType, reportDate }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const y = interpolate(enter, [0, 1], [-20, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: theme.safeTop,
        left: 60,
        right: 60,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      {/* Wordmark — red period is the visual signature */}
      <div
        style={{
          fontSize: theme.sizes.wordmark,
          fontWeight: 800,
          color: theme.textOnBg,
          lineHeight: 1,
        }}
      >
        MediTrack
        <span style={{ color: theme.danger }}>.</span>
      </div>

      {/* Report type */}
      <div
        style={{
          fontSize: theme.sizes.disclaimer,
          fontWeight: 500,
          color: theme.textOnBgDim,
          marginTop: 14,
        }}
      >
        {reportType}
      </div>

      {/* Report date */}
      <div
        style={{
          fontSize: theme.sizes.disclaimer,
          fontWeight: 500,
          color: theme.textOnBgDim,
          marginTop: 4,
        }}
      >
        {reportDate}
      </div>
    </div>
  );
};
