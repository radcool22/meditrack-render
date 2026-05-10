import { createMiddleware } from "hono/factory";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const windows = new Map<string, number[]>();

function getIp(c: {
  req: { header: (n: string) => string | undefined };
}): string {
  return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export const rateLimit = createMiddleware(async (c, next) => {
  const ip = getIp(c);
  const now = Date.now();
  const timestamps =
    windows.get(ip)?.filter((t) => now - t < WINDOW_MS) ?? [];

  if (timestamps.length >= MAX_REQUESTS) {
    return c.json(
      { error: "rate_limited", retry_after_sec: 60 },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  timestamps.push(now);
  windows.set(ip, timestamps);
  await next();
});
