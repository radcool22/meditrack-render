import path from "node:path";
import dotenv from "dotenv";

// Load .env.local before validating env vars
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { serve } from "@hono/node-server";
import { env } from "./env";
import { app } from "./http";
import { startWorker } from "./worker";

// Validate all env vars on boot — exits immediately if any are missing
const config = env();

// Start HTTP server
const server = serve({ fetch: app.fetch, port: config.PORT });
console.log(`[server] HTTP listening on :${config.PORT}`);

// Start BullMQ worker in the same process
const worker = startWorker();
console.log("[server] Render worker started (concurrency: 1)");

// Graceful shutdown
function shutdown() {
  console.log("[server] Shutting down…");
  worker.close().then(() => {
    server.close(() => process.exit(0));
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
