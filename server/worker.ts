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
      stalledInterval: 30_000,   // check for stalled jobs every 30s
      maxStalledCount: 1,        // mark as failed after 1 stall
      lockDuration: 300_000,     // 5 min lock — renders take this long
      lockRenewTime: 60_000,     // renew every 60s while running
    },
  );

  worker.on("failed", (job, err) => {
    log("error", "Job failed", { jobId: job?.id, error: err.message });
  });

  return worker;
}
