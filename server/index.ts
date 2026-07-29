import { serve } from "@hono/node-server";
import { env } from "./env"; // loads .env.local + .env.server.local via dotenv
import { app } from "./http";
import { startWorker } from "./worker";
import { log } from "./log";

// Last-resort safety net. The render itself is isolated in a child process
// (see server/pipeline/renderIsolated.ts), so this should rarely fire — but
// if something here does escape normal error handling, the process is in an
// undefined state and should not limp on. Log and exit; the Docker entrypoint
// supervisor (scripts/docker-entrypoint.sh) restarts it.
process.on("uncaughtException", (err) => {
  log("error", "Uncaught exception — exiting for supervisor restart", {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  log("error", "Unhandled rejection — exiting for supervisor restart", {
    message: reason instanceof Error ? reason.message : String(reason),
  });
  process.exit(1);
});

// Validate all env vars on boot — exits immediately if any are missing
const config = env();

// Start HTTP server
const server = serve({
  fetch: app.fetch,
  port: config.PORT,
  hostname: "0.0.0.0",
});
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
