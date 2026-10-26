import { permanentRedirect } from "next/navigation";

// The media kit was renamed Portfolio; old bookmarks land on the new page.
export default function OldMediaKitPage() {
  permanentRedirect("/dashboard/portfolio");
}
