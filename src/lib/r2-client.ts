import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'agent-storage';

let s3Client: S3Client | null = null;

if (accountId && accessKeyId && secretAccessKey) {
  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function getR2Client(): S3Client {
  if (!s3Client) {
    throw new Error("Cloudflare R2 Credentials are not configured in environment variables.");
  }
  return s3Client;
}

export async function generateR2PresignedUploadUrl(objectKey: string, expiresIn: number = 900): Promise<string> {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
  });
  // 900 seconds = 15 minutes
  return await getSignedUrl(client, command, { expiresIn });
}

export async function generateR2PresignedDownloadUrl(objectKey: string, expiresIn: number = 3600): Promise<string> {
  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
  });
  // 3600 seconds = 1 hour
  return await getSignedUrl(client, command, { expiresIn });
}
