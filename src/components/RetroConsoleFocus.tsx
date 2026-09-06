import React, { useEffect, useState } from 'react';
import { Play, Pause, Coffee, X, Maximize, Minimize } from 'lucide-react';
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
  onSwitchMode,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleClose = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.warn);
    }
    // Type casting window as any to access screen.orientation for various browsers
    const navWindow = window as any;
    if (navWindow.screen?.orientation?.unlock) {
      navWindow.screen.orientation.unlock();
    }
    onClose();
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        const navWindow = window as any;
        if (navWindow.screen?.orientation?.lock) {
          await navWindow.screen.orientation.lock('landscape').catch(console.warn);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        const navWindow = window as any;
        if (navWindow.screen?.orientation?.unlock) {
          navWindow.screen.orientation.unlock();
        }
      }
    } catch (err) {
      console.warn('Fullscreen/rotation toggle failed:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      else if (e.code === 'Space') {
        e.preventDefault();
        if (isRunning) onPause();
        else onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRunning, onStart, onPause, handleClose]);

  if (!isOpen) return null;

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;
  
  // Show hours if the total original time was an hour or more, OR if current timeLeft is an hour or more
  const showHours = totalTime >= 3600 || hours > 0;
  const timeString = showHours 
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center select-none">
      {/* Top Right Controls */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 flex items-center gap-3">
        {/* Fullscreen / Rotate Button */}
        <button 
          onClick={toggleFullscreen}
          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/90 border border-white/10 hover:border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-xl transition-all cursor-pointer"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen / Rotate Landscape"}
        >
          {isFullscreen ? <Minimize size={18} strokeWidth={2} /> : <Maximize size={18} strokeWidth={2} />}
        </button>

        {/* Minimal Exit Button */}
        <button 
          onClick={handleClose}
          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/90 border border-white/10 hover:border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-xl transition-all cursor-pointer"
          title="Exit Focus Mode (ESC)"
        >
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Massive Centered Timer */}
      <div className="flex-1 w-full flex items-center justify-center p-4">
         <div 
           className="font-pixel-heading font-black text-white/90 drop-shadow-sm leading-none tabular-nums"
           style={{ fontSize: showHours ? 'min(11vw, 22vh)' : 'min(18vw, 30vh)' }}
         >
           {timeString}
         </div>
      </div>
      
      {/* Soft Mirror Effect (Glassmorphism) Controls */}
      <div className="flex flex-row items-center justify-center gap-3 sm:gap-4 pb-12 sm:pb-16 px-4">
        <button 
           onClick={isRunning ? onPause : onStart}
           className="w-28 h-10 sm:w-36 sm:h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-xl flex items-center justify-center gap-2 sm:gap-2.5 text-white/60 hover:text-white/90 transition-all cursor-pointer"
        >
          {isRunning ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
          <span className="font-pixel-heading font-bold text-[8.5px] sm:text-[9.5px] tracking-widest uppercase">{isRunning ? 'PAUSE' : 'START'}</span>
        </button>

        <button 
           onClick={() => onSwitchMode(mode === 'shortBreak' ? 'focus' : 'shortBreak')}
           className="w-32 h-10 sm:w-40 sm:h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-xl flex items-center justify-center gap-2 sm:gap-2.5 text-white/60 hover:text-white/90 transition-all cursor-pointer"
        >
          <Coffee size={14} strokeWidth={2} />
          <span className="font-pixel-heading font-bold text-[8.5px] sm:text-[9.5px] tracking-widest uppercase">
            {mode === 'shortBreak' ? 'FOCUS' : 'BREAK 5M'}
          </span>
        </button>
      </div>
    </div>
  );
};
