import * as fs from "node:fs";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
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

  return url;
}

// Right-to-delete: removes every video rendered for a report ({reportId}/*.mp4).
export async function deleteReportVideos(reportId: string): Promise<number> {
  const e = env();
  const client = getS3Client();
  let deleted = 0;
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: e.R2_BUCKET,
        Prefix: `${reportId}/`,
        ContinuationToken: token,
      }),
    );
    const keys = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
    if (keys.length > 0) {
      await client.send(
        new DeleteObjectsCommand({ Bucket: e.R2_BUCKET, Delete: { Objects: keys } }),
      );
      deleted += keys.length;
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return deleted;
}
