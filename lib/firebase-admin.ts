import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getEnv(name: string): string | undefined {
  return process.env[name];
}

let dbInstance: ReturnType<typeof getFirestore> | null = null;

export function isFirebaseConfigured(): boolean {
  return !!(
    getEnv("FIREBASE_PROJECT_ID") &&
    getEnv("FIREBASE_CLIENT_EMAIL") &&
    getEnv("FIREBASE_PRIVATE_KEY")
  );
}

export function getAdminDb() {
  if (dbInstance) return dbInstance;

  if (!isFirebaseConfigured()) {
    throw new Error("Database is not configured. Please set up your environment variables.");
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: getEnv("FIREBASE_PROJECT_ID")!,
        clientEmail: getEnv("FIREBASE_CLIENT_EMAIL")!,
        privateKey: getEnv("FIREBASE_PRIVATE_KEY")!.replace(/\\n/g, "\n")
      })
    });
  }

  dbInstance = getFirestore();
  return dbInstance;
}
