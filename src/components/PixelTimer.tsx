import React from 'react';
import { Play, Pause, RotateCcw, SkipForward, Plus, Volume2, VolumeX, CheckSquare, Maximize2 } from 'lucide-react';
import { TimerMode, AppSettings, TaskItem } from '../types';

interface PixelTimerProps {
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
  onOpenFullscreenConsole?: () => void;
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
  onOpenFullscreenConsole,
}) => {
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const showHours = totalTime >= 3600 || timeLeft >= 3600;
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  const currentDurationMins =
    mode === 'focus'
      ? settings.focusDuration
      : mode === 'shortBreak'
      ? settings.shortBreakDuration
      : settings.longBreakDuration;

  const targetHrs = Math.floor(currentDurationMins / 60);
  const targetRemMins = currentDurationMins % 60;
  const targetDisplay =
    targetHrs > 0
      ? targetRemMins > 0
        ? `${targetHrs}H ${targetRemMins}M`
        : `${targetHrs} HR`
      : `${currentDurationMins} MIN`;

  const progressPercent = Math.min(100, Math.max(0, ((totalTime - timeLeft) / totalTime) * 100));

  return (
    <div className="w-full max-w-2xl mx-auto font-pixel-heading select-none">
      {/* Outer Gaming Console Chassis with Hardware Bevels, Corner Screws & Grips */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#1c1e28] via-[#12131b] to-[#090a0f] border-2 border-[#2e3244] shadow-[0_15px_35px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.15)] p-2 sm:p-3 overflow-hidden">
        
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
                className={`px-2.5 py-1 text-[8.5px] transition-all cursor-pointer rounded-xs ${
                  mode === 'focus'
                    ? 'bg-[#ff3b00] text-black font-black shadow-[0_0_8px_rgba(255,59,0,0.6)]'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                FOCUS
              </button>
              <button
                onClick={() => onSwitchMode('shortBreak')}
                className={`px-2.5 py-1 text-[8.5px] transition-all cursor-pointer rounded-xs ${
                  mode === 'shortBreak'
                    ? 'bg-[#ff3b00] text-black font-black shadow-[0_0_8px_rgba(255,59,0,0.6)]'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                SHORT
              </button>
              <button
                onClick={() => onSwitchMode('longBreak')}
                className={`px-2.5 py-1 text-[8.5px] transition-all cursor-pointer rounded-xs ${
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
              <div className="flex items-center gap-1.5 text-[8px] text-zinc-400 font-pixel-label">
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

              {/* Full Screen Button on Right Side */}
              {onOpenFullscreenConsole && (
                <button
                  onClick={onOpenFullscreenConsole}
                  className="px-2.5 py-1.5 bg-[#181a24] hover:bg-[#ff3b00] hover:text-black text-[#ff3b00] border border-[#ff3b00] text-[8.5px] font-pixel-heading font-bold flex items-center gap-1.5 cursor-pointer shadow-[0_0_8px_rgba(255,59,0,0.3)] hover:shadow-[0_0_12px_#ff3b00] transition-all uppercase rounded-xs"
                  title="Open Fullscreen Focus Mode"
                >
                  <Maximize2 size={12} className="shrink-0" />
                  <span>FULL SCREEN</span>
                </button>
              )}
            </div>
          </div>

          {/* Hero Display Panel (Inspired by reference UI neon orange header card) */}
          <div className="p-3 sm:p-5 bg-[#0b0c11]">
            <div className="pixel-box-orange px-3.5 py-4 sm:p-6 relative overflow-hidden rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,0.3)]">
              
              {/* Top Sub-Labels on Orange Card */}
              <div className="flex items-center justify-between text-[10px] font-pixel-label font-bold text-black border-b border-black/20 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 bg-black ${isRunning ? 'animate-ping' : ''}`} />
                  <span className="uppercase tracking-wider">
                    {mode === 'focus' ? 'FOCUS SESSION' : mode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-black text-[#ff3b00] px-2 py-0.5 text-[8px] font-pixel-heading font-black">
                    {isRunning ? 'RUNNING' : 'PAUSED'}
                  </span>
                  <span className="text-[7.5px] font-mono font-bold">
                    P-01
                  </span>
                </div>
              </div>

              {/* Big Pixel Countdown Numbers */}
              <div className="my-2 select-none flex items-center justify-center overflow-hidden">
                <div
                  className={`font-pixel-heading font-extrabold text-black leading-none drop-shadow-xs tabular-nums whitespace-nowrap text-center ${
                    showHours
                      ? 'text-[1.65rem] min-[360px]:text-[1.95rem] min-[420px]:text-4xl sm:text-5xl md:text-6xl tracking-tight'
                      : 'text-4xl min-[360px]:text-5xl sm:text-6xl md:text-7xl tracking-tight'
                  }`}
                >
                  {showHours
                    ? `${formattedHours}:${formattedMinutes}:${formattedSeconds}`
                    : `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${formattedSeconds}`}
                </div>
              </div>

              {/* Sub-Metrics Strip */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t-2 border-black/20 text-black">
                <div className="text-center">
                  <div className="text-[8px] font-pixel-label font-bold uppercase opacity-80">TARGET</div>
                  <div className="text-[10px] font-pixel-heading font-black mt-0.5">
                    {targetDisplay}
                  </div>
                </div>

                <div className="text-center border-x border-black/20">
                  <div className="text-[8px] font-pixel-label font-bold uppercase opacity-80">INTERVAL</div>
                  <div className="text-[10px] font-pixel-heading font-black mt-0.5">
                    {(completedCycles % 4) + 1}/4
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[8px] font-pixel-label font-bold uppercase opacity-80">PROGRESS</div>
                  <div className="text-[10px] font-pixel-heading font-black mt-0.5">
                    {Math.round(progressPercent)}%
                  </div>
                </div>
              </div>

            </div>

            {/* Active Task Link */}
            <div className="mt-2.5 p-2.5 bg-[#08090d] border border-[#1f222e] rounded-md flex items-center justify-between text-[9px] font-pixel-label">
              {activeTask ? (
                <div className="flex items-center gap-2 truncate text-zinc-300">
                  <CheckSquare size={13} className="text-[#ff3b00] shrink-0" />
                  <span className="text-zinc-500 uppercase text-[8px]">ACTIVE:</span>
                  <span className="text-[#ff3b00] font-bold truncate">{activeTask.title}</span>
                </div>
              ) : (
                <span className="text-zinc-500 text-[8px]">NO TASK SELECTED</span>
              )}
              {activeTask && (
                <span className="text-zinc-400 text-[8px] shrink-0 ml-2 font-pixel-heading">
                  [{activeTask.completedPomodoros}/{activeTask.estimatedPomodoros}]
                </span>
              )}
            </div>

            {/* Segmented Pixel Progress Bar */}
            <div className="mt-2.5">
              <div className="w-full bg-[#08090d] border border-[#222533] rounded-xs h-2.5 p-0.5 flex gap-0.5">
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

            {/* =========================================================================
                AUTHENTIC RETRO GAMING CONSOLE CONTROL DECK (ARCADE ACTION BUTTONS)
                ========================================================================= */}
            <div className="mt-4 p-3.5 sm:p-4 bg-gradient-to-b from-[#151722] via-[#0f1017] to-[#0a0b10] border border-[#282d3e] rounded-xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.05)]">
              
              {/* Arcade Action Buttons Deck */}
              <div className="flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
                
                {/* Primary START / PAUSE Button */}
                <button
                  onClick={isRunning ? onPause : onStart}
                  className={`px-6 py-3 rounded-full text-[11px] flex items-center gap-2 cursor-pointer font-pixel-heading font-black tracking-wider transition-all transform active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.6)] ${
                    isRunning
                      ? 'bg-gradient-to-b from-[#2a2c3a] to-[#12131a] border-2 border-[#ff3b00] text-[#ff3b00] shadow-[0_0_15px_rgba(255,59,0,0.4)]'
                      : 'bg-gradient-to-b from-[#ff5500] via-[#ff3b00] to-[#d62d00] border-2 border-[#ffa17a] text-black shadow-[0_0_18px_rgba(255,59,0,0.6)] hover:brightness-110'
                  }`}
                  title={isRunning ? 'Pause Timer' : 'Start Timer'}
                >
                  {isRunning ? (
                    <>
                      <Pause size={14} className="fill-current" />
                      <span>PAUSE</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} className="fill-current" />
                      <span>START</span>
                    </>
                  )}
                </button>

                {/* +5M Pill Button */}
                <button
                  onClick={onAddFiveMinutes}
                  className="bg-gradient-to-b from-[#252836] to-[#12131c] hover:from-[#323648] hover:to-[#1c1d29] border-2 border-[#3d4257] hover:border-[#ff3b00] text-zinc-200 hover:text-white px-4 py-2.5 rounded-full text-[10px] font-pixel-heading flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md"
                  title="Add 5 Minutes (+5M)"
                >
                  <Plus size={13} className="text-[#ff3b00]" />
                  <span>5 MIN</span>
                </button>

                {/* RESET Pill Button */}
                <button
                  onClick={onReset}
                  className="bg-gradient-to-b from-[#20222e] to-[#0f1017] hover:from-[#2a2d3d] hover:to-[#161722] border-2 border-[#333748] hover:border-zinc-300 text-zinc-300 hover:text-white px-4 py-2.5 rounded-full text-[10px] font-pixel-heading flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md"
                  title="Reset Timer"
                >
                  <RotateCcw size={12} />
                  <span>RESET</span>
                </button>

                {/* SKIP Pill Button */}
                <button
                  onClick={onSkip}
                  className="bg-gradient-to-b from-[#20222e] to-[#0f1017] hover:from-[#2a2d3d] hover:to-[#161722] border-2 border-[#333748] hover:border-zinc-300 text-zinc-300 hover:text-white px-4 py-2.5 rounded-full text-[10px] font-pixel-heading flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md"
                  title="Skip Session"
                >
                  <SkipForward size={12} />
                  <span>SKIP</span>
                </button>
              </div>

              {/* Console Deck Footer Bar */}
              <div className="mt-3 pt-2 border-t border-[#1d202d] flex items-center justify-between text-[7px] font-pixel-label text-zinc-500 font-bold">
                <span className="uppercase tracking-wider">PRAXIS CONSOLE HARDWARE INTERFACE</span>
                <span className="font-mono text-zinc-400">STATUS: {isRunning ? 'ACTIVE LOOP' : 'STANDBY'}</span>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

