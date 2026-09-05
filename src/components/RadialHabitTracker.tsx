import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
  Calendar,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Repeat,
  CalendarRange,
  Clock,
  Sliders,
  Sparkles,
  Zap,
  Shuffle,
  CalendarDays,
  Briefcase,
  Sun,
  Flame,
  Info,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { HabitItem, HabitProgressRecord, HabitSchedule, HabitFrequency } from '../types';

interface RadialHabitTrackerProps {
  habits: HabitItem[];
  habitLogs: HabitProgressRecord;
  onUpdateHabits: (habits: HabitItem[]) => void;
  onDeleteHabit?: (habitId: string) => void;
  onToggleHabitDay: (monthKey: string, habitId: string, day: number) => void;
  onBatchToggleDay?: (monthKey: string, day: number, habitIds: string[], complete: boolean) => void;
}

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

const DAYS_OF_WEEK_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const COLOR_PALETTE = [
  '#39d353', // GitHub Green
  '#00d26a', // Emerald Bright
  '#00b4d8', // Ocean Blue
  '#38bdf8', // Sky Blue
  '#a855f7', // Violet
  '#ec4899', // Hot Pink
  '#ff3b00', // Crimson Neon
  '#f59e0b', // Amber Orange
  '#eab308', // Cyber Gold
  '#10b981', // Mint
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

// Helper: Check if habit is scheduled on a specific date
export function isHabitScheduledOnDate(
  habit: HabitItem,
  year: number,
  monthIdx: number,
  dayNum: number
): boolean {
  if (!habit.schedule) return true;

  const date = new Date(year, monthIdx, dayNum);
  const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

  // Start date boundary
  if (habit.schedule.startDate && dateStr < habit.schedule.startDate) {
    return false;
  }
  // End date boundary
  if (habit.schedule.endDate && dateStr > habit.schedule.endDate) {
    return false;
  }

  const { frequency, daysOfWeek = [1, 2, 3, 4, 5, 6, 0], startDate, intervalDays = 2 } = habit.schedule;
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon ...

  if (frequency === 'daily') return true;
  if (frequency === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
  if (frequency === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6;
  if (frequency === 'custom_days') return daysOfWeek.includes(dayOfWeek);
  if (frequency === 'alternate') {
    const baseDate = startDate ? new Date(startDate) : new Date(year, 0, 1);
    const diffTime = Math.abs(date.getTime() - baseDate.getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays % (intervalDays || 2) === 0;
  }

  return true;
}

// Helper: Calculate total scheduled days in the given month
export function getMonthlyScheduledDaysCount(
  habit: HabitItem,
  year: number,
  monthIdx: number,
  daysInMonth: number
): number {
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (isHabitScheduledOnDate(habit, year, monthIdx, d)) {
      count++;
    }
  }
  return count;
}

// Format frequency text for summary
export function formatFrequencyLabel(schedule?: HabitSchedule): string {
  if (!schedule || schedule.frequency === 'daily') return 'Daily';
  if (schedule.frequency === 'weekdays') return 'Weekdays (Mon–Fri)';
  if (schedule.frequency === 'weekends') return 'Weekends (Sat–Sun)';
  if (schedule.frequency === 'alternate') return 'Every 2 days';
  if (schedule.frequency === 'custom_days') {
    if (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0) return 'No days scheduled';
    if (schedule.daysOfWeek.length === 7) return 'Daily';
    const names = schedule.daysOfWeek.map((d) => DAYS_OF_WEEK_SHORT[d]);
    return names.join(', ');
  }
  return 'Custom schedule';
}

export const RadialHabitTracker: React.FC<RadialHabitTrackerProps> = ({
  habits,
  habitLogs,
  onUpdateHabits,
  onDeleteHabit,
  onToggleHabitDay,
}) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthIdx = today.getMonth();
  const currentDayNum = today.getDate();
  const todayStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(currentDayNum).padStart(2, '0')}`;

  // Selected viewing month/year state
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIdx);
  const [selectedDay, setSelectedDay] = useState(currentDayNum);
  
  // Edit & Add state
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTarget, setEditTarget] = useState<string>('');
  const [editColor, setEditColor] = useState('#39d353');
  const [editSchedule, setEditSchedule] = useState<HabitSchedule>({
    frequency: 'daily',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    startDate: todayStr,
    endDate: null,
    intervalDays: 2,
  });
  const [editHasEndDate, setEditHasEndDate] = useState(false);

  // Add Habit Form State
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState<string>('');
  const [newColor, setNewColor] = useState('#39d353');
  const [newSchedule, setNewSchedule] = useState<HabitSchedule>({
    frequency: 'daily',
    daysOfWeek: [1, 2, 3, 4, 5],
    startDate: todayStr,
    endDate: null,
    intervalDays: 2,
  });
  const [newHasEndDate, setNewHasEndDate] = useState(false);

  const [hoveredCell, setHoveredCell] = useState<{ habitIndex: number; day: number } | null>(null);
  const [inspectedHabitId, setInspectedHabitId] = useState<string | null>(habits[0]?.id || null);

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  // Get weekday name for the selected day in this month
  const selectedDateObj = new Date(selectedYear, selectedMonth, selectedDay);
  const selectedDayOfWeek = DAYS_OF_WEEK_SHORT[selectedDateObj.getDay()];
  const isViewingCurrentMonth = selectedYear === currentYear && selectedMonth === currentMonthIdx;

  const currentMonthLogs = useMemo(() => {
    return habitLogs[monthKey] || {};
  }, [habitLogs, monthKey]);

  // Navigate months
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonthIdx);
    setSelectedDay(currentDayNum);
  };

  // Add Habit
  const handleCreateHabit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    const scheduleToSave: HabitSchedule = {
      ...newSchedule,
      endDate: newHasEndDate && newSchedule.endDate ? newSchedule.endDate : null,
    };

    const scheduledCount = getMonthlyScheduledDaysCount(
      { id: 'temp', number: 1, title: '', color: '', schedule: scheduleToSave },
      selectedYear,
      selectedMonth,
      daysInMonth
    );

    const parsedTarget = parseInt(newTarget.trim(), 10);
    const targetDays = !isNaN(parsedTarget) && parsedTarget > 0 ? parsedTarget : (scheduledCount || daysInMonth);

    const newHabit: HabitItem = {
      id: 'habit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      number: habits.length + 1,
      title: newTitle.trim(),
      targetDays: targetDays,
      color: newColor || COLOR_PALETTE[habits.length % COLOR_PALETTE.length],
      schedule: scheduleToSave,
    };

    const updated = [...habits, newHabit];
    onUpdateHabits(updated);
    setInspectedHabitId(newHabit.id);
    setNewTitle('');
    setNewTarget('');
    setNewColor(COLOR_PALETTE[(habits.length + 1) % COLOR_PALETTE.length]);
    setNewSchedule({
      frequency: 'daily',
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      startDate: todayStr,
      endDate: null,
      intervalDays: 2,
    });
    setNewHasEndDate(false);
    setIsAddingNew(false);
  };

  // Delete Habit
  const handleDeleteHabit = (habitId: string) => {
    if (onDeleteHabit) {
      onDeleteHabit(habitId);
    } else {
      const updated = habits
        .filter((h) => h.id !== habitId)
        .map((h, idx) => ({ ...h, number: idx + 1 }));
      onUpdateHabits(updated);
    }
    const remaining = habits.filter((h) => h.id !== habitId);
    if (inspectedHabitId === habitId) {
      setInspectedHabitId(remaining[0]?.id || null);
    }
    setEditingHabitId(null);
    setDeleteConfirmId(null);
  };

  // Move Habit Up / Down
  const handleMoveHabit = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= habits.length) return;

    const newHabits = [...habits];
    const [moved] = newHabits.splice(index, 1);
    newHabits.splice(targetIndex, 0, moved);

    const renumbered = newHabits.map((h, i) => ({ ...h, number: i + 1 }));
    onUpdateHabits(renumbered);
  };

  // Habit editing
  const startEditHabit = (habit: HabitItem) => {
    setEditingHabitId(habit.id);
    setDeleteConfirmId(null);
    setEditTitle(habit.title);
    setEditTarget(String(habit.targetDays || ''));
    setEditColor(habit.color || '#39d353');
    setEditSchedule(
      habit.schedule || {
        frequency: 'daily',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
        startDate: todayStr,
        endDate: null,
        intervalDays: 2,
      }
    );
    setEditHasEndDate(Boolean(habit.schedule?.endDate));
  };

  const saveEditHabit = (habitId: string) => {
    if (!editTitle.trim()) return;

    const scheduleToSave: HabitSchedule = {
      ...editSchedule,
      endDate: editHasEndDate && editSchedule.endDate ? editSchedule.endDate : null,
    };

    const scheduledCount = getMonthlyScheduledDaysCount(
      { id: habitId, number: 1, title: '', color: '', schedule: scheduleToSave },
      selectedYear,
      selectedMonth,
      daysInMonth
    );

    const parsedTarget = parseInt(editTarget.trim(), 10);
    const targetDays = !isNaN(parsedTarget) && parsedTarget > 0 ? parsedTarget : (scheduledCount || daysInMonth);

    const updated = habits.map((h) =>
      h.id === habitId
        ? {
            ...h,
            title: editTitle.trim(),
            targetDays: targetDays,
            color: editColor,
            schedule: scheduleToSave,
          }
        : h
    );
    onUpdateHabits(updated);
    setEditingHabitId(null);
  };

  // Toggle specific day in schedule custom days
  const toggleScheduleDay = (
    dayIndex: number,
    schedule: HabitSchedule,
    setter: React.Dispatch<React.SetStateAction<HabitSchedule>>
  ) => {
    const current = schedule.daysOfWeek || [];
    let updatedDays: number[];
    if (current.includes(dayIndex)) {
      updatedDays = current.filter((d) => d !== dayIndex);
    } else {
      updatedDays = [...current, dayIndex].sort();
    }
    setter({
      ...schedule,
      frequency: 'custom_days',
      daysOfWeek: updatedDays,
    });
  };

  // Habit calculation stats
  const habitStats = useMemo(() => {
    return habits.map((h) => {
      const completedList = currentMonthLogs[h.id] || [];
      const achievedCount = completedList.filter((d) => d <= daysInMonth).length;
      const scheduledCount = getMonthlyScheduledDaysCount(h, selectedYear, selectedMonth, daysInMonth);
      const target = h.targetDays || scheduledCount || daysInMonth;
      const percentage = target > 0 ? Math.min(100, Math.round((achievedCount / target) * 100)) : 0;
      
      const checkDay = isViewingCurrentMonth ? currentDayNum : selectedDay;
      const isScheduledToday = isHabitScheduledOnDate(h, selectedYear, selectedMonth, checkDay);
      const isCompletedToday = completedList.includes(checkDay);

      return {
        habitId: h.id,
        achievedCount,
        scheduledCount,
        target,
        percentage,
        isScheduledToday,
        isCompletedToday,
      };
    });
  }, [habits, currentMonthLogs, daysInMonth, selectedYear, selectedMonth, isViewingCurrentMonth, currentDayNum, selectedDay]);

  const totalAchievedThisMonth = habitStats.reduce((acc, h) => acc + h.achievedCount, 0);
  const totalScheduledThisMonth = habitStats.reduce((acc, h) => acc + h.scheduledCount, 0);
  const overallMonthPercent = totalScheduledThisMonth > 0 ? Math.round((totalAchievedThisMonth / totalScheduledThisMonth) * 100) : 0;

  // Geometry for SVG Spiral / Radial Wheel
  const svgSize = 520;
  const center = svgSize / 2;
  const innerRadius = 74;
  const maxAvailableRadius = 216;
  const habitCount = Math.max(1, habits.length);
  
  // Calculate dynamic ring thickness depending on habit count
  const ringThickness = Math.min(24, Math.max(7, (maxAvailableRadius - innerRadius) / habitCount));
  const outerPerimeterRadius = innerRadius + habits.length * ringThickness;

  // Arc configuration: 31 days spanning from -85° to 195° (clockwise: total arc = 282°)
  const startAngleDeg = -85;
  const totalSpanDeg = 282;
  const degPerDay = totalSpanDeg / 31;

  // Helper to convert polar to cartesian
  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  // Helper to generate SVG path for an annular sector
  const describeArcSector = (
    cx: number,
    cy: number,
    rInner: number,
    rOuter: number,
    startAngle: number,
    endAngle: number
  ) => {
    const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
    const p2 = polarToCartesian(cx, cy, rOuter, endAngle);
    const p3 = polarToCartesian(cx, cy, rInner, endAngle);
    const p4 = polarToCartesian(cx, cy, rInner, startAngle);

    const arcSweep = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      `M ${p1.x} ${p1.y}`,
      `A ${rOuter} ${rOuter} 0 ${arcSweep} 1 ${p2.x} ${p2.y}`,
      `L ${p3.x} ${p3.y}`,
      `A ${rInner} ${rInner} 0 ${arcSweep} 0 ${p4.x} ${p4.y}`,
      'Z',
    ].join(' ');
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 font-pixel-heading" id="radial-habit-tracker-container">
      <div className="bg-[#0e0f14] border-2 border-[#242630] p-4 sm:p-6 shadow-2xl space-y-6">
        
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#242630] pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
              HABIT TRACKER
            </h3>
          </div>

          {/* Month Navigation & Add Habit Action */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setIsAddingNew(!isAddingNew);
                setNewColor(COLOR_PALETTE[habits.length % COLOR_PALETTE.length]);
              }}
              className="px-2.5 py-1.5 bg-[#39d353] hover:bg-[#45e360] text-black text-[8px] font-bold border border-[#45e360] flex items-center gap-1 cursor-pointer transition-colors"
              title="Add a new habit"
            >
              <Plus size={11} />
              <span>ADD HABIT</span>
            </button>

            <div className="flex items-center bg-[#090a0d] border border-[#242630] px-1 py-0.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#181a24] transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="px-2 text-center">
                <div className="text-[9px] font-bold text-white tracking-wider">
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </div>
              </div>
              <button
                onClick={handleNextMonth}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#181a24] transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <button
              onClick={handleJumpToToday}
              className={`px-2.5 py-1.5 text-[8px] border transition-colors cursor-pointer font-pixel-label flex items-center gap-1 ${
                isViewingCurrentMonth
                  ? 'bg-[#181a24] text-zinc-300 border-[#2e3142]'
                  : 'bg-[#ff3b00] text-black border-[#ff5500] font-bold'
              }`}
            >
              <Calendar size={11} />
              <span>TODAY</span>
            </button>
          </div>
        </div>

        {/* Quick Month Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-[#090a0d] border border-[#242630] p-2.5">
            <span className="text-[7.5px] text-zinc-500 font-pixel-label uppercase">ACTIVE HABITS</span>
            <div className="text-[10px] font-bold text-white mt-0.5">
              {habits.length}
            </div>
          </div>
          <div className="bg-[#090a0d] border border-[#242630] p-2.5">
            <span className="text-[7.5px] text-zinc-500 font-pixel-label uppercase">COMPLETED / SCHEDULED</span>
            <div className="text-[10px] font-bold text-[#39d353] mt-0.5">
              {totalAchievedThisMonth} / {totalScheduledThisMonth}
            </div>
          </div>
          <div className="bg-[#090a0d] border border-[#242630] p-2.5">
            <span className="text-[7.5px] text-zinc-500 font-pixel-label uppercase">ADHERENCE RATE</span>
            <div className="text-[10px] font-bold text-white mt-0.5">
              {overallMonthPercent}%
            </div>
          </div>
          <div className="bg-[#090a0d] border border-[#242630] p-2.5">
            <span className="text-[7.5px] text-zinc-500 font-pixel-label uppercase">TODAY'S PROGRESS</span>
            <div className="text-[10px] font-bold text-[#ff3b00] mt-0.5">
              {habitStats.filter((h) => h.isCompletedToday && h.isScheduledToday).length} / {habitStats.filter((h) => h.isScheduledToday).length}
            </div>
          </div>
        </div>

        {/* Add New Habit Form */}
        {isAddingNew && (
          <form
            onSubmit={handleCreateHabit}
            className="bg-[#11131c] border-2 border-[#39d353] p-4 space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-[#242738] pb-2">
              <span className="text-[9px] font-bold text-[#39d353] uppercase flex items-center gap-1.5">
                <Plus size={13} /> ADD NEW HABIT
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            {/* Row 1: Title, Color */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <label className="text-[7.5px] text-zinc-300 font-pixel-label block mb-1">
                  HABIT NAME:
                </label>
                <input
                  type="text"
                  placeholder="e.g., Deep Work, Exercise, Reading..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#090a0e] border border-[#2e3144] focus:border-[#39d353] text-white px-2.5 py-1.5 text-[8.5px] focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="sm:col-span-4">
                <label className="text-[7.5px] text-zinc-300 font-pixel-label block mb-1">
                  COLOR:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-4 h-4 rounded-xs cursor-pointer transition-transform ${
                        newColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Schedule & Recurrence Box */}
            <div className="bg-[#0a0b10] border border-[#242738] p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1c1e2a] pb-1.5">
                <span className="text-[8px] font-bold text-amber-400 font-pixel-label flex items-center gap-1.5">
                  <Repeat size={11} /> SCHEDULE & RECURRENCE
                </span>
              </div>

              {/* Frequency Selection Buttons */}
              <div>
                <label className="text-[7.5px] text-zinc-400 font-pixel-label block mb-1">
                  FREQUENCY:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 font-pixel-label text-[7.5px]">
                  {[
                    { id: 'daily', label: 'Daily', icon: Zap, iconColor: 'text-[#39d353]' },
                    { id: 'alternate', label: 'Alternate (Every 2 days)', icon: Shuffle, iconColor: 'text-amber-400' },
                    { id: 'custom_days', label: 'Custom Days', icon: CalendarDays, iconColor: 'text-blue-400' },
                    { id: 'weekdays', label: 'Weekdays (Mon–Fri)', icon: Briefcase, iconColor: 'text-purple-400' },
                    { id: 'weekends', label: 'Weekends (Sat–Sun)', icon: Sun, iconColor: 'text-orange-400' },
                  ].map((freq) => {
                    const FreqIcon = freq.icon;
                    const isSelected = newSchedule.frequency === freq.id;
                    return (
                      <button
                        key={freq.id}
                        type="button"
                        onClick={() => {
                          let days = [1, 2, 3, 4, 5];
                          if (freq.id === 'daily') days = [0, 1, 2, 3, 4, 5, 6];
                          if (freq.id === 'weekends') days = [0, 6];
                          if (freq.id === 'alternate') days = [1, 3, 5]; // sample
                          setNewSchedule((prev) => ({
                            ...prev,
                            frequency: freq.id as HabitFrequency,
                            daysOfWeek: days,
                          }));
                        }}
                        className={`p-1.5 border text-left cursor-pointer transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#181a24] border-[#39d353] text-[#39d353] font-bold shadow-xs'
                            : 'bg-[#0f1016] border-[#222432] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <FreqIcon size={11} className={isSelected ? 'text-[#39d353]' : freq.iconColor} />
                        <span className="truncate">{freq.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Specific Days Selector */}
              {(newSchedule.frequency === 'custom_days' || newSchedule.frequency === 'weekdays' || newSchedule.frequency === 'weekends') && (
                <div className="bg-[#12141e] border border-[#262838] p-2 space-y-1.5 animate-fadeIn">
                  <label className="text-[7.5px] text-zinc-300 font-pixel-label block">
                    ACTIVE DAYS:
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { index: 1, name: 'MON' },
                      { index: 2, name: 'TUE' },
                      { index: 3, name: 'WED' },
                      { index: 4, name: 'THU' },
                      { index: 5, name: 'FRI' },
                      { index: 6, name: 'SAT' },
                      { index: 0, name: 'SUN' },
                    ].map((d) => {
                      const isActive = (newSchedule.daysOfWeek || []).includes(d.index);
                      return (
                        <button
                          key={d.name}
                          type="button"
                          onClick={() => toggleScheduleDay(d.index, newSchedule, setNewSchedule)}
                          className={`px-2.5 py-1 text-[8px] font-pixel-heading border cursor-pointer transition-all ${
                            isActive
                              ? 'bg-[#39d353] text-black border-[#45e360] font-bold shadow-[0_0_8px_rgba(57,211,83,0.3)]'
                              : 'bg-[#0a0b10] text-zinc-500 border-[#242636] hover:text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          {isActive ? '✓ ' : '○ '} {d.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Start Date & End Date Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#1c1e2a]">
                <div>
                  <label className="text-[7.5px] text-zinc-300 font-pixel-label block mb-1 flex items-center gap-1">
                    <CalendarRange size={10} /> START DATE:
                  </label>
                  <input
                    type="date"
                    value={newSchedule.startDate || todayStr}
                    onChange={(e) =>
                      setNewSchedule((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="w-full bg-[#12141e] border border-[#2e3144] text-white px-2 py-1 text-[8px] focus:outline-none focus:border-[#39d353]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[7.5px] text-zinc-300 font-pixel-label flex items-center gap-1">
                      <Clock size={10} /> END DATE:
                    </label>
                    <label className="text-[7px] text-zinc-400 font-pixel-label flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!newHasEndDate}
                        onChange={(e) => {
                          setNewHasEndDate(!e.target.checked);
                          if (e.target.checked) {
                            setNewSchedule((prev) => ({ ...prev, endDate: null }));
                          } else {
                            setNewSchedule((prev) => ({ ...prev, endDate: todayStr }));
                          }
                        }}
                      />
                      <span>NO END DATE</span>
                    </label>
                  </div>

                  {newHasEndDate ? (
                    <input
                      type="date"
                      value={newSchedule.endDate || todayStr}
                      onChange={(e) =>
                        setNewSchedule((prev) => ({
                          ...prev,
                          endDate: e.target.value,
                        }))
                      }
                      className="w-full bg-[#12141e] border border-[#ff3b00] text-white px-2 py-1 text-[8px] focus:outline-none"
                    />
                  ) : (
                    <div className="bg-[#12141e] border border-[#242636] text-zinc-500 px-2 py-1 text-[8px] font-pixel-label">
                      Ongoing
                    </div>
                  )}
                </div>
              </div>

              {/* Target Override */}
              <div className="pt-2 border-t border-[#1c1e2a] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="text-[7.5px] text-zinc-400 font-pixel-label">
                  MONTHLY TARGET: <span className="text-[#39d353] font-bold">
                    {getMonthlyScheduledDaysCount(
                      { id: 'temp', number: 1, title: '', color: '', schedule: newSchedule },
                      selectedYear,
                      selectedMonth,
                      daysInMonth
                    )} DAYS
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[7.5px] text-zinc-400 font-pixel-label">OVERRIDE TARGET:</span>
                  <input
                    type="number"
                    min="1"
                    max={daysInMonth}
                    placeholder="Auto"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    className="w-16 bg-[#12141e] border border-[#2e3144] text-white px-1.5 py-0.5 text-[8px] text-center focus:outline-none"
                  />
                  {newTarget && (
                    <button
                      type="button"
                      onClick={() => setNewTarget('')}
                      className="text-[6.5px] text-zinc-400 hover:text-white px-1 py-0.5 bg-[#181a24] border border-[#282a3a]"
                    >
                      CLEAR
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 bg-[#181a24] text-zinc-400 hover:text-white text-[8px] border border-[#282a3a] cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#39d353] hover:bg-[#45e360] text-black font-bold text-[8.5px] border border-[#45e360] cursor-pointer flex items-center gap-1"
              >
                <Check size={12} />
                <span>SAVE HABIT</span>
              </button>
            </div>
          </form>
        )}

        {/* Main Interactive Workspace: Left List + Right Radial Wheel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Dynamic Daily Habits List + Quick Day Check-in */}
          <div className="lg:col-span-5 space-y-3">
            
            {/* Header for Daily Habits */}
            <div className="flex items-center justify-between border-b border-[#242630] pb-2">
              <div>
                <div className="text-[8px] text-[#ff3b00] font-pixel-label uppercase tracking-wider">
                  DAILY HABITS ({habits.length})
                </div>
                <div className="text-[10px] font-bold text-zinc-200">
                  DAY {selectedDay} • {selectedDayOfWeek}
                </div>
              </div>

              {/* Day selector for fast multi-day review */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedDay((d) => Math.max(1, d - 1))}
                  className="px-1.5 py-0.5 bg-[#14151f] border border-[#282a3a] text-zinc-400 hover:text-white text-[8px]"
                  title="Previous Day"
                >
                  ◀
                </button>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                  className="bg-[#14151f] border border-[#282a3a] text-white text-[8px] px-1 py-0.5 font-pixel-heading focus:outline-none"
                >
                  {Array.from({ length: daysInMonth }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Day {i + 1} ({DAYS_OF_WEEK_SHORT[new Date(selectedYear, selectedMonth, i + 1).getDay()]})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setSelectedDay((d) => Math.min(daysInMonth, d + 1))}
                  className="px-1.5 py-0.5 bg-[#14151f] border border-[#282a3a] text-zinc-400 hover:text-white text-[8px]"
                  title="Next Day"
                >
                  ▶
                </button>
              </div>
            </div>

            {/* List of Habit Rows */}
            {habits.length === 0 ? (
              <div className="bg-[#090a0e] border border-dashed border-[#282a3a] p-6 text-center space-y-2">
                <p className="text-[9px] text-zinc-400 font-pixel-label">
                  NO HABITS CONFIGURED YET.
                </p>
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="px-3 py-1.5 bg-[#39d353] text-black font-bold text-[8px] border border-[#45e360] cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus size={11} /> ADD FIRST HABIT
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {habits.map((habit, index) => {
                  const habitNumber = index + 1;
                  const completedDaysList = currentMonthLogs[habit.id] || [];
                  const isDoneForSelectedDay = completedDaysList.includes(selectedDay);
                  const isScheduledOnSelectedDay = isHabitScheduledOnDate(habit, selectedYear, selectedMonth, selectedDay);
                  const scheduledMonthTarget = getMonthlyScheduledDaysCount(habit, selectedYear, selectedMonth, daysInMonth);
                  const effectiveTarget = habit.targetDays || scheduledMonthTarget || daysInMonth;
                  
                  const isEditing = editingHabitId === habit.id;
                  const isInspected = inspectedHabitId === habit.id;

                  return (
                    <div
                      key={habit.id}
                      onClick={() => setInspectedHabitId(habit.id)}
                      className={`p-2.5 border transition-all space-y-1.5 cursor-pointer ${
                        isInspected
                          ? 'border-[#ff3b00] ring-1 ring-[#ff3b00]/40'
                          : isDoneForSelectedDay
                          ? 'border-[#26a641]/60'
                          : !isScheduledOnSelectedDay
                          ? 'border-[#1b1c24] opacity-80 hover:opacity-100'
                          : 'border-[#1f212b] hover:border-[#2e3142]'
                      } ${
                        isDoneForSelectedDay
                          ? 'bg-[#0f1712] text-white'
                          : !isScheduledOnSelectedDay
                          ? 'bg-[#0a0b10] text-zinc-400'
                          : 'bg-[#090a0e] text-zinc-300'
                      }`}
                    >
                      {/* Top Row: Habit Number, Title, Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            className="w-4 h-4 rounded-xs text-black flex items-center justify-center text-[7.5px] font-bold shrink-0 font-pixel-heading shadow-xs"
                            style={{ backgroundColor: habit.color || '#39d353' }}
                          >
                            {habitNumber}
                          </span>

                          {isEditing ? (
                            <div className="flex flex-col gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="bg-[#14151f] border border-[#ff3b00] text-white px-2 py-0.5 text-[8px] flex-1 focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => saveEditHabit(habit.id)}
                                  className="p-1 bg-[#ff3b00] text-black hover:bg-[#ff5500] cursor-pointer"
                                  title="Save changes"
                                >
                                  <Check size={11} />
                                </button>
                                <button
                                  onClick={() => setEditingHabitId(null)}
                                  className="p-1 bg-[#1e202c] text-zinc-400 hover:text-white cursor-pointer"
                                  title="Cancel"
                                >
                                  <X size={11} />
                                </button>
                              </div>

                              {/* Edit Schedule Controls */}
                              <div className="bg-[#0e0f16] border border-[#292c3d] p-2 space-y-2 text-[7.5px] font-pixel-label">
                                <div className="flex items-center justify-between">
                                  <span className="text-amber-400 font-bold">EDIT SCHEDULE:</span>
                                  <select
                                    value={editSchedule.frequency}
                                    onChange={(e) => {
                                      const freq = e.target.value as HabitFrequency;
                                      let days = [1, 2, 3, 4, 5];
                                      if (freq === 'daily') days = [0, 1, 2, 3, 4, 5, 6];
                                      if (freq === 'weekends') days = [0, 6];
                                      setEditSchedule((prev) => ({
                                        ...prev,
                                        frequency: freq,
                                        daysOfWeek: days,
                                      }));
                                    }}
                                    className="bg-[#181a24] border border-[#282a3a] text-white px-1 py-0.5"
                                  >
                                    <option value="daily">Daily</option>
                                    <option value="alternate">Alternate (Every 2 days)</option>
                                    <option value="custom_days">Custom Days</option>
                                    <option value="weekdays">Weekdays (Mon–Fri)</option>
                                    <option value="weekends">Weekends (Sat–Sun)</option>
                                  </select>
                                </div>

                                {(editSchedule.frequency === 'custom_days' || editSchedule.frequency === 'weekdays' || editSchedule.frequency === 'weekends') && (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {[
                                      { index: 1, name: 'M' },
                                      { index: 2, name: 'T' },
                                      { index: 3, name: 'W' },
                                      { index: 4, name: 'T' },
                                      { index: 5, name: 'F' },
                                      { index: 6, name: 'S' },
                                      { index: 0, name: 'S' },
                                    ].map((d, i) => {
                                      const isAct = (editSchedule.daysOfWeek || []).includes(d.index);
                                      return (
                                        <button
                                          key={i}
                                          type="button"
                                          onClick={() => toggleScheduleDay(d.index, editSchedule, setEditSchedule)}
                                          className={`w-5 h-5 text-[7px] border cursor-pointer ${
                                            isAct ? 'bg-[#39d353] text-black font-bold' : 'bg-[#14151f] text-zinc-500'
                                          }`}
                                        >
                                          {d.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  <div>
                                    <span className="text-zinc-400 block">START:</span>
                                    <input
                                      type="date"
                                      value={editSchedule.startDate || todayStr}
                                      onChange={(e) => setEditSchedule((p) => ({ ...p, startDate: e.target.value }))}
                                      className="bg-[#181a24] border border-[#282a3a] text-white px-1 py-0.5 text-[7px] w-full"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-zinc-400 block">END:</span>
                                    <input
                                      type="date"
                                      value={editSchedule.endDate || ''}
                                      onChange={(e) => {
                                        setEditHasEndDate(Boolean(e.target.value));
                                        setEditSchedule((p) => ({ ...p, endDate: e.target.value || null }));
                                      }}
                                      className="bg-[#181a24] border border-[#282a3a] text-white px-1 py-0.5 text-[7px] w-full"
                                    />
                                  </div>
                                </div>

                                {/* Color Palette */}
                                <div className="flex items-center gap-1 flex-wrap pt-1">
                                  {COLOR_PALETTE.map((c) => (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => setEditColor(c)}
                                      className={`w-3 h-3 rounded-xs cursor-pointer ${
                                        editColor === c ? 'scale-125 ring-1 ring-white' : 'opacity-60 hover:opacity-100'
                                      }`}
                                      style={{ backgroundColor: c }}
                                    />
                                  ))}
                                </div>

                                {/* Bottom of Edit section: Orange Delete Button & Save / Cancel */}
                                <div className="pt-2 border-t border-[#292c3d] flex items-center justify-between gap-2">
                                  {deleteConfirmId === habit.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteHabit(habit.id);
                                          setEditingHabitId(null);
                                          setDeleteConfirmId(null);
                                        }}
                                        className="px-2.5 py-1.5 bg-[#ff3b00] hover:bg-[#ff5500] text-black font-bold text-[7.5px] font-pixel-heading flex items-center gap-1 border border-[#ff5500] cursor-pointer transition-colors shadow-xs animate-pulse"
                                        title="Click to permanently delete this habit"
                                      >
                                        <Trash2 size={10} />
                                        <span>CONFIRM DELETE?</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirmId(null);
                                        }}
                                        className="px-1.5 py-1 bg-[#181a24] text-zinc-400 hover:text-white text-[7px] border border-[#2e3144] cursor-pointer font-pixel-label"
                                      >
                                        BACK
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmId(habit.id);
                                      }}
                                      className="px-2.5 py-1.5 bg-[#ff3b00] hover:bg-[#ff5500] text-black font-bold text-[7.5px] font-pixel-heading flex items-center gap-1 border border-[#ff5500] cursor-pointer transition-colors shadow-xs"
                                      title="Delete this habit"
                                    >
                                      <Trash2 size={10} />
                                      <span>DELETE HABIT</span>
                                    </button>
                                  )}

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingHabitId(null);
                                        setDeleteConfirmId(null);
                                      }}
                                      className="px-2 py-1 bg-[#181a24] hover:bg-[#252838] text-zinc-300 text-[7.5px] border border-[#2e3144] cursor-pointer font-pixel-label"
                                    >
                                      CANCEL
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => saveEditHabit(habit.id)}
                                      className="px-2.5 py-1 bg-[#39d353] hover:bg-[#45e360] text-black font-bold text-[7.5px] border border-[#45e360] cursor-pointer font-pixel-heading flex items-center gap-1"
                                    >
                                      <Check size={10} />
                                      <span>SAVE</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 min-w-0">
                              <span className="text-[8.5px] font-pixel-label font-bold truncate block">
                                {habit.title}
                              </span>
                              <div className="flex items-center gap-1.5 text-[7px] font-pixel-label text-zinc-400 mt-0.5">
                                <span className="text-amber-400 flex items-center gap-1">
                                  <Repeat size={8} /> {formatFrequencyLabel(habit.schedule)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Top Right Action Tools */}
                        {!isEditing && (
                          <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleMoveHabit(index, 'up')}
                              disabled={index === 0}
                              className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 p-0.5 transition-colors"
                              title="Move Up"
                            >
                              <ArrowUp size={10} />
                            </button>
                            <button
                              onClick={() => handleMoveHabit(index, 'down')}
                              disabled={index === habits.length - 1}
                              className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 p-0.5 transition-colors"
                              title="Move Down"
                            >
                              <ArrowDown size={10} />
                            </button>
                            <button
                              onClick={() => startEditHabit(habit)}
                              className="text-zinc-400 hover:text-white p-0.5 transition-colors cursor-pointer"
                              title="Edit habit & schedule"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Bottom Row: Day Check Status / Rest Day Banner */}
                      {!isEditing && (
                        <div className="flex items-center justify-between pt-1 border-t border-[#1a1c24] text-[7.5px] font-pixel-label">
                          <div className="flex items-center gap-2">
                            <span>
                              {completedDaysList.length}/{effectiveTarget} DAYS ({Math.min(100, Math.round((completedDaysList.length / effectiveTarget) * 100))}%)
                            </span>
                            {!isScheduledOnSelectedDay && (
                              <span className="bg-[#181924] text-zinc-400 px-1.5 py-0.5 border border-[#2a2c3d] text-[6.5px]">
                                Rest day
                              </span>
                            )}
                          </div>

                          {/* Check Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleHabitDay(monthKey, habit.id, selectedDay);
                            }}
                            className={`px-2 py-1 text-[7.5px] font-pixel-heading border flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${
                              isDoneForSelectedDay
                                ? 'bg-[#39d353] text-black border-[#45e360] font-bold shadow-[0_0_8px_rgba(57,211,83,0.4)]'
                                : !isScheduledOnSelectedDay
                                ? 'bg-[#12131b] text-zinc-500 border-[#242636] hover:text-white'
                                : 'bg-[#14151f] text-zinc-400 border-[#282a3a] hover:text-white hover:border-zinc-500'
                            }`}
                            title={`Toggle habit for Day ${selectedDay}`}
                          >
                            {isDoneForSelectedDay ? (
                              <>
                                <CheckSquare size={11} />
                                <span>DONE</span>
                              </>
                            ) : (
                              <>
                                <Square size={11} />
                                <span>{isScheduledOnSelectedDay ? 'CHECK' : 'LOG EXTRA'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Actions for Selected Day */}
            {habits.length > 0 && (
              <div className="bg-[#090a0d] border border-[#242630] p-2.5 flex items-center justify-between text-[7.5px] font-pixel-label">
                <span className="text-zinc-400">
                  DAY {selectedDay} ({selectedDayOfWeek}):{' '}
                  <span className="text-white font-bold">
                    {habits.filter((h) => (currentMonthLogs[h.id] || []).includes(selectedDay)).length}/{habits.filter((h) => isHabitScheduledOnDate(h, selectedYear, selectedMonth, selectedDay)).length}
                  </span>{' '}
                  SCHEDULED DONE
                </span>
                <button
                  onClick={() => {
                    const scheduledHabits = habits.filter((h) => isHabitScheduledOnDate(h, selectedYear, selectedMonth, selectedDay));
                    const allDone = scheduledHabits.every((h) => (currentMonthLogs[h.id] || []).includes(selectedDay));
                    scheduledHabits.forEach((h) => {
                      const isDone = (currentMonthLogs[h.id] || []).includes(selectedDay);
                      if (allDone && isDone) {
                        onToggleHabitDay(monthKey, h.id, selectedDay);
                      } else if (!allDone && !isDone) {
                        onToggleHabitDay(monthKey, h.id, selectedDay);
                      }
                    });
                  }}
                  className="pixel-btn-dark px-2 py-1 text-[7px] cursor-pointer text-zinc-300 hover:text-white"
                >
                  TOGGLE SCHEDULED
                </button>
              </div>
            )}
          </div>

          {/* Right: The Radial Circular 31-Day Habit Wheel */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center relative bg-[#090a0e] border border-[#242630] p-4 sm:p-6 overflow-hidden">
            
            {/* Wheel Header Badge */}
            <div className="w-full flex items-center justify-between mb-2 text-[8px] text-zinc-400 font-pixel-label">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-[#39d353] inline-block animate-pulse" />
                <span>CIRCULAR VISUAL MAP ({habits.length} RINGS)</span>
              </span>
              <span className="bg-[#14151f] px-2 py-0.5 border border-[#282a3a] text-zinc-400">
                TOUCH TO INSPECT HABIT & STREAK
              </span>
            </div>

            {/* SVG Wheel Canvas */}
            <div className="relative w-full max-w-[440px] aspect-square flex items-center justify-center">
              <svg
                viewBox={`0 0 ${svgSize} ${svgSize}`}
                className="w-full h-full select-none"
              >
                {/* Background Ring Guide Circles */}
                <circle
                  cx={center}
                  cy={center}
                  r={innerRadius - 4}
                  fill="#0e0f14"
                  stroke="#242630"
                  strokeWidth="1.5"
                />

                {/* Draw Annular Sectors for each day (1 to 31) and each Habit (0 to habits.length - 1) */}
                {Array.from({ length: 31 }).map((_, dayIdx) => {
                  const dayNum = dayIdx + 1;
                  const isDayInMonth = dayNum <= daysInMonth;
                  const startA = startAngleDeg + dayIdx * degPerDay;
                  const endA = startA + degPerDay;
                  const midA = (startA + endA) / 2;

                  const isTodaySpoke = isViewingCurrentMonth && dayNum === currentDayNum;
                  const isSelectedSpoke = dayNum === selectedDay;

                  // Label position for day numbers around the perimeter
                  const labelPos = polarToCartesian(center, center, outerPerimeterRadius + 14, midA);

                  return (
                    <g key={`day-col-${dayNum}`} className="group">
                      {/* Day Number Label on Outer Edge */}
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className={`text-[9px] font-pixel-heading font-bold cursor-pointer transition-colors ${
                          isSelectedSpoke
                            ? 'fill-[#ff3b00] font-black'
                            : isTodaySpoke
                            ? 'fill-[#39d353]'
                            : isDayInMonth
                            ? 'fill-zinc-400 hover:fill-white'
                            : 'fill-zinc-700'
                        }`}
                        onClick={() => setSelectedDay(dayNum)}
                      >
                        {dayNum}
                      </text>

                      {/* Dynamic Concentric Rings for all Habits */}
                      {habits.map((habit, habitIdx) => {
                        const rIn = innerRadius + habitIdx * ringThickness;
                        const rOut = rIn + ringThickness;
                        const completedList = currentMonthLogs[habit.id] || [];
                        const isCompleted = completedList.includes(dayNum);
                        const isScheduled = isHabitScheduledOnDate(habit, selectedYear, selectedMonth, dayNum);
                        const isHovered = hoveredCell?.habitIndex === habitIdx && hoveredCell?.day === dayNum;
                        const isInspected = inspectedHabitId === habit.id;

                        const pathData = describeArcSector(center, center, rIn, rOut, startA + 0.35, endA - 0.35);

                        // Fill color calculation
                        let fillColor = '#12131a';
                        let strokeColor = '#222430';

                        if (!isDayInMonth) {
                          fillColor = '#0a0a0d';
                          strokeColor = '#181920';
                        } else if (isCompleted) {
                          fillColor = habit.color || '#39d353';
                          strokeColor = isHovered ? '#ffffff' : '#0e0f14';
                        } else if (!isScheduled) {
                          // Rest / Off Day for this habit
                          fillColor = isHovered ? '#1e202e' : '#0d0e14';
                          strokeColor = isHovered ? '#ff3b00' : '#1a1b24';
                        } else if (isHovered) {
                          fillColor = '#262838';
                          strokeColor = '#ff3b00';
                        } else if (isSelectedSpoke) {
                          fillColor = isInspected ? '#26293d' : '#191b26';
                          strokeColor = isInspected ? habit.color || '#39d353' : '#3e4259';
                        } else if (isInspected) {
                          fillColor = '#171926';
                          strokeColor = '#2f344d';
                        }

                        return (
                          <path
                            key={`arc-${habit.id}-${dayNum}`}
                            d={pathData}
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth={isHovered ? 1.5 : 0.8}
                            className={`transition-all duration-75 ${
                              isDayInMonth ? 'cursor-pointer hover:opacity-95' : 'cursor-not-allowed opacity-30'
                            }`}
                            onMouseEnter={() => {
                              if (isDayInMonth) {
                                setHoveredCell({ habitIndex: habitIdx, day: dayNum });
                              }
                            }}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => {
                              if (!isDayInMonth) return;
                              setSelectedDay(dayNum);
                              setInspectedHabitId(habit.id);
                              // Strictly DO NOT toggle habit completion on circle click!
                            }}
                          >
                            <title>
                              {`Habit ${habitIdx + 1}: ${habit.title} • Day ${dayNum} (${
                                isCompleted ? 'Completed ✓' : !isScheduled ? 'Rest / Off Day' : 'Scheduled Incomplete'
                              })`}
                            </title>
                          </path>
                        );
                      })}
                    </g>
                  );
                })}

                {/* Central Circle Calligraphy/Title (Month Of ...) */}
                <g className="select-none">
                  <circle
                    cx={center}
                    cy={center}
                    r={innerRadius - 2}
                    fill="#08090c"
                    stroke="#ff3b00"
                    strokeWidth="1.5"
                    className="drop-shadow-[0_0_12px_rgba(255,59,0,0.25)]"
                  />

                  <text
                    x={center}
                    y={center - 22}
                    textAnchor="middle"
                    className="font-pixel-label text-[9px] fill-zinc-400 uppercase tracking-widest"
                  >
                    MONTH OF
                  </text>

                  <text
                    x={center}
                    y={center - 2}
                    textAnchor="middle"
                    className="font-pixel-heading text-[12px] font-bold fill-[#ff3b00] tracking-wider"
                  >
                    {MONTH_NAMES[selectedMonth]}
                  </text>

                  <text
                    x={center}
                    y={center + 14}
                    textAnchor="middle"
                    className="font-pixel-label text-[8px] fill-zinc-500 font-bold"
                  >
                    {selectedYear}
                  </text>

                  <text
                    x={center}
                    y={center + 30}
                    textAnchor="middle"
                    className="font-pixel-heading text-[7.5px] fill-[#39d353]"
                  >
                    {totalAchievedThisMonth} / {totalScheduledThisMonth} DONE
                  </text>
                </g>
              </svg>
            </div>

            {/* Habit Inspector Card (Shows which habit is being tracked & continuous streak) */}
            {(() => {
              if (habits.length === 0) return null;

              const activeHabitIndex = hoveredCell !== null
                ? hoveredCell.habitIndex
                : habits.findIndex((h) => h.id === inspectedHabitId);
              const curHabit = habits[activeHabitIndex >= 0 ? activeHabitIndex : 0] || habits[0];
              const curDay = hoveredCell ? hoveredCell.day : selectedDay;
              const completedDays = currentMonthLogs[curHabit.id] || [];
              const isDoneOnDay = completedDays.includes(curDay);
              const isScheduledOnDay = isHabitScheduledOnDate(curHabit, selectedYear, selectedMonth, curDay);
              const monthlyScheduled = getMonthlyScheduledDaysCount(curHabit, selectedYear, selectedMonth, daysInMonth);
              const target = curHabit.targetDays || monthlyScheduled || daysInMonth;
              const percent = Math.min(100, Math.round((completedDays.length / target) * 100));

              // Compute continuous scheduled streak in month
              let maxStreak = 0;
              let tempStreak = 0;
              for (let d = 1; d <= daysInMonth; d++) {
                if (completedDays.includes(d)) {
                  tempStreak++;
                  if (tempStreak > maxStreak) maxStreak = tempStreak;
                } else {
                  // Only reset streak if the day was scheduled!
                  if (isHabitScheduledOnDate(curHabit, selectedYear, selectedMonth, d)) {
                    tempStreak = 0;
                  }
                }
              }

              // Current active streak ending at current/selected day
              let currentStreak = 0;
              let checkD = curDay;
              if (!completedDays.includes(checkD) && completedDays.includes(checkD - 1)) {
                checkD = checkD - 1;
              }
              while (checkD > 0) {
                if (completedDays.includes(checkD)) {
                  currentStreak++;
                } else if (isHabitScheduledOnDate(curHabit, selectedYear, selectedMonth, checkD)) {
                  break; // missed a scheduled day
                }
                checkD--;
              }

              return (
                <div className="w-full mt-3 bg-[#11131b] border border-[#2b2e3d] p-3 space-y-2 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#202330] pb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: curHabit.color || '#39d353' }}
                      />
                      <span className="text-[7.5px] font-pixel-label text-[#ff3b00] font-bold">
                        HABIT {activeHabitIndex >= 0 ? activeHabitIndex + 1 : 1}:
                      </span>
                      <span className="text-[9px] font-bold text-white tracking-wide truncate max-w-[180px] sm:max-w-xs">
                        {curHabit.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-[#1b1e2a] px-2 py-0.5 text-[7px] text-zinc-300 border border-[#2c3042] font-pixel-label">
                        DAY {curDay}: {isDoneOnDay ? (
                          <span className="text-[#39d353] font-bold">✓ DONE</span>
                        ) : !isScheduledOnDay ? (
                          <span className="text-zinc-400">REST DAY</span>
                        ) : (
                          <span className="text-amber-400">PENDING</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Schedule Details Line */}
                  <div className="bg-[#090a0e] p-1.5 border border-[#1f222e] text-[7px] font-pixel-label text-zinc-400 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1"><Repeat size={9} className="text-amber-400" /> <strong className="text-amber-400">Schedule:</strong> {formatFrequencyLabel(curHabit.schedule)}</span>
                    <span className="flex items-center gap-1"><Calendar size={9} className="text-zinc-400" /> <strong className="text-zinc-300">Active:</strong> {curHabit.schedule?.startDate || 'Anytime'} to {curHabit.schedule?.endDate || 'Ongoing'}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1 font-pixel-label text-[7.5px]">
                    <div className="bg-[#090a0e] p-1.5 border border-[#1f222e]">
                      <div className="text-zinc-500 uppercase text-[6.5px]">MONTHLY SCHEDULED</div>
                      <div className="text-[#39d353] font-bold text-[8.5px] mt-0.5">
                        {completedDays.length} / {target} DAYS
                      </div>
                      <div className="text-zinc-400 text-[6.5px]">({percent}% Target)</div>
                    </div>

                    <div className="bg-[#090a0e] p-1.5 border border-[#1f222e]">
                      <div className="text-zinc-500 uppercase text-[6.5px]">BEST STREAK</div>
                      <div className="text-amber-400 font-bold text-[8.5px] mt-0.5 flex items-center justify-center gap-1">
                        <Flame size={10} className="text-amber-400" />
                        <span>{maxStreak} DAYS</span>
                      </div>
                    </div>

                    <div className="bg-[#090a0e] p-1.5 border border-[#1f222e]">
                      <div className="text-zinc-500 uppercase text-[6.5px]">CURRENT STREAK</div>
                      <div className="text-[#00d26a] font-bold text-[8.5px] mt-0.5 flex items-center justify-center gap-1">
                        <Zap size={10} className="text-[#00d26a]" />
                        <span>{currentStreak} DAYS</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

        </div>

        {/* Bottom Matrix Table */}
        {habits.length > 0 && (
          <div className="border-t-2 border-[#242630] pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold text-[#ff3b00] font-pixel-label uppercase tracking-wider">
                HABIT TARGETS & PERFORMANCE MATRIX
              </span>
              <span className="text-[7.5px] text-zinc-500 font-pixel-label">
                MONTHLY AUDIT ({habits.length} {habits.length === 1 ? 'HABIT' : 'HABITS'})
              </span>
            </div>

            <div className="overflow-x-auto border border-[#242630] bg-[#090a0d] rounded-xs">
              <table className={`w-full text-left text-[8px] border-collapse ${
                habits.length >= 4 ? 'min-w-[540px]' : 'min-w-full table-fixed'
              }`}>
                <thead>
                  <tr className="bg-[#12131b] border-b border-[#242630]">
                    <th className="p-2 sm:p-2.5 border-r border-[#242630] font-pixel-label text-zinc-400 w-24 sm:w-28 md:w-32 uppercase shrink-0">
                      METRIC
                    </th>
                    {habits.map((h, i) => (
                      <th
                        key={h.id}
                        className={`p-2 sm:p-2.5 border-r border-[#242630] text-center font-pixel-heading text-zinc-200 ${
                          habits.length === 1
                            ? 'w-auto'
                            : habits.length <= 3
                            ? 'w-auto'
                            : 'min-w-[100px] sm:min-w-[115px]'
                        }`}
                      >
                        <div className="text-[7.5px] font-bold" style={{ color: h.color || '#ff3b00' }}>
                          HABIT {i + 1}
                        </div>
                        <div className="truncate max-w-[120px] mx-auto font-pixel-label text-zinc-300 mt-0.5 text-[7px]" title={h.title}>
                          {h.title}
                        </div>
                        <div className="text-[6.5px] font-pixel-label text-amber-400 truncate max-w-[120px] mx-auto mt-0.5">
                          {formatFrequencyLabel(h.schedule)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: Target Goals */}
                  <tr className="border-b border-[#1c1e28]">
                    <td className="p-2 sm:p-2.5 border-r border-[#242630] font-pixel-label font-bold text-zinc-300 uppercase bg-[#0d0e14]">
                      SCHEDULED DAYS
                    </td>
                    {habitStats.map((stat) => (
                      <td key={stat.habitId} className="p-2 sm:p-2.5 border-r border-[#242630] text-center font-pixel-heading text-white">
                        <span className="bg-[#151722] px-2 py-0.5 border border-[#282a3a] inline-block rounded-xs">
                          {stat.target} DAYS
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Row 2: Days Achieved */}
                  <tr>
                    <td className="p-2 sm:p-2.5 border-r border-[#242630] font-pixel-label font-bold text-[#39d353] uppercase bg-[#0d0e14]">
                      DAYS ACHIEVED
                    </td>
                    {habitStats.map((stat) => (
                      <td key={stat.habitId} className="p-2 sm:p-2.5 border-r border-[#242630] text-center font-pixel-heading">
                        <div className="text-[#39d353] font-bold text-[8.5px]">
                          {stat.achievedCount} <span className="text-[7px] text-zinc-500 font-normal">DAYS</span>
                        </div>
                        <div className="text-[6.5px] text-zinc-400 font-pixel-label mt-0.5">
                          ({stat.percentage}%)
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
