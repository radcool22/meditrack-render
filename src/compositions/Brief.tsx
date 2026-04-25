import { AbsoluteFill, Audio, OffthreadVideo, Sequence, useCurrentFrame } from "remotion";
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

      {/* Layer 3 — data layer: one ChartCard per beat, sequenced */}
      {brief.beats.map((beat, i) => (
        <Sequence key={i} from={beat.startFrame} durationInFrames={beat.endFrame - beat.startFrame}>
          <ChartCard spec={beat.chart} />
        </Sequence>
      ))}

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
