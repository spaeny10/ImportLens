import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { getFleetPositions } from "../../../lib/ais/provider";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const positions = await getFleetPositions();
  return NextResponse.json({ positions, generatedAt: new Date().toISOString() });
}
