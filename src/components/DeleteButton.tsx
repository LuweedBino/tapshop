"use client";

export function DeleteButton({ action, title }: { action: () => Promise<void>; title: string }) {
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(`Remove "${title}" from your store? Past buyers keep their downloads.`)) e.preventDefault(); }}>
      <button aria-label="Delete" className="px-1 text-sm text-neutral-400 hover:text-red-600">✕</button>
    </form>
  );
}
