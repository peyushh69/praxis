import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Initialize Firestore with auto-detect long-polling to prevent WebSocket timeout in restricted networks/sandboxes
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId || undefined
);

// Suppress non-fatal backend connection transition logs
setLogLevel('error');

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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

    // If network request failed, retry once automatically after a brief delay
    if (errorCode === 'auth/network-request-failed' || errorMsg.includes('network-request-failed')) {
      console.warn('Google Sign-In network glitch detected. Retrying once...');
      try {
        await new Promise((res) => setTimeout(res, 800));
        const retryResult = await signInWithPopup(auth, googleProvider);
        return retryResult.user;
      } catch (retryError: any) {
        const retryCode = retryError?.code || '';
        const retryMsg = retryError?.message || '';

        if (
          retryCode === 'auth/popup-closed-by-user' ||
          retryCode === 'auth/cancelled-popup-request' ||
          retryCode === 'auth/user-cancelled' ||
          retryMsg.includes('popup-closed-by-user')
        ) {
          return null;
        }

        console.warn('Network request failed on retry for Google Sign-In:', retryError?.message || retryError);
        throw new Error(
          'Network connection issue during Google Sign-In. Please check your internet connection, disable ad-blockers, or open the app in a new tab.'
        );
      }
    }

    if (errorCode === 'auth/popup-blocked' || errorMsg.includes('popup-blocked')) {
      console.warn('Popup blocked by browser during sign in.');
      throw new Error('Sign-in popup was blocked by your browser. Please allow popups or open the app in a new tab.');
    }

    console.warn('Google Sign-In issue:', errorMsg || error);
    throw error;
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
