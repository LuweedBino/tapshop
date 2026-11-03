"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObject, ownKey } from "@/lib/storage";
import { formatBytes, splitFileName, vaultKind, VAULT_MAX_BYTES, VAULT_QUOTA_BYTES } from "@/lib/vault";

const Item = z.object({
  key: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  contentType: z.string().max(200).default("application/octet-stream"),
  size: z.number().int().min(0).max(VAULT_MAX_BYTES),
  source: z.enum(["upload", "design", "video"]).default("upload"),
});

/** Records files that were already uploaded (privately) into the creator's Media Vault. */
export async function addVaultItems(input: unknown[], folderId?: string | null): Promise<{ error?: string; added?: number; items?: { id: string; name: string; kind: string }[] }> {
  const creator = await requireCreator();
  const parsed = z.array(Item).min(1).max(50).safeParse(input);
  if (!parsed.success) return { error: "Those files couldn't be added" };
  const folder = await ownFolder(folderId, creator.id);
  if (folder === false) return { error: "That folder doesn't exist any more" };
  const rows = [];
  for (const item of parsed.data) {
    const key = ownKey(item.key, creator.id, "private");
    if (!key) return { error: "Invalid file" };
    rows.push({ ...item, key, creatorId: creator.id, folderId: folder, kind: vaultKind(item.contentType, item.name) });
  }
  const used = (await db.vaultItem.aggregate({ where: { creatorId: creator.id }, _sum: { size: true } }))._sum.size ?? 0;
  if (used + rows.reduce((n, r) => n + r.size, 0) > VAULT_QUOTA_BYTES) {
    // The files are already uploaded; remove them so a full Vault doesn't leave orphans behind.
    await Promise.all(rows.map((r) => deleteObject(r.key).catch(() => {})));
    return { error: `Your Media Vault is full (${formatBytes(VAULT_QUOTA_BYTES)}). Delete some files to make room.` };
  }
  await db.vaultItem.createMany({ data: rows, skipDuplicates: true });
  const items = await db.vaultItem.findMany({ where: { creatorId: creator.id, key: { in: rows.map((r) => r.key) } }, select: { id: true, name: true, kind: true } });
  revalidatePath("/dashboard/studio");
  return { added: rows.length, items };
}

export async function deleteVaultItem(id: string): Promise<{ error?: string }> {
  const creator = await requireCreator();
  const item = await db.vaultItem.findFirst({ where: { id, creatorId: creator.id } });
  if (!item) return { error: "File not found" };
  await db.vaultItem.delete({ where: { id: item.id } });
  // "Sell this" products share the Vault's stored file, and buyers keep their downloads even
  // after a product is archived, so the file stays for as long as any product points at it.
  if (!(await db.product.count({ where: { fileKey: item.key } }))) await deleteObject(item.key);
  revalidatePath("/dashboard/studio");
  return {};
}

const FileName = z.string().trim().min(1, "Give the file a name").max(180, "That name is too long");

/** Changes the part of the name people see; the file's ending stays, so it keeps opening the same way. */
export async function renameVaultItem(id: string, name: string): Promise<{ error?: string }> {
  const creator = await requireCreator();
  const parsed = FileName.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const item = await db.vaultItem.findFirst({ where: { id, creatorId: creator.id }, select: { id: true, name: true } });
  if (!item) return { error: "File not found" };
  const { ext } = splitFileName(item.name);
  const typed = parsed.data.replace(/[\\/\p{Cc}]+/gu, " ").trim();
  const base = ext && typed.toLowerCase().endsWith(ext.toLowerCase()) ? typed.slice(0, -ext.length).trim() : typed;
  if (!base) return { error: "Give the file a name" };
  await db.vaultItem.update({ where: { id: item.id }, data: { name: base + ext } });
  revalidatePath("/dashboard/studio");
  return {};
}

const Sale = z.object({
  title: z.string().trim().min(1, "Give it a title").max(120),
  description: z.string().trim().max(5000).default(""),
  price: z.string().trim().max(20).default("0"),
  coverKey: z.string().default(""),
});

