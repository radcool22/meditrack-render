import { describe, it, expect, vi } from "vitest";

// Mock queue + Redis — no real Redis needed
vi.mock("../queue", () => ({
  getRenderQueue: () => ({
    add: vi.fn().mockResolvedValue({ id: "mock-job-id" }),
  }),
  getRedisConnection: () => ({
    ping: vi.fn().mockResolvedValue("PONG"),
  }),
}));

// Mock worker liveness — this test file never starts a real worker.
// Default true; individual tests can flip it to simulate a wedged worker.
vi.mock("../workerHealth", () => ({
  isWorkerHealthy: vi.fn(() => true),
}));

// Mock R2 — deletion is asserted on, never sent.
const { deleteReportVideos } = vi.hoisted(() => ({
  deleteReportVideos: vi.fn().mockResolvedValue(2),
}));
vi.mock("../pipeline/upload", () => ({ deleteReportVideos }));

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
import { isWorkerHealthy } from "../workerHealth";

const sampleBody = {
  reportId: "test-001",
  callbackUrl: "https://example.com/callback",
  patient: {
    firstName: "Priya",
    ageYears: 35,
    isPregnancyPanel: false,
  },
  report: {
    type: "Lipid Profile",
    date: "2025-10-18",
    lab: "Dr. Lal PathLabs",
  },
  findings: [
    {
      valueName: "LDL Cholesterol",
      value: 142,
      unit: "mg/dL",
      referenceRange: { low: 0, high: 100 },
      status: "high",
      history: null,
    },
    {
      valueName: "Total Cholesterol",
      value: 178,
      unit: "mg/dL",
      referenceRange: { low: 0, high: 200 },
      status: "normal",
      history: null,
    },
  ],
  lang: "hi" as const,
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

  it("returns 400 (not 500) for a non-JSON body", async () => {
    const res = await app.request("/render", {
      method: "POST",
      headers: { Authorization: "Bearer test-key", "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
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

describe("DELETE /videos/:reportId", () => {
  it("deletes a report's videos with auth", async () => {
    const res = await app.request("/videos/3f2c9a1e-0b7d-4c4e-9a51-2d3e4f5a6b7c", {
      method: "DELETE",
      headers: { Authorization: "Bearer test-key" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 2 });
    expect(deleteReportVideos).toHaveBeenCalledWith("3f2c9a1e-0b7d-4c4e-9a51-2d3e4f5a6b7c");
  });

  it("requires auth", async () => {
    const res = await app.request("/videos/3f2c9a1e-0b7d-4c4e", { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("rejects ids that could widen the R2 prefix", async () => {
    deleteReportVideos.mockClear();
    for (const id of ["abc", "..%2F..", "a%2Fb%2Fc%2Fd%2Fe"]) {
      const res = await app.request(`/videos/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer test-key" },
      });
      expect(res.status).not.toBe(200);
    }
    expect(deleteReportVideos).not.toHaveBeenCalled();
  });
});

describe("GET /healthz", () => {
  it("returns 200 ok", async () => {
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 503 when the worker is unresponsive", async () => {
    vi.mocked(isWorkerHealthy).mockReturnValueOnce(false);
    const res = await app.request("/healthz");
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.worker).toBe("unresponsive");
  });
});
