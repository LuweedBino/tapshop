"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/upload";

type Props = {
  name: string;
  visibility: "public" | "private";
  initialKey?: string | null;
  initialName?: string | null;
  accept?: string;
  label: string;
  hint?: string;
  onChange?: (key: string) => void;
};

// Uploads straight to storage, then submits only the storage key.
export function FileUpload({ name, visibility, initialKey, initialName, accept, label, hint, onChange }: Props) {
  const [key, setKeyState] = useState(initialKey ?? "");
  const setKey = (k: string) => {
    setKeyState(k);
    onChange?.(k);
  };
  const [fileName, setFileName] = useState(initialName ?? "");
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const isImage = visibility === "public";

  async function upload(file: File) {
    setStatus("uploading");
    setError("");
    try {
      setKey(await uploadFile(file, visibility));
      setFileName(file.name);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  return (
    <div>
      {label && <span className="label">{label}</span>}
      <input type="hidden" name={name} value={key} />
      {!isImage && <input type="hidden" name={`${name}Name`} value={fileName} />}
      <div className="flex items-center gap-3">
        {isImage && key && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/files/${key}`} alt="" className="h-16 w-16 rounded-xl object-cover" />
        )}
        {!isImage && fileName && <span className="truncate rounded-lg bg-neutral-100 px-3 py-2 text-sm">{fileName}</span>}
        <button type="button" className="btn-secondary" onClick={() => input.current?.click()} disabled={status === "uploading"}>
          {status === "uploading" ? "Uploading…" : key ? "Replace" : "Upload"}
        </button>
        {key && (
          <button type="button" className="text-sm text-neutral-500 hover:text-red-600" onClick={() => { setKey(""); setFileName(""); }}>
            Remove
          </button>
        )}
      </div>
      <input ref={input} type="file" accept={accept} className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {hint && <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>}
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
