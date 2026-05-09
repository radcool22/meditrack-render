import { describe, it, expect, vi } from "vitest";

// Mock queue — no Redis needed
vi.mock("../queue", () => ({
  getRenderQueue: () => ({
    add: vi.fn().mockResolvedValue({ id: "mock-job-id" }),
  }),
}));

// Mock env — provide test values
vi.mock("../env", () => ({
  env: () => ({
    PORT: 3000,
    RENDER_API_KEY: "test-key",
    REDIS_URL: "redis://localhost:6379",
    R2_ACCOUNT_ID: "test",
    R2_ACCESS_KEY_ID: "test",
    R2_SECRET_ACCESS_KEY: "test",
    R2_BUCKET: "test-bucket",
    OPENAI_API_KEY: "test",
    OPENAI_MODEL: "gpt-4o",
    ELEVENLABS_API_KEY: "test",
    ELEVENLABS_VOICE_ID_HI: "test",
  }),
}));

import { app } from "../http";

const sampleBody = {
  reportId: "test-001",
  callbackUrl: "https://example.com/callback",
  payload: {
    patientFirstName: "Priya",
    reportType: "Lipid Profile",
    reportDate: "18 Oct 2025",
    lang: "hi",
    disclaimer: "यह medical advice नहीं है। Doctor से consult करें।",
    hasCriticalValue: false,
    audioUrl: "",
    avatarName: "डॉ. Asha",
    avatarRole: "MediTrack AI",
    beats: [
      {
        startFrame: 0,
        endFrame: 90,
        caption: "नमस्ते Priya जी",
        chart: { kind: "bigNumber", value: "142", label: "LDL" },
      },
    ],
  },
};

describe("POST /render", () => {
  it("returns 202 with jobId for valid request", async () => {
    const res = await app.request("/render", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sampleBody),
    });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.jobId).toBeDefined();
    expect(body.status).toBe("queued");
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleBody),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 with invalid body", async () => {
    const res = await app.request("/render", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invalid: true }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /healthz", () => {
  it("returns 200 ok", async () => {
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
