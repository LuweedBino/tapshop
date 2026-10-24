"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function Refresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return <div className="mt-6 h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />;
}
