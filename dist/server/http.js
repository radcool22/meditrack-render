"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const hono_1 = require("hono");
const node_crypto_1 = require("node:crypto");
const auth_1 = require("./auth");
const rate_limit_1 = require("./rate-limit");
const queue_1 = require("./queue");
const types_1 = require("./types");
const log_1 = require("./log");
exports.app = new hono_1.Hono();
// Health check — verifies Redis connectivity, no auth required
exports.app.get("/healthz", async (c) => {
    try {
        const redis = (0, queue_1.getRedisConnection)();
        await Promise.race([
            redis.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1000)),
        ]);
    }
    catch {
        return c.json({ ok: false, redis: "unreachable" }, 503);
    }
    return c.json({ ok: true, uptime_sec: Math.floor(process.uptime()) });
});
// Render endpoint — rate limit → bearer auth → validate → enqueue
exports.app.post("/render", rate_limit_1.rateLimit, auth_1.bearerAuth, async (c) => {
    const body = await c.req.json();
    const parsed = types_1.renderRequestSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: "validation_failed", issues: parsed.error.issues }, 400);
    }
    const jobId = (0, node_crypto_1.randomUUID)();
    const queue = (0, queue_1.getRenderQueue)();
    await queue.add("render", { ...parsed.data, jobId }, { jobId });
    (0, log_1.log)("info", "Job queued", { jobId, reportId: parsed.data.reportId });
    return c.json({ jobId, status: "queued" }, 202);
});
