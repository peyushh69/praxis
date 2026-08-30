import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Minimize2,
  Target,
  RotateCcw,
  SkipForward,
  Plus,
  Minus
} from 'lucide-react';
import { TimerMode, AppSettings, TaskItem } from '../types';

interface RetroConsoleFocusProps {
  isOpen: boolean;
  onClose: () => void;
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
  todayMinutes?: number;
  currentStreak?: number;
}

export const RetroConsoleFocus: React.FC<RetroConsoleFocusProps> = ({
  isOpen,
  onClose,
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
  currentStreak = 0,
}) => {
  const [dpadActiveDir, setDpadActiveDir] = useState<string | null>(null);
  const [redBtnPressed, setRedBtnPressed] = useState(false);

  // Keyboard shortcut support in Fullscreen console
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (isRunning) onPause();
        else onStart();
      } else if (e.key === 'r' || e.key === 'R') {
        onReset();
      } else if (e.key === '+') {
        onAddFiveMinutes();
      } else if (e.key === '-') {
        if (onSubtractFiveMinutes) onSubtractFiveMinutes();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRunning, onStart, onPause, onReset, onAddFiveMinutes, onSubtractFiveMinutes, onClose]);

  if (!isOpen) return null;

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const showHours = totalTime >= 3600 || timeLeft >= 3600;
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  const progressPercent = Math.min(100, Math.max(0, ((totalTime - timeLeft) / totalTime) * 100));

  const handleDpad = (direction: 'up' | 'down' | 'left' | 'right') => {
    setDpadActiveDir(direction);
    setTimeout(() => setDpadActiveDir(null), 150);

    if (direction === 'up') {
      onAddFiveMinutes();
    } else if (direction === 'down') {
      if (onSubtractFiveMinutes) onSubtractFiveMinutes();
      else onReset();
    } else if (direction === 'left') {
      onReset();
    } else if (direction === 'right') {
      onSkip();
    }
  };

  const handleRedButton = () => {
    setRedBtnPressed(true);
    setTimeout(() => setRedBtnPressed(false), 150);
    if (isRunning) onPause();
    else onStart();
  };

  const handleVolumeCycle = () => {
    if (!settings.soundEnabled) {
      onUpdateSettings({ soundEnabled: true, soundVolume: 0.5 });
    } else if (settings.soundVolume <= 0.5) {
      onUpdateSettings({ soundVolume: 1.0 });
    } else {
      onUpdateSettings({ soundEnabled: false });
    }
  };

  return (
    <div
      id="retro-console-overlay"
      className="fixed inset-0 z-50 bg-[#050608]/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-3 md:p-4 select-none overflow-y-auto"
    >
      {/* Top Floating Control Bar */}
      <div className="fixed top-2 left-2 right-2 sm:top-4 sm:left-6 sm:right-6 flex items-center justify-between z-50 pointer-events-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#0e1017]/90 border border-[#24283b] px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-lg backdrop-blur-md rounded-xs">
          <span className="w-2 h-2 rounded-full bg-[#ff3b00] animate-pulse" />
          <span className="text-[8px] sm:text-[9px] font-pixel-heading text-zinc-200 tracking-wider">
            FOCUS CONSOLE
          </span>
        </div>

        {/* Audio Toggle & Exit Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`p-1.5 sm:p-2 border transition-colors cursor-pointer bg-[#0e1017]/90 rounded-xs ${
              settings.soundEnabled ? 'border-[#ff3b00] text-[#ff3b00]' : 'border-[#24283b] text-zinc-500'
            }`}
            title="Toggle Audio Feedback"
          >
            {settings.soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>

          {/* Exit Fullscreen Console */}
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 bg-[#ff3b00] hover:bg-[#ff5500] text-black border border-[#ff5500] transition-colors cursor-pointer flex items-center gap-1.5 shadow-md rounded-xs"
            title="Exit Fullscreen (ESC)"
          >
            <Minimize2 size={13} />
            <span className="text-[8px] sm:text-[9px] font-pixel-heading font-bold hidden sm:inline">EXIT</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          THE RETRO HARDWARE GAMING CONSOLE CHASSIS - FULLY CENTERED & VIEWPORT FIT
          ========================================================================= */}
      <div className="relative w-full max-w-[340px] sm:max-w-[370px] md:max-w-[380px] my-auto pt-7 sm:pt-6 select-none flex flex-col items-center justify-center">
        
        {/* Outer Translucent Cyber Chassis with Mechanical Bevels & Screws */}
        <div className="w-full relative rounded-[26px] sm:rounded-[30px] p-3.5 sm:p-4 bg-gradient-to-b from-[#d9dbe3]/95 via-[#cbced9]/90 to-[#b5b8c7]/95 border-[2.5px] border-[#eff1f8] shadow-[0_20px_50px_rgba(0,0,0,0.95),inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-4px_8px_rgba(0,0,0,0.25)] overflow-hidden">
          
          {/* Subtle Screws at 4 Chassis Corners */}
          <div className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-[#8c909e] border border-[#a8acb9] flex items-center justify-center shadow-inner opacity-75">
            <div className="w-1 h-0.5 bg-[#545763]" />
          </div>
          <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#8c909e] border border-[#a8acb9] flex items-center justify-center shadow-inner opacity-75">
            <div className="w-1 h-0.5 bg-[#545763] rotate-45" />
          </div>
          <div className="absolute bottom-2.5 left-2.5 w-2 h-2 rounded-full bg-[#8c909e] border border-[#a8acb9] flex items-center justify-center shadow-inner opacity-75">
            <div className="w-1 h-0.5 bg-[#545763] -rotate-45" />
          </div>
          <div className="absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full bg-[#8c909e] border border-[#a8acb9] flex items-center justify-center shadow-inner opacity-75">
            <div className="w-1 h-0.5 bg-[#545763] rotate-90" />
          </div>

          {/* Top Grip Latches */}
          <div className="absolute top-10 -left-1 w-1.5 h-10 bg-[#14151b] rounded-r-md border-r border-[#3a3d4f] shadow-md" />
          <div className="absolute top-10 -right-1 w-1.5 h-10 bg-[#14151b] rounded-l-md border-l border-[#3a3d4f] shadow-md" />

          {/* =========================================================================
              1. TOP CRT PIXEL DISPLAY SCREEN
              ========================================================================= */}
          <div className="relative rounded-[18px] sm:rounded-[20px] p-2 bg-gradient-to-b from-[#2a2c38] to-[#161720] border-[2px] border-[#3f4357] shadow-[inset_0_4px_10px_rgba(0,0,0,0.8)]">
            
            {/* The Vivid Red/Orange Pixel CRT Screen */}
            <div className="relative rounded-[14px] bg-gradient-to-br from-[#ff3823] via-[#ea2b16] to-[#cf1d0a] p-3 sm:p-3.5 text-black shadow-[inset_0_0_20px_rgba(0,0,0,0.4),0_0_15px_rgba(234,43,22,0.4)] overflow-hidden flex flex-col justify-between min-h-[175px] sm:min-h-[190px]">
              
              {/* Retro CRT Scanline Overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-15"
                style={{
                  backgroundImage: 'linear-gradient(rgba(0,0,0,0.3) 50%, transparent 50%)',
                  backgroundSize: '100% 4px',
                }}
              />

              {/* Screen Top Status Bar */}
              <div className="relative z-10 flex items-center justify-between text-[7.5px] sm:text-[8px] font-pixel-heading font-black tracking-wider border-b border-black/25 pb-1">
                <div className="flex items-center gap-1.5">
                  <span className="uppercase">
                    {mode === 'focus' ? 'FOCUS INTERVAL' : mode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="bg-black text-[#ff3823] px-1.5 py-0.5 text-[7px]">
                    {isRunning ? 'RUNNING' : 'PAUSED'}
                  </span>
                  <span className="font-mono text-[7.5px] font-bold">
                    [{(completedCycles % 4) + 1}/4]
                  </span>
                </div>
              </div>

              {/* Big Centered Pixel Countdown Display */}
              <div className="relative z-10 my-2 text-center flex flex-col items-center justify-center">
                <div className="font-pixel-heading font-extrabold text-black leading-none drop-shadow-[0_2px_0_rgba(255,255,255,0.2)] tracking-tighter tabular-nums text-4xl sm:text-[46px] md:text-[50px]">
                  {showHours
                    ? `${formattedHours}:${formattedMinutes}:${formattedSeconds}`
                    : `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${formattedSeconds}`}
                </div>

                {/* Active Task Name if present */}
                {activeTask ? (
                  <div className="mt-1.5 bg-black/85 text-[#ff8e3c] px-2 py-0.5 rounded-xs text-[7.5px] font-pixel-label font-bold truncate max-w-[220px] flex items-center gap-1 border border-black">
                    <Target size={9} className="text-[#ff3823] shrink-0" />
                    <span className="truncate">{activeTask.title}</span>
                  </div>
                ) : (
                  <div className="mt-1 text-[7px] font-pixel-label font-bold opacity-75 uppercase tracking-wider">
                    PRAXIS DEEP WORK ENGINE
                  </div>
                )}
              </div>

              {/* Segmented Pixel Progress Bar */}
              <div className="relative z-10 w-full bg-black/40 p-0.5 border border-black/30 rounded-xs">
                <div className="flex gap-0.5 h-1.5 sm:h-2">
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const filled = progressPercent >= (idx / 24) * 100;
                    return (
                      <div
                        key={idx}
                        className={`flex-1 h-full transition-colors ${
                          filled ? 'bg-black shadow-xs' : 'bg-black/20'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Bottom Telemetry Text */}
              <div className="relative z-10 pt-1.5 border-t border-black/25 flex items-center justify-between text-[6.5px] sm:text-[7px] font-pixel-label font-bold text-black/90">
                <span className="tracking-tight">00010 --% &amp; FOCUS // DEEP WORK // PRAXIS</span>
                <span className="font-mono uppercase">STREAK: {currentStreak}D</span>
              </div>
            </div>

            {/* Sub-Bezel Micro Text */}
            <div className="pt-1 px-1.5 flex items-center justify-between text-[6px] sm:text-[6.5px] font-pixel-heading text-zinc-400 uppercase tracking-wider">
              <span>GAME ON. LEVEL UP &gt;&gt; PRAXIS</span>
              <span>VER 4.2 CONSOLE</span>
            </div>
          </div>

          {/* =========================================================================
              2. HARDWARE CONTROLS SECTION
              ========================================================================= */}
          <div className="relative mt-2.5 rounded-[18px] sm:rounded-[20px] bg-gradient-to-b from-[#e3e6f0]/80 to-[#cbced9]/80 border border-[#f5f7fc] p-2.5 sm:p-3 shadow-inner">
            
            {/* Top Row: Dial Knob for Audio Control + Quick Mode Indicators */}
            <div className="flex items-center justify-between px-1 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[6.5px] sm:text-[7px] font-pixel-heading font-black text-zinc-700 uppercase">
                  AUDIO LEVEL
                </span>
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${settings.soundEnabled ? 'bg-[#ff3823]' : 'bg-zinc-400'}`} />
                  <span className="text-[6px] sm:text-[6.5px] font-pixel-label text-zinc-600 font-bold">
                    {settings.soundEnabled ? `${Math.round(settings.soundVolume * 100)}%` : 'MUTED'}
                  </span>
                </div>
              </div>

              {/* Tactile Rotary Dial Knob (Click to cycle volume) */}
              <button
                onClick={handleVolumeCycle}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-b from-[#2d303d] to-[#0e1017] border-[2px] border-[#454859] p-0.5 shadow-[0_2px_5px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all group shrink-0"
                title="Dial Knob (Click to cycle volume/mute)"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#1b1c24] to-[#0a0b0e] border border-[#333748] flex items-center justify-center shadow-inner">
                  <div className={`w-2 h-2 rounded-full transition-transform ${settings.soundEnabled ? 'bg-[#ff3823] shadow-[0_0_5px_#ff3823]' : 'bg-zinc-600'}`} />
                </div>
              </button>
            </div>

            {/* Lower Controls Row: Plus D-PAD on Left + Distinct Action Pills on Right */}
            <div className="flex items-center justify-between px-0.5 sm:px-1">
              
              {/* Left Side: Tactile Plus D-PAD with 4 Distinct Operational Buttons */}
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20 sm:w-22 sm:h-22 flex items-center justify-center">
                  {/* D-Pad Base Circle Shadow */}
                  <div className="absolute inset-0 rounded-full bg-[#b2b6c7]/60 shadow-inner" />

                  {/* The Cross Button */}
                  <div className="relative w-18 h-18 sm:w-19 sm:h-19">
                    {/* Up: +5 MIN */}
                    <button
                      onClick={() => handleDpad('up')}
                      className={`absolute top-0 left-6 sm:left-6.5 w-6 sm:w-6.5 h-6 sm:h-6.5 rounded-t-md bg-gradient-to-b from-[#2d2f3b] to-[#14151b] border-t border-x border-[#4b4f63] shadow-[0_2px_4px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center cursor-pointer active:brightness-125 transition-all ${
                        dpadActiveDir === 'up' ? 'scale-95 bg-[#ff3823]' : ''
                      }`}
                      title="Add 5 Minutes (+5M)"
                    >
                      <Plus size={8} className="text-[#39d353]" />
                      <span className="text-[5px] font-bold text-zinc-300 -mt-0.5">+5M</span>
                    </button>

                    {/* Down: -5 MIN */}
                    <button
                      onClick={() => handleDpad('down')}
                      className={`absolute bottom-0 left-6 sm:left-6.5 w-6 sm:w-6.5 h-6 sm:h-6.5 rounded-b-md bg-gradient-to-t from-[#2d2f3b] to-[#14151b] border-b border-x border-[#4b4f63] shadow-[0_2px_4px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center cursor-pointer active:brightness-125 transition-all ${
                        dpadActiveDir === 'down' ? 'scale-95 bg-[#ff3823]' : ''
                      }`}
                      title="Subtract 5 Minutes (-5M)"
                    >
                      <Minus size={8} className="text-amber-400" />
                      <span className="text-[5px] font-bold text-zinc-300 -mt-0.5">-5M</span>
                    </button>

                    {/* Left: RESET */}
                    <button
                      onClick={() => handleDpad('left')}
                      className={`absolute left-0 top-6 sm:top-6.5 w-6 sm:w-6.5 h-6 sm:h-6.5 rounded-l-md bg-gradient-to-r from-[#2d2f3b] to-[#14151b] border-l border-y border-[#4b4f63] shadow-[0_2px_4px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center cursor-pointer active:brightness-125 transition-all ${
                        dpadActiveDir === 'left' ? 'scale-95 bg-[#ff3823]' : ''
                      }`}
                      title="Reset Timer"
                    >
                      <RotateCcw size={7.5} className="text-zinc-300" />
                      <span className="text-[4.5px] font-bold text-zinc-300">RST</span>
                    </button>

                    {/* Right: SKIP */}
                    <button
                      onClick={() => handleDpad('right')}
                      className={`absolute right-0 top-6 sm:top-6.5 w-6 sm:w-6.5 h-6 sm:h-6.5 rounded-r-md bg-gradient-to-l from-[#2d2f3b] to-[#14151b] border-r border-y border-[#4b4f63] shadow-[0_2px_4px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center cursor-pointer active:brightness-125 transition-all ${
                        dpadActiveDir === 'right' ? 'scale-95 bg-[#ff3823]' : ''
                      }`}
                      title="Skip to Next Session"
                    >
                      <SkipForward size={7.5} className="text-zinc-300" />
                      <span className="text-[4.5px] font-bold text-zinc-300">SKP</span>
                    </button>

                    {/* Center of Cross */}
                    <div className="absolute top-6 sm:top-6.5 left-6 sm:left-6.5 w-6 sm:w-6.5 h-6 sm:h-6.5 bg-[#1c1d25] border border-[#373a4b] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#ff3823]/60" />
                    </div>
                  </div>
                </div>
                <span className="text-[6px] font-pixel-heading text-zinc-600 font-bold mt-0.5">
                  D-PAD CONTROL
                </span>
              </div>

              {/* Center Decorative Divider */}
              <div className="flex flex-col items-center gap-1 opacity-50">
                <div className="w-1 h-1 rounded-full bg-zinc-700" />
                <div className="w-1 h-1 rounded-full bg-zinc-700" />
                <div className="w-1 h-1 rounded-full bg-zinc-700" />
              </div>

              {/* Right Side: 3 Distinct Dedicated Action Pill Buttons */}
              <div className="flex flex-col gap-1.5 shrink-0">
                {/* 1. START / PAUSE Pill Button */}
                <button
                  onClick={isRunning ? onPause : onStart}
                  className={`w-22 sm:w-24 h-6.5 rounded-full px-2 bg-gradient-to-b from-[#2b2d38] to-[#101117] border border-[#474a5e] shadow-[0_2px_5px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all ${
                    isRunning ? 'ring-2 ring-[#ff3823]' : 'hover:border-[#ff3823]'
                  }`}
                  title="Toggle Timer Start / Pause"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-[#ff3823] shadow-[0_0_5px_#ff3823]' : 'bg-[#39d353]'}`} />
                  <span className="text-[7px] sm:text-[7.5px] font-pixel-heading font-black text-white">
                    {isRunning ? 'PAUSE' : 'START'}
                  </span>
                </button>

                {/* 2. FOCUS MODE Pill Button */}
                <button
                  onClick={() => onSwitchMode('focus')}
                  className={`w-22 sm:w-24 h-5.5 rounded-full px-2 bg-gradient-to-b from-[#2b2d38] to-[#101117] border border-[#474a5e] shadow-[0_2px_5px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all ${
                    mode === 'focus' ? 'border-[#ff3823] bg-[#ff3823]/10 text-[#ff3823]' : 'text-zinc-300 hover:border-zinc-400'
                  }`}
                  title="Switch to Focus Mode"
                >
                  <span className="text-[6.5px] sm:text-[7px] font-pixel-heading font-bold">
                    FOCUS (25M)
                  </span>
                </button>

                {/* 3. BREAK MODE Pill Button */}
                <button
                  onClick={() => onSwitchMode('shortBreak')}
                  className={`w-22 sm:w-24 h-5.5 rounded-full px-2 bg-gradient-to-b from-[#2b2d38] to-[#101117] border border-[#474a5e] shadow-[0_2px_5px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all ${
                    mode === 'shortBreak' ? 'border-[#ff3823] bg-[#ff3823]/10 text-[#ff3823]' : 'text-zinc-300 hover:border-zinc-400'
                  }`}
                  title="Switch to Break Mode"
                >
                  <span className="text-[6.5px] sm:text-[7px] font-pixel-heading font-bold">
                    BREAK (5M)
                  </span>
                </button>
              </div>

            </div>

            {/* Bottom Primary Trigger Button */}
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#c6c9d7]">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRedButton}
                  className={`w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-md bg-gradient-to-b from-[#ff3823] to-[#b81708] border border-[#ff7060] shadow-[0_2px_5px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)] flex items-center justify-center cursor-pointer active:scale-90 transition-all ${
                    redBtnPressed ? 'scale-90 brightness-125' : ''
                  }`}
                  title="Quick Start / Pause Trigger"
                >
                  <span className="w-1.5 h-1.5 rounded-xs bg-white/80" />
                </button>
                <span className="text-[6px] sm:text-[6.5px] font-pixel-heading text-zinc-600 font-bold">
                  PRIMARY TRIGGER
                </span>
              </div>

              <div className="text-[6px] sm:text-[6.5px] font-pixel-label text-zinc-500 font-bold uppercase">
                SPACE: {isRunning ? 'PAUSE' : 'START'} • ESC: EXIT
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
