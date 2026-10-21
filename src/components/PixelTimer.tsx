import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Plus,
  Volume2,
  VolumeX,
  CheckSquare,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { TimerMode, AppSettings, TaskItem } from '../types';
import { wakeLockManager } from '../utils/timerService';

export interface PixelTimerProps {
  mode: TimerMode;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
  onAddFiveMinutes: () => void;
  onSubtractFiveMinutes?: () => void;
  onSwitchMode: (newMode: TimerMode) => void;
  completedCycles: number;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  activeTask?: TaskItem | null;
}

export const PixelTimer: React.FC<PixelTimerProps> = ({
  mode,
  timeLeft,
  totalTime,
  isRunning,
  onStart,
  onPause,
  onReset,
  onSkip,
  onAddFiveMinutes,
  onSubtractFiveMinutes,
  onSwitchMode,
  completedCycles,
  settings,
  onUpdateSettings,
  activeTask,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aodActive, setAodActive] = useState(false);

  const currentDurationMins =
    mode === 'focus'
      ? settings.focusDuration || 25
      : mode === 'shortBreak'
      ? settings.shortBreakDuration || 5
      : settings.longBreakDuration || 15;

  const fallbackSeconds = Math.max(60, currentDurationMins * 60);
  const safeTotalTime =
    typeof totalTime === 'number' && Number.isFinite(totalTime) && totalTime > 0
      ? totalTime
      : fallbackSeconds;
  const safeTimeLeft =
    typeof timeLeft === 'number' && Number.isFinite(timeLeft) && timeLeft >= 0
      ? timeLeft
      : safeTotalTime;

  const hours = Math.floor(safeTimeLeft / 3600);
  const minutes = Math.floor((safeTimeLeft % 3600) / 60);
  const seconds = Math.floor(safeTimeLeft % 60);

  const showHours = safeTotalTime >= 3600 || safeTimeLeft >= 3600;
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  const targetHrs = Math.floor(currentDurationMins / 60);
  const targetRemMins = currentDurationMins % 60;
  const targetDisplay =
    targetHrs > 0
      ? targetRemMins > 0
        ? `${targetHrs}H ${targetRemMins}M`
        : `${targetHrs} HR`
      : `${currentDurationMins} MIN`;

  const rawProgress = ((safeTotalTime - safeTimeLeft) / safeTotalTime) * 100;
  const progressPercent = Number.isFinite(rawProgress)
    ? Math.min(100, Math.max(0, rawProgress))
    : 0;

  // Toggle Fullscreen & Always On Display
  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      // Synchronously acquire wake lock & unlock video/audio inside user tap gesture
      wakeLockManager.setFullscreenActive(true);
      wakeLockManager.acquireFromUserGesture();
      setIsFullscreen(true);
      setAodActive(true);
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch {
        // Fallback to CSS fullscreen overlay if blocked by sandbox
      }
    } else {
      wakeLockManager.setFullscreenActive(false);
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
        }
      } catch {
        // Ignore
      }
      if (!isRunning) {
        setAodActive(false);
      }
    }
  };

  // Keep screen awake whenever fullscreen is active or timer is running
  useEffect(() => {
    wakeLockManager.setFullscreenActive(isFullscreen);
    wakeLockManager.setTimerActive(isRunning);
    setAodActive(isFullscreen || isRunning);
  }, [isFullscreen, isRunning]);

  // Lock background page scrolling when fullscreen overlay is open
  useEffect(() => {
    if (isFullscreen) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [isFullscreen]);

  // Synchronize fullscreenchange and keyboard shortcuts
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFs = Boolean(document.fullscreenElement);
      if (!isNativeFs && isFullscreen) {
        wakeLockManager.setFullscreenActive(false);
        setIsFullscreen(false);
        if (!isRunning) {
          setAodActive(false);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key exits fullscreen
      if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        wakeLockManager.setFullscreenActive(false);
        setIsFullscreen(false);
        if (!isRunning) {
          setAodActive(false);
        }
      }
      // F key toggles fullscreen if not typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if ((e.key === 'f' || e.key === 'F') && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        toggleFullscreen();
      }
      // Space key starts/pauses in fullscreen
      if (isFullscreen && e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        if (isRunning) {
          onPause();
        } else {
          onStart();
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, isRunning, onStart, onPause]);

  // The Timer Box Inner Component
  const timerChassis = (
    <div
      className={`relative rounded-2xl bg-gradient-to-b from-[#1c1e28] via-[#12131b] to-[#090a0f] border-2 border-[#2e3244] shadow-[0_15px_40px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.15)] overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'p-3 sm:p-5' : 'p-2 sm:p-3'
      }`}
    >
      {/* Subtle Hardware Corner Screws */}
      <div className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-[#3d4256] border border-[#5a6078] flex items-center justify-center opacity-70">
        <div className="w-1 h-px bg-[#1a1c24]" />
      </div>
      <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#3d4256] border border-[#5a6078] flex items-center justify-center opacity-70">
        <div className="w-1 h-px bg-[#1a1c24] rotate-90" />
      </div>
      <div className="absolute bottom-2.5 left-2.5 w-2 h-2 rounded-full bg-[#3d4256] border border-[#5a6078] flex items-center justify-center opacity-70">
        <div className="w-1 h-px bg-[#1a1c24] rotate-45" />
      </div>
      <div className="absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full bg-[#3d4256] border border-[#5a6078] flex items-center justify-center opacity-70">
        <div className="w-1 h-px bg-[#1a1c24] -rotate-45" />
      </div>

      {/* Inner Console Screen & Control Casing */}
      <div className="bg-[#0b0c11] border border-[#222533] rounded-xl overflow-hidden shadow-inner">
        {/* Mode Navigation & Top Info Strip */}
        <div className="bg-[#141620] px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[#232736] flex flex-wrap items-center justify-between gap-2">
          {/* Left Corner: Mode Selector Buttons */}
          <div className="flex items-center gap-1 bg-[#090a0f] p-1 border border-[#262a3a] rounded-xs">
            <button
              onClick={() => onSwitchMode('focus')}
              className={`px-2.5 py-1 text-[8.5px] sm:text-[9.5px] transition-all cursor-pointer rounded-xs ${
                mode === 'focus'
                  ? 'bg-[#ff3b00] text-black font-black shadow-[0_0_8px_rgba(255,59,0,0.6)]'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              FOCUS
            </button>
            <button
              onClick={() => onSwitchMode('shortBreak')}
              className={`px-2.5 py-1 text-[8.5px] sm:text-[9.5px] transition-all cursor-pointer rounded-xs ${
                mode === 'shortBreak'
                  ? 'bg-[#ff3b00] text-black font-black shadow-[0_0_8px_rgba(255,59,0,0.6)]'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              SHORT
            </button>
            <button
              onClick={() => onSwitchMode('longBreak')}
              className={`px-2.5 py-1 text-[8.5px] sm:text-[9.5px] transition-all cursor-pointer rounded-xs ${
                mode === 'longBreak'
                  ? 'bg-[#ff3b00] text-black font-black shadow-[0_0_8px_rgba(255,59,0,0.6)]'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              LONG
            </button>
          </div>

          {/* Right Corner: Cycle Indicator, Sound Toggle & Full Screen Button */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Cycle Count Indicator */}
            <div className="flex items-center gap-1.5 text-[8px] sm:text-[9px] text-zinc-400 font-pixel-label">
              <span className="text-zinc-500">CYCLE:</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((idx) => {
                  const filled = (completedCycles % 4) > idx || (completedCycles > 0 && completedCycles % 4 === 0);
                  return (
                    <div
                      key={idx}
                      className={`w-2.5 h-2.5 border rounded-xs ${
                        filled
                          ? 'bg-[#ff3b00] border-[#ff5500] shadow-[0_0_6px_rgba(255,59,0,0.6)]'
                          : 'bg-[#181920] border-[#313340]'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`p-1.5 border rounded-xs transition-all cursor-pointer ${
                settings.soundEnabled
                  ? 'bg-[#1e202b] border-[#ff3b00] text-[#ff3b00]'
                  : 'bg-[#101116] border-[#292b36] text-zinc-600 hover:text-zinc-400'
              }`}
              title={settings.soundEnabled ? '8-Bit Sound On' : 'Muted'}
            >
              {settings.soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>

            {/* Fullscreen Toggle Button */}
            <button
              onClick={toggleFullscreen}
              className={`p-1.5 border rounded-xs transition-all cursor-pointer flex items-center gap-1 font-pixel-label text-[8px] ${
                isFullscreen
                  ? 'bg-[#ff3b00] border-[#ff3b00] text-black font-bold shadow-[0_0_10px_rgba(255,59,0,0.6)]'
                  : 'bg-[#101116] hover:bg-[#1e202b] border-[#292b36] hover:border-[#ff3b00] text-zinc-400 hover:text-[#ff3b00]'
              }`}
              title={isFullscreen ? 'Exit Full Screen (Esc / F)' : 'Enter Full Screen (F)'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span className="hidden min-[400px]:inline">
                {isFullscreen ? 'EXIT' : 'FULLSCREEN'}
              </span>
            </button>
          </div>
        </div>

        {/* Hero Display Panel (Neon Orange Header Card) */}
        <div className={`bg-[#0b0c11] ${isFullscreen ? 'p-3.5 sm:p-6' : 'p-3 sm:p-5'}`}>
          <div className="pixel-box-orange w-full relative overflow-hidden rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,0.3)] flex flex-col px-3.5 py-4 sm:p-6 justify-center">
            {/* Top Sub-Labels on Orange Card */}
            <div className="flex items-center justify-between font-pixel-label font-bold text-black border-b border-black/20 pb-2 sm:pb-3 mb-2 sm:mb-3 w-full text-[10px] sm:text-xs">
              <div className="flex items-center gap-2">
                <span className="uppercase tracking-wider">
                  {mode === 'focus' ? 'FOCUS SESSION' : mode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-black text-[#ff3b00] font-pixel-heading font-black px-2 py-0.5 text-[8px] sm:text-[9px]">
                  {isRunning ? 'RUNNING' : 'PAUSED'}
                </span>
                <span className="font-mono font-bold text-[7.5px] sm:text-[8.5px]">
                  P-01
                </span>
              </div>
            </div>

            {/* Big Pixel Countdown Numbers - Fluid Scaling for Mobile, Tablet & PC */}
            <div className="my-2 select-none flex-1 flex flex-col items-center justify-center w-full overflow-hidden">
              <div
                className={`font-pixel-heading font-extrabold text-black drop-shadow-xs tabular-nums whitespace-nowrap text-center tracking-tight leading-none py-2 transition-all ${
                  isFullscreen
                    ? showHours
                      ? 'text-3xl min-[360px]:text-4xl min-[480px]:text-5xl sm:text-6xl md:text-7xl lg:text-8xl'
                      : 'text-5xl min-[360px]:text-6xl min-[480px]:text-7xl sm:text-8xl md:text-9xl'
                    : showHours
                    ? 'text-[1.65rem] min-[360px]:text-[1.95rem] min-[420px]:text-4xl sm:text-5xl md:text-6xl'
                    : 'text-4xl min-[360px]:text-5xl sm:text-6xl md:text-7xl'
                }`}
              >
                {showHours
                  ? `${formattedHours}:${formattedMinutes}:${formattedSeconds}`
                  : `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${formattedSeconds}`}
              </div>
            </div>

            {/* Sub-Metrics Strip */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t-2 border-black/20 text-black w-full">
              <div className="text-center">
                <div className="font-pixel-label font-bold uppercase opacity-80 text-[8px] sm:text-[9px]">TARGET</div>
                <div className="font-pixel-heading font-black mt-0.5 text-[10px] sm:text-xs">
                  {targetDisplay}
                </div>
              </div>

              <div className="text-center border-x border-black/20">
                <div className="font-pixel-label font-bold uppercase opacity-80 text-[8px] sm:text-[9px]">INTERVAL</div>
                <div className="font-pixel-heading font-black mt-0.5 text-[10px] sm:text-xs">
                  {(completedCycles % 4) + 1}/4
                </div>
              </div>

              <div className="text-center">
                <div className="font-pixel-label font-bold uppercase opacity-80 text-[8px] sm:text-[9px]">PROGRESS</div>
                <div className="font-pixel-heading font-black mt-0.5 text-[10px] sm:text-xs">
                  {Math.round(progressPercent)}%
                </div>
              </div>
            </div>
          </div>

          {/* Active Task Link */}
          <div className="mt-2.5 p-2.5 bg-[#08090d] border border-[#1f222e] rounded-md flex items-center justify-between text-[9px] sm:text-[10px] font-pixel-label">
            {activeTask ? (
              <div className="flex items-center gap-2 truncate text-zinc-300">
                <CheckSquare size={13} className="text-[#ff3b00] shrink-0" />
                <span className="text-zinc-500 uppercase text-[8px] sm:text-[9px]">ACTIVE:</span>
                <span className="text-[#ff3b00] font-bold truncate">{activeTask.title}</span>
              </div>
            ) : (
              <span className="text-zinc-500 text-[8px] sm:text-[9px]">NO TASK SELECTED</span>
            )}
            {activeTask && (
              <span className="text-zinc-400 text-[8px] sm:text-[9px] shrink-0 ml-2 font-pixel-heading">
                [{activeTask.completedPomodoros}/{activeTask.estimatedPomodoros}]
              </span>
            )}
          </div>

          {/* Segmented Pixel Progress Bar */}
          <div className="mt-2.5">
            <div className="w-full bg-[#08090d] border border-[#222533] rounded-xs h-2.5 sm:h-3 p-0.5 flex gap-0.5">
              {Array.from({ length: 32 }).map((_, idx) => {
                const segmentVal = (idx / 32) * 100;
                const isFilled = progressPercent >= segmentVal;
                return (
                  <div
                    key={idx}
                    className={`flex-1 h-full transition-colors duration-100 ${
                      isFilled
                        ? 'bg-[#ff3b00] shadow-[0_0_3px_#ff3b00]'
                        : 'bg-[#14161f]'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Arcade Action Buttons Deck */}
          <div className={`bg-gradient-to-b from-[#151722] via-[#0f1017] to-[#0a0b10] border border-[#282d3e] rounded-xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.05)] ${
            isFullscreen ? 'mt-4 sm:mt-6 p-4 sm:p-5' : 'mt-4 p-3.5 sm:p-4'
          }`}>
            <div className="flex items-center justify-center flex-wrap gap-2.5 sm:gap-3">
              {/* Primary START / PAUSE Button */}
              <button
                onClick={isRunning ? onPause : onStart}
                className={`rounded-full flex items-center gap-2 cursor-pointer font-pixel-heading font-black tracking-wider transition-all transform active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.6)] ${
                  isFullscreen
                    ? 'px-7 sm:px-9 py-3 sm:py-3.5 text-xs sm:text-sm'
                    : 'px-6 py-3 text-[11px]'
                } ${
                  isRunning
                    ? 'bg-gradient-to-b from-[#2a2c3a] to-[#12131a] border-2 border-[#ff3b00] text-[#ff3b00] shadow-[0_0_15px_rgba(255,59,0,0.4)]'
                    : 'bg-gradient-to-b from-[#ff5500] via-[#ff3b00] to-[#d62d00] border-2 border-[#ffa17a] text-black shadow-[0_0_18px_rgba(255,59,0,0.6)] hover:brightness-110'
                }`}
                title={isRunning ? 'Pause Timer (Space)' : 'Start Timer (Space)'}
              >
                {isRunning ? (
                  <>
                    <Pause size={isFullscreen ? 16 : 14} className="fill-current" />
                    <span>PAUSE</span>
                  </>
                ) : (
                  <>
                    <Play size={isFullscreen ? 16 : 14} className="fill-current" />
                    <span>START</span>
                  </>
                )}
              </button>

              {/* +5M Pill Button */}
              <button
                onClick={onAddFiveMinutes}
                className={`bg-gradient-to-b from-[#252836] to-[#12131c] hover:from-[#323648] hover:to-[#1c1d29] border-2 border-[#3d4257] hover:border-[#ff3b00] text-zinc-200 hover:text-white rounded-full font-pixel-heading flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md ${
                  isFullscreen ? 'px-4 sm:px-5 py-2.5 sm:py-3 text-[11px]' : 'px-4 py-2.5 text-[10px]'
                }`}
                title="Add 5 Minutes (+5M)"
              >
                <Plus size={13} className="text-[#ff3b00]" />
                <span>5 MIN</span>
              </button>

              {/* RESET Pill Button */}
              <button
                onClick={onReset}
                className={`bg-gradient-to-b from-[#20222e] to-[#0f1017] hover:from-[#2a2d3d] hover:to-[#161722] border-2 border-[#333748] hover:border-zinc-300 text-zinc-300 hover:text-white rounded-full font-pixel-heading flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md ${
                  isFullscreen ? 'px-4 sm:px-5 py-2.5 sm:py-3 text-[11px]' : 'px-4 py-2.5 text-[10px]'
                }`}
                title="Reset Timer"
              >
                <RotateCcw size={12} />
                <span>RESET</span>
              </button>

              {/* SKIP Pill Button */}
              <button
                onClick={onSkip}
                className={`bg-gradient-to-b from-[#20222e] to-[#0f1017] hover:from-[#2a2d3d] hover:to-[#161722] border-2 border-[#333748] hover:border-zinc-300 text-zinc-300 hover:text-white rounded-full font-pixel-heading flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md ${
                  isFullscreen ? 'px-4 sm:px-5 py-2.5 sm:py-3 text-[11px]' : 'px-4 py-2.5 text-[10px]'
                }`}
                title="Skip Session"
              >
                <SkipForward size={12} />
                <span>SKIP</span>
              </button>
            </div>

            {/* Console Deck Footer Bar */}
            <div className="mt-3 pt-2 border-t border-[#1d202d] flex flex-wrap items-center justify-between gap-2 text-[7.5px] sm:text-[8px] font-pixel-label text-zinc-500 font-bold">
              <div className="flex items-center gap-1.5 uppercase tracking-wider">
                <span
                  className={`w-2 h-2 rounded-full transition-all ${
                    isRunning || isFullscreen
                      ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
                      : 'bg-zinc-700'
                  }`}
                />
                <span className={isRunning || isFullscreen ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}>
                  {aodActive || isFullscreen
                    ? 'ALWAYS ON DISPLAY: SCREEN KEPT AWAKE'
                    : isRunning
                    ? 'BACKGROUND CONTINUOUS RUN: ACTIVE'
                    : 'BACKGROUND SYNC: READY'}
                </span>
              </div>
              <span className="font-mono text-zinc-400">
                STATUS: {isRunning ? 'LOOP ACTIVE' : 'STANDBY'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const fullscreenOverlay = isFullscreen && typeof document !== 'undefined'
    ? createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100dvh',
            minHeight: '100vh',
            margin: 0,
            zIndex: 999999,
            backgroundColor: '#000000',
          }}
          className="bg-black text-white flex flex-col items-center justify-center px-6 sm:px-12 select-none overflow-hidden font-pixel-heading"
        >
          {/* Top-Right Subtle Exit Fullscreen Icon Button */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-5 right-5 sm:top-7 sm:right-7 w-10 h-10 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Exit Full Screen (Esc)"
            aria-label="Exit Full Screen"
          >
            <Minimize2 size={17} />
          </button>

          {/* Dead-Center Timer & Minimal Buttons */}
          <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto">
            {/* Responsive Centered Timer Display - Balanced & Never Overflows Phone Screen */}
            <div
              style={{
                fontSize: showHours
                  ? 'clamp(1.35rem, min(8vw, 15vh), 5.5rem)'
                  : 'clamp(2.25rem, min(12.5vw, 20vh), 8rem)',
              }}
              className="flex items-center justify-center font-pixel-heading font-black text-[#ff3b00] tabular-nums whitespace-nowrap text-center leading-none tracking-tight select-none drop-shadow-[0_0_24px_rgba(255,59,0,0.22)]"
            >
              {showHours && (
                <>
                  <span>{formattedHours}</span>
                  <span className="mx-[0.06em] text-[#ff3b00]/80 -translate-y-[0.04em]">:</span>
                </>
              )}
              <span>
                {showHours ? formattedMinutes : String(Math.floor(timeLeft / 60)).padStart(2, '0')}
              </span>
              <span
                className={`mx-[0.06em] text-[#ff3b00]/85 -translate-y-[0.04em] transition-opacity duration-300 ${
                  isRunning ? 'animate-pulse' : ''
                }`}
              >
                :
              </span>
              <span>{formattedSeconds}</span>
            </div>

            {/* Minimal Action Buttons: Start/Stop & Reset */}
            <div className="mt-9 sm:mt-12 flex items-center justify-center gap-3.5 sm:gap-5">
              <button
                onClick={() => {
                  wakeLockManager.acquireFromUserGesture();
                  if (isRunning) {
                    onPause();
                  } else {
                    wakeLockManager.setTimerActive(true);
                    onStart();
                  }
                }}
                className={`min-w-[128px] sm:min-w-[156px] h-11 sm:h-13 px-6 sm:px-8 rounded-full font-pixel-heading font-bold text-[11px] sm:text-xs tracking-wider flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-95 ${
                  isRunning
                    ? 'bg-zinc-950 border-2 border-[#ff3b00] text-[#ff3b00] shadow-[0_0_20px_rgba(255,59,0,0.2)]'
                    : 'bg-[#ff3b00] border-2 border-[#ff3b00] text-black shadow-[0_0_24px_rgba(255,59,0,0.35)] hover:brightness-110'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause size={15} className="fill-current shrink-0" />
                    <span>STOP</span>
                  </>
                ) : (
                  <>
                    <Play size={15} className="fill-current shrink-0" />
                    <span>START</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  wakeLockManager.acquireFromUserGesture();
                  onReset();
                }}
                className="min-w-[128px] sm:min-w-[156px] h-11 sm:h-13 px-6 sm:px-8 rounded-full bg-zinc-950 hover:bg-zinc-900 border-2 border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white font-pixel-heading font-bold text-[11px] sm:text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <RotateCcw size={14} className="shrink-0" />
                <span>RESET</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  // Regular In-Page View + Fullscreen Portal
  return (
    <div className="w-full max-w-2xl mx-auto font-pixel-heading select-none">
      {timerChassis}
      {fullscreenOverlay}
    </div>
  );
};

