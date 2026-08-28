import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Sparkles,
  CloudRain,
  Flame,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Tv,
  Music,
  Radio,
  Zap,
  Target,
  Clock
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
  todayMinutes = 0,
  currentStreak = 0,
}) => {
  // Ambient Sound generator (White noise / Lo-fi rain / Deep focus wave / Ticking)
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'whitenoise' | 'ticking'>('none');
  const [ambientVolume, setAmbientVolume] = useState(0.3);
  const [dpadActiveDir, setDpadActiveDir] = useState<string | null>(null);
  const [redBtnPressed, setRedBtnPressed] = useState(false);
  const audioNodesRef = useRef<{ ctx: AudioContext; source?: AudioNode; gain?: GainNode; interval?: number } | null>(null);

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
      } else if (e.key === 'f' || e.key === 'F') {
        // Toggle system fullscreen if desired
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRunning, onStart, onPause, onReset, onAddFiveMinutes, onClose]);

  // Ambient sound synthesizer
  useEffect(() => {
    if (!isOpen || ambientSound === 'none') {
      if (audioNodesRef.current) {
        if (audioNodesRef.current.interval) clearInterval(audioNodesRef.current.interval);
        audioNodesRef.current.ctx.close().catch(() => {});
        audioNodesRef.current = null;
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(ambientVolume, ctx.currentTime);
      masterGain.connect(ctx.destination);

      if (ambientSound === 'whitenoise') {
        // Pink / soft brown noise buffer
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
          b6 = white * 0.115926;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;
        whiteNoise.connect(masterGain);
        whiteNoise.start(0);
        audioNodesRef.current = { ctx, source: whiteNoise, gain: masterGain };
      } else if (ambientSound === 'rain') {
        // Rain effect with lowpass filter
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.05;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(masterGain);
        whiteNoise.start(0);
        audioNodesRef.current = { ctx, source: whiteNoise, gain: masterGain };
      } else if (ambientSound === 'ticking') {
        // Soft mechanical clock tick every second
        const tickInterval = window.setInterval(() => {
          if (ctx.state === 'running') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            gain.gain.setValueAtTime(ambientVolume * 0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.04);
          }
        }, 1000);
        audioNodesRef.current = { ctx, gain: masterGain, interval: tickInterval };
      }
    } catch {
      // Audio permission or unsupported
    }

    return () => {
      if (audioNodesRef.current) {
        if (audioNodesRef.current.interval) clearInterval(audioNodesRef.current.interval);
        audioNodesRef.current.ctx.close().catch(() => {});
        audioNodesRef.current = null;
      }
    };
  }, [ambientSound, ambientVolume, isOpen]);

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
      onSwitchMode('shortBreak');
    } else if (direction === 'right') {
      onSwitchMode('focus');
    }
  };

  const handleRedButton = () => {
    setRedBtnPressed(true);
    setTimeout(() => setRedBtnPressed(false), 150);
    if (isRunning) onPause();
    else onStart();
  };

  return (
    <div
      id="retro-console-overlay"
      className="fixed inset-0 z-50 bg-[#050608]/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto select-none"
    >
      {/* Top Floating Control Bar */}
      <div className="fixed top-3 left-3 right-3 sm:top-5 sm:left-6 sm:right-6 flex items-center justify-between z-50 pointer-events-auto">
        <div className="flex items-center gap-2 bg-[#0e1017]/90 border border-[#24283b] px-3 py-1.5 shadow-lg backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#ff3b00] animate-pulse" />
          <span className="text-[9px] font-pixel-heading text-zinc-200 tracking-wider">
            STUDY CONSOLE FOCUS MODE
          </span>
        </div>

        {/* Ambient Sound Selector & Exit Button */}
        <div className="flex items-center gap-2">
          {/* Ambient Noise Switcher */}
          <div className="flex items-center bg-[#0e1017]/90 border border-[#24283b] p-1 gap-1 shadow-lg backdrop-blur-md">
            <button
              onClick={() => setAmbientSound(ambientSound === 'rain' ? 'none' : 'rain')}
              className={`px-2 py-1 text-[8px] font-pixel-label flex items-center gap-1 cursor-pointer transition-colors ${
                ambientSound === 'rain'
                  ? 'bg-[#3b82f6] text-black font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Rain Sound"
            >
              <CloudRain size={10} />
              <span className="hidden sm:inline">RAIN</span>
            </button>

            <button
              onClick={() => setAmbientSound(ambientSound === 'whitenoise' ? 'none' : 'whitenoise')}
              className={`px-2 py-1 text-[8px] font-pixel-label flex items-center gap-1 cursor-pointer transition-colors ${
                ambientSound === 'whitenoise'
                  ? 'bg-[#10b981] text-black font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Focus White Noise"
            >
              <Radio size={10} />
              <span className="hidden sm:inline">NOISE</span>
            </button>

            <button
              onClick={() => setAmbientSound(ambientSound === 'ticking' ? 'none' : 'ticking')}
              className={`px-2 py-1 text-[8px] font-pixel-label flex items-center gap-1 cursor-pointer transition-colors ${
                ambientSound === 'ticking'
                  ? 'bg-amber-400 text-black font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Mechanical Clock Tick"
            >
              <Clock size={10} />
              <span className="hidden sm:inline">TICK</span>
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`p-2 border transition-colors cursor-pointer bg-[#0e1017]/90 ${
              settings.soundEnabled ? 'border-[#ff3b00] text-[#ff3b00]' : 'border-[#24283b] text-zinc-500'
            }`}
            title="Toggle 8-bit Audio"
          >
            {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Exit Fullscreen Console */}
          <button
            onClick={onClose}
            className="p-2 bg-[#ff3b00] hover:bg-[#ff5500] text-black border border-[#ff5500] transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
            title="Exit Fullscreen (ESC)"
          >
            <Minimize2 size={14} />
            <span className="text-[9px] font-pixel-heading font-bold hidden sm:inline">EXIT</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          THE RETRO HARDWARE GAMING CONSOLE (Directly Replicating Reference Photo)
          ========================================================================= */}
      <div className="relative w-full max-w-[370px] sm:max-w-[400px] my-auto mt-12 sm:mt-14 select-none">
        
        {/* Outer Translucent Cyber Chassis with Mechanical Bevels & Screws */}
        <div className="relative rounded-[32px] p-4 sm:p-5 bg-gradient-to-b from-[#d9dbe3]/95 via-[#cbced9]/90 to-[#b5b8c7]/95 border-[3px] border-[#eff1f8] shadow-[0_25px_60px_rgba(0,0,0,0.95),inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-4px_8px_rgba(0,0,0,0.25)] overflow-hidden">
          
          {/* Subtle Screws at 4 Chassis Corners */}
          <div className="absolute top-3 left-3 w-2.5 h-2.5 rounded-full bg-[#8c909e] border border-[#a8acb9] flex items-center justify-center shadow-inner opacity-75">
            <div className="w-1.5 h-0.5 bg-[#545763]" />
          </div>
          <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[#8c909e] border border-[#a8acb9] flex items-center justify-center shadow-inner opacity-75">
            <div className="w-1.5 h-0.5 bg-[#545763] rotate-45" />
          </div>
          <div className="absolute bottom-3 left-3 w-2.5 h-2.5 rounded-full bg-[#8c909e] border border-[#a8acb9] flex items-center justify-center shadow-inner opacity-75">
            <div className="w-1.5 h-0.5 bg-[#545763] -rotate-45" />
          </div>
          <div className="absolute bottom-3 right-3 w-2.5 h-2.5 rounded-full bg-[#8c909e] border border-[#a8acb9] flex items-center justify-center shadow-inner opacity-75">
            <div className="w-1.5 h-0.5 bg-[#545763] rotate-90" />
          </div>

          {/* Top Black Latches / Grip Modules (From Reference Image) */}
          <div className="absolute top-12 -left-1 w-2 h-14 bg-[#14151b] rounded-r-md border-r border-[#3a3d4f] shadow-md" />
          <div className="absolute top-12 -right-1 w-2 h-14 bg-[#14151b] rounded-l-md border-l border-[#3a3d4f] shadow-md" />

          {/* =========================================================================
              1. TOP CYBER SCREEN (Orange-Red Retro Pixel Display from image)
              ========================================================================= */}
          <div className="relative rounded-[22px] p-2 sm:p-2.5 bg-gradient-to-b from-[#2a2c38] to-[#161720] border-[2px] border-[#3f4357] shadow-[inset_0_4px_10px_rgba(0,0,0,0.8)]">
            
            {/* The Vivid Red/Orange Pixel CRT Screen */}
            <div className="relative rounded-[16px] bg-gradient-to-br from-[#ff3823] via-[#ea2b16] to-[#cf1d0a] p-3.5 sm:p-4 text-black shadow-[inset_0_0_25px_rgba(0,0,0,0.4),0_0_15px_rgba(234,43,22,0.4)] overflow-hidden flex flex-col justify-between min-h-[220px]">
              
              {/* Retro CRT Scanline Overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-15"
                style={{
                  backgroundImage: 'linear-gradient(rgba(0,0,0,0.3) 50%, transparent 50%)',
                  backgroundSize: '100% 4px',
                }}
              />

              {/* Screen Top Status Bar */}
              <div className="relative z-10 flex items-center justify-between text-[8px] font-pixel-heading font-black tracking-wider border-b border-black/25 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full bg-black ${isRunning ? 'animate-ping' : ''}`} />
                  <span className="uppercase">
                    {mode === 'focus' ? 'FOCUS INTERVAL' : mode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="bg-black text-[#ff3823] px-1.5 py-0.5 text-[7.5px]">
                    {isRunning ? 'RUNNING' : 'PAUSED'}
                  </span>
                  <span className="font-mono text-[8px] font-bold">
                    [{(completedCycles % 4) + 1}/4]
                  </span>
                </div>
              </div>

              {/* Big Centered Pixel Countdown Display */}
              <div className="relative z-10 my-3 text-center flex flex-col items-center justify-center">
                <div className="font-pixel-heading font-extrabold text-black leading-none drop-shadow-[0_2px_0_rgba(255,255,255,0.2)] tracking-tighter tabular-nums text-4xl sm:text-5xl md:text-[54px]">
                  {showHours
                    ? `${formattedHours}:${formattedMinutes}:${formattedSeconds}`
                    : `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${formattedSeconds}`}
                </div>

                {/* Active Task Name if present */}
                {activeTask ? (
                  <div className="mt-2 bg-black/85 text-[#ff8e3c] px-2.5 py-0.5 rounded-xs text-[8px] font-pixel-label font-bold truncate max-w-[240px] flex items-center gap-1 border border-black">
                    <Target size={10} className="text-[#ff3823] shrink-0" />
                    <span className="truncate">{activeTask.title}</span>
                  </div>
                ) : (
                  <div className="mt-1.5 text-[7.5px] font-pixel-label font-bold opacity-75 uppercase tracking-wider">
                    PRAXIS DEEP WORK ENGINE
                  </div>
                )}
              </div>

              {/* Segmented Pixel Progress Bar */}
              <div className="relative z-10 w-full bg-black/40 p-1 border border-black/30 rounded-xs">
                <div className="flex gap-0.5 h-2">
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

              {/* Bottom Telemetry Text (From reference image: 00010 --% & HELLO || LET'S GO / ____ || PLAY GAME) */}
              <div className="relative z-10 pt-2 border-t border-black/25 flex items-center justify-between text-[7px] font-pixel-label font-bold text-black/90">
                <span className="tracking-tight">00010 --% &amp; FOCUS // LET&apos;S GO // STUDY</span>
                <span className="font-mono uppercase">STREAK: {currentStreak}D</span>
              </div>
            </div>

            {/* Sub-Bezel Micro Text (From reference: GAME ON. LEVEL UP >> PRAXIS) */}
            <div className="pt-1 px-2 flex items-center justify-between text-[6.5px] font-pixel-heading text-zinc-400 uppercase tracking-wider">
              <span>GAME ON. LEVEL UP &gt;&gt; PRAXIS</span>
              <span>VER 4.2 CONSOLE</span>
            </div>
          </div>

          {/* =========================================================================
              2. TOP RED SLIDER BUTTONS (Just beneath the screen)
              ========================================================================= */}
          <div className="flex items-center justify-center gap-3 my-2.5">
            <button
              onClick={() => onSwitchMode(mode === 'focus' ? 'shortBreak' : 'focus')}
              className="px-3 py-0.5 rounded-sm bg-gradient-to-b from-[#ff3823] to-[#c71c0b] border border-[#ff6e5e] shadow-[0_2px_4px_rgba(0,0,0,0.4)] text-[7px] font-pixel-heading font-black text-black uppercase cursor-pointer hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
            >
              <Zap size={9} />
              <span>MODE: {mode === 'focus' ? 'FOCUS' : 'BREAK'}</span>
            </button>
            <button
              onClick={onAddFiveMinutes}
              className="px-3 py-0.5 rounded-sm bg-gradient-to-b from-[#ff3823] to-[#c71c0b] border border-[#ff6e5e] shadow-[0_2px_4px_rgba(0,0,0,0.4)] text-[7px] font-pixel-heading font-black text-black uppercase cursor-pointer hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
            >
              <span>+5 MIN</span>
            </button>
          </div>

          {/* =========================================================================
              3. MIDDLE / CONTROLS SECTION (Hardware Layout from Image)
              ========================================================================= */}
          <div className="relative rounded-[22px] bg-gradient-to-b from-[#e3e6f0]/80 to-[#cbced9]/80 border border-[#f5f7fc] p-3 shadow-inner">
            
            {/* Top Row of Controls: Black Pill Buttons + Apple White Badge + Lens Rotary Dial */}
            <div className="flex items-start justify-between gap-2">
              
              {/* Left Top: Dual Stacked Pill Buttons */}
              <div className="flex flex-col gap-1.5 shrink-0 pt-1">
                <button
                  onClick={() => onSwitchMode('focus')}
                  className={`w-9 h-6 rounded-md bg-gradient-to-b from-[#2b2d38] to-[#12131a] border border-[#4a4d60] shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
                    mode === 'focus' ? 'ring-2 ring-[#ff3823]' : ''
                  }`}
                  title="Focus Mode"
                >
                  <span className="text-[6.5px] font-pixel-heading font-bold text-zinc-200">FOC</span>
                </button>
                <button
                  onClick={() => onSwitchMode('shortBreak')}
                  className={`w-9 h-6 rounded-md bg-gradient-to-b from-[#2b2d38] to-[#12131a] border border-[#4a4d60] shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
                    mode === 'shortBreak' ? 'ring-2 ring-[#ff3823]' : ''
                  }`}
                  title="Break Mode"
                >
                  <span className="text-[6.5px] font-pixel-heading font-bold text-zinc-200">BRK</span>
                </button>
              </div>

              {/* Middle Top: Minimal Spacer */}
              <div className="flex-1" />

              {/* Right Top: Big Tactile Rotary Dial Knob (Camera lens style) */}
              <button
                onClick={() => {
                  onUpdateSettings({ soundVolume: settings.soundVolume >= 0.8 ? 0.3 : settings.soundVolume + 0.3 });
                }}
                className="w-14 h-14 rounded-full bg-gradient-to-b from-[#2d303d] to-[#0e1017] border-[3px] border-[#454859] p-1.5 shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.2)] flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all group shrink-0"
                title="Dial Knob (Click to adjust sound volume)"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#1b1c24] to-[#0a0b0e] border border-[#333748] flex items-center justify-center shadow-inner">
                  <div className="w-3 h-3 rounded-full bg-[#ff3823] shadow-[0_0_6px_#ff3823] group-hover:scale-110 transition-transform" />
                </div>
              </button>

            </div>

            {/* Lower Controls Row: Tactile Cross D-PAD on Left + Triple Action Pills on Right */}
            <div className="flex items-center justify-between mt-3 px-1">
              
              {/* Left Side: Tactile Game Cross D-PAD (PLUS SHAPED) */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                {/* D-Pad Base Circle Shadow */}
                <div className="absolute inset-0 rounded-full bg-[#b2b6c7]/60 shadow-inner" />

                {/* The Cross Button */}
                <div className="relative w-20 h-20">
                  {/* Up Button */}
                  <button
                    onClick={() => handleDpad('up')}
                    className={`absolute top-0 left-6.5 w-7 h-7 rounded-t-md bg-gradient-to-b from-[#2d2f3b] to-[#14151b] border-t border-x border-[#4b4f63] shadow-[0_3px_5px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-pointer active:brightness-125 transition-all ${
                      dpadActiveDir === 'up' ? 'scale-95 bg-[#ff3823]' : ''
                    }`}
                    title="Add 5 Minutes"
                  >
                    <span className="text-[7.5px] font-bold text-zinc-300">▲</span>
                  </button>

                  {/* Down Button */}
                  <button
                    onClick={() => handleDpad('down')}
                    className={`absolute bottom-0 left-6.5 w-7 h-7 rounded-b-md bg-gradient-to-t from-[#2d2f3b] to-[#14151b] border-b border-x border-[#4b4f63] shadow-[0_3px_5px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-pointer active:brightness-125 transition-all ${
                      dpadActiveDir === 'down' ? 'scale-95 bg-[#ff3823]' : ''
                    }`}
                    title="Reset / Adjust"
                  >
                    <span className="text-[7.5px] font-bold text-zinc-300">▼</span>
                  </button>

                  {/* Left Button */}
                  <button
                    onClick={() => handleDpad('left')}
                    className={`absolute left-0 top-6.5 w-7 h-7 rounded-l-md bg-gradient-to-r from-[#2d2f3b] to-[#14151b] border-l border-y border-[#4b4f63] shadow-[0_3px_5px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-pointer active:brightness-125 transition-all ${
                      dpadActiveDir === 'left' ? 'scale-95 bg-[#ff3823]' : ''
                    }`}
                    title="Short Break Mode"
                  >
                    <span className="text-[7.5px] font-bold text-zinc-300">◀</span>
                  </button>

                  {/* Right Button */}
                  <button
                    onClick={() => handleDpad('right')}
                    className={`absolute right-0 top-6.5 w-7 h-7 rounded-r-md bg-gradient-to-l from-[#2d2f3b] to-[#14151b] border-r border-y border-[#4b4f63] shadow-[0_3px_5px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-pointer active:brightness-125 transition-all ${
                      dpadActiveDir === 'right' ? 'scale-95 bg-[#ff3823]' : ''
                    }`}
                    title="Focus Mode"
                  >
                    <span className="text-[7.5px] font-bold text-zinc-300">▶</span>
                  </button>

                  {/* Center of Cross */}
                  <div className="absolute top-6.5 left-6.5 w-7 h-7 bg-[#1c1d25] border border-[#373a4b]" />
                </div>
              </div>

              {/* Center Vertical LED & Status Pins from image */}
              <div className="flex flex-col items-center gap-1 opacity-70">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              </div>

              {/* Right Side: Triple Stacked Action Pill Buttons (From photo: START/PAUSE, RESET, SKIP) */}
              <div className="flex flex-col gap-1.5 shrink-0">
                {/* START / PAUSE Pill Button */}
                <button
                  onClick={isRunning ? onPause : onStart}
                  className={`w-20 h-6 rounded-full px-2 bg-gradient-to-b from-[#2b2d38] to-[#101117] border border-[#474a5e] shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all ${
                    isRunning ? 'ring-2 ring-[#ff3823]' : 'hover:border-[#ff3823]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-[#ff3823] shadow-[0_0_6px_#ff3823]' : 'bg-[#39d353]'}`} />
                  <span className="text-[7px] font-pixel-heading font-black text-white">
                    {isRunning ? 'PAUSE' : 'START'}
                  </span>
                </button>

                {/* RESET Pill Button */}
                <button
                  onClick={onReset}
                  className="w-20 h-6 rounded-full px-2 bg-gradient-to-b from-[#2b2d38] to-[#101117] border border-[#474a5e] shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 hover:border-zinc-300 transition-all"
                >
                  <span className="text-[7px] font-pixel-heading font-bold text-zinc-300">
                    RESET
                  </span>
                </button>

                {/* SKIP Pill Button */}
                <button
                  onClick={onSkip}
                  className="w-20 h-6 rounded-full px-2 bg-gradient-to-b from-[#2b2d38] to-[#101117] border border-[#474a5e] shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 hover:border-zinc-300 transition-all"
                >
                  <span className="text-[7px] font-pixel-heading font-bold text-zinc-300">
                    SKIP
                  </span>
                </button>
              </div>

            </div>

            {/* Red Square Action Button (Bottom Left, like in image) */}
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#c6c9d7]">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRedButton}
                  className={`w-7 h-7 rounded-md bg-gradient-to-b from-[#ff3823] to-[#b81708] border border-[#ff7060] shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)] flex items-center justify-center cursor-pointer active:scale-90 transition-all ${
                    redBtnPressed ? 'scale-90 brightness-125' : ''
                  }`}
                  title="Primary Action Button"
                >
                  <span className="w-2 h-2 rounded-xs bg-white/80" />
                </button>
                <span className="text-[6.5px] font-pixel-heading text-zinc-600 font-bold">
                  PRIMARY ACT
                </span>
              </div>

              <div className="text-[6.5px] font-pixel-label text-zinc-500 font-bold uppercase">
                SPACE: {isRunning ? 'PAUSE' : 'START'} • ESC: EXIT
              </div>
            </div>

          </div>



        </div>

      </div>

    </div>
  );
};
