import React from 'react';
import { Flame, Trophy, Clock, CheckCircle } from 'lucide-react';

interface StatsOverviewProps {
  currentStreak: number;
  maxStreak: number;
  todayCompleted: number;
  todayMinutes: number;
  dailyTarget: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  currentStreak,
  maxStreak,
  todayCompleted,
  todayMinutes,
  dailyTarget,
}) => {
  const targetPercent = Math.min(100, Math.round((todayCompleted / dailyTarget) * 100));

  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 font-pixel-heading">
      
      {/* Current Streak */}
      <div className="bg-[#0e0f14] border-2 border-[#242630] p-4 relative group hover:border-[#ff3b00] transition-colors">
        <div className="flex items-center justify-between text-zinc-400 mb-2 font-pixel-label">
          <span className="text-[8px] uppercase tracking-wider">STREAK</span>
          <Flame size={14} className={currentStreak > 0 ? 'text-[#ff3b00]' : 'text-zinc-600'} />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-white mt-1">
          {currentStreak} <span className="text-[9px] font-normal text-zinc-500 font-pixel-label">{currentStreak === 1 ? 'DAY' : 'DAYS'}</span>
        </div>
        <div className="text-[8px] text-zinc-500 mt-1 font-pixel-label">
          {currentStreak > 0 ? 'ACTIVE' : 'NO STREAK'}
        </div>
      </div>

      {/* Record Streak */}
      <div className="bg-[#0e0f14] border-2 border-[#242630] p-4 relative group hover:border-[#ff3b00] transition-colors">
        <div className="flex items-center justify-between text-zinc-400 mb-2 font-pixel-label">
          <span className="text-[8px] uppercase tracking-wider">BEST</span>
          <Trophy size={14} className={maxStreak > 0 ? 'text-[#ff3b00]' : 'text-zinc-600'} />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-white mt-1">
          {maxStreak} <span className="text-[9px] font-normal text-zinc-500 font-pixel-label">{maxStreak === 1 ? 'DAY' : 'DAYS'}</span>
        </div>
        <div className="text-[8px] text-zinc-500 mt-1 font-pixel-label">
          ALL TIME
        </div>
      </div>

      {/* Today Completed */}
      <div className="bg-[#0e0f14] border-2 border-[#242630] p-4 relative group hover:border-[#ff3b00] transition-colors">
        <div className="flex items-center justify-between text-zinc-400 mb-2 font-pixel-label">
          <span className="text-[8px] uppercase tracking-wider">TODAY</span>
          <CheckCircle size={14} className={todayCompleted >= dailyTarget ? 'text-[#ff3b00]' : 'text-zinc-600'} />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-[#ff3b00] mt-1">
          {todayCompleted} <span className="text-[9px] font-normal text-zinc-400 font-pixel-label">/{dailyTarget}</span>
        </div>
        <div className="w-full bg-[#090a0d] border border-[#272935] h-1.5 mt-2 overflow-hidden">
          <div
            className="bg-[#ff3b00] h-full transition-all duration-300 shadow-[0_0_4px_#ff3b00]"
            style={{ width: `${targetPercent}%` }}
          />
        </div>
      </div>

      {/* Focus Time Today */}
      <div className="bg-[#0e0f14] border-2 border-[#242630] p-4 relative group hover:border-[#ff3b00] transition-colors">
        <div className="flex items-center justify-between text-zinc-400 mb-2 font-pixel-label">
          <span className="text-[8px] uppercase tracking-wider">TIME</span>
          <Clock size={14} className="text-zinc-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-white mt-1">
          {todayMinutes} <span className="text-[9px] font-normal text-zinc-500 font-pixel-label">MINS</span>
        </div>
        <div className="text-[8px] text-zinc-500 mt-1 font-pixel-label">
          {(todayMinutes / 60).toFixed(1)} HOURS
        </div>
      </div>

    </div>
  );
};

