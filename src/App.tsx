import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, CheckCircle2, Moon, Sparkles, RefreshCw } from 'lucide-react';
import { TimerMode, AppSettings, PomodoroSession, TaskItem, DayLog, HabitItem, HabitProgressRecord } from './types';
import {
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
  formatDateKey,
  aggregateDayLogs,
  calculateStreakStats,
  DEFAULT_SETTINGS,
} from './utils/storage';
import { cleanAudio } from './utils/audio';
import { PixelTimer } from './components/PixelTimer';
import { ExamCountdownCard } from './components/ExamCountdownCard';
import { ConsistencyHeatmap } from './components/ConsistencyHeatmap';
import { StatsOverview } from './components/StatsOverview';
import { RadialHabitTracker } from './components/RadialHabitTracker';
import { SettingsModal } from './components/SettingsModal';
import { DayDetailsModal } from './components/DayDetailsModal';
import { RetroConsoleFocus } from './components/RetroConsoleFocus';
import { InstallApkModal } from './components/InstallApkModal';
import { Smartphone } from 'lucide-react';
import { CountdownGoal } from './types';

const DEFAULT_COUNTDOWN_GOAL: CountdownGoal = {
  id: 'goal-exam-october',
  title: 'UKSSSC Exam',
  targetDate: '2026-10-05',
  startDate: '2026-08-01',
  description: 'Exam Countdown & Milestone Tracker',
  color: '#ff3b00',
};

export const App: React.FC = () => {
  // Persistence state
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [sessions, setSessions] = useState<PomodoroSession[]>(() => loadSessions());
  const [tasks, setTasks] = useState<TaskItem[]>(() => loadTasks());
  const [habits, setHabits] = useState<HabitItem[]>(() => loadHabits());
  const [habitLogs, setHabitLogs] = useState<HabitProgressRecord>(() => loadHabitLogs());
  const [countdownGoal, setCountdownGoal] = useState<CountdownGoal>(() => {
    try {
      const saved = localStorage.getItem('praxis_countdown_goal');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_COUNTDOWN_GOAL;
  });

  // Timer dynamic state
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState<number>(() => settings.focusDuration * 60);
  const [totalTime, setTotalTime] = useState<number>(() => settings.focusDuration * 60);
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

  // Save changes to storage
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveHabits(habits);
  }, [habits]);

  useEffect(() => {
    saveHabitLogs(habitLogs);
  }, [habitLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('praxis_countdown_goal', JSON.stringify(countdownGoal));
    } catch (e) {
      console.error('Failed to save countdown goal', e);
    }
  }, [countdownGoal]);

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

      // Update associated active task if any
      if (activeTaskId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeTaskId
              ? { ...t, completedPomodoros: t.completedPomodoros + 1 }
              : t
          )
        );
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
  };

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (activeTaskId === taskId) {
      setActiveTaskId(null);
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

      return {
        ...prev,
        [monthKey]: {
          ...monthObj,
          [habitId]: updatedList,
        },
      };
    });
  };

  const handleUpdateHabits = (newHabits: HabitItem[]) => {
    setHabits(newHabits);
  };

  const handleResetAllData = () => {
    setSessions([]);
    setTasks([]);
    setHabitLogs({});
    setCompletedCycles(0);
    setActiveTaskId(null);
    handleReset();
  };

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-between selection:bg-[#ff3b00] selection:text-black">
      
      {/* Top Navigation Bar */}
      <header className="border-b-2 border-[#242630] bg-[#0e0f14]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between font-pixel-heading">
          
          <div className="flex items-center gap-3">
            {/* Chunky 3D Pixel Logo from reference image */}
            <div className="flex items-center gap-2 select-none group cursor-default">
              <span className="font-pixel-chunky text-lg sm:text-2xl font-bold lowercase tracking-normal transition-transform duration-100 hover:scale-105">
                praxis
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="bg-[#181a24] hover:bg-[#ff3b00] hover:text-black text-[#ff3b00] border border-[#ff3b00]/70 px-2.5 py-1.5 text-[8px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-all font-pixel-label uppercase"
              title="Download / Install Android App (APK)"
            >
              <Smartphone size={12} />
              <span className="hidden sm:inline">GET ANDROID APP</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="pixel-btn-dark px-3 py-1.5 text-[8px] flex items-center gap-1.5 cursor-pointer"
              title="Open System Preferences"
            >
              <Settings size={12} />
              <span className="hidden sm:inline font-pixel-label">SETTINGS</span>
            </button>
          </div>

        </div>
      </header>

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
          onUpdateGoal={setCountdownGoal}
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
          onToggleHabitDay={handleToggleHabitDay}
        />

      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#242630] bg-[#0e0f14] py-4 text-center font-pixel-heading text-[8px] text-zinc-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex flex-col sm:items-start items-center text-center sm:text-left gap-0.5">
            <span className="text-white font-bold text-[9.5px] tracking-wider">PRAXIS</span>
            <span className="text-[7.5px] text-zinc-400 font-pixel-label tracking-normal">
              By <strong className="text-zinc-200 font-semibold">Zero Sum Commune</strong> • Created by <strong className="text-white font-semibold">Peyush</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 text-zinc-400 font-pixel-label text-[7.5px]">
            <span className="bg-[#171922] border border-[#272a38] px-2 py-0.5 text-zinc-300">
              OFFLINE LOCAL PERSISTENCE
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
