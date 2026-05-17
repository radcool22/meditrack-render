"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recomputeTiming = void 0;
const FPS = 30;
const GAP_FRAMES = 6; // 200ms silence between beats at 30fps
function recomputeTiming(script, voice, masterAudioPath) {
    let currentFrame = 0;
    const beats = script.beats.map((beat, i) => {
        const audioDurationMs = voice.beatAudios[i]?.durationMs ?? 3000;
        const audioFrames = Math.ceil((audioDurationMs / 1000) * FPS);
        const startFrame = currentFrame;
        const endFrame = currentFrame + audioFrames + GAP_FRAMES;
        currentFrame = endFrame;
        return { ...beat, startFrame, endFrame };
    });
    const totalFrames = currentFrame;
    if (totalFrames > 2700) {
        console.warn(`[timing] Duration ${(totalFrames / FPS).toFixed(1)}s exceeds 90s cap — proceeding anyway`);
    }
    return {
        patientFirstName: script.patientFirstName,
        reportType: script.reportType,
        reportDate: script.reportDate,
        lang: script.lang,
        disclaimer: "यह medical advice नहीं है। Doctor से consult करें।",
        hasCriticalValue: script.hasCriticalValue,
        audioUrl: masterAudioPath, // placeholder — overwritten by orchestrator with HTTP URL
        avatarName: "डॉ. Asha",
        avatarRole: "MediTrack AI",
        beats,
    };
}
exports.recomputeTiming = recomputeTiming;
