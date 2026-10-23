import { randomUUID } from "node:crypto";
import { Worker } from "bullmq";
import { getRedisConnection, RENDER_QUEUE_NAME } from "./queue";
import { runPipeline } from "./pipeline/run";
import { log } from "./log";
import { markHeartbeat } from "./workerHealth";
import type { RenderJobData } from "./types";

export function startWorker(): Worker {
  const worker = new Worker<RenderJobData>(
    RENDER_QUEUE_NAME,
    async (job) => {
      const correlationId = randomUUID();
      log("info", "Processing job", {
        jobId: job.id,
        reportId: job.data.reportId,
        correlationId,
      });
      // attemptsMade counts prior failed attempts, so this run is attempt N+1.
      const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      await runPipeline(job.data, isFinalAttempt);
      log("info", "Completed job", { jobId: job.id, correlationId });
    },
    {
      connection: getRedisConnection(),
      concurrency: 1,
      drainDelay: 60_000,       // when queue is empty, wait 60s before next poll (default 5s)
      stalledInterval: 60_000,  // check for stalled jobs every 1 min — was 5 min, too slow to
                                // reclaim a job abandoned by a crashed worker
      maxStalledCount: 1,       // mark as failed after 1 stall
      lockDuration: 600_000,    // 10 min lock — generous for slowest renders
      lockRenewTime: 120_000,   // renew every 2 min while running (was 60s)
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

  // Heartbeat independent of job activity, so /healthz can tell a wedged
  // worker apart from a merely idle one.
  const heartbeat = setInterval(() => {
    markHeartbeat(worker.isRunning());
  }, 15_000);
  heartbeat.unref();
  markHeartbeat(worker.isRunning());

  worker.on("closed", () => clearInterval(heartbeat));

  return worker;
}
