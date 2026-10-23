import { env } from "../env";
import type { CallbackBody } from "../types";

// Backoff before each retry. A lost callback leaves the caller's report stuck
// in "generating", so transient failures (network, 5xx) are retried.
const RETRY_DELAYS_MS = [2_000, 10_000, 30_000];

async function attempt(url: string, body: CallbackBody): Promise<"ok" | "retry" | "give_up"> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "meditrack-render/1.0",
        "Authorization": `Bearer ${env().CALLBACK_SHARED_SECRET}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.ok) return "ok";
    const text = await res.text().catch(() => "<unreadable>");
    console.error(
      `[callback] Failed: ${url} → ${res.status} ${res.statusText}\n${text.slice(0, 500)}`,
    );
    // 4xx (bad secret, bad body) won't fix itself on retry.
    return res.status >= 500 || res.status === 429 ? "retry" : "give_up";
  } catch (err) {
    console.error(
      `[callback] Error posting to ${url}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return "retry";
  } finally {
    clearTimeout(timeout);
  }
}

// Never throws — a callback failure must not mask the pipeline's own outcome.
export async function postCallback(
  url: string,
  body: CallbackBody,
): Promise<void> {
  for (let i = 0; ; i++) {
    const result = await attempt(url, body);
    if (result !== "retry" || i >= RETRY_DELAYS_MS.length) {
      if (result !== "ok") {
        console.error(`[callback] Giving up after ${i + 1} attempt(s): ${url}`);
      }
      return;
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[i]));
  }
}
