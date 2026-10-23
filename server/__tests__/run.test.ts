import { describe, it, expect, vi, beforeEach } from "vitest";

// Every pipeline stage is mocked; these tests cover only the orchestration —
// which outcome sends which callback, and what BullMQ is told to retry.
const m = vi.hoisted(() => ({
  checkSafetyGates: vi.fn(),
  generateScript: vi.fn(),
  lintScript: vi.fn(),
  generateVoice: vi.fn(),
  recomputeTiming: vi.fn(),
  renderVideoIsolated: vi.fn(),
  uploadToR2: vi.fn(),
  postCallback: vi.fn(),
}));

vi.mock("../pipeline/safety", () => ({ checkSafetyGates: m.checkSafetyGates }));
vi.mock("../pipeline/script", () => ({ generateScript: m.generateScript }));
vi.mock("../pipeline/lint", () => ({ lintScript: m.lintScript }));
vi.mock("../pipeline/voice", () => ({ generateVoice: m.generateVoice }));
vi.mock("../pipeline/timing", () => ({ recomputeTiming: m.recomputeTiming }));
vi.mock("../pipeline/renderIsolated", () => ({ renderVideoIsolated: m.renderVideoIsolated }));
vi.mock("../pipeline/upload", () => ({ uploadToR2: m.uploadToR2 }));
vi.mock("../pipeline/callback", () => ({ postCallback: m.postCallback }));
vi.mock("../pipeline/local-asset-server", () => ({
  startAssetServer: async () => ({ url: "http://127.0.0.1:1", close: async () => {} }),
}));

import { UnrecoverableError } from "bullmq";
import { runPipeline } from "../pipeline/run";
import { PipelineError, SafetyError, ScriptError } from "../pipeline/errors";

const job = {
  jobId: "11111111-2222-3333-4444-555555555555",
  reportId: "r1",
  callbackUrl: "https://app.example/api/videos/callback",
  patient: { firstName: "Priya", ageYears: 40, isPregnancyPanel: false },
  report: { type: "Lipid Profile", date: "2025-10-18", lab: "Dr. Lal PathLabs" },
  findings: [],
  lang: "hi" as const,
};

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.generateScript.mockResolvedValue({ beats: [{ caption: "x" }], reportDate: "18 Oct 2025" });
  m.generateVoice.mockResolvedValue({ masterAudioPath: "/tmp/x.mp3", beatAudios: [], totalDurationMs: 1000 });
  m.recomputeTiming.mockReturnValue({ beats: [] });
  m.renderVideoIsolated.mockResolvedValue({ durationSec: 40 });
  m.uploadToR2.mockResolvedValue("https://r2.example/r1/job.mp4");
});

describe("runPipeline outcomes", () => {
  it("success → one 'completed' callback with the video URL", async () => {
    await runPipeline(job, true);
    expect(m.postCallback).toHaveBeenCalledTimes(1);
    expect(m.postCallback.mock.calls[0][1]).toMatchObject({ status: "completed", videoUrl: "https://r2.example/r1/job.mp4", durationSec: 40 });
  });

  it("passes the report to lint so the spoken date is grounded", async () => {
    await runPipeline(job, true);
    expect(m.lintScript.mock.calls[0][2]).toEqual(job.report);
  });

  it("passes the lab name into the render payload", async () => {
    await runPipeline(job, true);
    expect(m.recomputeTiming.mock.calls[0][3]).toBe("Dr. Lal PathLabs");
  });

  it("retryable failure on a non-final attempt → NO callback, error rethrown for retry", async () => {
    m.generateVoice.mockRejectedValue(new PipelineError("tts_failed", "ElevenLabs down"));
    await expect(runPipeline(job, false)).rejects.toBeInstanceOf(PipelineError);
    expect(m.postCallback).not.toHaveBeenCalled();
  });

  it("retryable failure on the final attempt → 'failed' callback with its code", async () => {
    m.renderVideoIsolated.mockRejectedValue(new PipelineError("render_timeout", "killed"));
    await expect(runPipeline(job, true)).rejects.toBeInstanceOf(PipelineError);
    expect(m.postCallback).toHaveBeenCalledTimes(1);
    expect(m.postCallback.mock.calls[0][1]).toMatchObject({ status: "failed", error: "render_timeout" });
  });

  it("unknown crash on the final attempt → 'failed' callback as render_failed", async () => {
    m.uploadToR2.mockRejectedValue(new Error("socket hang up"));
    await expect(runPipeline(job, true)).rejects.toThrow("socket hang up");
    expect(m.postCallback.mock.calls[0][1]).toMatchObject({ status: "failed", error: "render_failed" });
  });

  it("safety stop → callback even on a non-final attempt, and never retried", async () => {
    m.checkSafetyGates.mockImplementation(() => { throw new SafetyError("specialist_required", "Pediatric"); });
    await expect(runPipeline(job, false)).rejects.toBeInstanceOf(UnrecoverableError);
    expect(m.postCallback.mock.calls[0][1]).toMatchObject({ status: "failed", error: "specialist_required" });
    expect(m.generateScript).not.toHaveBeenCalled();
  });

  it("lint violation → callback on first attempt, never retried", async () => {
    m.lintScript.mockImplementation(() => { throw new ScriptError("script_number_hallucination", "Number 9.9"); });
    await expect(runPipeline(job, false)).rejects.toBeInstanceOf(UnrecoverableError);
    expect(m.postCallback.mock.calls[0][1]).toMatchObject({ status: "failed", error: "script_number_hallucination" });
    expect(m.generateVoice).not.toHaveBeenCalled();
  });

  it("a callback that throws never masks the pipeline's own error", async () => {
    m.generateScript.mockRejectedValue(new ScriptError("script_generation_failed", "bad JSON"));
    m.postCallback.mockRejectedValue(new Error("callback exploded"));
    await expect(runPipeline(job, true)).rejects.toThrow("script_generation_failed");
  });
});
