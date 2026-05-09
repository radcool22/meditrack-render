import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";

let _connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis(env().REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
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
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    });
  }
  return _queue;
}
