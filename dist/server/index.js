"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load .env.local before validating env vars
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), ".env.local") });
const node_server_1 = require("@hono/node-server");
const env_1 = require("./env");
const http_1 = require("./http");
const worker_1 = require("./worker");
const log_1 = require("./log");
// Validate all env vars on boot — exits immediately if any are missing
const config = (0, env_1.env)();
// Start HTTP server
const server = (0, node_server_1.serve)({ fetch: http_1.app.fetch, port: config.PORT });
(0, log_1.log)("info", "HTTP listening", { port: config.PORT });
// Start BullMQ worker in the same process
const worker = (0, worker_1.startWorker)();
(0, log_1.log)("info", "Render worker started", { concurrency: 1 });
// Graceful shutdown — runs once even if both SIGINT and SIGTERM arrive
let shuttingDown = false;
function shutdown(signal) {
    if (shuttingDown)
        return;
    shuttingDown = true;
    (0, log_1.log)("info", "Shutting down", { signal });
    // Force-exit after 5 minutes if current job is stuck
    const forceTimeout = setTimeout(() => {
        (0, log_1.log)("error", "Shutdown timeout — force exit");
        process.exit(1);
    }, 5 * 60 * 1000);
    forceTimeout.unref();
    server.close(() => {
        (0, log_1.log)("info", "HTTP server closed");
    });
    worker.close().then(() => {
        (0, log_1.log)("info", "Worker drained");
        process.exit(0);
    });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
