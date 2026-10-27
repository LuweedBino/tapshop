"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObject, ownKey } from "@/lib/storage";
import { vaultKind, VAULT_MAX_BYTES } from "@/lib/vault";

const Item = z.object({
  key: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  contentType: z.string().max(200).default("application/octet-stream"),
  size: z.number().int().min(0).max(VAULT_MAX_BYTES),
  source: z.enum(["upload", "design", "video"]).default("upload"),
});

/** Records files that were already uploaded (privately) into the creator's Media Vault. */
export async function addVaultItems(input: unknown[]): Promise<{ error?: string; added?: number }> {
  const creator = await requireCreator();
  const parsed = z.array(Item).min(1).max(50).safeParse(input);
  if (!parsed.success) return { error: "Those files couldn't be added" };
  const rows = [];
  for (const item of parsed.data) {
    const key = ownKey(item.key, creator.id, "private");
    if (!key) return { error: "Invalid file" };
    rows.push({ ...item, key, creatorId: creator.id, kind: vaultKind(item.contentType, item.name) });
  }
  await db.vaultItem.createMany({ data: rows, skipDuplicates: true });
  revalidatePath("/dashboard/studio");
  return { added: rows.length };
}

export async function deleteVaultItem(id: string): Promise<{ error?: string }> {
  const creator = await requireCreator();
  const item = await db.vaultItem.findFirst({ where: { id, creatorId: creator.id } });
  if (!item) return { error: "File not found" };
  await db.vaultItem.delete({ where: { id: item.id } });
  await deleteObject(item.key);
  revalidatePath("/dashboard/studio");
  return {};
}
