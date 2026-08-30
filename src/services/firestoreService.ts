import {
  doc,
  setDoc,
  getDoc,
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
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) {
      // Create initial profile and default data
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
      // Update profile info if changed
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
    }
  } catch (error) {
    console.error('Error initializing user data in Firestore:', error);
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
      console.error('Firestore subscribeUserDoc error:', err);
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
      console.error('Firestore subscribeSessions error:', err);
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
      console.error('Firestore subscribeTasks error:', err);
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
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as HabitItem);
      });
      callback(list.length > 0 ? list : DEFAULT_HABITS);
    },
    (err) => {
      console.error('Firestore subscribeHabits error:', err);
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

export async function saveHabitsToFirestore(userId: string, habits: HabitItem[]) {
  try {
    const batch = writeBatch(db);
    habits.forEach((h) => {
      const ref = doc(db, 'users', userId, 'habits', h.id);
      batch.set(ref, { ...h, userId });
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
