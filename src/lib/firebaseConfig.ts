import rawConfig from '../../firebase-applet-config.json';

const env = ((import.meta as unknown as { env?: Record<string, string> }).env) || {};

/**
 * Firebase configuration provider.
 * Follows industry best practices:
 * 1. Prioritizes environment variables (VITE_FIREBASE_*) for deployment & open-source security
 * 2. Falls back to local firebase-applet-config.json for AI Studio dev runtime
 */
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || rawConfig.apiKey || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig.authDomain || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || rawConfig.projectId || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || rawConfig.storageBucket || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig.messagingSenderId || '',
  appId: env.VITE_FIREBASE_APP_ID || rawConfig.appId || '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || rawConfig.measurementId || '',
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || rawConfig.firestoreDatabaseId || undefined,
};
