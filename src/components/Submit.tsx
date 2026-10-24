"use client";

import { useFormStatus } from "react-dom";

export function Submit({ children, className = "btn", pendingText, style }: { children: React.ReactNode; className?: string; pendingText?: string; style?: React.CSSProperties }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} style={style} disabled={pending}>
      {pending ? pendingText ?? "Saving…" : children}
    </button>
  );
}
