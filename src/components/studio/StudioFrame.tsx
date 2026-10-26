"use client";

// The original static editor runs in an iframe so its CSS and global scripts stay out of
// the app. Keep src stable: remounting the iframe drops unsaved in-memory video edits.
// allow-modals is needed for the "custom size" prompt in the design studio.
export function StudioFrame() {
  return (
    <iframe
      title="TapShop Studio"
      src="/dashboard/studio/assets/index.html"
      sandbox="allow-scripts allow-same-origin allow-downloads allow-forms allow-modals"
      className="block h-[calc(100dvh-140px)] min-h-[600px] w-full rounded-xl border border-neutral-200 bg-white md:h-[calc(100dvh-64px)]"
    />
  );
}
