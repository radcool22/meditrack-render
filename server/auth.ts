import { createMiddleware } from "hono/factory";
import { timingSafeEqual } from "node:crypto";
import { env } from "./env";

export const bearerAuth = createMiddleware(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json(
      { error: "unauthorized", message: "Missing Bearer token" },
      401,
    );
  }

  const token = header.slice(7);
  const expected = env().RENDER_API_KEY;

  // Constant-time comparison
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return c.json(
      { error: "unauthorized", message: "Invalid Bearer token" },
      401,
    );
  }

  await next();
});
