import type { ScriptOutput } from "./script";
import type { VoiceResult } from "./voice";
import type { MediTrackPayload } from "../../src/data/sampleMediTrack";
import { ScriptError } from "./errors";

const FPS = 30;
const GAP_FRAMES = 6; // 200ms silence between beats at 30fps

export function recomputeTiming(
  script: ScriptOutput,
  voice: VoiceResult,
  masterAudioPath: string,
  reportLab = "",
): MediTrackPayload {
  let currentFrame = 0;

  const beats = script.beats.map((beat, i) => {
    const audioDurationMs = voice.beatAudios[i]?.durationMs ?? 3000;
    const audioFrames = Math.ceil((audioDurationMs / 1000) * FPS);
    const startFrame = currentFrame;
    const endFrame = currentFrame + audioFrames + GAP_FRAMES;
    currentFrame = endFrame;
    return { ...beat, startFrame, endFrame };
  });

  // Hard cap 90s (CLAUDE.md §2.3.2): cut content, never speed up audio.
  // Non-retryable — a rerun of the same script is just as long.
  const totalFrames = currentFrame;
  if (totalFrames > 90 * FPS) {
    throw new ScriptError(
      "script_too_long",
      `Narration is ${(totalFrames / FPS).toFixed(1)}s, over the 90s cap`,
    );
  }

  return {
    patientFirstName: script.patientFirstName,
    reportType: script.reportType,
    reportDate: script.reportDate,
    reportLab,
    lang: script.lang,
    disclaimer: "यह medical advice नहीं है। Doctor से consult करें।",
    hasCriticalValue: script.hasCriticalValue,
    audioUrl: masterAudioPath, // placeholder — overwritten by orchestrator with HTTP URL
    avatarName: "डॉ. Asha",
    avatarRole: "MediTrack AI",
    beats,
  };
}
