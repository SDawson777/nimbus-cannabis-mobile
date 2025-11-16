import * as admin from 'firebase-admin';
import { env } from '../env';

let appInstance: admin.app.App | null = null;

function serviceAccountFromEnv(): admin.ServiceAccount {
  const b64 = env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 missing');
  const json = Buffer.from(b64, 'base64').toString('utf8');
  const svc = JSON.parse(json);
  if (
    typeof (svc as any).private_key !== 'string' ||
    !(svc as any).private_key.includes('BEGIN PRIVATE KEY')
  ) {
    throw new Error('service account JSON missing valid private_key');
  }
  return svc as admin.ServiceAccount;
}

export const initFirebase = (): admin.app.App => {
  // Skip Firebase initialization in test environment
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
    // Return a mock app instance for tests
    return {
      name: 'test-app',
      options: {},
    } as admin.app.App;
  }

  if (appInstance) return appInstance;
  if (admin.apps.length) {
    appInstance = admin.app();
    return appInstance;
  }
  appInstance = admin.initializeApp({
    credential: admin.credential.cert(serviceAccountFromEnv()),
    storageBucket: `${env.FIREBASE_PROJECT_ID}.appspot.com`,
  });
  return appInstance;
};

export const getFirestore = (): admin.firestore.Firestore => {
  // Skip Firebase initialization in test environment
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
    // Return a mock Firestore instance for tests
    return {} as admin.firestore.Firestore;
  }

  if (!admin.apps.length) initFirebase();
  return admin.firestore();
};

export { admin };
