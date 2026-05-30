import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";
import { log } from "./log";

let _connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis(env().REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,    // BullMQ recommendation
      retryStrategy: (times) => {
        // 200ms, 400ms, 800ms, ... up to 30s max
        return Math.min(times * 200, 30_000);
      },
    });

    // Deduplicated error logging — don't spam the same message
    let lastRedisError: string | null = null;
    _connection.on("error", (err) => {
      if (err.message !== lastRedisError) {
        log("error", "Redis error", { message: err.message });
        lastRedisError = err.message;
      }
    });
    _connection.on("ready", () => {
      if (lastRedisError !== null) {
        log("info", "Redis reconnected");
        lastRedisError = null;
      }
    });
  }
  return _connection;
}

let _queue: Queue | null = null;

export function getRenderQueue(): Queue {
  if (!_queue) {
    _queue = new Queue("render", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2, // initial + 1 retry
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 100, age: 7 * 24 * 3600 },
        removeOnFail: { count: 50, age: 7 * 24 * 3600 },
      },
    });
  }
  return _queue;
}
