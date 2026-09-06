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
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center select-none overflow-hidden">
      {/* Top Right Controls (Absolute) */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 flex items-center gap-2 sm:gap-3 z-10">
        {/* Fullscreen / Rotate Button */}
        <button 
          onClick={toggleFullscreen}
          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/50 hover:text-white/90 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-xl transition-all cursor-pointer"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen / Rotate Landscape"}
        >
          {isFullscreen ? <Minimize size={16} strokeWidth={2} /> : <Maximize size={16} strokeWidth={2} />}
        </button>

        {/* Minimal Exit Button */}
        <button 
          onClick={handleClose}
          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/50 hover:text-white/90 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-xl transition-all cursor-pointer"
          title="Exit Focus Mode (ESC)"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Massive Centered Timer (Perfectly centered in viewport) */}
      <div className="w-full flex items-center justify-center px-4">
         <div 
           className="font-pixel-heading font-black text-white/80 drop-shadow-sm leading-none tabular-nums"
           style={{ fontSize: showHours ? 'min(10vw, 18vh)' : 'min(14vw, 24vh)' }}
         >
           {timeString}
         </div>
      </div>
      
      {/* Bottom Controls (Absolute) */}
      <div className="absolute bottom-10 sm:bottom-14 left-0 w-full flex flex-row items-center justify-center gap-3 sm:gap-4 px-4 z-10">
        <button 
           onClick={isRunning ? onPause : onStart}
           className="w-24 h-9 sm:w-32 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-xl flex items-center justify-center gap-2 text-white/50 hover:text-white/90 transition-all cursor-pointer"
        >
          {isRunning ? <Pause size={12} strokeWidth={2} /> : <Play size={12} strokeWidth={2} />}
          <span className="font-pixel-heading font-bold text-[8px] sm:text-[9px] tracking-widest uppercase">{isRunning ? 'PAUSE' : 'START'}</span>
        </button>

        <button 
           onClick={() => onSwitchMode(mode === 'shortBreak' ? 'focus' : 'shortBreak')}
           className="w-28 h-9 sm:w-36 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-xl flex items-center justify-center gap-2 text-white/50 hover:text-white/90 transition-all cursor-pointer"
        >
          <Coffee size={12} strokeWidth={2} />
          <span className="font-pixel-heading font-bold text-[8px] sm:text-[9px] tracking-widest uppercase">
            {mode === 'shortBreak' ? 'FOCUS' : 'BREAK 5M'}
          </span>
        </button>
      </div>
    </div>
  );
};
