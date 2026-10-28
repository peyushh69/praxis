import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  BellRing,
  Plus,
  Trash2,
  Droplets,
  Clock,
  Repeat,
  Volume2,
  Check,
  X,
  Link2,
  RotateCcw,
  Play,
  Square,
  CalendarClock,
  Timer,
} from 'lucide-react';
import { MiniAlarm, HabitItem, TaskItem, AlarmType } from '../types';
import { cleanAudio } from '../utils/audio';
import { wakeLockManager, audioKeepAlive, requestNotificationPermission } from '../utils/timerService';

interface MiniAlarmSectionProps {
  alarms: MiniAlarm[];
  habits: HabitItem[];
  tasks: TaskItem[];
  ringingAlarms: MiniAlarm[];
  soundVolume: number;
  onUpdateAlarms: (alarms: MiniAlarm[]) => void;
  onDismissRinging: (alarmId: string) => void;
  onSnoozeRinging: (alarmId: string, minutes?: number) => void;
  onCompleteLinkedItem?: (alarm: MiniAlarm) => void;
  quickLinkTarget?: { type: 'habit' | 'task'; id: string; title: string } | null;
  onClearQuickLinkTarget?: () => void;
}

export function parseTimeToMinutes(timeStr: string, fallback = 540): number {
  const parts = (timeStr || '').split(':').map(Number);
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
    return fallback;
  }
  return Math.max(0, Math.min(1439, parts[0] * 60 + parts[1]));
}

export function formatMinutesToHHMM(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hrs = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function formatMinutesTo12Hr(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hrs24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const period = hrs24 >= 12 ? 'PM' : 'AM';
  const hrs12 = hrs24 % 12 === 0 ? 12 : hrs24 % 12;
  return mins === 0
    ? `${hrs12} ${period}`
    : `${hrs12}:${String(mins).padStart(2, '0')} ${period}`;
}

export function computeClockTargetTimestamp(clockTime: string, fromMs = Date.now()): number {
  const parts = (clockTime || '08:00').split(':').map(Number);
  const hours = Number.isFinite(parts[0]) ? parts[0] : 8;
  const minutes = Number.isFinite(parts[1]) ? parts[1] : 0;

  const now = new Date(fromMs);
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0,
    0
  );

  if (target.getTime() <= fromMs + 1000) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

export function getTimeframeDailySlots(
  windowStartTime = '09:00',
  windowEndTime = '21:00',
  intervalMinutes = 60
): number[] {
  const startMins = parseTimeToMinutes(windowStartTime, 9 * 60);
  const endMins = parseTimeToMinutes(windowEndTime, 21 * 60);
  const step = Math.max(5, Math.min(720, Number(intervalMinutes) || 60));
  const slots: number[] = [];

  if (endMins >= startMins) {
    for (let m = startMins; m <= endMins; m += step) {
      slots.push(m);
    }
  } else {
    for (let m = startMins; m < 1440; m += step) {
      slots.push(m);
    }
    for (let m = 0; m <= endMins; m += step) {
      slots.push(m);
    }
  }

  return slots.length > 0 ? slots : [startMins];
}

export function computeTimeframeNextTimestamp(
  windowStartTime = '09:00',
  windowEndTime = '21:00',
  intervalMinutes = 60,
  fromMs = Date.now()
): number {
  const slots = getTimeframeDailySlots(windowStartTime, windowEndTime, intervalMinutes).sort(
    (a, b) => a - b
  );
  const now = new Date(fromMs);

  for (const slotMins of slots) {
    const hrs = Math.floor(slotMins / 60);
    const mins = slotMins % 60;
    const candidate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hrs,
      mins,
      0,
      0
    );
    if (candidate.getTime() > fromMs + 1000) {
      return candidate.getTime();
    }
  }

  const firstSlot = slots[0] ?? parseTimeToMinutes(windowStartTime, 9 * 60);
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    Math.floor(firstSlot / 60),
    firstSlot % 60,
    0,
    0
  );
  return tomorrow.getTime();
}

export function getNextAlarmStateOnTrigger(alarm: MiniAlarm, nowMs = Date.now()): MiniAlarm {
  if (alarm.type === 'timeframe') {
    const nextTarget = computeTimeframeNextTimestamp(
      alarm.windowStartTime || '09:00',
      alarm.windowEndTime || '21:00',
      alarm.intervalMinutes || 60,
      nowMs
    );
    return {
      ...alarm,
      enabled: true,
      targetTimestamp: nextTarget,
    };
  }

  if (alarm.type === 'trip_repeat') {
    const totalRings = Math.max(1, alarm.tripTotalRings || 6);
    const completed = (alarm.tripCompletedRings || 0) + 1;
    if (completed < totalRings) {
      const stepMins = Math.max(1, alarm.intervalMinutes || 60);
      return {
        ...alarm,
        enabled: true,
        tripCompletedRings: completed,
        targetTimestamp: nowMs + stepMins * 60 * 1000,
      };
    }
    return {
      ...alarm,
      enabled: false,
      tripCompletedRings: totalRings,
      targetTimestamp: null,
    };
  }

  if (alarm.repeat) {
    const nextTarget =
      alarm.type === 'interval'
        ? nowMs + Math.max(1, alarm.intervalMinutes || 30) * 60 * 1000
        : computeClockTargetTimestamp(alarm.clockTime || '18:00', nowMs);
    return {
      ...alarm,
      enabled: true,
      targetTimestamp: nextTarget,
    };
  }

  return {
    ...alarm,
    enabled: false,
    targetTimestamp: null,
  };
}

