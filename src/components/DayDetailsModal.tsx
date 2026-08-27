import React, { useEffect } from 'react';
import { X, CheckCircle, ArrowLeft, Clock } from 'lucide-react';
import { DayLog } from '../types';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  dayLog?: DayLog;
}

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  dayLog,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dateObj = new Date(dateStr + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs font-pixel-heading animate-in fade-in duration-150"
    >
      <div className="bg-[#0e0f14] border border-[#ff3b00]/80 sm:border-2 sm:border-[#ff3b00] w-full max-w-md max-h-[90vh] shadow-[0_0_35px_rgba(255,59,0,0.25)] flex flex-col relative overflow-hidden">
        
        {/* Header with Back & Close */}
        <div className="flex items-center justify-between border-b border-[#242630] px-4 py-3 bg-[#0a0b10] shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1 -ml-1 text-zinc-400 hover:text-white sm:hidden flex items-center gap-1 text-[8px] font-pixel-label cursor-pointer"
              title="Back"
            >
              <ArrowLeft size={15} className="text-[#ff3b00]" />
              <span className="text-zinc-300 uppercase">BACK</span>
            </button>
            <div>
              <div className="text-[7.5px] text-[#ff3b00] uppercase font-pixel-label">DATE LOG</div>
              <h3 className="text-[10px] sm:text-xs font-bold text-white mt-0.5">{formattedDate.toUpperCase()}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1a1b24] transition-colors cursor-pointer rounded-xs"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[8.5px]">
          {/* Overview Numbers */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#090a0d] border border-[#242630] p-3">
              <div className="text-[7.5px] text-zinc-500 font-pixel-label uppercase">COMPLETED SESSIONS</div>
              <div className="text-base sm:text-lg font-bold text-white mt-1">
                {dayLog?.completedPomodoros || 0}
              </div>
            </div>
            <div className="bg-[#090a0d] border border-[#242630] p-3">
              <div className="text-[7.5px] text-zinc-500 font-pixel-label uppercase">TOTAL FOCUS TIME</div>
              <div className="text-base sm:text-lg font-bold text-[#39d353] mt-1">
                {dayLog?.totalMinutes || 0} <span className="text-[7.5px] font-normal text-zinc-500 font-pixel-label">MINS</span>
              </div>
            </div>
          </div>

          {/* Sessions List */}
          <div>
            <div className="text-[8px] text-zinc-400 font-pixel-label uppercase tracking-wider mb-2">
              AUTOMATICALLY RECORDED SESSIONS
            </div>

            {!dayLog || dayLog.sessions.length === 0 ? (
              <div className="text-center py-6 border border-[#242630] text-zinc-500 text-[8px] font-pixel-label bg-[#090a0d] px-3">
                <Clock size={16} className="mx-auto mb-1.5 text-zinc-600" />
                NO TIMER SESSIONS RECORDED ON THIS DATE.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {dayLog.sessions.map((session, idx) => {
                  const timeStr = new Date(session.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div
                      key={session.id || idx}
                      className="flex items-center justify-between p-2.5 bg-[#090a0d] border border-[#242630] text-[8px]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle size={12} className="text-[#39d353] shrink-0" />
                        <span className="text-zinc-200 font-medium font-pixel-label truncate">
                          {session.taskTitle || 'Focus Session'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500 text-[7.5px] shrink-0 ml-2">
                        <span className="text-[#ff3b00] font-bold">{session.durationMinutes}M</span>
                        <span>{timeStr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 py-2.5 bg-[#0a0b10] border-t border-[#242630] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="pixel-btn-dark px-3.5 py-1.5 text-[8px] cursor-pointer"
          >
            CLOSE
          </button>
        </div>

      </div>
    </div>
  );
};



