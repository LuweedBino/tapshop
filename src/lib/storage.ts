import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { get as getBlob } from "@vercel/blob";
import { env } from "./env";

// Files live under "public/<creatorId>/..." (avatars, covers) or "private/<creatorId>/..."
// (paid downloads). Where they are stored depends on the environment:
// - S3_BUCKET set: S3 or any S3-compatible store such as Cloudflare R2
// - BLOB_READ_WRITE_TOKEN set: a private Vercel Blob store (set automatically when a Blob
//   store is connected to the Vercel project); every file is served through our routes
// - neither: ./storage on local disk, for development

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

export type Backend = "s3" | "blob" | "local";

export function backend(): Backend {
  if (env.s3.bucket) return "s3";
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  return "local";
}

export const usingS3 = () => backend() === "s3";

export type Visibility = "public" | "private";

export const MAX_BYTES: Record<Visibility, number> = { public: 5 * 1024 * 1024, private: 500 * 1024 * 1024 };

export function newKey(visibility: Visibility, creatorId: string, filename: string) {
  const safe = filename.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "file";
  return `${visibility}/${creatorId}/${nanoid(12)}-${safe}`;
}

export function keyOwner(key: string) {
  const [visibility, creatorId] = key.split("/");
  return visibility === "public" || visibility === "private" ? { visibility: visibility as Visibility, creatorId } : null;
}

/** Accepts a storage key only if it belongs to this creator and has the expected visibility. */
export function ownKey(value: FormDataEntryValue | null, creatorId: string, visibility: Visibility) {
  const key = typeof value === "string" ? value : "";
  if (!key) return null;
  const owner = keyOwner(key);
  return owner?.creatorId === creatorId && owner.visibility === visibility ? key : undefined;
}

function localPath(key: string) {
  const p = path.resolve(LOCAL_ROOT, key);
  if (!p.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Bad key");
  return p;
}

/** Where the browser should PUT the file; null means upload through Vercel Blob's client SDK. */
export async function uploadUrl(key: string, contentType: string) {
  if (backend() === "blob") return null;
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

/** Reads a file from local disk or Vercel Blob. Returns null if it doesn't exist. */
export async function readObject(key: string): Promise<{ body: BodyInit; contentType: string } | null> {
  if (backend() === "blob") {
    const res = await getBlob(key, { access: "private" }).catch(() => null);
    if (!res || res.statusCode !== 200) return null;
    return { body: res.stream, contentType: res.blob.contentType };
  }
  try {
    const { body, contentType } = await readLocal(key);
    return { body: new Uint8Array(body), contentType };
  } catch {
    return null;
  }
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
