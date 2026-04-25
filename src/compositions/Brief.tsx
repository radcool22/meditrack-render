import { AbsoluteFill, Audio, Easing, interpolate, OffthreadVideo, Sequence, useCurrentFrame } from "remotion";
import type { BriefPayload } from "../data/sampleBrief";
import { Background } from "../components/Background";
import { ChartCard } from "../components/ChartCard";
import { AvatarBubble } from "../components/AvatarBubble";
import { Captions } from "../components/Captions";
import { Header } from "../components/Header";
import { Outro } from "../components/Outro";

export const Brief: React.FC<{ brief: BriefPayload }> = ({ brief }) => {
  const frame = useCurrentFrame();
  const activeBeat =
    brief.beats.find((b) => frame >= b.startFrame && frame < b.endFrame) ??
    brief.beats[brief.beats.length - 1];

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0f1a", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Layer 1 — animated background gradient */}
      <Background />

      {/* Layer 2 — header (title + author, trust-critical) */}
      <Header title={brief.title} author={brief.author} source={brief.sourceQueryLabel} />

      {/* Layer 3 — data layer: one ChartCard per beat, with 6-frame whip-pan
          transitions centered on each beat boundary (3 frames bleed each side).
          Only this layer moves — Header, AvatarBubble, and Captions stay put. */}
      {brief.beats.map((beat, i) => {
        const HALF = 3; // frames on each side of the boundary
        const isFirst = i === 0;
        const isLast = i === brief.beats.length - 1;

        // Extend each sequence to cover the transition bleed.
        // First beat has no incoming bleed; last beat has no outgoing bleed.
        const seqFrom = isFirst ? beat.startFrame : beat.startFrame - HALF;
        const seqEnd  = isLast  ? beat.endFrame   : beat.endFrame   + HALF;

        // — Incoming transition: this card slides in from the right —
        const inStart  = beat.startFrame - HALF; // frame 72 for beat 1
        const inEnd    = beat.startFrame + HALF; // frame 78 for beat 1
        const inActive = !isFirst && frame >= inStart && frame <= inEnd;

        // — Outgoing transition: this card slides out to the left —
        const outStart  = beat.endFrame - HALF; // frame 72 for beat 0
        const outEnd    = beat.endFrame + HALF; // frame 78 for beat 0
        const outActive = !isLast && frame >= outStart && frame <= outEnd;

        let translateX = 0;
        let blurPx = 0;

        if (inActive) {
          // Progress 0→1 over [inStart, inEnd]; Easing.out(cubic) decelerates into rest.
          const p = interpolate(frame, [inStart, inEnd], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          translateX = interpolate(p, [0, 1], [1080, 0]); // 1080px = full canvas width
          // Blur ramps up to 12px at the boundary frame, then falls back to 0.
          blurPx = frame <= beat.startFrame
            ? interpolate(frame, [inStart, beat.startFrame], [0, 12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            : interpolate(frame, [beat.startFrame, inEnd],   [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        } else if (outActive) {
          // Progress 0→1 over [outStart, outEnd]; Easing.in(cubic) accelerates off-screen.
          const p = interpolate(frame, [outStart, outEnd], [0, 1], {
            easing: Easing.in(Easing.cubic),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          translateX = interpolate(p, [0, 1], [0, -1080]);
          // Blur ramps up to 12px at the boundary frame, then falls back to 0.
          blurPx = frame <= beat.endFrame
            ? interpolate(frame, [outStart, beat.endFrame], [0, 12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            : interpolate(frame, [beat.endFrame, outEnd],   [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        }

        return (
          <Sequence key={i} from={seqFrom} durationInFrames={seqEnd - seqFrom}>
            <AbsoluteFill
              style={{
                transform: `translateX(${translateX}px)`,
                filter: blurPx > 0 ? `blur(${blurPx}px)` : "none",
              }}
            >
              <ChartCard spec={beat.chart} />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Layer 4 — avatar bubble (HeyGen MP4, muted, circular crop, lower area).
          Falls back to a stylized placeholder when avatarVideoUrl is empty —
          this is the sample-render path. In production this is always present. */}
      <AvatarBubble videoUrl={brief.avatarVideoUrl} />

      {/* Layer 5 — burnt-in captions, driven by active beat.
          Critical: most Slack viewers watch muted. */}
      <Captions text={activeBeat.caption} beatStart={activeBeat.startFrame} beatEnd={activeBeat.endFrame} />

      {/* Layer 6 — outro: last 3s becomes the "View source query →" card.
          This is a trust surface — see CLAUDE.md §12. */}
      <Sequence from={210} durationInFrames={90}>
        <Outro sourceLabel={brief.sourceQueryLabel} />
      </Sequence>

      {/* Master audio track — the TTS WAV from ElevenLabs.
          NOTE: HeyGen's video has its own audio; we mute it (muted prop on
          OffthreadVideo inside AvatarBubble) and use this track as the master
          so we don't double-encode. See previous message re: audio path. */}
      {brief.audioUrl ? <Audio src={brief.audioUrl} /> : null}
    </AbsoluteFill>
  );
};
