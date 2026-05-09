import { AbsoluteFill, Audio, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import type { MediTrackPayload } from "../data/sampleMediTrack";
import { theme }      from "../theme";
import { Background }  from "../components/Background";
import { Header }      from "../components/Header";
import { ChartCard }   from "../components/ChartCard";
import { Character }   from "../components/Character";
import { Captions }    from "../components/Captions";
import { Disclaimer }  from "../components/Disclaimer";

export const MediTrack: React.FC<{ payload: MediTrackPayload }> = ({ payload }) => {
  const frame = useCurrentFrame();
  const activeBeat =
    payload.beats.find((b) => frame >= b.startFrame && frame < b.endFrame) ??
    payload.beats[payload.beats.length - 1];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        fontFamily: "Inter, 'Noto Sans Devanagari', system-ui, sans-serif",
      }}
    >

      {/* Layer 0 — canvas */}
      <Background />

      {/* Layer 1 — masthead */}
      <Header
        reportType={payload.reportType}
        reportDate={payload.reportDate}
        patientFirstName={payload.patientFirstName}
      />

      {/* Layer 2 — data layer: one ChartCard per beat, 6-frame whip-pan transitions
          centred on each beat boundary (3 frames bleed each side).
          Only this layer moves — Header, Character, Captions, and Disclaimer stay put. */}
      {payload.beats.map((beat, i) => {
        const HALF    = 3; // frames on each side of the boundary
        const isFirst = i === 0;
        const isLast  = i === payload.beats.length - 1;

        // Extend each sequence to cover the transition bleed
        const seqFrom = isFirst ? beat.startFrame : beat.startFrame - HALF;
        const seqEnd  = isLast  ? beat.endFrame   : beat.endFrame   + HALF;

        // — Incoming transition: this card slides in from the right —
        const inStart  = beat.startFrame - HALF;
        const inEnd    = beat.startFrame + HALF;
        const inActive = !isFirst && frame >= inStart && frame <= inEnd;

        // — Outgoing transition: this card slides out to the left —
        const outStart  = beat.endFrame - HALF;
        const outEnd    = beat.endFrame + HALF;
        const outActive = !isLast && frame >= outStart && frame <= outEnd;

        let translateX = 0;
        let blurPx     = 0;

        if (inActive) {
          const p = interpolate(frame, [inStart, inEnd], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          translateX = interpolate(p, [0, 1], [1080, 0]); // 1080px = full canvas width
          blurPx = frame <= beat.startFrame
            ? interpolate(frame, [inStart, beat.startFrame], [0, 12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            : interpolate(frame, [beat.startFrame, inEnd],   [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        } else if (outActive) {
          const p = interpolate(frame, [outStart, outEnd], [0, 1], {
            easing: Easing.in(Easing.cubic),
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          translateX = interpolate(p, [0, 1], [0, -1080]);
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
              {beat.chart ? <ChartCard spec={beat.chart} /> : null}
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Layer 3 — illustrated character (always present, audio drives talking mode).
          Replaces AvatarBubble. See CLAUDE.md §5.8. */}
      <Character
        audioUrl={payload.audioUrl}
        lookAt={activeBeat.lookAt}
        centered={!activeBeat.chart}
      />

      {/* Layer 4 — burnt-in captions; most viewers watch muted */}
      <Captions
        text={activeBeat.caption}
        beatStart={activeBeat.startFrame}
        beatEnd={activeBeat.endFrame}
        lang={payload.lang}
      />

      {/* Layer 5 — disclaimer: render invariant, outside every Sequence.
          See CLAUDE.md §2.1.4. Never move this inside a beat or Sequence. */}
      <Disclaimer text={payload.disclaimer} />

      {/* Master TTS audio — see CLAUDE.md §5.6. */}
      {payload.audioUrl ? <Audio src={payload.audioUrl} /> : null}

    </AbsoluteFill>
  );
};
