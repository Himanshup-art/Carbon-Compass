import { NextRequest, NextResponse } from "next/server";
import { calculateCarbonFootprint, getMonthKey, validateCarbonForm } from "@/lib/carbon";
import { isFirebaseConfigured, getAdminDb } from "@/lib/firebase-admin";
import { CarbonEntryRecord, CarbonFormValues } from "@/lib/types";

const COLLECTION = "carbonEntries";

export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json({ mode: "local" });
    }

    const profileId = request.nextUrl.searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const snapshot = await db
      .collection(COLLECTION)
      .where("profileId", "==", profileId)
      .get();

    const history = snapshot.docs
      .map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data()
          }) as CarbonEntryRecord
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15);

    const groupedTrend = new Map<string, number>();
    for (const item of history) {
      if (!groupedTrend.has(item.monthKey)) {
        groupedTrend.set(item.monthKey, item.calculation.totalAnnualKg);
      }
    }

    const trend = Array.from(groupedTrend.entries())
      .reverse()
      .map(([monthKey, totalAnnualKg]) => ({ monthKey, totalAnnualKg }));

    return NextResponse.json({
      mode: "cloud",
      latestEntry: history[0] ?? null,
      history,
      trend
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json({ mode: "local" });
    }

    const payload = (await request.json()) as CarbonFormValues;
    const issues = validateCarbonForm(payload);

    if (issues.length) {
      return NextResponse.json({ error: issues.join(" ") }, { status: 400 });
    }

    const calculation = calculateCarbonFootprint(payload);
    const createdAt = new Date().toISOString();
    const monthKey = getMonthKey(new Date());

    const db = getAdminDb();
    const docRef = await db.collection(COLLECTION).add({
      ...payload,
      calculation,
      createdAt,
      monthKey
    });

    return NextResponse.json({
      mode: "cloud",
      entry: {
        id: docRef.id,
        ...payload,
        calculation,
        createdAt,
        monthKey
      } satisfies CarbonEntryRecord
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json({ mode: "local" });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection(COLLECTION).doc(id).delete();

    return NextResponse.json({ mode: "cloud", success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete entry" },
      { status: 500 }
    );
  }
}
