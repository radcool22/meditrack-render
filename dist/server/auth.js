"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bearerAuth = void 0;
const factory_1 = require("hono/factory");
const node_crypto_1 = require("node:crypto");
const env_1 = require("./env");
exports.bearerAuth = (0, factory_1.createMiddleware)(async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
        return c.json({ error: "unauthorized", message: "Missing Bearer token" }, 401);
    }
    const token = header.slice(7);
    const expected = (0, env_1.env)().RENDER_API_KEY;
    // Constant-time comparison
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !(0, node_crypto_1.timingSafeEqual)(a, b)) {
        return c.json({ error: "unauthorized", message: "Invalid Bearer token" }, 401);
    }
    await next();
});
