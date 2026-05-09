import * as fs from "node:fs";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";

function getS3Client(): S3Client {
  const e = env();
  return new S3Client({
    region: "auto",
    endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: e.R2_ACCESS_KEY_ID,
      secretAccessKey: e.R2_SECRET_ACCESS_KEY,
    },
  });
}

export async function uploadToR2(
  reportId: string,
  jobId: string,
  filePath: string,
): Promise<string> {
  const e = env();
  const client = getS3Client();
  const key = `${reportId}/${jobId}.mp4`;

  await client.send(
    new PutObjectCommand({
      Bucket: e.R2_BUCKET,
      Key: key,
      Body: fs.readFileSync(filePath),
      ContentType: "video/mp4",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  // Always generate a presigned URL (24h TTL).
  // R2_PUBLIC_BASE_URL support deferred until custom domain + public bucket is configured.
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: e.R2_BUCKET, Key: key }),
    { expiresIn: 86400 },
  );

  console.log(`[upload] Presigned URL: ${url}`);
  return url;
}