/** "Sell this": turns a Vault file into a published product on the main store. */
export async function sellVaultItem(id: string, input: unknown): Promise<{ error?: string; productId?: string; handle?: string }> {
  const creator = await requireCreator();
  const parsed = Sale.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { title, description, price, coverKey } = parsed.data;
  const amount = Number(price.replace(/[$,\s]/g, "") || "0");
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) return { error: "Enter a valid price" };
  const priceCents = Math.round(amount * 100);
  if (priceCents > 0 && priceCents < 50) return { error: "Paid products must cost at least $0.50" };
  const item = await db.vaultItem.findFirst({ where: { id, creatorId: creator.id }, select: { key: true, name: true, kind: true } });
  if (!item) return { error: "File not found" };
  if (item.kind === "project") return { error: "Editable projects can't be sold. Save it as a video or picture first." };
  const cover = ownKey(coverKey, creator.id, "public");
  if (cover === undefined) return { error: "Invalid cover picture" };
  const last = await db.product.findFirst({ where: { creatorId: creator.id, pageId: null }, orderBy: { position: "desc" } });
  const product = await db.product.create({
    data: { creatorId: creator.id, type: "DIGITAL", title, description, priceCents, coverKey: cover, fileKey: item.key, fileName: item.name, published: true, position: (last?.position ?? -1) + 1 },
    select: { id: true },
  });
  revalidatePath(`/${creator.handle}`, "layout");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/studio");
  return { productId: product.id, handle: creator.handle };
}

const FolderName = z.string().trim().min(1, "Give the folder a name").max(60, "That name is too long");

/** null for "no folder"; false when the id isn't one of this creator's folders. */
async function ownFolder(id: string | null | undefined, creatorId: string): Promise<string | null | false> {
  if (!id) return null;
  const folder = await db.vaultFolder.findFirst({ where: { id, creatorId }, select: { id: true } });
  return folder ? folder.id : false;
}

export async function createVaultFolder(name: string): Promise<{ error?: string; id?: string }> {
  const creator = await requireCreator();
  const parsed = FolderName.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if ((await db.vaultFolder.count({ where: { creatorId: creator.id } })) >= 200) return { error: "You have the most folders allowed" };
  const folder = await db.vaultFolder.create({ data: { creatorId: creator.id, name: parsed.data }, select: { id: true } });
  revalidatePath("/dashboard/studio");
  return { id: folder.id };
}

export async function renameVaultFolder(id: string, name: string): Promise<{ error?: string }> {
  const creator = await requireCreator();
  const parsed = FolderName.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { count } = await db.vaultFolder.updateMany({ where: { id, creatorId: creator.id }, data: { name: parsed.data } });
  if (!count) return { error: "Folder not found" };
  revalidatePath("/dashboard/studio");
  return {};
}

/** Removes the folder only; its files stay in the Vault, outside any folder. */
export async function deleteVaultFolder(id: string): Promise<{ error?: string }> {
  const creator = await requireCreator();
  const folder = await db.vaultFolder.findFirst({ where: { id, creatorId: creator.id }, select: { id: true } });
  if (!folder) return { error: "Folder not found" };
  await db.$transaction([
    db.vaultItem.updateMany({ where: { folderId: folder.id, creatorId: creator.id }, data: { folderId: null } }),
    db.vaultFolder.delete({ where: { id: folder.id } }),
  ]);
  revalidatePath("/dashboard/studio");
  return {};
}

export async function moveVaultItems(ids: string[], folderId: string | null): Promise<{ error?: string }> {
  const creator = await requireCreator();
  const parsed = z.array(z.string().min(1)).min(1).max(500).safeParse(ids);
  if (!parsed.success) return { error: "Nothing to move" };
  const folder = await ownFolder(folderId, creator.id);
  if (folder === false) return { error: "That folder doesn't exist any more" };
  await db.vaultItem.updateMany({ where: { id: { in: parsed.data }, creatorId: creator.id }, data: { folderId: folder } });
  revalidatePath("/dashboard/studio");
  return {};
}
