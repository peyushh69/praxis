import React, { useState, useMemo } from 'react';
import { Info, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayLog } from '../types';
import { formatDateKey } from '../utils/storage';

interface ConsistencyHeatmapProps {
  dayLogs: Record<string, DayLog>;
  onSelectDay: (dateStr: string, log?: DayLog) => void;
  dailyTarget: number;
}

export const ConsistencyHeatmap: React.FC<ConsistencyHeatmapProps> = ({
  dayLogs,
  onSelectDay,
  dailyTarget,
}) => {
  const currentActualYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentActualYear);
  const [hoveredDay, setHoveredDay] = useState<{
    dateStr: string;
    formattedDate: string;
    completed: number;
    minutes: number;
    x: number;
    y: number;
  } | null>(null);

  // Year Remaining calculation
  const { daysRemaining, totalDaysInYear, dayOfYear, yearProgressPct } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfYear = new Date(selectedYear, 11, 31);
    endOfYear.setHours(23, 59, 59, 999);
    const startOfYear = new Date(selectedYear, 0, 1);
    const msPerDay = 1000 * 60 * 60 * 24;

    const totalDays = Math.round((endOfYear.getTime() - startOfYear.getTime()) / msPerDay);
    
    if (selectedYear === today.getFullYear()) {
      const remaining = Math.max(0, Math.ceil((endOfYear.getTime() - today.getTime()) / msPerDay));
      const currentDayOfYear = Math.min(totalDays, Math.floor((today.getTime() - startOfYear.getTime()) / msPerDay) + 1);
      const progress = Math.min(100, Math.max(0, Math.round((currentDayOfYear / totalDays) * 100)));
      return {
        daysRemaining: remaining,
        totalDaysInYear: totalDays,
        dayOfYear: currentDayOfYear,
        yearProgressPct: progress,
      };
    } else if (selectedYear < today.getFullYear()) {
      return {
        daysRemaining: 0,
        totalDaysInYear: totalDays,
        dayOfYear: totalDays,
        yearProgressPct: 100,
      };
    } else {
      return {
        daysRemaining: totalDays,
        totalDaysInYear: totalDays,
        dayOfYear: 0,
        yearProgressPct: 0,
      };
    }
  }, [selectedYear]);

  // Generate January 1 to December 31 calendar grid with clean month-by-month separation
  const { monthsData, stats } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    interface Cell {
      date: Date;
      dateStr: string;
      log?: DayLog;
      isFuture: boolean;
      isCurrentYear: boolean;
      isPadding: boolean;
      monthIndex: number;
    }

    interface MonthBlock {
      monthIndex: number;
      name: string;
      weeks: Array<Array<Cell>>;
    }

    const months: Array<MonthBlock> = [];
    let activeDaysCount = 0;
    let totalMins = 0;
    let totalPomodoros = 0;

    for (let month = 0; month < 12; month++) {
      const firstDate = new Date(selectedYear, month, 1);
      const daysInMonth = new Date(selectedYear, month + 1, 0).getDate();
      const startDayOfWeek = firstDate.getDay(); // 0 = Sun, 6 = Sat

      const monthWeeks: Array<Array<Cell>> = [];
      let currentWeek: Array<Cell> = [];

      // 1. Add padding cells before the 1st of the month (Sun to Day-1)
      for (let p = 0; p < startDayOfWeek; p++) {
        currentWeek.push({
          date: new Date(selectedYear, month, 1 - (startDayOfWeek - p)),
          dateStr: '',
          isFuture: false,
          isCurrentYear: false,
          isPadding: true,
          monthIndex: month,
        });
      }

      // 2. Add all days of this month (1 to daysInMonth)
      for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        const curDate = new Date(selectedYear, month, dayNum);
        const dateStr = formatDateKey(curDate);
        const isFuture = curDate > today;
        const isCurrentYear = curDate.getFullYear() === selectedYear;
        const log = dayLogs[dateStr];

        if (!isFuture && isCurrentYear && log && log.completedPomodoros > 0) {
          activeDaysCount++;
          totalMins += log.totalMinutes;
          totalPomodoros += log.completedPomodoros;
        }

        currentWeek.push({
          date: curDate,
          dateStr,
          log,
          isFuture,
          isCurrentYear,
          isPadding: false,
          monthIndex: month,
        });

        if (currentWeek.length === 7) {
          monthWeeks.push(currentWeek);
          currentWeek = [];
        }
      }

      // 3. Add dark padding cells for the remaining slots in the last column after the month ends
      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push({
            date: new Date(selectedYear, month, daysInMonth + 1),
            dateStr: '',
            isFuture: false,
            isCurrentYear: false,
            isPadding: true,
            monthIndex: month,
          });
        }
        monthWeeks.push(currentWeek);
        currentWeek = [];
      }

      months.push({
        monthIndex: month,
        name: monthNames[month],
        weeks: monthWeeks,
      });
    }

    return {
      monthsData: months,
      stats: {
        activeDaysCount,
        totalMins,
        totalPomodoros,
      },
    };
  }, [dayLogs, selectedYear]);

  const getIntensityLevel = (log?: DayLog): number => {
    if (!log || log.completedPomodoros === 0) return 0;
    if (log.completedPomodoros === 1) return 1;
    if (log.completedPomodoros === 2) return 2;
    if (log.completedPomodoros <= 4) return 3;
    return 4;
  };

  const getColorClass = (level: number, isFuture: boolean, isCurrentYear: boolean): string => {
    if (!isCurrentYear) return 'bg-transparent border-transparent opacity-0 pointer-events-none';
    if (isFuture) return 'bg-[#0d0e14] border-[#1c1e2a] cursor-pointer hover:border-[#383c50]';
    switch (level) {
      case 1:
        return 'bg-[#0e4429] hover:bg-[#145a37] border-[#1b6e43]';
      case 2:
        return 'bg-[#006d32] hover:bg-[#00873e] border-[#26a641]';
      case 3:
        return 'bg-[#26a641] hover:bg-[#2fc24d] border-[#39d353]';
      case 4:
        return 'bg-[#39d353] hover:bg-[#4df26b] border-[#56f000] shadow-[0_0_6px_#39d353]';
      case 0:
      default:
        return 'bg-[#15161d] hover:bg-[#21232d] border-[#252733]';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-6">
      <div className="bg-[#0e0f14] border-2 border-[#242630] p-4 sm:p-6 shadow-xl">
        
        {/* Heatmap Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#242630] pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-pixel-heading text-xs font-bold text-white tracking-wide">
                FOCUS MATRIX ({selectedYear})
              </h2>
            </div>
            <p className="text-zinc-400 text-[8px] mt-1 font-pixel-label">
              Daily focus block distribution
            </p>
          </div>

          {/* Year Navigator & Countdown Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#090a0d] border border-[#272935] px-1 py-0.5">
              <button
                onClick={() => setSelectedYear((y) => y - 1)}
                className="p-1 text-zinc-400 hover:text-[#ff3b00] transition-colors cursor-pointer"
                title="Previous Year"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="px-2 font-pixel-heading text-[9px] text-white font-bold">
                {selectedYear}
              </span>
              <button
                onClick={() => setSelectedYear((y) => y + 1)}
                className="p-1 text-zinc-400 hover:text-[#ff3b00] transition-colors cursor-pointer"
                title="Next Year"
              >
                <ChevronRight size={13} />
              </button>
            </div>

            {selectedYear !== currentActualYear && (
              <button
                onClick={() => setSelectedYear(currentActualYear)}
                className="pixel-btn-orange px-2 py-1 text-[7px] cursor-pointer"
              >
                CURRENT
              </button>
            )}
          </div>
        </div>

        {/* Metrics Overview Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5 font-pixel-heading">
          <div className="bg-[#090a0d] border border-[#242630] p-3">
            <div className="text-[8px] text-zinc-500 font-pixel-label uppercase">ACTIVE DAYS</div>
            <div className="text-sm font-bold text-white mt-1">
              {stats.activeDaysCount} <span className="text-[8px] font-normal text-zinc-500 font-pixel-label">DAYS</span>
            </div>
          </div>

          <div className="bg-[#090a0d] border border-[#242630] p-3">
            <div className="text-[8px] text-zinc-500 font-pixel-label uppercase">SESSIONS</div>
            <div className="text-sm font-bold text-[#ff3b00] mt-1">
              {stats.totalPomodoros}
            </div>
          </div>

          <div className="bg-[#090a0d] border border-[#242630] p-3">
            <div className="text-[8px] text-zinc-500 font-pixel-label uppercase">FOCUS TIME</div>
            <div className="text-sm font-bold text-[#39d353] mt-1">
              {Math.round((stats.totalMins / 60) * 10) / 10} <span className="text-[8px] font-normal text-zinc-500 font-pixel-label">HRS</span>
            </div>
          </div>

          <div className="bg-[#090a0d] border border-[#242630] p-3">
            <div className="text-[8px] text-zinc-500 font-pixel-label uppercase">DAILY TARGET</div>
            <div className="text-sm font-bold text-white mt-1">
              {dailyTarget} <span className="text-[8px] font-normal text-zinc-500 font-pixel-label">SESS</span>
            </div>
          </div>
        </div>

        {/* Matrix Grid Container (Full 12 Months Jan - Dec) */}
        <div className="relative overflow-x-auto pb-4 pt-2">
          <div className="min-w-fit flex items-start select-none gap-2">
            
            {/* Day of Week Labels on Left */}
            <div className="flex flex-col gap-1 text-[7px] font-pixel-label text-zinc-400 w-7 shrink-0 text-right pr-1 select-none pt-6">
              <span className="h-3 leading-3 text-zinc-500">Sun</span>
              <span className="h-3 leading-3 text-zinc-300">Mon</span>
              <span className="h-3 leading-3 text-zinc-500">Tue</span>
              <span className="h-3 leading-3 text-zinc-300">Wed</span>
              <span className="h-3 leading-3 text-zinc-500">Thu</span>
              <span className="h-3 leading-3 text-zinc-300">Fri</span>
              <span className="h-3 leading-3 text-zinc-500">Sat</span>
            </div>

            {/* Months Container: All 12 months from JAN to DEC */}
            <div className="flex items-start gap-2">
              {monthsData.map((m) => (
                <div key={m.monthIndex} className="flex flex-col items-center">
                  {/* Centered Month Header */}
                  <div className="h-6 flex items-center justify-center text-[7.5px] font-pixel-heading text-zinc-300 font-bold uppercase tracking-wider select-none">
                    {m.name}
                  </div>

                  {/* Month Week Columns */}
                  <div className="flex gap-1 bg-[#090a0e] border border-[#1d1f2b] p-1 shadow-sm">
                    {m.weeks.map((week, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-1">
                        {week.map((dayItem, dIdx) => {
                          if (dayItem.isPadding) {
                            return (
                              <div
                                key={dIdx}
                                className="w-3 h-3 bg-[#040507] border border-[#0d0e14] opacity-50 pointer-events-none select-none"
                              />
                            );
                          }

                          const level = getIntensityLevel(dayItem.log);
                          const isToday = dayItem.dateStr === formatDateKey(new Date());

                          return (
                            <button
                              key={dIdx}
                              onClick={() => {
                                if (!dayItem.isCurrentYear) return;
                                onSelectDay(dayItem.dateStr, dayItem.log);
                              }}
                              onMouseEnter={(e) => {
                                if (!dayItem.isCurrentYear) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoveredDay({
                                  dateStr: dayItem.dateStr,
                                  formattedDate: dayItem.date.toLocaleDateString(undefined, {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  }),
                                  completed: dayItem.log?.completedPomodoros || 0,
                                  minutes: dayItem.log?.totalMinutes || 0,
                                  x: rect.left + rect.width / 2,
                                  y: rect.top,
                                });
                              }}
                              onMouseLeave={() => setHoveredDay(null)}
                              className={`w-3 h-3 border transition-all duration-100 cursor-pointer ${getColorClass(
                                level,
                                dayItem.isFuture,
                                dayItem.isCurrentYear
                              )} ${isToday ? 'ring-2 ring-[#ff3b00] ring-offset-1 ring-offset-black z-10' : ''}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Heatmap Footer: Legend */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-[#242630] text-[8px] text-zinc-400 font-pixel-label">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Info size={12} className="shrink-0 text-[#ff3b00]" />
            <span>CLICK CELL TO VIEW AUTOMATICALLY RECORDED SESSIONS</span>
          </div>

          {/* Color Level Legend */}
          <div className="flex items-center gap-2">
            <span className="text-[7px] text-zinc-500 font-pixel-heading">LESS</span>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 bg-[#15161d] border border-[#252733]" title="0 sessions" />
              <div className="w-2.5 h-2.5 bg-[#0e4429] border border-[#1b6e43]" title="1 session" />
              <div className="w-2.5 h-2.5 bg-[#006d32] border border-[#26a641]" title="2 sessions" />
              <div className="w-2.5 h-2.5 bg-[#26a641] border border-[#39d353]" title="3-4 sessions" />
              <div className="w-2.5 h-2.5 bg-[#39d353] border border-[#56f000]" title="5+ sessions" />
            </div>
            <span className="text-[7px] text-zinc-500 font-pixel-heading">MORE</span>
          </div>
        </div>

      </div>

      {/* Floating Hover Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-[#090a0d] text-zinc-200 border-2 border-[#ff3b00] p-2.5 shadow-2xl text-left min-w-[170px] font-pixel-heading"
          style={{ left: `${hoveredDay.x}px`, top: `${hoveredDay.y - 6}px` }}
        >
          <div className="text-[8px] font-bold text-white border-b border-[#242630] pb-1 mb-1.5 font-pixel-label">
            {hoveredDay.formattedDate.toUpperCase()}
          </div>
          <div className="text-[8px] flex justify-between gap-3">
            <span className="text-zinc-500">SESSIONS:</span>
            <span className="font-bold text-[#ff3b00]">
              {hoveredDay.completed}
            </span>
          </div>
          <div className="text-[8px] flex justify-between gap-3 mt-0.5">
            <span className="text-zinc-500">FOCUS TIME:</span>
            <span className="text-[#39d353] font-bold">{hoveredDay.minutes} MINS</span>
          </div>
          <div className="mt-1 text-[7px] text-zinc-500 font-pixel-label">
            {hoveredDay.completed >= dailyTarget ? 'TARGET ACHIEVED' : `TARGET: ${dailyTarget} SESSIONS`}
          </div>
        </div>
      )}
    </div>
  );
};


