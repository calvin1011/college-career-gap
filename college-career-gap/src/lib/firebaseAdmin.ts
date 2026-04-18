import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Validation is intentionally lazy (see initAdminSdk below).
// Running it at module load time causes Next.js to throw during the
// "Collecting page data" build step, before runtime env vars are available.
const REQUIRED_ENV_VARS = [
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
] as const;

let _adminAuth: Auth | undefined;
let _adminDb: Firestore | undefined;

function initAdminSdk(): void {
  if (_adminAuth) return; // already initialised

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
    });
  }

  _adminAuth = getAuth();
  _adminDb = getFirestore();
}

// Proxy exports so callers keep the same `adminAuth.x` / `adminDb.x` API
// while deferring initialisation until the first actual property access.
export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop: string | symbol) {
    initAdminSdk();
    return (_adminAuth as Auth)[prop as keyof Auth];
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop: string | symbol) {
    initAdminSdk();
    return (_adminDb as Firestore)[prop as keyof Firestore];
  },
});
