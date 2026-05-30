import { randomUUID } from "node:crypto";
import { Worker } from "bullmq";
import { getRedisConnection } from "./queue";
import { runPipeline } from "./pipeline/run";
import { log } from "./log";
import type { RenderJobData } from "./types";

export function startWorker(): Worker {
  const worker = new Worker<RenderJobData>(
    "render",
    async (job) => {
      const correlationId = randomUUID();
      log("info", "Processing job", {
        jobId: job.id,
        reportId: job.data.reportId,
        correlationId,
      });
      await runPipeline(job.data);
      log("info", "Completed job", { jobId: job.id, correlationId });
    },
    {
      connection: getRedisConnection(),
      concurrency: 1,
      drainDelay: 60_000,        // when queue is empty, wait 60s before next poll (default 5s)
      stalledInterval: 300_000,  // check for stalled jobs every 5 min (default 30s)
      maxStalledCount: 1,        // mark as failed after 1 stall
      lockDuration: 600_000,     // 10 min lock — generous for slowest renders
      lockRenewTime: 120_000,    // renew every 2 min while running (was 60s)
    },
  );

  worker.on("failed", (job, err) => {
    log("error", "Job failed", { jobId: job?.id, error: err.message });
  });

  // Detect Upstash quota exhaustion and pause worker to stop the error loop
  worker.on("error", (err) => {
    if (err.message?.includes("max requests limit exceeded")) {
      log("error", "Upstash quota exhausted — pausing worker", {
        message: err.message,
      });
      worker.pause();
    }
  });

  return worker;
}
