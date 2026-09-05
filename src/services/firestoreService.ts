import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  AppSettings,
  PomodoroSession,
  TaskItem,
  HabitItem,
  HabitProgressRecord,
  CountdownGoal,
} from '../types';
import { DEFAULT_HABITS, DEFAULT_SETTINGS } from '../utils/storage';

export const DEFAULT_COUNTDOWN_GOAL: CountdownGoal = {
  id: 'goal-target-default',
  title: 'SET TARGET',
  targetDate: '2026-10-31',
  startDate: '2026-08-01',
  description: 'Target Goal & Milestone Tracker',
  color: '#ff3b00',
};

// Top level user doc
export async function initializeUserData(
  userId: string,
  userProfile?: { displayName?: string | null; email?: string | null; photoURL?: string | null }
) {
  try {
    const userDocRef = doc(db, 'users', userId);
    let snap: any = null;

    try {
      snap = await getDoc(userDocRef);
    } catch (fetchErr: any) {
      // Offline mode or slow connection: non-fatal, log notice and continue with offline merge
      console.warn('Notice: Firestore offline during initializeUserData, syncing locally:', fetchErr?.message || fetchErr);
    }

    if (snap && snap.exists()) {
      // Existing user: update profile info with merge
      await setDoc(
        userDocRef,
        {
          displayName: userProfile?.displayName || snap.data()?.displayName || 'Praxis User',
          email: userProfile?.email || snap.data()?.email || '',
          photoURL: userProfile?.photoURL || snap.data()?.photoURL || '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } else if (snap && !snap.exists()) {
      // Brand new user: create initial profile and default data
      await setDoc(userDocRef, {
        uid: userId,
        displayName: userProfile?.displayName || 'Praxis User',
        email: userProfile?.email || '',
        photoURL: userProfile?.photoURL || '',
        settings: DEFAULT_SETTINGS,
        countdownGoal: DEFAULT_COUNTDOWN_GOAL,
        habitLogs: {},
        updatedAt: new Date().toISOString(),
      });

      // Seed initial default habits in subcollection
      const habitsColl = collection(db, 'users', userId, 'habits');
      for (const h of DEFAULT_HABITS) {
        await setDoc(doc(habitsColl, h.id), {
          ...h,
          userId,
        });
      }
    } else {
      // Client offline fallback: save profile via merge so it queues in local cache and syncs online
      await setDoc(
        userDocRef,
        {
          uid: userId,
          ...(userProfile?.displayName ? { displayName: userProfile.displayName } : {}),
          ...(userProfile?.email ? { email: userProfile.email } : {}),
          ...(userProfile?.photoURL ? { photoURL: userProfile.photoURL } : {}),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (error: any) {
    console.warn('Notice initializing user data in Firestore:', error?.message || error);
  }
}

// ----------------------------------------------------
// Realtime Subscriptions
// ----------------------------------------------------

export function subscribeUserDoc(
  userId: string,
  callback: (data: {
    settings?: AppSettings;
    countdownGoal?: CountdownGoal;
    habitLogs?: HabitProgressRecord;
  }) => void
): Unsubscribe {
  const userDocRef = doc(db, 'users', userId);
  return onSnapshot(
    userDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback({
          settings: data.settings ? { ...DEFAULT_SETTINGS, ...data.settings } : undefined,
          countdownGoal: data.countdownGoal || undefined,
          habitLogs: data.habitLogs || undefined,
        });
      }
    },
    (err) => {
      console.warn('Firestore subscribeUserDoc status:', err?.message || err);
    }
  );
}

export function subscribeSessions(
  userId: string,
  callback: (sessions: PomodoroSession[]) => void
): Unsubscribe {
  const sessionsColl = collection(db, 'users', userId, 'sessions');
  const q = query(sessionsColl, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PomodoroSession[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as PomodoroSession);
      });
      callback(list);
    },
    (err) => {
      console.warn('Firestore subscribeSessions status:', err?.message || err);
    }
  );
}

export function subscribeTasks(
  userId: string,
  callback: (tasks: TaskItem[]) => void
): Unsubscribe {
  const tasksColl = collection(db, 'users', userId, 'tasks');
  const q = query(tasksColl, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: TaskItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as TaskItem);
      });
      callback(list);
    },
    (err) => {
      console.warn('Firestore subscribeTasks status:', err?.message || err);
    }
  );
}

