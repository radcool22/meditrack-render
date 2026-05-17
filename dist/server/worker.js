"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorker = void 0;
const node_crypto_1 = require("node:crypto");
const bullmq_1 = require("bullmq");
const queue_1 = require("./queue");
const run_1 = require("./pipeline/run");
const log_1 = require("./log");
function startWorker() {
    const worker = new bullmq_1.Worker("render", async (job) => {
        const correlationId = (0, node_crypto_1.randomUUID)();
        (0, log_1.log)("info", "Processing job", {
            jobId: job.id,
            reportId: job.data.reportId,
            correlationId,
        });
        await (0, run_1.runPipeline)(job.data);
        (0, log_1.log)("info", "Completed job", { jobId: job.id, correlationId });
    }, {
        connection: (0, queue_1.getRedisConnection)(),
        concurrency: 1,
    });
    worker.on("failed", (job, err) => {
        (0, log_1.log)("error", "Job failed", { jobId: job?.id, error: err.message });
    });
    return worker;
}
exports.startWorker = startWorker;
