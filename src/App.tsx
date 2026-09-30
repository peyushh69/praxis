import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, LogIn, LogOut, User as UserIcon, Cloud, Smartphone, AlertCircle } from 'lucide-react';
import { TimerMode, AppSettings, PomodoroSession, TaskItem, DayLog, HabitItem, HabitProgressRecord, CountdownGoal } from './types';
import {
  formatDateKey,
  aggregateDayLogs,
  calculateStreakStats,
  DEFAULT_SETTINGS,
  DEFAULT_HABITS,
  loadSettings,
  saveSettings,
  loadSessions,
  saveSessions,
  loadTasks,
  saveTasks,
  loadHabits,
  saveHabits,
  loadHabitLogs,
  saveHabitLogs,
} from './utils/storage';
import {
  saveActiveTimer,
  loadActiveTimer,
  clearActiveTimer,
  backgroundTicker,
  audioKeepAlive,
  wakeLockManager,
  requestNotificationPermission,
  showDesktopNotification,
} from './utils/timerService';
import { cleanAudio } from './utils/audio';
import {
  auth,
  loginWithGoogle,
  logoutUser,
  onAuthStateChanged,
  User,
} from './lib/firebase';
import {
  initializeUserData,
  subscribeUserDoc,
  subscribeSessions,
  subscribeTasks,
  subscribeHabits,
  saveSessionToFirestore,
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  saveHabitsToFirestore,
  deleteHabitFromFirestore,
  saveHabitLogsToFirestore,
  saveSettingsToFirestore,
  saveCountdownGoalToFirestore,
  resetUserDataInFirestore,
  DEFAULT_COUNTDOWN_GOAL,
} from './services/firestoreService';

import { PixelTimer } from './components/PixelTimer';
import { ExamCountdownCard } from './components/ExamCountdownCard';
import { ConsistencyHeatmap } from './components/ConsistencyHeatmap';
import { StatsOverview } from './components/StatsOverview';
import { RadialHabitTracker } from './components/RadialHabitTracker';
import { SettingsModal } from './components/SettingsModal';
import { DayDetailsModal } from './components/DayDetailsModal';
import { InstallApkModal } from './components/InstallApkModal';
import { AuthModal } from './components/AuthModal';

