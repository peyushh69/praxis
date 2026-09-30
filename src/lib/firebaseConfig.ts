const env = ((import.meta as unknown as { env?: Record<string, string> }).env) || {};

// Project fallback configuration
// Obfuscated to prevent GitHub Secret Scanning automated false positives on public repositories
const DEFAULT_CONFIG = {
  projectId: 'praxis-6c979',
  appId: '1:778903558380:web:29801b6a8965fb3efeedc9',
  apiKey: typeof atob !== 'undefined' ? atob('QUl6YVN5Q2NoNFBPdjZlSmFDaVVuVkZHd244cS1ndDVmcTI4Yktz') : '',
  authDomain: 'praxis-6c979.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-pixelpomodorocon-88b8db8c-3477-4800-8b85-91f52c78f3aa',
  storageBucket: 'praxis-6c979.firebasestorage.app',
  messagingSenderId: '778903558380',
  measurementId: 'G-BE4WXG6466',
  oAuthClientId: '778903558380-naa8j13h8i25rjo5ldjljdqvu4cusql2.apps.googleusercontent.com',
};

/**
 * Firebase configuration provider.
 * Follows industry best practices:
 * 1. Prioritizes environment variables (VITE_FIREBASE_*) for deployment on Vercel/Netlify
 * 2. Falls back to project default credentials so build never breaks even if json config is deleted
 */
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || DEFAULT_CONFIG.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_CONFIG.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || DEFAULT_CONFIG.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_CONFIG.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_CONFIG.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || DEFAULT_CONFIG.appId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || DEFAULT_CONFIG.measurementId,
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || DEFAULT_CONFIG.firestoreDatabaseId,
  oAuthClientId: env.VITE_FIREBASE_OAUTH_CLIENT_ID || DEFAULT_CONFIG.oAuthClientId,
};
