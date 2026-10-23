import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

// Header lines must never wrap — the disclaimer sits directly below them.
const oneLine = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
} as const;

export const Header: React.FC<{
  reportType: string;
  reportDate: string;
  reportLab: string;
}> = ({ reportType, reportDate, reportLab }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const y = interpolate(enter, [0, 1], [-20, 0]);

  // Date and lab share one line; either may be absent on the source report.
  const provenance = [reportDate, reportLab].filter(Boolean).join(" · ");

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
      {/* Wordmark — red period is the visual signature. "AI" completes the
          "MediTrack AI" byline, a render invariant (CLAUDE.md §2.2.3). */}
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
        <span
          style={{
            fontSize: theme.sizes.disclaimer,
            fontWeight: 600,
            color: theme.textOnBgDim,
            marginLeft: 12,
          }}
        >
          AI
        </span>
      </div>

      {/* Report type */}
      <div
        style={{
          fontSize: theme.sizes.disclaimer,
          fontWeight: 500,
          color: theme.textOnBgDim,
          marginTop: 14,
          ...oneLine,
        }}
      >
        {reportType}
      </div>

      {/* Report date · lab — visible every frame (CLAUDE.md §2.2.2) */}
      {provenance ? (
        <div
          style={{
            fontSize: theme.sizes.disclaimer,
            fontWeight: 500,
            color: theme.textOnBgDim,
            marginTop: 4,
            ...oneLine,
          }}
        >
          {provenance}
        </div>
      ) : null}
    </div>
  );
};