export const App: React.FC = () => {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Persistence state - initialized with offline/guest local storage fallback
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [sessions, setSessions] = useState<PomodoroSession[]>(() => loadSessions());
  const [tasks, setTasks] = useState<TaskItem[]>(() => loadTasks());
  const [habits, setHabits] = useState<HabitItem[]>(() => loadHabits());
  const [habitLogs, setHabitLogs] = useState<HabitProgressRecord>(() => loadHabitLogs());
  const [countdownGoal, setCountdownGoal] = useState<CountdownGoal>(DEFAULT_COUNTDOWN_GOAL);

  // Timer dynamic state - initialized from active timer persistence if available
  const [mode, setMode] = useState<TimerMode>(() => {
    const saved = loadActiveTimer();
    return saved ? saved.mode : 'focus';
  });

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const saved = loadActiveTimer();
    if (saved) {
      if (saved.isRunning && saved.targetEndTime) {
        const remaining = Math.round((saved.targetEndTime - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
      }
      return typeof saved.timeLeft === 'number' ? saved.timeLeft : DEFAULT_SETTINGS.focusDuration * 60;
    }
    return DEFAULT_SETTINGS.focusDuration * 60;
  });

  const [totalTime, setTotalTime] = useState<number>(() => {
    const saved = loadActiveTimer();
    return saved && saved.totalTime ? saved.totalTime : DEFAULT_SETTINGS.focusDuration * 60;
  });

  const [isRunning, setIsRunning] = useState<boolean>(() => {
    const saved = loadActiveTimer();
    if (saved && saved.isRunning && saved.targetEndTime) {
      const remaining = Math.round((saved.targetEndTime - Date.now()) / 1000);
      return remaining > 0;
    }
    return false;
  });

  const [completedCycles, setCompletedCycles] = useState<number>(() => {
    const saved = loadActiveTimer();
    return saved ? saved.completedCycles || 0 : 0;
  });

  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => {
    const saved = loadActiveTimer();
    return saved ? saved.activeTaskId : null;
  });

  const [completionNotice, setCompletionNotice] = useState<string | null>(null);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Day logs and stats calculation (memoized)
  const dayLogs = useMemo(() => aggregateDayLogs(sessions), [sessions]);
  const streakStats = useMemo(() => calculateStreakStats(dayLogs), [dayLogs]);

  // Audio & Notification Ref
  const timerIntervalRef = useRef<number | null>(null);

  // ---------------------------------------------------------------------------
  // Firebase Auth State Listener & Firestore Real-Time Data Sync
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        // User logged in: Initialize user document if new & load their Firestore collections
        try {
          await initializeUserData(user.uid, {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          });
        } catch (e: any) {
          console.warn('Notice: initialize user doc:', e?.message || e);
        }
      } else {
        // User logged out / Guest mode: Load local data, DO NOT wipe running timer!
        setSessions(loadSessions());
        setTasks(loadTasks());
        setHabits(loadHabits());
        setHabitLogs(loadHabitLogs());
        setSettings(loadSettings());
        setCountdownGoal(DEFAULT_COUNTDOWN_GOAL);

        const active = loadActiveTimer();
        if (!active || !active.isRunning) {
          setIsRunning(false);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Subscribe to user collections when currentUser changes
  useEffect(() => {
    if (!currentUser) return;

    const uid = currentUser.uid;

    // 1. Subscribe to User top-level doc (settings, countdownGoal, habitLogs)
    const unsubUserDoc = subscribeUserDoc(uid, (data) => {
      if (data.settings) setSettings(data.settings);
      if (data.countdownGoal) setCountdownGoal(data.countdownGoal);
      if (data.habitLogs) setHabitLogs(data.habitLogs);
    });

    // 2. Subscribe to Sessions subcollection
    const unsubSessions = subscribeSessions(uid, (cloudSessions) => {
      setSessions(cloudSessions);
    });

    // 3. Subscribe to Tasks subcollection
    const unsubTasks = subscribeTasks(uid, (cloudTasks) => {
      setTasks(cloudTasks);
    });

    // 4. Subscribe to Habits subcollection
    const unsubHabits = subscribeHabits(uid, (cloudHabits) => {
      setHabits(cloudHabits);
    });

    return () => {
      unsubUserDoc();
      unsubSessions();
      unsubTasks();
      unsubHabits();
    };
  }, [currentUser]);

  // Auth Handlers
  const handleGoogleLogin = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      setIsLoggingIn(true);
      setLoginError(null);
      const user = await loginWithGoogle();
      if (!user) {
        // User closed or cancelled login popup
        return;
      }
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';

      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/user-cancelled' ||
        msg.includes('popup-closed-by-user')
      ) {
        return;
      }

      console.warn('Sign-in notification:', msg || err);
      setLoginError(msg || 'Login failed. Please check connection and try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // ---------------------------------------------------------------------------
  // Robust Background Timer Engine & Tab-Reload Resilient Synchronization
  // ---------------------------------------------------------------------------
  const expectedEndTimeRef = useRef<number | null>(() => {
    const saved = loadActiveTimer();
    if (saved && saved.isRunning && saved.targetEndTime) {
      const remaining = Math.round((saved.targetEndTime - Date.now()) / 1000);
      return remaining > 0 ? saved.targetEndTime : null;
    }
    return null;
  });
  const latestCompleteHandler = useRef<() => void>(() => {});

  // Update total duration when mode or settings change and timer is stopped
  const switchMode = (newMode: TimerMode, autoStart = false) => {
    setIsRunning(false);
    expectedEndTimeRef.current = null;
    backgroundTicker.stop();
    audioKeepAlive.stop();
    wakeLockManager.release();

    setMode(newMode);
    let durationMins = settings.focusDuration;
    if (newMode === 'shortBreak') durationMins = settings.shortBreakDuration;
    if (newMode === 'longBreak') durationMins = settings.longBreakDuration;

    const seconds = durationMins * 60;
    setTimeLeft(seconds);
    setTotalTime(seconds);

    if (autoStart) {
      setTimeout(() => {
        const endTime = Date.now() + seconds * 1000;
        expectedEndTimeRef.current = endTime;
        saveActiveTimer({
          mode: newMode,
          targetEndTime: endTime,
          timeLeft: seconds,
          totalTime: seconds,
          isRunning: true,
          startedAt: Date.now(),
          completedCycles,
          activeTaskId,
          lastUpdated: Date.now(),
        });
        setIsRunning(true);
      }, 100);
    } else {
      saveActiveTimer({
        mode: newMode,
        targetEndTime: null,
        timeLeft: seconds,
        totalTime: seconds,
        isRunning: false,
        startedAt: Date.now(),
        completedCycles,
        activeTaskId,
        lastUpdated: Date.now(),
      });
    }
  };

  // Timer Tick Engine with Worker + Visibility Sync
  useEffect(() => {
    const checkTimer = () => {
      if (!expectedEndTimeRef.current || !isRunning) return;

      const now = Date.now();
      const remainingMs = expectedEndTimeRef.current - now;
      const remainingSecs = Math.round(remainingMs / 1000);

      if (remainingSecs <= 0) {
        expectedEndTimeRef.current = null;
        setTimeLeft(0);
        backgroundTicker.stop();
        audioKeepAlive.stop();
        wakeLockManager.release();
        latestCompleteHandler.current();
      } else {
        setTimeLeft(remainingSecs);
        // Periodic touch to update lastUpdated in localStorage
        saveActiveTimer({
          mode,
          targetEndTime: expectedEndTimeRef.current,
          timeLeft: remainingSecs,
          totalTime,
          isRunning: true,
          startedAt: expectedEndTimeRef.current - totalTime * 1000,
          completedCycles,
          activeTaskId,
          lastUpdated: now,
        });
      }
    };

    if (isRunning) {
      if (!expectedEndTimeRef.current) {
        expectedEndTimeRef.current = Date.now() + timeLeft * 1000;
      }

      // 1. Start dedicated Web Worker (immune to browser window interval throttling)
      backgroundTicker.start(checkTimer);

      // 2. Start silent audio keep-alive (exempts tab from Chrome Memory Saver discarding)
      audioKeepAlive.start();

      // 3. Keep screen/system awake if supported
      wakeLockManager.request();

      // 4. Save to persistent localStorage immediately
      saveActiveTimer({
        mode,
        targetEndTime: expectedEndTimeRef.current,
        timeLeft,
        totalTime,
        isRunning: true,
        startedAt: expectedEndTimeRef.current - totalTime * 1000,
        completedCycles,
        activeTaskId,
        lastUpdated: Date.now(),
      });

      // 5. Instantly catch up when user focuses tab or switches back to tab
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          checkTimer();
        }
      };
      const handleWindowFocus = () => {
        checkTimer();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleWindowFocus);

      return () => {
        backgroundTicker.stop();
        audioKeepAlive.stop();
        wakeLockManager.release();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleWindowFocus);
      };
    } else {
      backgroundTicker.stop();
      audioKeepAlive.stop();
      wakeLockManager.release();
    }
  }, [isRunning, mode, totalTime, completedCycles, activeTaskId]);

  // Initial recovery check on mount (recovers session if tab was discarded/reloaded after timer completed)
  useEffect(() => {
    const saved = loadActiveTimer();
    if (saved && saved.isRunning && saved.targetEndTime) {
      const remainingSecs = Math.round((saved.targetEndTime - Date.now()) / 1000);
      if (remainingSecs <= 0) {
        // The timer expired while the tab was asleep, backgrounded, or during reload
        latestCompleteHandler.current();
        setCompletionNotice(
          saved.mode === 'focus'
            ? `🎉 25-minute focus session finished while you were away! Session logged. Great job!`
            : `🔔 Break period finished while you were away! Ready for your next focus session?`
        );
      } else {
        expectedEndTimeRef.current = saved.targetEndTime;
        setIsRunning(true);
      }
    }
  }, []);

  // Multi-Tab Synchronization via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'praxis_active_timer_v1') {
        const saved = loadActiveTimer();
        if (!saved) return;
        setMode(saved.mode);
        setTotalTime(saved.totalTime);
        setCompletedCycles(saved.completedCycles || 0);
        setActiveTaskId(saved.activeTaskId);

        if (saved.isRunning && saved.targetEndTime) {
          const remaining = Math.round((saved.targetEndTime - Date.now()) / 1000);
          if (remaining > 0) {
            setTimeLeft(remaining);
            expectedEndTimeRef.current = saved.targetEndTime;
            setIsRunning(true);
          } else {
            setTimeLeft(0);
            setIsRunning(false);
          }
        } else {
          setTimeLeft(saved.timeLeft);
          expectedEndTimeRef.current = null;
          setIsRunning(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Flush state on beforeunload so reload has exact timestamp
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isRunning && expectedEndTimeRef.current) {
        saveActiveTimer({
          mode,
          targetEndTime: expectedEndTimeRef.current,
          timeLeft,
          totalTime,
          isRunning: true,
          startedAt: Date.now(),
          completedCycles,
          activeTaskId,
          lastUpdated: Date.now(),
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning, mode, timeLeft, totalTime, completedCycles, activeTaskId]);

  // Document Title update with status indicator
  useEffect(() => {
    const hrs = Math.floor(timeLeft / 3600);
    const mins = Math.floor((timeLeft % 3600) / 60);
    const secs = timeLeft % 60;
    const timeStr =
      hrs > 0
        ? `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        : `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const modeLabel = mode === 'focus' ? 'Focus 🍅' : 'Break ☕';
    const playStatus = isRunning ? '▶' : '⏸';
    document.title = `${playStatus} ${timeStr} (${modeLabel}) - Praxis`;
  }, [timeLeft, mode, isRunning]);

  // Completion Handler
  const handleTimerComplete = () => {
    setIsRunning(false);
    expectedEndTimeRef.current = null;
    backgroundTicker.stop();
    audioKeepAlive.stop();
    wakeLockManager.release();

    if (settings.soundEnabled) {
      cleanAudio.playComplete(settings.soundVolume);
    }

    // Trigger Desktop Notification
    showDesktopNotification(
      mode === 'focus' ? '🍅 Focus Session Complete!' : '🔔 Break Complete!',
      {
        body:
          mode === 'focus'
            ? `Awesome job! You finished ${settings.focusDuration} minutes of focused study. Time for a well-deserved break!`
            : 'Break is over! Ready to dive back into deep focus?',
      }
    );

    if (mode === 'focus') {
      const todayStr = formatDateKey(new Date());
      const newSession: PomodoroSession = {
        id: 'session_' + Date.now(),
        date: todayStr,
        timestamp: Date.now(),
        durationMinutes: settings.focusDuration,
        mode: 'focus',
        taskTitle: activeTask ? activeTask.title : undefined,
        completed: true,
      };

      setSessions((prev) => {
        const updated = [...prev, newSession];
        saveSessions(updated);
        return updated;
      });

      // Cloud Firestore Persistence
      if (currentUser) {
        saveSessionToFirestore(currentUser.uid, newSession);
      }

      // Update associated active task if any
      if (activeTaskId) {
        setTasks((prev) => {
          const updatedTasks = prev.map((t) => {
            if (t.id === activeTaskId) {
              const updated = { ...t, completedPomodoros: t.completedPomodoros + 1 };
              if (currentUser) {
                saveTaskToFirestore(currentUser.uid, updated);
              }
              return updated;
            }
            return t;
          });
          saveTasks(updatedTasks);
          return updatedTasks;
        });
      }

      const nextCycleCount = completedCycles + 1;
      setCompletedCycles(nextCycleCount);

      if (nextCycleCount % settings.longBreakInterval === 0) {
        switchMode('longBreak', settings.autoStartBreaks);
      } else {
        switchMode('shortBreak', settings.autoStartBreaks);
      }
    } else {
      // Break completed -> back to focus
      switchMode('focus', settings.autoStartFocus);
    }
  };

  // Keep a ref to the latest handler to avoid stale closures in the interval
  useEffect(() => {
    latestCompleteHandler.current = handleTimerComplete;
  }, [handleTimerComplete]);

  const handleStart = () => {
    if (settings.soundEnabled) cleanAudio.playStart(settings.soundVolume);
    // Request desktop notification permission on user action
    requestNotificationPermission();

    const endTime = Date.now() + timeLeft * 1000;
    expectedEndTimeRef.current = endTime;
    saveActiveTimer({
      mode,
      targetEndTime: endTime,
      timeLeft,
      totalTime,
      isRunning: true,
      startedAt: Date.now(),
      completedCycles,
      activeTaskId,
      lastUpdated: Date.now(),
    });
    setIsRunning(true);
  };

  const handlePause = () => {
    if (settings.soundEnabled) cleanAudio.playPause(settings.soundVolume);
    expectedEndTimeRef.current = null;
    setIsRunning(false);
    backgroundTicker.stop();
    audioKeepAlive.stop();
    wakeLockManager.release();

    saveActiveTimer({
      mode,
      targetEndTime: null,
      timeLeft,
      totalTime,
      isRunning: false,
      startedAt: Date.now(),
      completedCycles,
      activeTaskId,
      lastUpdated: Date.now(),
    });
  };

  const handleReset = () => {
    if (settings.soundEnabled) cleanAudio.playClick(settings.soundVolume);
    expectedEndTimeRef.current = null;
    setIsRunning(false);
    backgroundTicker.stop();
    audioKeepAlive.stop();
    wakeLockManager.release();

    let durationMins = settings.focusDuration;
    if (mode === 'shortBreak') durationMins = settings.shortBreakDuration;
    if (mode === 'longBreak') durationMins = settings.longBreakDuration;
    const seconds = durationMins * 60;
    setTimeLeft(seconds);
    setTotalTime(seconds);

    clearActiveTimer();
  };

  const handleSkip = () => {
    if (settings.soundEnabled) cleanAudio.playClick(settings.soundVolume);
    expectedEndTimeRef.current = null;
    setIsRunning(false);
    backgroundTicker.stop();
    audioKeepAlive.stop();
    wakeLockManager.release();
    clearActiveTimer();

    if (mode === 'focus') {
      switchMode('shortBreak', false);
    } else {
      switchMode('focus', false);
    }
  };

  const handleAddFiveMinutes = () => {
    if (settings.soundEnabled) cleanAudio.playClick(settings.soundVolume);
    const newLeft = timeLeft + 300;
    const newTotal = totalTime + 300;
    setTimeLeft(newLeft);
    setTotalTime(newTotal);

    if (isRunning && expectedEndTimeRef.current) {
      expectedEndTimeRef.current += 300 * 1000;
      saveActiveTimer({
        mode,
        targetEndTime: expectedEndTimeRef.current,
        timeLeft: newLeft,
        totalTime: newTotal,
        isRunning: true,
        startedAt: Date.now(),
        completedCycles,
        activeTaskId,
        lastUpdated: Date.now(),
      });
    }
  };

  const handleUpdateSettings = (newPartial: Partial<AppSettings>) => {
    const updated = { ...settings, ...newPartial };
    setSettings(updated);
    saveSettings(updated);
    if (currentUser) {
      saveSettingsToFirestore(currentUser.uid, updated);
    }
    if (!isRunning) {
      if (mode === 'focus') {
        setTimeLeft(updated.focusDuration * 60);
        setTotalTime(updated.focusDuration * 60);
      } else if (mode === 'shortBreak') {
        setTimeLeft(updated.shortBreakDuration * 60);
        setTotalTime(updated.shortBreakDuration * 60);
      } else if (mode === 'longBreak') {
        setTimeLeft(updated.longBreakDuration * 60);
        setTotalTime(updated.longBreakDuration * 60);
      }
    }
  };

  const handleUpdateCountdownGoal = (newGoal: CountdownGoal) => {
    setCountdownGoal(newGoal);
    if (currentUser) {
      saveCountdownGoalToFirestore(currentUser.uid, newGoal);
    }
  };

  // Task Actions
  const handleAddTask = (title: string, estimatedPomodoros: number) => {
    const newTask: TaskItem = {
      id: 'task_' + Date.now(),
      title,
      completed: false,
      estimatedPomodoros,
      completedPomodoros: 0,
      createdAt: Date.now(),
    };
    setTasks((prev) => {
      const updated = [newTask, ...prev];
      saveTasks(updated);
      return updated;
    });
    if (!activeTaskId) {
      setActiveTaskId(newTask.id);
    }
    if (currentUser) {
      saveTaskToFirestore(currentUser.uid, newTask);
    }
  };

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) => {
      const updatedTasks = prev.map((t) => {
        if (t.id === taskId) {
          const updated = { ...t, completed: !t.completed };
          if (currentUser) {
            saveTaskToFirestore(currentUser.uid, updated);
          }
          return updated;
        }
        return t;
      });
      saveTasks(updatedTasks);
      return updatedTasks;
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      saveTasks(updated);
      return updated;
    });
    if (activeTaskId === taskId) {
      setActiveTaskId(null);
    }
    if (currentUser) {
      deleteTaskFromFirestore(currentUser.uid, taskId);
    }
  };

  const handleToggleHabitDay = (monthKey: string, habitId: string, day: number) => {
    setHabitLogs((prev) => {
      const monthObj = prev[monthKey] || {};
      const currentList = monthObj[habitId] || [];
      const exists = currentList.includes(day);

      const updatedList = exists
        ? currentList.filter((d) => d !== day)
        : [...currentList, day].sort((a, b) => a - b);

      const newLogs = {
        ...prev,
        [monthKey]: {
          ...monthObj,
          [habitId]: updatedList,
        },
      };

      saveHabitLogs(newLogs);
      if (currentUser) {
        saveHabitLogsToFirestore(currentUser.uid, newLogs);
      }

      return newLogs;
    });
  };

  const handleUpdateHabits = (newHabits: HabitItem[]) => {
    setHabits(newHabits);
    saveHabits(newHabits);
    if (currentUser) {
      saveHabitsToFirestore(currentUser.uid, newHabits);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    const updated = habits
      .filter((h) => h.id !== habitId)
      .map((h, idx) => ({ ...h, number: idx + 1 }));
    setHabits(updated);
    saveHabits(updated);

    // Clean up habitLogs for this habit ID
    setHabitLogs((prev) => {
      let changed = false;
      const nextLogs: HabitProgressRecord = {};
      Object.keys(prev).forEach((monthKey) => {
        const monthObj = prev[monthKey];
        if (monthObj && habitId in monthObj) {
          changed = true;
          const updatedMonth: { [id: string]: number[] } = {};
          Object.keys(monthObj).forEach((hId) => {
            if (hId !== habitId) {
              updatedMonth[hId] = monthObj[hId];
            }
          });
          nextLogs[monthKey] = updatedMonth;
        } else if (monthObj) {
          nextLogs[monthKey] = monthObj;
        }
      });
      saveHabitLogs(nextLogs);
      if (changed && currentUser) {
        saveHabitLogsToFirestore(currentUser.uid, nextLogs);
      }
      return changed ? nextLogs : prev;
    });

    if (currentUser) {
      await deleteHabitFromFirestore(currentUser.uid, habitId, updated);
    }
  };

  const handleResetAllData = () => {
    setSessions([]);
    setTasks([]);
    setHabitLogs({});
    setCompletedCycles(0);
    setActiveTaskId(null);
    handleReset();
    if (currentUser) {
      resetUserDataInFirestore(currentUser.uid);
    }
  };

  const activeTask = tasks.find((t) => t.id === activeTaskId);
  const userFirstName = currentUser?.displayName
    ? currentUser.displayName.split(' ')[0].toUpperCase()
    : 'PILOT';

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-between selection:bg-[#ff3b00] selection:text-black relative z-0">
      {/* Top Navigation Bar */}
      <header className="border-b-2 border-[#151515] bg-black/90 backdrop-blur-md sticky top-0 z-40 w-full">
        <div className="w-full px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between font-pixel-heading gap-2">
          
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Chunky 3D Pixel Logo */}
            <div className="flex items-center gap-2 select-none group cursor-default">
              <span className="font-pixel-chunky text-lg sm:text-2xl font-bold lowercase tracking-normal transition-transform duration-100 hover:scale-105">
                praxis
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Google Authentication Control */}
            {authLoading ? (
              <div className="bg-[#181a24] text-zinc-500 border border-[#272a38] px-2 py-1 text-[7.5px] sm:text-[8px] flex items-center gap-1 font-pixel-label">
                <span>CONNECTING...</span>
              </div>
            ) : currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* User Profile Pill */}
                <div className="flex items-center gap-1.5 bg-[#13151f] border border-[#242738] px-2 py-1 rounded-sm">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-4 h-4 rounded-full border border-[#ff3b00]/60 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-[#ff3b00]/20 text-[#ff3b00] border border-[#ff3b00]/60 flex items-center justify-center text-[7px] font-bold shrink-0">
                      {userFirstName.charAt(0)}
                    </div>
                  )}
                  <span className="text-[7.5px] sm:text-[8px] font-pixel-heading text-zinc-200 tracking-wider max-w-[70px] sm:max-w-none truncate">
                    {userFirstName}
                  </span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="bg-[#181a24] hover:bg-red-950/40 hover:border-red-500 hover:text-red-400 text-zinc-400 border border-[#272a38] px-2 sm:px-2.5 py-1 sm:py-1.5 text-[7.5px] sm:text-[8px] flex items-center gap-1 cursor-pointer transition-all font-pixel-heading uppercase"
                  title="Sign out of Google Account"
                >
                  <LogOut size={11} />
                  <span className="hidden sm:inline">LOGOUT</span>
                </button>
              </div>
            ) : (
              /* Cloud Login Button - Opens AuthModal with Google, Email & Vercel Guide */
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-[#181a24] hover:bg-[#ff3b00] hover:text-black text-[#ff3b00] border border-[#ff3b00] px-2 sm:px-3 py-1 sm:py-1.5 text-[7.5px] sm:text-[8px] flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-[0_0_8px_rgba(255,59,0,0.2)] hover:shadow-[0_0_14px_rgba(255,59,0,0.6)] transition-all font-pixel-heading uppercase tracking-wider group shrink-0"
                title="Login with Google or Email to sync sessions & habits across devices"
              >
                <LogIn size={11} className="transition-transform group-hover:scale-110 shrink-0" />
                <span>LOGIN / CLOUD SYNC</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsInstallModalOpen(true)}
              className="bg-[#181a24] hover:bg-[#ff3b00] hover:text-black text-[#ff3b00] border border-[#ff3b00]/70 px-2 sm:px-2.5 py-1 sm:py-1.5 text-[7.5px] sm:text-[8px] flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-xs transition-all font-pixel-label uppercase"
              title="Download / Install Android App (APK)"
            >
              <Smartphone size={11} />
              <span className="hidden sm:inline">GET ANDROID APP</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="pixel-btn-dark px-2 sm:px-3 py-1 sm:py-1.5 text-[7.5px] sm:text-[8px] flex items-center gap-1 sm:gap-1.5 cursor-pointer"
              title="Open System Preferences"
            >
              <Settings size={11} />
              <span className="hidden sm:inline font-pixel-label">SETTINGS</span>
            </button>
          </div>

        </div>
      </header>

      {/* Login Error Notification Banner if any */}
      {loginError && (
        <div className="bg-red-950/90 border-b border-red-800/80 text-red-200 px-4 py-2 text-center text-[8px] font-pixel-label flex flex-wrap items-center justify-center gap-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={12} className="text-red-400 shrink-0" />
            <span className="max-w-xl text-left sm:text-center">{loginError}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-[#ff3b00] hover:bg-[#ff5722] text-black font-bold px-2 py-0.5 text-[7.5px] cursor-pointer transition-colors"
            >
              FIX / AUTH OPTIONS
            </button>
            {typeof window !== 'undefined' && window.self !== window.top && (
              <button
                type="button"
                onClick={() => window.open(window.location.href, '_blank')}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2 py-0.5 text-[7.5px] cursor-pointer"
              >
                OPEN IN NEW TAB ↗
              </button>
            )}
            <button
              type="button"
              onClick={() => setLoginError(null)}
              className="underline text-red-400 hover:text-white cursor-pointer ml-1 text-[7.5px]"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Guest Mode Notification Pill when logged out */}
      {!authLoading && !currentUser && (
        <div className="bg-[#10121a] border-b border-[#212433] px-4 py-1.5 text-center text-[7.5px] font-pixel-label text-zinc-400 flex items-center justify-center gap-2">
          <span className="text-[#ff3b00] font-bold">[!] GUEST MODE:</span>
          <span>Sign in with Google or Email to persist your timer history, tasks, and streaks directly to Firestore.</span>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="text-white hover:text-[#ff3b00] underline font-bold cursor-pointer ml-1"
          >
            Sign in now →
          </button>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 w-full flex-1 space-y-6">
        
        {/* Metric Statistics (Starts clean at 0, 0) */}
        <StatsOverview
          currentStreak={streakStats.currentStreak}
          bestDayMinutes={streakStats.bestDayMinutes}
          todayCompleted={streakStats.todayCompleted}
          todayMinutes={streakStats.todayMinutes}
          dailyTarget={settings.dailyTarget}
        />

        {/* Exam / Milestone Target Countdown Dot Matrix Card (Positioned right above focused timer) */}
        <ExamCountdownCard
          goal={countdownGoal}
          dayLogs={dayLogs}
          sessions={sessions}
          onUpdateGoal={handleUpdateCountdownGoal}
          onSelectGoalAsTask={(title) => {
            const existingTask = tasks.find((t) => t.title.toLowerCase() === title.toLowerCase());
            if (existingTask) {
              setActiveTaskId(existingTask.id);
            } else {
              const newGoalTask: TaskItem = {
                id: 'task_' + Date.now(),
                title: title,
                completedPomodoros: 0,
                estimatedPomodoros: 4,
                completed: false,
                createdAt: Date.now(),
              };
              setTasks((prev) => [newGoalTask, ...prev]);
              setActiveTaskId(newGoalTask.id);
              if (currentUser) {
                saveTaskToFirestore(currentUser.uid, newGoalTask);
              }
            }
          }}
        />

        {/* Background Session Completed Notice Banner */}
        {completionNotice && (
          <div className="bg-[#0e1f13] border-2 border-[#39d353] text-[#39d353] px-3.5 py-3 rounded-xl flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(57,211,83,0.3)] animate-in fade-in duration-200 font-pixel-heading">
            <div className="flex items-center gap-2.5 text-[9px]">
              <span className="text-base shrink-0">🍅</span>
              <span>{completionNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setCompletionNotice(null)}
              className="text-zinc-300 hover:text-white bg-[#17331f] hover:bg-[#1e4228] border border-[#39d353]/60 px-2 py-1 text-[8px] font-pixel-label rounded-xs cursor-pointer shrink-0 uppercase tracking-wider"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* Vintage Pixel/Digital Countdown Timer */}
        <PixelTimer
          mode={mode}
          timeLeft={timeLeft}
          totalTime={totalTime}
          isRunning={isRunning}
          onStart={handleStart}
          onPause={handlePause}
          onReset={handleReset}
          onSkip={handleSkip}
          onAddFiveMinutes={handleAddFiveMinutes}
          onSubtractFiveMinutes={() => setTimeLeft((prev) => Math.max(60, prev - 300))}
          onSwitchMode={(m) => switchMode(m, false)}
          completedCycles={completedCycles}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          activeTask={activeTask}
        />

        {/* Daily Consistency Green Box Heatmap (Matrix positioned cleanly in flow) */}
        <ConsistencyHeatmap
          dayLogs={dayLogs}
          onSelectDay={(dateStr) => setSelectedDate(dateStr)}
          dailyTarget={settings.dailyTarget}
        />

        {/* Radial Spiral Habit Tracker (Matching Reference Design with Daily Check-in & Target Performance Table) */}
        <RadialHabitTracker
          habits={habits}
          habitLogs={habitLogs}
          onUpdateHabits={handleUpdateHabits}
          onDeleteHabit={handleDeleteHabit}
          onToggleHabitDay={handleToggleHabitDay}
        />

      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#151515] bg-black py-4 text-center font-pixel-heading text-[8px] text-zinc-500 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex flex-col sm:items-start items-center text-center sm:text-left gap-1">
            <span className="font-pixel-chunky text-sm sm:text-base font-bold lowercase tracking-normal select-none">praxis</span>
            <span className="text-[7.5px] text-zinc-400 font-pixel-label tracking-normal">
              By <strong className="text-zinc-200 font-semibold">zero-sum commun</strong> • Created by <strong className="text-white font-semibold">Peyush</strong>
            </span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={(newS) => setSettings(newS)}
        onResetData={handleResetAllData}
      />

      {/* Day Details Modal */}
      {selectedDate && (
        <DayDetailsModal
          isOpen={Boolean(selectedDate)}
          onClose={() => setSelectedDate(null)}
          dateStr={selectedDate}
          dayLog={dayLogs[selectedDate]}
        />
      )}

      {/* Android App & APK Installation Guide Modal */}
      <InstallApkModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Authentication & Cloud Sync Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialError={loginError}
      />

    </div>
  );
};

export default App;
