import path from "node:path";
import dotenv from "dotenv";

// Load .env.local before validating env vars
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { serve } from "@hono/node-server";
import { env } from "./env";
import { app } from "./http";
import { startWorker } from "./worker";
import { log } from "./log";

// Validate all env vars on boot — exits immediately if any are missing
const config = env();

// Start HTTP server
const server = serve({ fetch: app.fetch, port: config.PORT });
log("info", "HTTP listening", { port: config.PORT });

// Start BullMQ worker in the same process
const worker = startWorker();
log("info", "Render worker started", { concurrency: 1 });

// Graceful shutdown — runs once even if both SIGINT and SIGTERM arrive
let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("info", "Shutting down", { signal });

  // Force-exit after 5 minutes if current job is stuck
  const forceTimeout = setTimeout(() => {
    log("error", "Shutdown timeout — force exit");
    process.exit(1);
  }, 5 * 60 * 1000);
  forceTimeout.unref();

  server.close(() => {
    log("info", "HTTP server closed");
  });

  worker.close().then(() => {
    log("info", "Worker drained");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
