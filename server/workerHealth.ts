// Tracks BullMQ worker liveness so /healthz can reflect a wedged worker, not
// just a live HTTP server. Updated on an interval independent of job
// activity (see worker.ts) so it stays fresh even while the queue is idle.

const HEARTBEAT_STALE_MS = 45_000; // 3x the 15s heartbeat interval

let lastHeartbeatAt = 0;
let lastKnownRunning = false;

export function markHeartbeat(isRunning: boolean) {
  lastHeartbeatAt = Date.now();
  lastKnownRunning = isRunning;
}

export function isWorkerHealthy(): boolean {
  if (lastHeartbeatAt === 0) return false; // hasn't reported in yet
  const age = Date.now() - lastHeartbeatAt;
  return lastKnownRunning && age < HEARTBEAT_STALE_MS;
}
