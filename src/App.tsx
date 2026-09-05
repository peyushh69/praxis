import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, LogIn, LogOut, User as UserIcon, Cloud, Smartphone, AlertCircle } from 'lucide-react';
import { TimerMode, AppSettings, PomodoroSession, TaskItem, DayLog, HabitItem, HabitProgressRecord, CountdownGoal } from './types';
import {
  formatDateKey,
  aggregateDayLogs,
  calculateStreakStats,
  DEFAULT_SETTINGS,
  DEFAULT_HABITS,
} from './utils/storage';
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
import { RetroConsoleFocus } from './components/RetroConsoleFocus';
import { InstallApkModal } from './components/InstallApkModal';

export const App: React.FC = () => {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Persistence state
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [habits, setHabits] = useState<HabitItem[]>(DEFAULT_HABITS);
  const [habitLogs, setHabitLogs] = useState<HabitProgressRecord>({});
  const [countdownGoal, setCountdownGoal] = useState<CountdownGoal>(DEFAULT_COUNTDOWN_GOAL);

  // Timer dynamic state
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState<number>(() => DEFAULT_SETTINGS.focusDuration * 60);
  const [totalTime, setTotalTime] = useState<number>(() => DEFAULT_SETTINGS.focusDuration * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isRetroConsoleOpen, setIsRetroConsoleOpen] = useState(false);
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
        // User logged out: Reset UI state to empty/blank state
        setSessions([]);
        setTasks([]);
        setHabits([]);
        setHabitLogs({});
        setSettings(DEFAULT_SETTINGS);
        setCountdownGoal(DEFAULT_COUNTDOWN_GOAL);
        setActiveTaskId(null);
        setCompletedCycles(0);
        setIsRunning(false);
        setTimeLeft(DEFAULT_SETTINGS.focusDuration * 60);
        setTotalTime(DEFAULT_SETTINGS.focusDuration * 60);
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

  // Update total duration when mode or settings change and timer is stopped
  const switchMode = (newMode: TimerMode, autoStart = false) => {
    setIsRunning(false);
    setMode(newMode);
    let durationMins = settings.focusDuration;
    if (newMode === 'shortBreak') durationMins = settings.shortBreakDuration;
    if (newMode === 'longBreak') durationMins = settings.longBreakDuration;

    const seconds = durationMins * 60;
    setTimeLeft(seconds);
    setTotalTime(seconds);

    if (autoStart) {
      setTimeout(() => setIsRunning(true), 100);
    }
  };

  // Timer Tick Engine
  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning, mode, settings, completedCycles, activeTaskId, tasks]);

  // Document Title update
  useEffect(() => {
    const hrs = Math.floor(timeLeft / 3600);
    const mins = Math.floor((timeLeft % 3600) / 60);
    const secs = timeLeft % 60;
    const timeStr =
      hrs > 0
        ? `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        : `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const modeLabel = mode === 'focus' ? 'Focus' : 'Break';
    document.title = `${timeStr} (${modeLabel}) - Praxis`;
  }, [timeLeft, mode]);

  // Completion Handler
  const handleTimerComplete = () => {
    setIsRunning(false);

    if (settings.soundEnabled) {
      cleanAudio.playComplete(settings.soundVolume);
    }

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

      setSessions((prev) => [...prev, newSession]);

      // Cloud Firestore Persistence
      if (currentUser) {
        saveSessionToFirestore(currentUser.uid, newSession);
      }

      // Update associated active task if any
      if (activeTaskId) {
        const updatedTask = tasks.find((t) => t.id === activeTaskId);
        if (updatedTask) {
          const newTaskObj = { ...updatedTask, completedPomodoros: updatedTask.completedPomodoros + 1 };
          setTasks((prev) =>
            prev.map((t) => (t.id === activeTaskId ? newTaskObj : t))
          );
          if (currentUser) {
            saveTaskToFirestore(currentUser.uid, newTaskObj);
          }
        }
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

  const handleStart = () => {
    if (settings.soundEnabled) cleanAudio.playStart(settings.soundVolume);
    setIsRunning(true);
  };

  const handlePause = () => {
    if (settings.soundEnabled) cleanAudio.playPause(settings.soundVolume);
    setIsRunning(false);
  };

  const handleReset = () => {
    if (settings.soundEnabled) cleanAudio.playClick(settings.soundVolume);
    setIsRunning(false);
    let durationMins = settings.focusDuration;
    if (mode === 'shortBreak') durationMins = settings.shortBreakDuration;
    if (mode === 'longBreak') durationMins = settings.longBreakDuration;
    setTimeLeft(durationMins * 60);
    setTotalTime(durationMins * 60);
  };

  const handleSkip = () => {
    if (settings.soundEnabled) cleanAudio.playClick(settings.soundVolume);
    if (mode === 'focus') {
      switchMode('shortBreak', false);
    } else {
      switchMode('focus', false);
    }
  };

  const handleAddFiveMinutes = () => {
    if (settings.soundEnabled) cleanAudio.playClick(settings.soundVolume);
    setTimeLeft((prev) => prev + 300);
    setTotalTime((prev) => prev + 300);
  };

  const handleUpdateSettings = (newPartial: Partial<AppSettings>) => {
    const updated = { ...settings, ...newPartial };
    setSettings(updated);
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
    setTasks((prev) => [newTask, ...prev]);
    if (!activeTaskId) {
      setActiveTaskId(newTask.id);
    }
    if (currentUser) {
      saveTaskToFirestore(currentUser.uid, newTask);
    }
  };

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updated = { ...t, completed: !t.completed };
          if (currentUser) {
            saveTaskToFirestore(currentUser.uid, updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
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

      if (currentUser) {
        saveHabitLogsToFirestore(currentUser.uid, newLogs);
      }

      return newLogs;
    });
  };

  const handleUpdateHabits = (newHabits: HabitItem[]) => {
    setHabits(newHabits);
    if (currentUser) {
      saveHabitsToFirestore(currentUser.uid, newHabits);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    const updated = habits
      .filter((h) => h.id !== habitId)
      .map((h, idx) => ({ ...h, number: idx + 1 }));
    setHabits(updated);

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
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-between selection:bg-[#ff3b00] selection:text-black">
      
      {/* Top Navigation Bar */}
      <header className="border-b-2 border-[#242630] bg-[#0e0f14]/90 backdrop-blur-md sticky top-0 z-40 w-full">
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
              /* Login With Google Button (Retro Neon Orange Aesthetic - Responsive) */
              <button
                type="button"
                onClick={(e) => handleGoogleLogin(e)}
                disabled={isLoggingIn}
                className="bg-[#181a24] hover:bg-[#ff3b00] hover:text-black text-[#ff3b00] border border-[#ff3b00] px-2 sm:px-3 py-1 sm:py-1.5 text-[7.5px] sm:text-[8px] flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-[0_0_8px_rgba(255,59,0,0.2)] hover:shadow-[0_0_14px_rgba(255,59,0,0.6)] transition-all font-pixel-heading uppercase tracking-wider group shrink-0"
                title="Login with Google to sync sessions & habits across devices"
              >
                {/* SVG Google 'G' Icon */}
                <svg className="w-3 h-3 transition-transform group-hover:scale-110 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLoggingIn ? '...' : 'LOGIN'}<span className="hidden sm:inline"> WITH GOOGLE</span></span>
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
            <span>{loginError}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => handleGoogleLogin(e)}
              disabled={isLoggingIn}
              className="bg-[#ff3b00] hover:bg-[#ff5722] text-black font-bold px-2 py-0.5 text-[7.5px] cursor-pointer transition-colors"
            >
              {isLoggingIn ? 'RETRYING...' : 'RETRY SIGN-IN'}
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
          <span>Sign in with Google to persist your timer history, tasks, and streaks directly to Firestore.</span>
          <button
            type="button"
            onClick={(e) => handleGoogleLogin(e)}
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
          maxStreak={streakStats.maxStreak}
          todayCompleted={streakStats.todayCompleted}
          todayMinutes={streakStats.todayMinutes}
          dailyTarget={settings.dailyTarget}
        />

        {/* Exam / Milestone Target Countdown Dot Matrix Card (Positioned right above focused timer) */}
        <ExamCountdownCard
          goal={countdownGoal}
          onUpdateGoal={handleUpdateCountdownGoal}
        />

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
          onOpenFullscreenConsole={() => setIsRetroConsoleOpen(true)}
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
      <footer className="border-t-2 border-[#242630] bg-[#0e0f14] py-4 text-center font-pixel-heading text-[8px] text-zinc-500 w-full">
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

      {/* Fullscreen Retro Gaming Console Focus Mode */}
      <RetroConsoleFocus
        isOpen={isRetroConsoleOpen}
        onClose={() => setIsRetroConsoleOpen(false)}
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
        todayMinutes={streakStats.todayMinutes}
        currentStreak={streakStats.currentStreak}
      />

      {/* Android App & APK Installation Guide Modal */}
      <InstallApkModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

    </div>
  );
};

export default App;
