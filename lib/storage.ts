import { CarbonDashboardResponse, CarbonEntryRecord, MonthlyTrendPoint } from "@/lib/types";

const KEYS = {
  user: "cc-user",
  entries: "cc-entries"
} as const;

export type UserSession = {
  profileId: string;
  name: string;
  email: string;
  createdAt: string;
};

function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function generateDeterministicId(email: string) {
  // Creating a deterministic ID from the email so data persists across logins perfectly
  let hash = 0;
  const str = email.trim().toLowerCase();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `usr_${Math.abs(hash).toString(36)}_${str.replace(/[^a-z0-9]/g, "").slice(0, 8)}`;
}

export function getUser(): UserSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

export function setUser(name: string, email: string): UserSession {
  const session: UserSession = {
    profileId: generateDeterministicId(email),
    name,
    email,
    createdAt: new Date().toISOString()
  };
  window.localStorage.setItem(KEYS.user, JSON.stringify(session));
  return session;
}

export function logout(): void {
  window.localStorage.removeItem(KEYS.user);
}

function getAllEntries(): CarbonEntryRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEYS.entries);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CarbonEntryRecord[];
  } catch {
    return [];
  }
}

function persistEntries(entries: CarbonEntryRecord[]): void {
  window.localStorage.setItem(KEYS.entries, JSON.stringify(entries));
}

export function saveEntry(entry: Omit<CarbonEntryRecord, "id">): CarbonEntryRecord {
  const all = getAllEntries();
  const record: CarbonEntryRecord = { id: generateId(), ...entry };
  all.unshift(record);
  persistEntries(all);
  return record;
}

export function deleteEntry(id: string): void {
  const all = getAllEntries();
  persistEntries(all.filter((e) => e.id !== id));
}


export function loadDashboard(profileId: string): CarbonDashboardResponse {
  const all = getAllEntries();

  const history = all
    .filter((e) => e.profileId === profileId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15);

  const groupedTrend = new Map<string, number>();
  for (const item of history) {
    if (!groupedTrend.has(item.monthKey)) {
      groupedTrend.set(item.monthKey, item.calculation.totalAnnualKg);
    }
  }

  const trend: MonthlyTrendPoint[] = Array.from(groupedTrend.entries())
    .reverse()
    .map(([monthKey, totalAnnualKg]) => ({
      monthKey,
      totalAnnualKg
    }));

  return {
    latestEntry: history[0] ?? null,
    history,
    trend
  };
}
