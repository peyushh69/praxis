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

export type AlarmType = 'interval' | 'clock' | 'timeframe' | 'trip_repeat';

export interface MiniAlarm {
  id: string;
  title: string;
  category: 'water' | 'reading' | 'task' | 'custom';
  type: AlarmType; // 'interval' | 'clock' | 'timeframe' (9AM-9PM hourly/mins) | 'trip_repeat' (X hours, Y times)
  intervalMinutes: number; // e.g., 15, 30, 45, 60
  clockTime?: string; // e.g., "17:30"
  windowStartTime?: string; // e.g., "09:00" (start of daily time frame)
  windowEndTime?: string; // e.g., "21:00" (end of daily time frame)
  tripHours?: number; // e.g., 6 (for 6-hour trip/block)
  tripTotalRings?: number; // e.g., 6 (ring 6 times in 6 hours)
  tripCompletedRings?: number; // counter of completed rings in current trip
  repeat: boolean; // Auto-repeat after ringing
  enabled: boolean;
  targetTimestamp: number | null; // Next epoch ms when alarm will ring
  linkedHabitId?: string | null; // Connected HabitItem.id from bottom Daily Habits
  linkedTaskId?: string | null; // Connected TaskItem.id from Focus Tasks
  linkedTaskTitle?: string | null; // Cached title of connected task/habit
  createdAt: number;
}

