import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";

export async function startAssetServer(
  directory: string,
): Promise<{ url: string; close: () => Promise<void> }> {
  const cors: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
    "Cache-Control": "no-store",
  };

  const server = http.createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors);
      res.end();
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, cors);
      res.end();
      return;
    }

    const reqPath = decodeURIComponent(req.url ?? "/").slice(1); // strip leading /
    if (!reqPath || reqPath.includes("..") || path.isAbsolute(reqPath)) {
      res.writeHead(403, cors);
      res.end();
      return;
    }

    const filePath = path.join(directory, reqPath);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not_found", path: reqPath }));
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === ".mp3"
        ? "audio/mpeg"
        : ext === ".wav"
          ? "audio/wav"
          : ext === ".mp4"
            ? "video/mp4"
            : "application/octet-stream";

    res.writeHead(200, { ...cors, "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      const url = `http://127.0.0.1:${addr.port}`;
      console.log(`[assets] Serving from ${directory} at ${url}`);
      resolve({
        url,
        close: () =>
          new Promise<void>((res) => {
            server.close(() => {
              console.log("[assets] Closed");
              res();
            });
          }),
      });
    });
  });
}
