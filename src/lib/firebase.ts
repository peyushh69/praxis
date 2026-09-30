import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setLogLevel } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Initialize Firestore with long-polling and persistent cache so user data connects reliably
// across restricted networks, sandboxes, Cloud Run, iframes, and offline states
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId || undefined
);

// Suppress non-fatal connection transition logs
setLogLevel('silent');

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Translates Firebase Auth error codes into clear, actionable human explanations
 */
export function getAuthErrorMessage(error: any): string {
  const code = error?.code || '';
  const rawMsg = error?.message || '';

  if (code === 'auth/unauthorized-domain' || rawMsg.includes('unauthorized-domain')) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
    return `Domain unauthorized: "${host}" is not in your Firebase Authorized Domains. Add it in Firebase Console -> Authentication -> Settings -> Authorized domains, or use Email / Guest sign-in.`;
  }

  if (code === 'auth/popup-blocked' || rawMsg.includes('popup-blocked')) {
    return 'Sign-in popup was blocked by your browser or sandbox iframe. Please open the app in a new tab or use Email login.';
  }

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Sign-in was cancelled.';
  }

  if (code === 'auth/operation-not-allowed' || rawMsg.includes('operation-not-allowed')) {
    return 'This sign-in method is not enabled in Firebase Console. Enable it under Authentication -> Sign-in method.';
  }

  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Invalid email or password. Please verify and try again.';
  }

  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please log in instead.';
  }

  if (code === 'auth/weak-password') {
    return 'Password must be at least 6 characters long.';
  }

  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }

  if (code === 'auth/network-request-failed' || rawMsg.includes('network-request-failed')) {
    return 'Network connection issue during authentication. Please check your internet or retry.';
  }

  if (code === 'auth/invalid-api-key' || rawMsg.includes('invalid-api-key')) {
    return 'Invalid Firebase API Key. Please verify your environment variables or Firebase configuration.';
  }

  return rawMsg || 'Authentication failed. Please check connection and try again.';
}

export async function loginWithGoogle(): Promise<User | null> {
  // Check online connectivity
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Please check your internet connection.');
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    const errorCode = error?.code || '';
    const errorMsg = error?.message || '';

    // User closed the popup or cancelled authentication - handled smoothly without error state
    if (
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/cancelled-popup-request' ||
      errorCode === 'auth/user-cancelled' ||
      errorMsg.includes('popup-closed-by-user')
    ) {
      return null;
    }

    // Translate to actionable message
    const friendlyMessage = getAuthErrorMessage(error);
    const enrichedError = new Error(friendlyMessage);
    (enrichedError as any).code = errorCode;
    throw enrichedError;
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  if (!email || !pass) {
    throw new Error('Please enter both email and password.');
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return cred.user;
  } catch (error: any) {
    const friendlyMessage = getAuthErrorMessage(error);
    const enrichedError = new Error(friendlyMessage);
    (enrichedError as any).code = error?.code;
    throw enrichedError;
  }
}

export async function registerWithEmail(email: string, pass: string, displayName?: string): Promise<User> {
  if (!email || !pass) {
    throw new Error('Please enter both email and password.');
  }
  if (pass.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (displayName && cred.user) {
      try {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      } catch (pErr) {
        console.warn('Profile update notice:', pErr);
      }
    }
    return cred.user;
  } catch (error: any) {
    const friendlyMessage = getAuthErrorMessage(error);
    const enrichedError = new Error(friendlyMessage);
    (enrichedError as any).code = error?.code;
    throw enrichedError;
  }
}

export async function loginAnonymouslyUser(): Promise<User> {
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (error: any) {
    const friendlyMessage = getAuthErrorMessage(error);
    const enrichedError = new Error(friendlyMessage);
    (enrichedError as any).code = error?.code;
    throw enrichedError;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Logout Error:', error);
    throw error;
  }
}

export { onAuthStateChanged, type User };
