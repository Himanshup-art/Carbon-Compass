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

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const profileId = generateDeterministicId(email);
    const db = getAdminDb();
    
    const userRef = db.collection("carbonUsers").doc(profileId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const userData = doc.data()!;
    const hashedPassword = createHash("sha256").update(password).digest("hex");

    if (userData.password !== hashedPassword) {
      // Temporary transition bridge: If user registered earlier without a password, let's auto-bind it in our cloud era.
      // But we shouldn't do this automatically for security. Wait, the user specifically has old accounts without a password.
      // We will reject it to enforce proper reset. 
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      profileId: userData.profileId,
      name: userData.name,
      email: userData.email
    });

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Error" }, { status: 500 });
  }
}
