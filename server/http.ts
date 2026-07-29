import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { bearerAuth } from "./auth";
import { rateLimit } from "./rate-limit";
import { getRenderQueue, getRedisConnection } from "./queue";
import { renderRequestSchema } from "./types";
import { log } from "./log";
import { isWorkerHealthy } from "./workerHealth";

export const app = new Hono();

// Health check — verifies Redis connectivity AND worker liveness, no auth required
app.get("/healthz", async (c) => {
  try {
    const redis = getRedisConnection();
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 1000),
      ),
    ]);
  } catch {
    return c.json({ ok: false, redis: "unreachable" }, 503);
  }

  if (!isWorkerHealthy()) {
    return c.json({ ok: false, worker: "unresponsive" }, 503);
  }

  return c.json({ ok: true, uptime_sec: Math.floor(process.uptime()) });
});

// Render endpoint — rate limit → bearer auth → validate → enqueue
app.post("/render", rateLimit, bearerAuth, async (c) => {
  const body = await c.req.json();
  const parsed = renderRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "validation_failed", issues: parsed.error.issues },
      400,
    );
  }

  const jobId = randomUUID();
  const queue = getRenderQueue();

  await queue.add("render", { ...parsed.data, jobId }, { jobId });

  log("info", "Job queued", { jobId, reportId: parsed.data.reportId });
  return c.json({ jobId, status: "queued" }, 202);
});
