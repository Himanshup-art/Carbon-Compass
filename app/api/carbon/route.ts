import { NextRequest, NextResponse } from "next/server";
import { calculateCarbonFootprint, getMonthKey, validateCarbonForm } from "@/lib/carbon";
import { getAdminDb } from "@/lib/firebase-admin";
import { CarbonEntryRecord, CarbonFormValues } from "@/lib/types";

const COLLECTION = "carbonEntries";

export async function GET(request: NextRequest) {
  try {
    const profileId = request.nextUrl.searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const snapshot = await db
      .collection(COLLECTION)
      .where("profileId", "==", profileId)
      .orderBy("createdAt", "desc")
      .limit(12)
      .get();

    const history = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data()
        }) as CarbonEntryRecord
    );

    const trend = [...history]
      .reverse()
      .map((item) => ({ monthKey: item.monthKey, totalAnnualKg: item.calculation.totalAnnualKg }));

    return NextResponse.json({
      latestEntry: history[0] ?? null,
      history,
      trend
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load dashboard data"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
      {
        error: error instanceof Error ? error.message : "Unable to save entry"
      },
      { status: 500 }
    );
  }
}
