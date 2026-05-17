"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAssetServer = void 0;
const http = __importStar(require("node:http"));
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const log_1 = require("../log");
async function startAssetServer(directory) {
    const cors = {
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
        const contentType = ext === ".mp3"
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
            const addr = server.address();
            const url = `http://127.0.0.1:${addr.port}`;
            (0, log_1.log)("info", "Asset server started", { directory, url });
            resolve({
                url,
                close: () => new Promise((res) => {
                    server.close(() => {
                        (0, log_1.log)("info", "Asset server closed");
                        res();
                    });
                }),
            });
        });
    });
}
exports.startAssetServer = startAssetServer;
