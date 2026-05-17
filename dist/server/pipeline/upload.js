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
exports.uploadToR2 = void 0;
const fs = __importStar(require("node:fs"));
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const env_1 = require("../env");
function getS3Client() {
    const e = (0, env_1.env)();
    return new client_s3_1.S3Client({
        region: "auto",
        endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        forcePathStyle: true,
        credentials: {
            accessKeyId: e.R2_ACCESS_KEY_ID,
            secretAccessKey: e.R2_SECRET_ACCESS_KEY,
        },
    });
}
async function uploadToR2(reportId, jobId, filePath) {
    const e = (0, env_1.env)();
    const client = getS3Client();
    const key = `${reportId}/${jobId}.mp4`;
    await client.send(new client_s3_1.PutObjectCommand({
        Bucket: e.R2_BUCKET,
        Key: key,
        Body: fs.readFileSync(filePath),
        ContentType: "video/mp4",
        CacheControl: "public, max-age=31536000, immutable",
    }));
    // Always generate a presigned URL (24h TTL).
    // R2_PUBLIC_BASE_URL support deferred until custom domain + public bucket is configured.
    const url = await (0, s3_request_presigner_1.getSignedUrl)(client, new client_s3_1.GetObjectCommand({ Bucket: e.R2_BUCKET, Key: key }), { expiresIn: 86400 });
    console.log(`[upload] Presigned URL: ${url}`);
    return url;
}
exports.uploadToR2 = uploadToR2;
