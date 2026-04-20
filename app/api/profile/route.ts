import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isFirebaseConfigured } from "@/lib/firebase-admin";
import { createHash } from "crypto";

export async function PATCH(request: NextRequest) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json({ error: "Cloud database not configured" }, { status: 500 });
    }

    const { profileId, newName, newPassword } = await request.json();

    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getAdminDb();
    const userRef = db.collection("carbonUsers").doc(profileId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updates: Record<string, string> = {};

    if (newName?.trim()) {
      updates.name = newName.trim();
    }

    if (newPassword?.trim()) {
      if (newPassword.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      updates.password = createHash("sha256").update(newPassword).digest("hex");
    }

    if (Object.keys(updates).length > 0) {
      await userRef.update(updates);
    }

    return NextResponse.json({ success: true, ...updates });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Error" }, { status: 500 });
  }
}
