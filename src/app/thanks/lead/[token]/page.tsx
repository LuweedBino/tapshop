import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ThanksCard } from "@/components/ThanksCard";

export default async function LeadThanks({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lead = await db.lead.findUnique({ where: { downloadToken: token }, include: { product: true, creator: true } });
  if (!lead) notFound();
  return (
    <ThanksCard
      creator={lead.creator}
      title="Check your inbox!"
      body={lead.product.fileKey ? `We sent ${lead.product.title} to ${lead.email}. You can also grab it right here.` : `Thanks for signing up, ${lead.name || "friend"}. You're on the list.`}
      download={lead.product.fileKey ? `/api/download/${token}` : undefined}
    />
  );
}
