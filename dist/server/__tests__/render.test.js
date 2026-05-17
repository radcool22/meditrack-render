"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// Mock queue + Redis — no real Redis needed
vitest_1.vi.mock("../queue", () => ({
    getRenderQueue: () => ({
        add: vitest_1.vi.fn().mockResolvedValue({ id: "mock-job-id" }),
    }),
    getRedisConnection: () => ({
        ping: vitest_1.vi.fn().mockResolvedValue("PONG"),
    }),
}));
// Mock env — provide test values
vitest_1.vi.mock("../env", () => ({
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
const http_1 = require("../http");
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
    lang: "hi",
};
(0, vitest_1.describe)("POST /render", () => {
    (0, vitest_1.it)("returns 202 with jobId for valid request", async () => {
        const res = await http_1.app.request("/render", {
            method: "POST",
            headers: {
                Authorization: "Bearer test-key",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(sampleBody),
        });
        (0, vitest_1.expect)(res.status).toBe(202);
        const body = await res.json();
        (0, vitest_1.expect)(body.jobId).toBeDefined();
        (0, vitest_1.expect)(body.status).toBe("queued");
    });
    (0, vitest_1.it)("returns 401 without auth", async () => {
        const res = await http_1.app.request("/render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sampleBody),
        });
        (0, vitest_1.expect)(res.status).toBe(401);
    });
    (0, vitest_1.it)("returns 400 with invalid body", async () => {
        const res = await http_1.app.request("/render", {
            method: "POST",
            headers: {
                Authorization: "Bearer test-key",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ invalid: true }),
        });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
});
(0, vitest_1.describe)("GET /healthz", () => {
    (0, vitest_1.it)("returns 200 ok", async () => {
        const res = await http_1.app.request("/healthz");
        (0, vitest_1.expect)(res.status).toBe(200);
        const body = await res.json();
        (0, vitest_1.expect)(body.ok).toBe(true);
    });
});
