import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

// Files live under "public/<creatorId>/..." (avatars, covers) or "private/<creatorId>/..."
// (paid downloads). With S3_BUCKET set they go to S3 or any S3-compatible store such as
// Cloudflare R2; otherwise they are written to ./storage for local development.

const LOCAL_ROOT = path.join(process.cwd(), "storage");

let s3client: S3Client | null = null;
function s3() {
  s3client ??= new S3Client({
    region: env.s3.region,
    endpoint: env.s3.endpoint,
    forcePathStyle: Boolean(env.s3.endpoint),
    credentials: { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey },
  });
  return s3client;
}

export const usingS3 = () => Boolean(env.s3.bucket);

export type Visibility = "public" | "private";

export function newKey(visibility: Visibility, creatorId: string, filename: string) {
  const safe = filename.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "file";
  return `${visibility}/${creatorId}/${nanoid(12)}-${safe}`;
}

export function keyOwner(key: string) {
  const [visibility, creatorId] = key.split("/");
  return visibility === "public" || visibility === "private" ? { visibility: visibility as Visibility, creatorId } : null;
}

function localPath(key: string) {
  const p = path.resolve(LOCAL_ROOT, key);
  if (!p.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Bad key");
  return p;
}

export async function uploadUrl(key: string, contentType: string) {
  if (usingS3()) {
    return getSignedUrl(s3(), new PutObjectCommand({ Bucket: env.s3.bucket, Key: key, ContentType: contentType }), {
      expiresIn: 600,
    });
  }
  return `/api/upload/local?key=${encodeURIComponent(key)}`;
}

export async function writeLocal(key: string, body: Buffer, contentType: string) {
  const p = localPath(key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
  await fs.writeFile(p + ".type", contentType);
}

export async function readLocal(key: string) {
  const p = localPath(key);
  const [body, contentType] = await Promise.all([
    fs.readFile(p),
    fs.readFile(p + ".type", "utf8").catch(() => "application/octet-stream"),
  ]);
  return { body, contentType };
}

export async function signedDownloadUrl(key: string, downloadName?: string) {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      ResponseContentDisposition: downloadName ? `attachment; filename="${downloadName.replace(/"/g, "")}"` : undefined,
    }),
    { expiresIn: 300 },
  );
}
