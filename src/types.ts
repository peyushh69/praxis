export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroSession {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  durationMinutes: number;
  mode: TimerMode;
  taskTitle?: string;
  completed: boolean;
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  completedPomodoros: number;
  sessions: PomodoroSession[];
}

export interface AppSettings {
  focusDuration: number; // in minutes (default 25)
  shortBreakDuration: number; // in minutes (default 5)
  longBreakDuration: number; // in minutes (default 15)
  longBreakInterval: number; // every N pomodoros (default 4)
  dailyTarget: number; // target pomodoros per day (default 4)
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  soundVolume: number; // 0 to 1
  tickSoundEnabled: boolean;
  notificationEnabled: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  estimatedPomodoros: number;
  completedPomodoros: number;
  createdAt: number;
}

export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'alternate' | 'custom_days';

export interface HabitSchedule {
  frequency: HabitFrequency;
  daysOfWeek: number[]; // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  startDate?: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD or null
  intervalDays?: number; // e.g. 2 for alternate days
}

export interface HabitItem {
  id: string;
  number: number; // 1, 2, 3...
  title: string;
  targetDays?: number; // e.g. 30 or auto-computed
  color: string; // hex or token
  schedule?: HabitSchedule;
}

export interface HabitProgressRecord {
  // Key is "YYYY-MM" e.g. "2026-08"
  // Value is map of habitId -> array of completed day numbers [1, 2, 3... 31]
  [monthKey: string]: {
    [habitId: string]: number[];
  };
}

export interface CountdownGoal {
  id: string;
  title: string;
  targetDate: string; // YYYY-MM-DD
  startDate: string; // YYYY-MM-DD
  description?: string;
  color?: string;
}
