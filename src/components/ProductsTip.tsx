import Link from "next/link";

/** Explains how products, the storefront and extra pages fit together. */
export function ProductsTip({ link = true }: { link?: boolean }) {
  return (
    <div className="mb-5 flex gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
      <span aria-hidden className="text-lg leading-none">💡</span>
      <div className="space-y-1.5">
        <p><strong className="text-neutral-900">Every product you add to your main store shows up in your storefront</strong> automatically, in the order you set on the Products page.</p>
        <p>
          You can also make <strong className="text-neutral-900">as many product pages as you like</strong>, for example a sale, a collection or a launch. Each page has{" "}
          <strong className="text-neutral-900">its own link</strong> and is fully customizable in the page builder (tap <strong className="text-neutral-900">Edit page</strong>): background, header, banner, pictures, videos, text, buttons, FAQs, countdowns and footer.
        </p>
        {link && (
          <p className="pt-1">
            <Link href="/dashboard/products" className="font-semibold text-neutral-900 underline underline-offset-2">Go to Products →</Link>
          </p>
        )}
      </div>
    </div>
  );
}
