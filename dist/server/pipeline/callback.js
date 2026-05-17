"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postCallback = void 0;
async function postCallback(url, body) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "meditrack-render/1.0",
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
            const text = await res.text().catch(() => "<unreadable>");
            console.error(`[callback] Failed: ${url} → ${res.status} ${res.statusText}\n${text.slice(0, 500)}`);
        }
    }
    catch (err) {
        console.error(`[callback] Error posting to ${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
}
exports.postCallback = postCallback;
