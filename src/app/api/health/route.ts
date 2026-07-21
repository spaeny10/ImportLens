import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "../../../db";

export const dynamic = "force-dynamic";

export async function GET() {
  const mode = process.env.DATABASE_URL ? "postgres" : "pglite";
  try {
    const db = await getDb();
    const r = await db.execute(sql`SELECT count(*)::int AS n FROM shipments`);
    const shipments = (r.rows[0] as { n: number }).n;
    return NextResponse.json({ ok: true, db: mode, shipments });
  } catch (e) {
    const err = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return NextResponse.json({ ok: false, db: mode, error: err }, { status: 500 });
  }
}
