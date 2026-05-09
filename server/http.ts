import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { bearerAuth } from "./auth";
import { getRenderQueue } from "./queue";
import { renderRequestSchema } from "./types";

export const app = new Hono();

// Health check — no auth required (Fly uses this)
app.get("/healthz", (c) => c.json({ ok: true }));

// Render endpoint — bearer auth required
app.post("/render", bearerAuth, async (c) => {
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

  return c.json({ jobId, status: "queued" }, 202);
});
