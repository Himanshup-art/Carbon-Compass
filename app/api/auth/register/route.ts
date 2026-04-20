import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isFirebaseConfigured } from "@/lib/firebase-admin";
import { createHash } from "crypto";

function generateDeterministicId(email: string) {
  let hash = 0;
  const str = email.trim().toLowerCase();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `usr_${Math.abs(hash).toString(36)}_${str.replace(/[^a-z0-9]/g, "").slice(0, 8)}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json({ error: "Cloud database not configured" }, { status: 500 });
    }

    const { name, email, password } = await request.json();

    if (!name || !email || !password || password.length < 6) {
      return NextResponse.json({ error: "Invalid registration details provided" }, { status: 400 });
    }

    const profileId = generateDeterministicId(email);
    const db = getAdminDb();
    
    // Check if user already exists
    const userRef = db.collection("carbonUsers").doc(profileId);
    const doc = await userRef.get();

    if (doc.exists) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
    }

    const hashedPassword = createHash("sha256").update(password).digest("hex");

    await userRef.set({
      profileId,
      name,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      profileId,
      name,
      email: email.trim().toLowerCase()
    });

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Error" }, { status: 500 });
  }
}
