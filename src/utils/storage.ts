import { AppSettings, DayLog, PomodoroSession, TaskItem, HabitItem, HabitProgressRecord } from '../types';

const SETTINGS_KEY = 'pixel_chrono_settings_v2';
const SESSIONS_KEY = 'pixel_chrono_sessions_v2';
const TASKS_KEY = 'pixel_chrono_tasks_v2';
const HABITS_KEY = 'pixel_chrono_habits_v2';
const HABIT_LOGS_KEY = 'pixel_chrono_habit_logs_v2';

export const DEFAULT_HABITS: HabitItem[] = [
  { id: 'habit-1', number: 1, title: 'newspaper', targetDays: 25, color: '#39d353' },
  { id: 'habit-2', number: 2, title: 'gym', targetDays: 20, color: '#ff7700' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  dailyTarget: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  soundVolume: 0.6,
  tickSoundEnabled: false,
  notificationEnabled: false,
};

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function loadSessions(): PomodoroSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSessions(sessions: PomodoroSession[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save sessions', e);
  }
}

export function loadTasks(): TaskItem[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTasks(tasks: TaskItem[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks', e);
  }
}

export function loadHabits(): HabitItem[] {
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    if (!raw) return DEFAULT_HABITS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_HABITS;
  } catch {
    return DEFAULT_HABITS;
  }
}

export function saveHabits(habits: HabitItem[]): void {
  try {
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  } catch (e) {
    console.error('Failed to save habits', e);
  }
}

export function loadHabitLogs(): HabitProgressRecord {
  try {
    const raw = localStorage.getItem(HABIT_LOGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveHabitLogs(logs: HabitProgressRecord): void {
  try {
    localStorage.setItem(HABIT_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save habit logs', e);
  }
}

export function aggregateDayLogs(sessions: PomodoroSession[]): Record<string, DayLog> {
  const map: Record<string, DayLog> = {};

  sessions.forEach((s) => {
    if (!s.completed || s.mode !== 'focus') return;
    if (!map[s.date]) {
      map[s.date] = {
        date: s.date,
        totalMinutes: 0,
        completedPomodoros: 0,
        sessions: [],
      };
    }
    map[s.date].totalMinutes += s.durationMinutes;
    map[s.date].completedPomodoros += 1;
    map[s.date].sessions.push(s);
  });

  return map;
}

export function calculateStreakStats(dayLogs: Record<string, DayLog>) {
  const todayStr = formatDateKey(new Date());
  const dates = Object.keys(dayLogs).filter((d) => dayLogs[d]?.completedPomodoros > 0).sort();

  let totalSessions = 0;
  let totalMinutes = 0;

  Object.values(dayLogs).forEach((log) => {
    totalSessions += log.completedPomodoros;
    totalMinutes += log.totalMinutes;
  });

  if (dates.length === 0) {
    return {
      currentStreak: 0,
      maxStreak: 0,
      totalSessions: 0,
      totalMinutes: 0,
      todayCompleted: 0,
      todayMinutes: 0,
    };
  }

  // Calculate Current Streak
  let currentStreak = 0;
  const checkDate = new Date();
  const todayKey = formatDateKey(checkDate);
  const hasToday = (dayLogs[todayKey]?.completedPomodoros || 0) > 0;

  if (hasToday) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const key = formatDateKey(checkDate);
    if ((dayLogs[key]?.completedPomodoros || 0) > 0) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate Max Streak
  let maxStreak = 0;
  let runningStreak = 0;
  let prevDateObj: Date | null = null;

  dates.forEach((dateStr) => {
    const parts = dateStr.split('-').map(Number);
    const currDate = new Date(parts[0], parts[1] - 1, parts[2]);

    if (!prevDateObj) {
      runningStreak = 1;
    } else {
      const diffTime = currDate.getTime() - prevDateObj.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      if (diffDays === 1) {
        runningStreak++;
      } else {
        runningStreak = 1;
      }
    }
    if (runningStreak > maxStreak) {
      maxStreak = runningStreak;
    }
    prevDateObj = currDate;
  });

  maxStreak = Math.max(maxStreak, currentStreak);
  const todayLog = dayLogs[todayStr] || { completedPomodoros: 0, totalMinutes: 0, sessions: [], date: todayStr };

  return {
    currentStreak,
    maxStreak,
    totalSessions,
    totalMinutes,
    todayCompleted: todayLog.completedPomodoros,
    todayMinutes: todayLog.totalMinutes,
  };
}
