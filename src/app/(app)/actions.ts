"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../../db";
import { requireUser } from "../../lib/auth";

export async function saveSearch(name: string, params: Record<string, string>) {
  const user = await requireUser();
  const db = await getDb();
  const clean = Object.fromEntries(
    Object.entries(params).filter(([k, v]) => v && k !== "page")
  );
  await db.insert(schema.savedSearches).values({ userId: user.id, name: name.trim() || "Untitled search", params: clean });
  revalidatePath("/saved");
}

export async function deleteSavedSearch(id: number) {
  const user = await requireUser();
  const db = await getDb();
  await db
    .delete(schema.savedSearches)
    .where(and(eq(schema.savedSearches.id, id), eq(schema.savedSearches.userId, user.id)));
  revalidatePath("/saved");
}

export async function toggleWatch(companyId: number) {
  const user = await requireUser();
  const db = await getDb();
  const existing = await db
    .select({ id: schema.watchlist.id })
    .from(schema.watchlist)
    .where(and(eq(schema.watchlist.userId, user.id), eq(schema.watchlist.companyId, companyId)))
    .limit(1);
  if (existing.length > 0) {
    await db.delete(schema.watchlist).where(eq(schema.watchlist.id, existing[0].id));
  } else {
    await db.insert(schema.watchlist).values({ userId: user.id, companyId });
  }
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/saved");
}