export function subscribeHabits(
  userId: string,
  callback: (habits: HabitItem[]) => void
): Unsubscribe {
  const habitsColl = collection(db, 'users', userId, 'habits');
  const q = query(habitsColl, orderBy('number', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: HabitItem[] = [];
      const seenIds = new Set<string>();
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as HabitItem;
        const id = item.id || docSnap.id;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          list.push({ ...item, id });
        }
      });
      // Always sort by habit number
      list.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
      callback(list);
    },
    (err) => {
      console.warn('Firestore subscribeHabits status:', err?.message || err);
    }
  );
}

// ----------------------------------------------------
// Firestore Write Operations
// ----------------------------------------------------

export async function saveSessionToFirestore(userId: string, session: PomodoroSession) {
  try {
    const sessionDocRef = doc(db, 'users', userId, 'sessions', session.id);
    await setDoc(sessionDocRef, {
      ...session,
      userId,
    });
  } catch (error) {
    console.error('Error saving session to Firestore:', error);
  }
}

export async function saveTaskToFirestore(userId: string, task: TaskItem) {
  try {
    const taskDocRef = doc(db, 'users', userId, 'tasks', task.id);
    await setDoc(taskDocRef, {
      ...task,
      userId,
    });
  } catch (error) {
    console.error('Error saving task to Firestore:', error);
  }
}

export async function deleteTaskFromFirestore(userId: string, taskId: string) {
  try {
    const taskDocRef = doc(db, 'users', userId, 'tasks', taskId);
    await deleteDoc(taskDocRef);
  } catch (error) {
    console.error('Error deleting task from Firestore:', error);
  }
}

export async function deleteHabitFromFirestore(
  userId: string,
  habitId: string,
  remainingHabits?: HabitItem[]
) {
  try {
    const batch = writeBatch(db);
    // 1. Permanently delete the target habit document
    const habitDocRef = doc(db, 'users', userId, 'habits', habitId);
    batch.delete(habitDocRef);

    // 2. Renumber and persist remaining habits atomically in the same batch
    if (remainingHabits && remainingHabits.length > 0) {
      remainingHabits.forEach((h, idx) => {
        const ref = doc(db, 'users', userId, 'habits', h.id);
        batch.set(ref, {
          ...h,
          number: idx + 1,
          userId,
        });
      });
    }

    await batch.commit();
  } catch (error) {
    console.error('Error deleting habit from Firestore:', error);
  }
}

export async function saveHabitsToFirestore(userId: string, habits: HabitItem[]) {
  try {
    const habitsColl = collection(db, 'users', userId, 'habits');
    const existingSnap = await getDocs(habitsColl);
    const newHabitIds = new Set(habits.map((h) => h.id));

    const batch = writeBatch(db);

    // Delete any documents in Firestore that are no longer in the user's active habits list
    existingSnap.forEach((docSnap) => {
      if (!newHabitIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    // Write / update all current habits with sequential numbering
    habits.forEach((h, idx) => {
      const ref = doc(db, 'users', userId, 'habits', h.id);
      batch.set(ref, {
        ...h,
        number: idx + 1,
        userId,
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error saving habits to Firestore:', error);
  }
}

export async function saveHabitLogsToFirestore(userId: string, habitLogs: HabitProgressRecord) {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        habitLogs,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error saving habit logs to Firestore:', error);
  }
}

export async function saveSettingsToFirestore(userId: string, settings: AppSettings) {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        settings,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error saving settings to Firestore:', error);
  }
}

export async function saveCountdownGoalToFirestore(userId: string, goal: CountdownGoal) {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        countdownGoal: goal,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error saving countdown goal to Firestore:', error);
  }
}

export async function resetUserDataInFirestore(userId: string) {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        habitLogs: {},
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error resetting user data in Firestore:', error);
  }
}
