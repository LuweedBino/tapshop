import { upload as blobUpload } from "@vercel/blob/client";

// Browser-side: uploads straight to storage (S3 presigned URL, Vercel Blob, or the local dev
// endpoint) so files never pass through a server action. Returns the new storage key.
export async function uploadFile(file: File, visibility: "public" | "private") {
  const contentType = file.type || "application/octet-stream";
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ visibility, filename: file.name, contentType, size: file.size }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  if (data.url) {
    const put = await fetch(data.url, { method: "PUT", headers: { "content-type": contentType }, body: file });
    if (!put.ok) throw new Error("Upload failed");
  } else {
    await blobUpload(data.key, file, { access: "private", handleUploadUrl: "/api/upload/blob", contentType: file.type || undefined, multipart: file.size > 50 * 1024 * 1024 });
  }
  return data.key as string;
}