export const MiniAlarmSection: React.FC<MiniAlarmSectionProps> = ({
  alarms,
  habits,
  tasks,
  ringingAlarms,
  soundVolume,
  onUpdateAlarms,
  onDismissRinging,
  onCompleteLinkedItem,
  quickLinkTarget,
  onClearQuickLinkTarget,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'water' | 'reading' | 'task' | 'custom'>('custom');
  const [alarmType, setAlarmType] = useState<AlarmType>('timeframe');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(60);
  const [clockTime, setClockTime] = useState<string>('18:00');
  const [windowStartTime, setWindowStartTime] = useState<string>('09:00');
  const [windowEndTime, setWindowEndTime] = useState<string>('21:00');
  const [tripHours, setTripHours] = useState<number>(6);
  const [tripTotalRings, setTripTotalRings] = useState<number>(6);
  const [repeat, setRepeat] = useState<boolean>(true);
  const [linkedSelection, setLinkedSelection] = useState<string>('none');

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (quickLinkTarget) {
      setIsAdding(true);
      setTitle(quickLinkTarget.title);
      setCategory('task');
      setAlarmType('timeframe');
      setIntervalMinutes(60);
      setLinkedSelection(`${quickLinkTarget.type}:${quickLinkTarget.id}`);
      if (onClearQuickLinkTarget) {
        onClearQuickLinkTarget();
      }
    }
  }, [quickLinkTarget, onClearQuickLinkTarget]);

  const unlockMobileAudioAndWake = () => {
    cleanAudio.playClick(soundVolume);
    requestNotificationPermission();
    audioKeepAlive.start();
    wakeLockManager.acquireFromUserGesture();
  };

  const schedulePreview = useMemo(() => {
    if (alarmType === 'timeframe') {
      const slots = getTimeframeDailySlots(windowStartTime, windowEndTime, intervalMinutes);
      const startMins = parseTimeToMinutes(windowStartTime, 540);
      const endMins = parseTimeToMinutes(windowEndTime, 1260);
      const totalSpanMins =
        endMins >= startMins ? endMins - startMins : 1440 - startMins + endMins;
      const totalHours = Math.max(0.5, +(totalSpanMins / 60).toFixed(1));
      return {
        modeLabel: `${formatMinutesTo12Hr(startMins)} – ${formatMinutesTo12Hr(endMins)}`,
        totalHoursLabel: `${totalHours} HRS`,
        ringsCount: slots.length,
        slotsMinutesOfDay: slots,
        previewTimes: slots.map(formatMinutesToHHMM),
      };
    }

    if (alarmType === 'trip_repeat') {
      const safeHrs = Math.max(1, Math.min(48, Number(tripHours) || 6));
      const safeRings = Math.max(1, Math.min(48, Number(tripTotalRings) || 6));
      const stepMins = Math.max(1, Math.round((safeHrs * 60) / safeRings));
      const nowDate = new Date(nowMs);
      const startMins = nowDate.getHours() * 60 + nowDate.getMinutes();
      const slots: number[] = [];
      for (let i = 1; i <= safeRings; i++) {
        slots.push((startMins + i * stepMins) % 1440);
      }
      return {
        modeLabel: `${safeHrs}H · ${safeRings}X (EVERY ${stepMins}M)`,
        totalHoursLabel: `${safeHrs} HRS`,
        ringsCount: safeRings,
        slotsMinutesOfDay: slots,
        previewTimes: slots.map(formatMinutesToHHMM),
      };
    }

    if (alarmType === 'interval') {
      const safeMins = Math.max(1, Number(intervalMinutes) || 30);
      const nowDate = new Date(nowMs);
      const startMins = nowDate.getHours() * 60 + nowDate.getMinutes();
      const firstSlot = (startMins + safeMins) % 1440;
      const slots = repeat
        ? [1, 2, 3, 4, 5, 6].map((i) => (startMins + i * safeMins) % 1440)
        : [firstSlot];
      return {
        modeLabel: repeat ? `EVERY ${safeMins}M` : `IN ${safeMins}M`,
        totalHoursLabel: `${+(safeMins / 60).toFixed(1)} HR`,
        ringsCount: slots.length,
        slotsMinutesOfDay: slots,
        previewTimes: slots.map(formatMinutesToHHMM),
      };
    }

    const targetMins = parseTimeToMinutes(clockTime, 18 * 60);
    return {
      modeLabel: `AT ${formatMinutesTo12Hr(targetMins)}`,
      totalHoursLabel: repeat ? 'DAILY' : 'ONCE',
      ringsCount: 1,
      slotsMinutesOfDay: [targetMins],
      previewTimes: [formatMinutesToHHMM(targetMins)],
    };
  }, [
    alarmType,
    windowStartTime,
    windowEndTime,
    intervalMinutes,
    tripHours,
    tripTotalRings,
    clockTime,
    repeat,
    nowMs,
  ]);

  const handleQuickTimeframePreset = (
    presetTitle: string,
    presetCategory: 'water' | 'reading' | 'task' | 'custom',
    startStr: string,
    endStr: string,
    everyMins: number
  ) => {
    unlockMobileAudioAndWake();
    const targetTimestamp = computeTimeframeNextTimestamp(startStr, endStr, everyMins);
    const newAlarm: MiniAlarm = {
      id: 'alarm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: presetTitle,
      category: presetCategory,
      type: 'timeframe',
      windowStartTime: startStr,
      windowEndTime: endStr,
      intervalMinutes: everyMins,
      repeat: true,
      enabled: true,
      targetTimestamp,
      linkedHabitId: null,
      linkedTaskId: null,
      linkedTaskTitle: null,
      createdAt: Date.now(),
    };
    onUpdateAlarms([newAlarm, ...alarms]);
  };

  const handleQuickTripPreset = (
    presetTitle: string,
    hrs: number,
    rings: number
  ) => {
    unlockMobileAudioAndWake();
    const stepMins = Math.max(1, Math.round((hrs * 60) / rings));
    const newAlarm: MiniAlarm = {
      id: 'alarm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: presetTitle,
      category: 'custom',
      type: 'trip_repeat',
      intervalMinutes: stepMins,
      tripHours: hrs,
      tripTotalRings: rings,
      tripCompletedRings: 0,
      repeat: true,
      enabled: true,
      targetTimestamp: Date.now() + stepMins * 60 * 1000,
      linkedHabitId: null,
      linkedTaskId: null,
      linkedTaskTitle: null,
      createdAt: Date.now(),
    };
    onUpdateAlarms([newAlarm, ...alarms]);
  };

  const handleCreateAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    unlockMobileAudioAndWake();

    let linkedHabitId: string | null = null;
    let linkedTaskId: string | null = null;
    let linkedTaskTitle: string | null = null;

    if (linkedSelection.startsWith('habit:')) {
      const hId = linkedSelection.replace('habit:', '');
      const found = habits.find((h) => h.id === hId);
      if (found) {
        linkedHabitId = found.id;
        linkedTaskTitle = found.title;
      }
    } else if (linkedSelection.startsWith('task:')) {
      const tId = linkedSelection.replace('task:', '');
      const found = tasks.find((t) => t.id === tId);
      if (found) {
        linkedTaskId = found.id;
        linkedTaskTitle = found.title;
      }
    }

    const safeHrs = Math.max(1, Math.min(48, Number(tripHours) || 6));
    const safeRings = Math.max(1, Math.min(48, Number(tripTotalRings) || 6));
    const computedStepMins =
      alarmType === 'trip_repeat'
        ? Math.max(1, Math.round((safeHrs * 60) / safeRings))
        : Math.max(1, Math.min(720, Number(intervalMinutes) || 60));

    const finalTitle =
      title.trim() ||
      (linkedTaskTitle
        ? linkedTaskTitle
        : alarmType === 'timeframe'
        ? `Schedule (${windowStartTime}–${windowEndTime})`
        : alarmType === 'trip_repeat'
        ? `${safeHrs}H (${safeRings}x)`
        : 'Alarm');

    let targetTimestamp: number;
    if (alarmType === 'timeframe') {
      targetTimestamp = computeTimeframeNextTimestamp(
        windowStartTime,
        windowEndTime,
        computedStepMins
      );
    } else if (alarmType === 'trip_repeat') {
      targetTimestamp = Date.now() + computedStepMins * 60 * 1000;
    } else if (alarmType === 'interval') {
      targetTimestamp = Date.now() + computedStepMins * 60 * 1000;
    } else {
      targetTimestamp = computeClockTargetTimestamp(clockTime);
    }

    const newAlarm: MiniAlarm = {
      id: 'alarm_' + Date.now(),
      title: finalTitle,
      category: linkedHabitId || linkedTaskId ? 'task' : category,
      type: alarmType,
      intervalMinutes: computedStepMins,
      clockTime: alarmType === 'clock' ? clockTime : undefined,
      windowStartTime: alarmType === 'timeframe' ? windowStartTime : undefined,
      windowEndTime: alarmType === 'timeframe' ? windowEndTime : undefined,
      tripHours: alarmType === 'trip_repeat' ? safeHrs : undefined,
      tripTotalRings: alarmType === 'trip_repeat' ? safeRings : undefined,
      tripCompletedRings: alarmType === 'trip_repeat' ? 0 : undefined,
      repeat: alarmType === 'timeframe' || alarmType === 'trip_repeat' ? true : repeat,
      enabled: true,
      targetTimestamp,
      linkedHabitId,
      linkedTaskId,
      linkedTaskTitle,
      createdAt: Date.now(),
    };

    onUpdateAlarms([newAlarm, ...alarms]);
    setTitle('');
    setLinkedSelection('none');
    setIsAdding(false);
  };

  const handleToggleAlarm = (alarm: MiniAlarm) => {
    unlockMobileAudioAndWake();
    const nextEnabled = !alarm.enabled;
    let nextTarget: number | null = null;

    if (nextEnabled) {
      if (alarm.type === 'timeframe') {
        nextTarget = computeTimeframeNextTimestamp(
          alarm.windowStartTime || '09:00',
          alarm.windowEndTime || '21:00',
          alarm.intervalMinutes || 60
        );
      } else if (alarm.type === 'trip_repeat') {
        nextTarget = Date.now() + Math.max(1, alarm.intervalMinutes || 60) * 60 * 1000;
      } else if (alarm.type === 'interval') {
        nextTarget = Date.now() + Math.max(1, alarm.intervalMinutes || 30) * 60 * 1000;
      } else {
        nextTarget = computeClockTargetTimestamp(alarm.clockTime || '18:00');
      }
    }

    const updated = alarms.map((a) =>
      a.id === alarm.id
        ? {
            ...a,
            enabled: nextEnabled,
            tripCompletedRings: nextEnabled && a.type === 'trip_repeat' ? 0 : a.tripCompletedRings,
            targetTimestamp: nextTarget,
          }
        : a
    );
    onUpdateAlarms(updated);
  };

  const handleRestartAlarm = (alarm: MiniAlarm) => {
    unlockMobileAudioAndWake();
    let nextTarget: number;
    if (alarm.type === 'timeframe') {
      nextTarget = computeTimeframeNextTimestamp(
        alarm.windowStartTime || '09:00',
        alarm.windowEndTime || '21:00',
        alarm.intervalMinutes || 60
      );
    } else if (alarm.type === 'clock') {
      nextTarget = computeClockTargetTimestamp(alarm.clockTime || '18:00');
    } else {
      nextTarget = Date.now() + Math.max(1, alarm.intervalMinutes || 30) * 60 * 1000;
    }

    const updated = alarms.map((a) =>
      a.id === alarm.id
        ? {
            ...a,
            enabled: true,
            tripCompletedRings: a.type === 'trip_repeat' ? 0 : a.tripCompletedRings,
            targetTimestamp: nextTarget,
          }
        : a
    );
    onUpdateAlarms(updated);
  };

  const handleDeleteAlarm = (alarmId: string) => {
    onDismissRinging(alarmId);
    onUpdateAlarms(alarms.filter((a) => a.id !== alarmId));
  };

  const formatRemaining = (targetTimestamp: number | null) => {
    if (!targetTimestamp || !Number.isFinite(targetTimestamp)) return '--:--';
    const diffSecs = Math.max(0, Math.round((targetTimestamp - nowMs) / 1000));
    const hrs = Math.floor(diffSecs / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);
    const secs = diffSecs % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatNextClockLabel = (targetTimestamp: number | null) => {
    if (!targetTimestamp || !Number.isFinite(targetTimestamp)) return '';
    const d = new Date(targetTimestamp);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const activeCount = alarms.filter((a) => a.enabled).length;
  const cycleState = ringingAlarms.length > 0 ? cleanAudio.getAlarmCycleState() : null;

  const getClockPoint = (minsOfDay: number, radius: number, cx = 64, cy = 64) => {
    const angleDeg = (minsOfDay / 1440) * 360 - 90;
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  return (
    <section
      id="mini-alarm-section"
      className="w-full max-w-4xl mx-auto font-pixel-heading"
    >
      {/* Centered "STOP" Notification Modal */}
      {ringingAlarms.length > 0 &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 pointer-events-auto">
            <div className="w-full max-w-xs space-y-3">
              {ringingAlarms.map((ringing) => (
                <div
                  key={ringing.id}
                  className="bg-[#0e0f13] border-2 border-[#ff3b00] text-white p-5 shadow-[0_0_40px_rgba(255,59,0,0.4)] text-center space-y-3.5"
                >
                  <div className="w-11 h-11 mx-auto bg-[#ff3b00] text-black flex items-center justify-center border-2 border-[#ff6a00] animate-bounce">
                    <BellRing size={22} />
                  </div>

                  <div className="space-y-1">
                    <div className="text-[7.5px] font-pixel-label text-[#ff3b00] uppercase tracking-widest">
                      {cycleState && !cycleState.isRingingMinute
                        ? `PAUSED (${cycleState.secondsRemainingInPhase}S)`
                        : `ALARM (${cycleState?.secondsRemainingInPhase ?? 60}S)`}
                    </div>
                    <div className="text-sm font-bold text-white uppercase tracking-wide break-words">
                      {ringing.title}
                    </div>
                    {ringing.linkedTaskTitle && (
                      <div className="text-[8px] font-pixel-label text-[#39d353] uppercase">
                        {ringing.linkedTaskTitle}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onDismissRinging(ringing.id)}
                      className="w-full pixel-btn-orange py-2.5 px-4 text-xs font-bold uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Square size={13} fill="currentColor" />
                      <span>STOP</span>
                    </button>

                    {(ringing.linkedHabitId || ringing.linkedTaskId) && onCompleteLinkedItem && (
                      <button
                        type="button"
                        onClick={() => onCompleteLinkedItem(ringing)}
                        className="w-full bg-[#39d353] hover:bg-[#45e360] text-black font-bold py-2 px-3 text-[7.5px] cursor-pointer flex items-center justify-center gap-1.5 uppercase border border-[#45e360]"
                      >
                        <Check size={11} />
                        <span>DONE & STOP</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}

      {/* Compact Alarm Panel */}
      <div className="bg-[#0e0f13] border-2 border-[#23242c] p-2.5 sm:p-3 shadow-lg space-y-2">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-5 h-5 flex items-center justify-center border ${
                activeCount > 0
                  ? 'bg-[#ff3b00]/15 border-[#ff3b00] text-[#ff3b00]'
                  : 'bg-[#17181f] border-[#2f303c] text-zinc-400'
              }`}
            >
              <Bell size={11} />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-[9px] sm:text-[10px] font-bold text-zinc-100 uppercase tracking-wider">
                ALARMS
              </h3>
              <span className="text-[7px] font-pixel-label text-[#39d353]">
                {activeCount} ACTIVE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() =>
                handleQuickTimeframePreset('Hourly (9AM–9PM)', 'custom', '09:00', '21:00', 60)
              }
              className="bg-[#17181f] hover:bg-[#22242e] text-zinc-300 hover:text-white border border-[#2f303c] px-2 py-1 text-[7px] font-pixel-label flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CalendarClock size={9} className="text-[#ff3b00]" />
              <span>+9AM–9PM (1H)</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickTripPreset('6H Session (6x)', 6, 6)}
              className="bg-[#17181f] hover:bg-[#22242e] text-zinc-300 hover:text-white border border-[#2f303c] px-2 py-1 text-[7px] font-pixel-label flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Repeat size={9} className="text-[#39d353]" />
              <span>+6H (6X)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickTimeframePreset('Water', 'water', '09:00', '21:00', 60)
              }
              className="bg-[#17181f] hover:bg-[#22242e] text-zinc-300 hover:text-white border border-[#2f303c] px-2 py-1 text-[7px] font-pixel-label flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Droplets size={9} className="text-[#ff3b00]" />
              <span>+WATER</span>
            </button>

            <button
              type="button"
              onClick={() => {
                unlockMobileAudioAndWake();
                cleanAudio.playBeepAlarm(soundVolume);
              }}
              className="bg-[#17181f] hover:bg-[#22242e] text-zinc-300 hover:text-[#ff3b00] border border-[#2f303c] px-2 py-1 text-[7px] font-pixel-label flex items-center gap-1 cursor-pointer transition-colors"
              title="Test Sound"
            >
              <Volume2 size={9} className="text-[#ff3b00]" />
              <span>TEST</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="pixel-btn-orange px-2 py-1 text-[7.5px] flex items-center gap-1 cursor-pointer"
            >
              {isAdding ? <X size={10} /> : <Plus size={10} />}
              <span>{isAdding ? 'CLOSE' : 'NEW'}</span>
            </button>
          </div>
        </div>

        {/* Clean Setup Form */}
        {isAdding && (
          <form
            onSubmit={handleCreateAlarm}
            className="bg-[#0b0c10] border border-[#ff3b00] p-2.5 space-y-2.5"
          >
            {/* Mode Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              {[
                { id: 'timeframe', label: 'TIME WINDOW', icon: CalendarClock },
                { id: 'trip_repeat', label: 'HOURS / REPEATS', icon: Repeat },
                { id: 'interval', label: 'TIMER', icon: Timer },
                { id: 'clock', label: 'CLOCK', icon: Clock },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = alarmType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAlarmType(tab.id as AlarmType)}
                    className={`py-1.5 px-2 text-[7px] border cursor-pointer flex items-center justify-center gap-1 transition-colors ${
                      active
                        ? 'bg-[#ff3b00] text-black border-[#ff5500] font-bold'
                        : 'bg-[#14151f] text-zinc-400 border-[#23242c] hover:text-white'
                    }`}
                  >
                    <Icon size={10} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center bg-[#14151f] border border-[#23242c] p-2.5">
              {/* Left Controls */}
              <div className="md:col-span-8 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[6.5px] text-zinc-400 font-pixel-label block mb-1">
                      LABEL
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Alarm label..."
                      className="w-full bg-[#0e0f13] border border-[#2f303c] focus:border-[#ff3b00] text-white px-2 py-1 text-[8px] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[6.5px] text-zinc-400 font-pixel-label block mb-1 flex items-center gap-1">
                      <Link2 size={9} className="text-[#39d353]" /> LINK TASK
                    </label>
                    <select
                      value={linkedSelection}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLinkedSelection(val);
                        if (val.startsWith('habit:')) {
                          const h = habits.find((item) => item.id === val.replace('habit:', ''));
                          if (h && !title.trim()) setTitle(h.title);
                        } else if (val.startsWith('task:')) {
                          const t = tasks.find((item) => item.id === val.replace('task:', ''));
                          if (t && !title.trim()) setTitle(t.title);
                        }
                      }}
                      className="w-full bg-[#0e0f13] border border-[#2f303c] focus:border-[#39d353] text-white px-2 py-1 text-[8px] font-pixel-label focus:outline-none"
                    >
                      <option value="none">None (Standalone)</option>
                      {habits.length > 0 && (
                        <optgroup label="Habits">
                          {habits.map((h, idx) => (
                            <option key={h.id} value={`habit:${h.id}`}>
                              #{idx + 1} {h.title}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {tasks.length > 0 && (
                        <optgroup label="Tasks">
                          {tasks.map((t) => (
                            <option key={t.id} value={`task:${t.id}`}>
                              {t.title}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                </div>

                {/* 1. TIME WINDOW */}
                {alarmType === 'timeframe' && (
                  <div className="bg-[#0e0f13] border border-[#23242c] p-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[6.5px] text-zinc-400 font-pixel-label block mb-1">
                          FROM
                        </label>
                        <input
                          type="time"
                          value={windowStartTime}
                          onChange={(e) => setWindowStartTime(e.target.value)}
                          className="w-full bg-[#14151f] border border-[#2f303c] focus:border-[#ff3b00] text-white px-2 py-1 text-[8px]"
                        />
                      </div>
                      <div>
                        <label className="text-[6.5px] text-zinc-400 font-pixel-label block mb-1">
                          TO
                        </label>
                        <input
                          type="time"
                          value={windowEndTime}
                          onChange={(e) => setWindowEndTime(e.target.value)}
                          className="w-full bg-[#14151f] border border-[#2f303c] focus:border-[#ff3b00] text-white px-2 py-1 text-[8px]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[6.5px] text-zinc-400 font-pixel-label">EVERY:</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {[
                          { label: '30M', m: 30 },
                          { label: '1H', m: 60 },
                          { label: '2H', m: 120 },
                          { label: '3H', m: 180 },
                          { label: '4H', m: 240 },
                        ].map((opt) => (
                          <button
                            key={opt.m}
                            type="button"
                            onClick={() => setIntervalMinutes(opt.m)}
                            className={`px-2 py-0.5 text-[7px] border cursor-pointer ${
                              intervalMinutes === opt.m
                                ? 'bg-[#39d353] text-black border-[#45e360] font-bold'
                                : 'bg-[#14151f] text-zinc-300 border-[#23242c]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                        <input
                          type="number"
                          min="5"
                          max="720"
                          value={intervalMinutes}
                          onChange={(e) =>
                            setIntervalMinutes(Math.max(5, parseInt(e.target.value) || 60))
                          }
                          className="w-11 bg-[#14151f] border border-[#2f303c] text-white px-1 py-0.5 text-[7px] text-center"
                        />
                        <span className="text-[6px] font-pixel-label text-zinc-500">MIN</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. HOURS / REPEATS */}
                {alarmType === 'trip_repeat' && (
                  <div className="bg-[#0e0f13] border border-[#23242c] p-2 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[6.5px] text-zinc-400 font-pixel-label block mb-1">
                          DURATION (HOURS)
                        </label>
                        <div className="flex items-center gap-1 flex-wrap">
                          {[2, 4, 6, 8, 12].map((h) => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => setTripHours(h)}
                              className={`px-1.5 py-0.5 text-[7px] border cursor-pointer ${
                                tripHours === h
                                  ? 'bg-[#ff3b00] text-black border-[#ff5500] font-bold'
                                  : 'bg-[#14151f] text-zinc-300 border-[#23242c]'
                              }`}
                            >
                              {h}H
                            </button>
                          ))}
                          <input
                            type="number"
                            min="1"
                            max="48"
                            value={tripHours}
                            onChange={(e) => setTripHours(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-10 bg-[#14151f] border border-[#2f303c] text-white px-1 py-0.5 text-[7px] text-center"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[6.5px] text-zinc-400 font-pixel-label block mb-1">
                          REPEATS (COUNT)
                        </label>
                        <div className="flex items-center gap-1 flex-wrap">
                          {[2, 3, 4, 6, 8, 12].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setTripTotalRings(r)}
                              className={`px-1.5 py-0.5 text-[7px] border cursor-pointer ${
                                tripTotalRings === r
                                  ? 'bg-[#39d353] text-black border-[#45e360] font-bold'
                                  : 'bg-[#14151f] text-zinc-300 border-[#23242c]'
                              }`}
                            >
                              {r}X
                            </button>
                          ))}
                          <input
                            type="number"
                            min="1"
                            max="48"
                            value={tripTotalRings}
                            onChange={(e) =>
                              setTripTotalRings(Math.max(1, parseInt(e.target.value) || 1))
                            }
                            className="w-10 bg-[#14151f] border border-[#2f303c] text-white px-1 py-0.5 text-[7px] text-center"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. TIMER */}
                {alarmType === 'interval' && (
                  <div className="bg-[#0e0f13] border border-[#23242c] p-2 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1 flex-wrap">
                      {[10, 15, 30, 45, 60, 90, 120].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setIntervalMinutes(m)}
                          className={`px-1.5 py-0.5 text-[7px] border cursor-pointer ${
                            intervalMinutes === m
                              ? 'bg-[#39d353] text-black border-[#45e360] font-bold'
                              : 'bg-[#14151f] text-zinc-300 border-[#23242c]'
                          }`}
                        >
                          {m >= 60 && m % 60 === 0 ? `${m / 60}H` : `${m}M`}
                        </button>
                      ))}
                      <input
                        type="number"
                        min="1"
                        max="720"
                        value={intervalMinutes}
                        onChange={(e) =>
                          setIntervalMinutes(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-12 bg-[#14151f] border border-[#2f303c] text-white px-1 py-0.5 text-[7px] text-center"
                      />
                      <span className="text-[6.5px] font-pixel-label text-zinc-400">MIN</span>
                    </div>

                    <label className="flex items-center gap-1 text-[7px] font-pixel-label text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={repeat}
                        onChange={(e) => setRepeat(e.target.checked)}
                        className="accent-[#ff3b00]"
                      />
                      <span>REPEAT</span>
                    </label>
                  </div>
                )}

                {/* 4. CLOCK */}
                {alarmType === 'clock' && (
                  <div className="bg-[#0e0f13] border border-[#23242c] p-2 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[6.5px] text-zinc-400 font-pixel-label">TIME:</span>
                      <input
                        type="time"
                        value={clockTime}
                        onChange={(e) => setClockTime(e.target.value)}
                        className="bg-[#14151f] border border-[#ff3b00] text-white px-2.5 py-1 text-[8px]"
                      />
                    </div>
                    <label className="flex items-center gap-1 text-[7px] font-pixel-label text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={repeat}
                        onChange={(e) => setRepeat(e.target.checked)}
                        className="accent-[#ff3b00]"
                      />
                      <span>DAILY</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Right Compact 24-Hr Clock Dial */}
              <div className="md:col-span-4 bg-[#0e0f13] border border-[#23242c] p-2 flex flex-col items-center justify-center gap-1.5">
                <svg width="128" height="128" viewBox="0 0 128 128" className="overflow-visible">
                  <circle
                    cx="64"
                    cy="64"
                    r="48"
                    fill="#14151f"
                    stroke="#23242c"
                    strokeWidth="2.5"
                  />

                  {Array.from({ length: 24 }).map((_, hr) => {
                    const p1 = getClockPoint(hr * 60, 43);
                    const p2 = getClockPoint(hr * 60, 48);
                    const isMajor = hr % 6 === 0;
                    return (
                      <line
                        key={hr}
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={isMajor ? '#a1a1aa' : '#3f3f46'}
                        strokeWidth={isMajor ? '2' : '1'}
                      />
                    );
                  })}

                  <text x="64" y="11" textAnchor="middle" fill="#a1a1aa" fontSize="6.5" fontFamily="monospace">
                    00
                  </text>
                  <text x="120" y="66" textAnchor="middle" fill="#a1a1aa" fontSize="6.5" fontFamily="monospace">
                    06
                  </text>
                  <text x="64" y="122" textAnchor="middle" fill="#a1a1aa" fontSize="6.5" fontFamily="monospace">
                    12
                  </text>
                  <text x="8" y="66" textAnchor="middle" fill="#a1a1aa" fontSize="6.5" fontFamily="monospace">
                    18
                  </text>

                  {schedulePreview.slotsMinutesOfDay.map((slotMins, idx) => {
                    const pt = getClockPoint(slotMins, 37);
                    const isFirst = idx === 0;
                    return (
                      <g key={`${slotMins}-${idx}`}>
                        <line
                          x1="64"
                          y1="64"
                          x2={pt.x}
                          y2={pt.y}
                          stroke={isFirst ? '#ff3b00' : '#39d353'}
                          strokeWidth="1"
                          strokeOpacity="0.35"
                        />
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isFirst ? '3.5' : '2.5'}
                          fill={isFirst ? '#ff3b00' : '#39d353'}
                          stroke="#0e0f13"
                          strokeWidth="1"
                        />
                      </g>
                    );
                  })}

                  <circle cx="64" cy="64" r="21" fill="#0e0f13" stroke="#2f303c" strokeWidth="1.5" />
                  <text
                    x="64"
                    y="62"
                    textAnchor="middle"
                    fill="#ff3b00"
                    fontSize="7.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {schedulePreview.ringsCount}X
                  </text>
                  <text
                    x="64"
                    y="71"
                    textAnchor="middle"
                    fill="#39d353"
                    fontSize="6"
                    fontFamily="monospace"
                  >
                    {schedulePreview.totalHoursLabel}
                  </text>
                </svg>

                <div className="text-[6.5px] font-pixel-label text-[#ff3b00] truncate max-w-full">
                  {schedulePreview.modeLabel}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1 bg-[#14151f] text-zinc-400 hover:text-white border border-[#23242c] text-[7px] cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="pixel-btn-orange px-3 py-1 text-[7.5px] cursor-pointer flex items-center gap-1 uppercase"
              >
                <Check size={10} />
                <span>SAVE</span>
              </button>
            </div>
          </form>
        )}

        {/* Alarms List */}
        {alarms.length === 0 ? (
          <div className="text-center py-2 border border-dashed border-[#23242c] text-zinc-500 text-[7px] font-pixel-label">
            NO ALARMS SET
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {alarms.map((alarm) => {
              const isRinging = ringingAlarms.some((r) => r.id === alarm.id);
              const linkedHabit = alarm.linkedHabitId
                ? habits.find((h) => h.id === alarm.linkedHabitId)
                : null;
              const linkedTask = alarm.linkedTaskId
                ? tasks.find((t) => t.id === alarm.linkedTaskId)
                : null;
              const displayTaskTitle =
                linkedHabit?.title || linkedTask?.title || alarm.linkedTaskTitle;

              const scheduleBadge =
                alarm.type === 'timeframe'
                  ? `${alarm.windowStartTime || '09:00'}–${alarm.windowEndTime || '21:00'} · ${
                      alarm.intervalMinutes >= 60 && alarm.intervalMinutes % 60 === 0
                        ? `${alarm.intervalMinutes / 60}H`
                        : `${alarm.intervalMinutes}M`
                    }`
                  : alarm.type === 'trip_repeat'
                  ? `${alarm.tripHours || 6}H (${alarm.tripCompletedRings || 0}/${
                      alarm.tripTotalRings || 6
                    })`
                  : alarm.type === 'interval'
                  ? `EVERY ${alarm.intervalMinutes}M`
                  : `${alarm.clockTime}`;

              const nextClockStr = alarm.enabled ? formatNextClockLabel(alarm.targetTimestamp) : '';

              return (
                <div
                  key={alarm.id}
                  className={`px-2.5 py-1.5 border flex items-center justify-between gap-2 transition-colors ${
                    isRinging
                      ? 'bg-[#1a1110] border-[#ff3b00]'
                      : alarm.enabled
                      ? 'bg-[#14151f] border-[#2f303c]'
                      : 'bg-[#0b0c10] border-[#1c1d24] opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleAlarm(alarm)}
                      className={`px-1.5 py-1 text-[6.5px] font-pixel-heading border cursor-pointer flex items-center gap-1 shrink-0 ${
                        alarm.enabled
                          ? 'bg-[#ff3b00] text-black border-[#ff5500] font-bold'
                          : 'bg-[#17181f] text-zinc-400 border-[#2f303c] hover:text-white'
                      }`}
                    >
                      {alarm.enabled ? <Square size={8} /> : <Play size={8} />}
                      <span>{alarm.enabled ? 'ON' : 'OFF'}</span>
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="text-[8px] font-bold truncate text-zinc-100">
                        {alarm.title}
                      </div>
                      <div className="flex items-center gap-1 text-[6.5px] font-pixel-label text-zinc-400 truncate">
                        <span className="text-[#ff3b00]">{scheduleBadge}</span>
                        {nextClockStr && (
                          <>
                            <span>·</span>
                            <span className="text-zinc-300">{nextClockStr}</span>
                          </>
                        )}
                        {displayTaskTitle && (
                          <>
                            <span>·</span>
                            <span className="text-[#39d353] truncate">{displayTaskTitle}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-pixel-digital tracking-wider ${
                        isRinging
                          ? 'text-[#ff3b00] animate-pulse font-bold'
                          : alarm.enabled
                          ? 'text-[#39d353]'
                          : 'text-zinc-600'
                      }`}
                    >
                      {isRinging
                        ? 'RINGING'
                        : alarm.enabled
                        ? formatRemaining(alarm.targetTimestamp)
                        : 'OFF'}
                    </span>

                    {alarm.enabled && (
                      <button
                        type="button"
                        onClick={() => handleRestartAlarm(alarm)}
                        className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                        title="Reset"
                      >
                        <RotateCcw size={10} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteAlarm(alarm.id)}
                      className="p-1 text-zinc-500 hover:text-[#ff3b00] transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
