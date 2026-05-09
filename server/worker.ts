import { Worker } from "bullmq";
import { getRedisConnection } from "./queue";
import { runPipeline } from "./pipeline/run";
import type { RenderJobData } from "./types";

export function startWorker(): Worker {
  const worker = new Worker<RenderJobData>(
    "render",
    async (job) => {
      console.log(
        `[worker] Processing job ${job.id} (report: ${job.data.reportId})`,
      );
      await runPipeline(job.data);
      console.log(`[worker] Completed job ${job.id}`);
    },
    {
      connection: getRedisConnection(),
      concurrency: 1,
    },
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
