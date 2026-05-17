"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = void 0;
const factory_1 = require("hono/factory");
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const windows = new Map();
function getIp(c) {
    return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
exports.rateLimit = (0, factory_1.createMiddleware)(async (c, next) => {
    const ip = getIp(c);
    const now = Date.now();
    const timestamps = windows.get(ip)?.filter((t) => now - t < WINDOW_MS) ?? [];
    if (timestamps.length >= MAX_REQUESTS) {
        return c.json({ error: "rate_limited", retry_after_sec: 60 }, { status: 429, headers: { "Retry-After": "60" } });
    }
    timestamps.push(now);
    windows.set(ip, timestamps);
    await next();
});
