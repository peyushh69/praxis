import React, { useState, useMemo, useRef } from 'react';
import { Calendar, X, Clock, Target } from 'lucide-react';
import { CountdownGoal } from '../types';

interface ExamCountdownCardProps {
  goal: CountdownGoal;
  onUpdateGoal: (updatedGoal: CountdownGoal) => void;
}

export const ExamCountdownCard: React.FC<ExamCountdownCardProps> = ({
  goal,
  onUpdateGoal,
}) => {
  // Slide index: 0 = Exam/Target Countdown, 1 = Year Timeline Countdown
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editTargetDate, setEditTargetDate] = useState(goal.targetDate);
  const [editStartDate, setEditStartDate] = useState(goal.startDate);
  
  // Touch / Swipe handling refs
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 45;

  const [hoveredDay, setHoveredDay] = useState<{
    slide: 'exam' | 'year';
    dateStr: string;
    isElapsed: boolean;
    isToday: boolean;
    dayNum: number;
    label?: string;
  } | null>(null);

  // Parse today's date string YYYY-MM-DD
  const todayDateObj = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const currentYear = todayDateObj.getFullYear();

  // ==========================================
  // 1. STATS FOR SLIDE 1: EXAM / GOAL TARGET
  // ==========================================
  const examStats = useMemo(() => {
    const start = new Date(goal.startDate + 'T00:00:00');
    const target = new Date(goal.targetDate + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');

    const diffTotalTime = target.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.round(diffTotalTime / (1000 * 60 * 60 * 24)));

    const diffRemainingTime = target.getTime() - today.getTime();
    const daysLeft = Math.max(0, Math.round(diffRemainingTime / (1000 * 60 * 60 * 24)));

    const diffElapsed = today.getTime() - start.getTime();
    const daysElapsed = Math.max(0, Math.min(totalDays, Math.round(diffElapsed / (1000 * 60 * 60 * 24))));

    const percentElapsed = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));
    const percentRemaining = Math.max(0, 100 - percentElapsed);

    const targetFormatted = target.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return {
      totalDays,
      daysLeft,
      daysElapsed,
      percentElapsed,
      percentRemaining,
      targetFormatted,
      isTargetPassed: daysLeft === 0,
    };
  }, [goal.startDate, goal.targetDate, todayStr]);

  // Exam day dots array
  const examDayDots = useMemo(() => {
    const dots = [];
    const startDate = new Date(goal.startDate + 'T00:00:00');
    const totalToRender = Math.max(1, Math.min(120, examStats.totalDays));
    const todayDotIndex = Math.min(
      totalToRender - 1,
      Math.max(0, Math.floor((examStats.daysElapsed / examStats.totalDays) * totalToRender))
    );

    for (let i = 0; i < totalToRender; i++) {
      const isToday = !examStats.isTargetPassed && i === todayDotIndex;
      const isElapsed = examStats.isTargetPassed || i < todayDotIndex;

      const dotDate = new Date(startDate);
      let dayOffset: number;
      let dotDateStr: string;

      if (isToday) {
        dayOffset = examStats.daysElapsed;
        dotDateStr = todayStr;
      } else {
        dayOffset = examStats.totalDays > 120 
          ? Math.floor((i / totalToRender) * examStats.totalDays) 
          : i;
        dotDate.setDate(dotDate.getDate() + dayOffset);
        dotDateStr = `${dotDate.getFullYear()}-${String(dotDate.getMonth() + 1).padStart(2, '0')}-${String(dotDate.getDate()).padStart(2, '0')}`;
      }

      dots.push({
        index: i,
        dayNum: dayOffset + 1,
        dateStr: dotDateStr,
        isElapsed,
        isToday,
      });
    }
    return dots;
  }, [goal.startDate, examStats.totalDays, examStats.daysElapsed, examStats.isTargetPassed, todayStr]);

  // ==========================================
  // 2. STATS FOR SLIDE 2: YEAR 2026 TIMELINE
  // ==========================================
  const yearStats = useMemo(() => {
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    const today = new Date(todayStr + 'T00:00:00');

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDaysInYear = Math.round((new Date(currentYear, 11, 31).getTime() - startOfYear.getTime()) / msPerDay) + 1;
    const daysRemaining = Math.max(0, Math.ceil((endOfYear.getTime() - today.getTime()) / msPerDay));
    const dayOfYear = Math.min(totalDaysInYear, Math.floor((today.getTime() - startOfYear.getTime()) / msPerDay) + 1);
    const yearProgressPct = Math.min(100, Math.max(0, Math.round((dayOfYear / totalDaysInYear) * 100)));

    return {
      currentYear,
      totalDaysInYear,
      daysRemaining,
      dayOfYear,
      yearProgressPct,
      endFormatted: `31 Dec ${currentYear}`,
    };
  }, [currentYear, todayStr]);

  // Year timeline dots array (scaled to clean matrix grid)
  const yearDayDots = useMemo(() => {
    const dots = [];
    const startDate = new Date(currentYear, 0, 1);
    const totalToRender = 100; // 100 dense proportional dots representing 100% of year
    const todayDotIndex = Math.min(
      totalToRender - 1,
      Math.max(0, Math.floor(((yearStats.dayOfYear - 1) / yearStats.totalDaysInYear) * totalToRender))
    );

    for (let i = 0; i < totalToRender; i++) {
      const isToday = i === todayDotIndex;
      const isElapsed = i < todayDotIndex;

      const dotDate = new Date(startDate);
      let dayOffset: number;
      let dotDateStr: string;

      if (isToday) {
        dayOffset = yearStats.dayOfYear - 1;
        dotDateStr = todayStr;
      } else {
        dayOffset = Math.min(yearStats.totalDaysInYear - 1, Math.floor((i / totalToRender) * yearStats.totalDaysInYear));
        dotDate.setDate(dotDate.getDate() + dayOffset);
        dotDateStr = `${dotDate.getFullYear()}-${String(dotDate.getMonth() + 1).padStart(2, '0')}-${String(dotDate.getDate()).padStart(2, '0')}`;
      }

      dots.push({
        index: i,
        dayNum: dayOffset + 1,
        dateStr: dotDateStr,
        isElapsed,
        isToday,
      });
    }
    return dots;
  }, [currentYear, yearStats.totalDaysInYear, yearStats.dayOfYear, todayStr]);

  // Swipe & Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && activeSlide < 1) {
      setActiveSlide(1);
    } else if (isRightSwipe && activeSlide > 0) {
      setActiveSlide(0);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editTargetDate) return;

    onUpdateGoal({
      ...goal,
      title: editTitle.trim() || 'Exam / Target Goal',
      targetDate: editTargetDate,
      startDate: editStartDate || todayStr,
    });
    setIsEditing(false);
  };

  const handleSetOctoberExamPreset = () => {
    setEditStartDate(todayStr);
    setEditTargetDate(`${currentYear}-10-05`);
    setEditTitle('UKSSSC Exam');
  };

  const handleSetPreset = (days: number, name?: string) => {
    const t = new Date(todayStr + 'T00:00:00');
    t.setDate(t.getDate() + days);
    const targetStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    
    setEditStartDate(todayStr);
    setEditTargetDate(targetStr);
    if (name) setEditTitle(name);
  };

  return (
    <div className="w-full max-w-2xl mx-auto font-pixel-heading select-none">
      {/* Outer Card Chassis with Dual-Slide Support */}
      <div 
        className="bg-[#0a0b10] border-2 border-[#222636] hover:border-[#383d52] transition-all rounded-xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* Top Navigation & Slide Selector Bar */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1c202d]">
          
          {/* Slide Tab Buttons */}
          <div className="flex items-center bg-[#07080c] border border-[#232738] p-0.5 rounded-lg">
            {/* 1st Tab: 2026 TIMELINE */}
            <button
              onClick={() => setActiveSlide(0)}
              className={`px-3 py-1.5 rounded-md text-[8.5px] sm:text-[9px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeSlide === 0
                  ? 'bg-gradient-to-r from-white to-zinc-200 text-black shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Clock size={11} className={activeSlide === 0 ? 'text-black' : 'text-white'} />
              <span>{currentYear} TIMELINE</span>
            </button>

            {/* 2nd Tab: UKSSSC / EXAM TARGET */}
            <button
              onClick={() => setActiveSlide(1)}
              className={`px-3 py-1.5 rounded-md text-[8.5px] sm:text-[9px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeSlide === 1
                  ? 'bg-gradient-to-r from-[#ff5500] to-[#ff3b00] text-black shadow-[0_0_12px_rgba(255,59,0,0.5)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Target size={11} className={activeSlide === 1 ? 'text-black' : 'text-[#ff3b00]'} />
              <span>{goal.title || 'UKSSSC EXAM'}</span>
            </button>
          </div>

          {/* Slide Controls & Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* If on Exam Slide (Slide 1), Show Config Button */}
            {activeSlide === 1 && (
              <button
                onClick={() => {
                  setEditTitle(goal.title);
                  setEditTargetDate(goal.targetDate);
                  setEditStartDate(goal.startDate);
                  setIsEditing(!isEditing);
                }}
                className="px-2.5 py-1.5 bg-[#141622] hover:bg-[#ff3b00] hover:text-black text-[#ff3b00] border border-[#ff3b00]/60 rounded-md text-[8px] font-bold flex items-center gap-1 cursor-pointer transition-all uppercase"
                title="Configure Exam Date & Title"
              >
                <Calendar size={11} />
                <span className="hidden sm:inline">{isEditing ? 'CLOSE' : 'SET DATE'}</span>
              </button>
            )}
          </div>

        </div>

        {/* Inline Edit Drawer for Exam Goal */}
        {isEditing && activeSlide === 1 && (
          <form
            onSubmit={handleSave}
            className="mb-4 p-3.5 bg-[#12141d] border border-[#ff3b00]/50 rounded-lg space-y-3 animate-fadeIn text-zinc-200 font-pixel-label"
          >
            <div className="flex items-center justify-between border-b border-[#252838] pb-1.5">
              <span className="text-[9px] font-bold text-[#ff3b00] flex items-center gap-1.5 font-pixel-heading">
                <Target size={12} /> CONFIGURE EXAM / TARGET COUNTDOWN
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[7.5px] text-zinc-400 block mb-1 uppercase">
                  EXAM / TARGET TITLE:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5 October Exam"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#08090d] border border-[#2e3244] focus:border-[#ff3b00] text-white px-2 py-1.5 text-[8.5px] rounded-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[7.5px] text-zinc-400 block mb-1 uppercase">
                  EXAM TARGET DATE:
                </label>
                <input
                  type="date"
                  value={editTargetDate}
                  onChange={(e) => setEditTargetDate(e.target.value)}
                  className="w-full bg-[#08090d] border border-[#2e3244] focus:border-[#ff3b00] text-white px-2 py-1.5 text-[8.5px] rounded-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[7.5px] text-zinc-400 block mb-1 uppercase">
                  TIMELINE START DATE:
                </label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full bg-[#08090d] border border-[#2e3244] focus:border-[#ff3b00] text-white px-2 py-1.5 text-[8.5px] rounded-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[7px] text-zinc-500 uppercase">PRESETS:</span>
              <button
                type="button"
                onClick={handleSetOctoberExamPreset}
                className="px-2 py-0.5 bg-[#1a1c26] hover:bg-[#ff3b00] hover:text-black text-zinc-300 text-[7px] rounded-xs cursor-pointer border border-[#2c3042]"
              >
                5 October Exam
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset(30, '30-Day Sprint')}
                className="px-2 py-0.5 bg-[#1a1c26] hover:bg-[#ff3b00] hover:text-black text-zinc-300 text-[7px] rounded-xs cursor-pointer border border-[#2c3042]"
              >
                +30 Days
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset(60, '60-Day Prep')}
                className="px-2 py-0.5 bg-[#1a1c26] hover:bg-[#ff3b00] hover:text-black text-zinc-300 text-[7px] rounded-xs cursor-pointer border border-[#2c3042]"
              >
                +60 Days
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#252838]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 bg-[#181a24] text-zinc-400 hover:text-white text-[8px] rounded-xs cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-[#ff3b00] hover:bg-[#ff5500] text-black font-black text-[8px] rounded-xs cursor-pointer font-pixel-heading"
              >
                SAVE
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            SLIDE 0: YEAR 2026 TIMELINE COUNTDOWN (1ST VIEW)
            ========================================================================= */}
        {activeSlide === 0 && (
          <div className="animate-fadeIn space-y-4">
            
            {/* Header Stat & Meta Row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              
              {/* Big High-Contrast Statistic Display */}
              <div className="flex items-baseline gap-2 shrink-0">
                <div className="text-4xl sm:text-5xl md:text-6xl font-black font-pixel-heading text-white tracking-tight leading-none">
                  {yearStats.daysRemaining}
                  <span className="text-lg sm:text-2xl text-white font-bold ml-1">D</span>
                </div>
                <div className="text-[10px] font-pixel-label font-bold text-zinc-400 uppercase leading-tight">
                  LEFT IN {yearStats.currentYear}
                </div>
              </div>

              {/* Description & Timeline Meta Text */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] sm:text-xs font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
                  <span className="text-white font-black">[{yearStats.currentYear} YEAR TIMELINE]</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-300 font-pixel-label">{yearStats.endFormatted}</span>
                </div>
                <div className="text-[8.5px] sm:text-[9px] text-zinc-400 font-pixel-label mt-1 leading-relaxed">
                  <span>
                    <strong className="text-white">{yearStats.dayOfYear}</strong> of <strong className="text-white">{yearStats.totalDaysInYear}</strong> total days elapsed (<strong className="text-[#ff3b00]">{yearStats.yearProgressPct}%</strong> of {yearStats.currentYear} completed). Time is finite and precious.
                  </span>
                </div>
              </div>

            </div>

            {/* Circular Dot Matrix for Year Timeline */}
            <div className="pt-1">
              <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center justify-start bg-[#06070a] p-3 sm:p-4 rounded-lg border border-[#1a1c26]">
                {yearDayDots.map((dot) => {
                  const isElapsed = dot.isElapsed;
                  const isToday = dot.isToday;

                  return (
                    <div
                      key={dot.index}
                      onMouseEnter={() => setHoveredDay({
                        slide: 'year',
                        dateStr: dot.dateStr,
                        isElapsed: dot.isElapsed,
                        isToday: dot.isToday,
                        dayNum: dot.dayNum,
                      })}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`relative cursor-pointer transition-all duration-200 transform hover:scale-135 rounded-full ${
                        isToday
                          ? 'ring-2 ring-white ring-offset-1 ring-offset-[#06070a] scale-110 z-10'
                          : ''
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-colors ${
                          isElapsed
                            ? 'bg-[#ff3b00] shadow-[0_0_6px_rgba(255,59,0,0.7)]'
                            : isToday
                            ? 'bg-gradient-to-tr from-[#ff3b00] to-white shadow-[0_0_8px_white]'
                            : 'bg-[#d8dce6] opacity-85 hover:opacity-100 hover:bg-white'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Legend & Tooltip Bar */}
              <div className="mt-2.5 flex items-center justify-between text-[7.5px] font-pixel-label text-zinc-400">
                {hoveredDay && hoveredDay.slide === 'year' ? (
                  <div className="text-zinc-200 flex items-center gap-1.5">
                    <span className="text-white font-bold">DAY {hoveredDay.dayNum}:</span>
                    <span>{hoveredDay.dateStr}</span>
                    <span className="text-zinc-500">
                      [{hoveredDay.isElapsed ? 'YEAR PASSED (RED)' : hoveredDay.isToday ? 'TODAY' : 'YEAR REMAINING (GRAY)'}]
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff3b00] shadow-[0_0_4px_#ff3b00]" />
                      <span>{yearStats.currentYear} ELAPSED (RED)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#d8dce6]" />
                      <span>{yearStats.currentYear} REMAINING (GRAY)</span>
                    </div>
                  </div>
                )}

                <div className="font-pixel-heading text-[7.5px] text-zinc-500">
                  YEAR END: <span className="text-white">31 DEC {yearStats.currentYear}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            SLIDE 1: EXAM / UKSSSC TARGET GOAL COUNTDOWN (2ND VIEW)
            ========================================================================= */}
        {activeSlide === 1 && (
          <div className="animate-fadeIn space-y-4">
            
            {/* Header Stat & Meta Row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              
              {/* Big High-Contrast Statistic Display */}
              <div className="flex items-baseline gap-2 shrink-0">
                <div className="text-4xl sm:text-5xl md:text-6xl font-black font-pixel-heading text-white tracking-tight leading-none">
                  {examStats.daysLeft}
                  <span className="text-lg sm:text-2xl text-[#ff3b00] font-bold ml-1">D</span>
                </div>
                <div className="text-[10px] font-pixel-label font-bold text-zinc-400 uppercase leading-tight">
                  LEFT
                </div>
              </div>

              {/* Description & Target Meta Text */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] sm:text-xs font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
                  <span className="text-[#ff3b00] font-black">[{goal.title || 'UKSSSC EXAM'}]</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-300 font-pixel-label">{examStats.targetFormatted}</span>
                </div>
                <div className="text-[8.5px] sm:text-[9px] text-zinc-400 font-pixel-label mt-1 leading-relaxed">
                  {examStats.isTargetPassed ? (
                    <span className="text-[#39d353] font-bold">Target date has arrived! Focus compound accomplished.</span>
                  ) : (
                    <span>
                      <strong className="text-white">{examStats.daysElapsed}</strong> of <strong className="text-white">{examStats.totalDays}</strong> total days elapsed (<strong className="text-[#ff3b00]">{examStats.percentElapsed}%</strong> completed). Every focus session compounds towards your exam.
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Circular Dot Matrix (Elapsed = Red, Remaining = Gray) */}
            <div className="pt-1">
              <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center justify-start bg-[#06070a] p-3 sm:p-4 rounded-lg border border-[#1a1c26]">
                {examDayDots.map((dot) => {
                  const isElapsed = dot.isElapsed;
                  const isToday = dot.isToday;

                  return (
                    <div
                      key={dot.index}
                      onMouseEnter={() => setHoveredDay({
                        slide: 'exam',
                        dateStr: dot.dateStr,
                        isElapsed: dot.isElapsed,
                        isToday: dot.isToday,
                        dayNum: dot.dayNum,
                      })}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`relative cursor-pointer transition-all duration-200 transform hover:scale-135 rounded-full ${
                        isToday
                          ? 'ring-2 ring-[#ff3b00] ring-offset-1 ring-offset-[#06070a] scale-110 z-10'
                          : ''
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-colors ${
                          isElapsed
                            ? 'bg-[#ff3b00] shadow-[0_0_6px_rgba(255,59,0,0.7)]'
                            : isToday
                            ? 'bg-gradient-to-tr from-[#ff3b00] to-white shadow-[0_0_8px_#ff3b00]'
                            : 'bg-[#d8dce6] opacity-85 hover:opacity-100 hover:bg-white'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Legend & Tooltip Bar */}
              <div className="mt-2.5 flex items-center justify-between text-[7.5px] font-pixel-label text-zinc-400">
                {hoveredDay && hoveredDay.slide === 'exam' ? (
                  <div className="text-zinc-200 flex items-center gap-1.5">
                    <span className="text-[#ff3b00] font-bold">DAY {hoveredDay.dayNum}:</span>
                    <span>{hoveredDay.dateStr}</span>
                    <span className="text-zinc-500">
                      [{hoveredDay.isElapsed ? 'PASSED (RED)' : hoveredDay.isToday ? 'TODAY' : 'UPCOMING (GRAY)'}]
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff3b00] shadow-[0_0_4px_#ff3b00]" />
                      <span>PASSED DAYS (RED)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#d8dce6]" />
                      <span>REMAINING DAYS (GRAY)</span>
                    </div>
                  </div>
                )}

                <div className="font-pixel-heading text-[7.5px] text-zinc-500">
                  EXAM: <span className="text-[#ff3b00]">{goal.targetDate}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Bottom Swipe Hint & Slide Indicator Dots */}
        <div className="mt-3 pt-2.5 border-t border-[#181a24] flex items-center justify-between text-[7px] font-pixel-label text-zinc-500 font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b00]" />
            <span className="uppercase tracking-wider">SWIPE LEFT / RIGHT OR CLICK TABS TO SWITCH VIEWS</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveSlide(0)}
              className={`w-4 h-1.5 rounded-full transition-all cursor-pointer ${
                activeSlide === 0 ? 'bg-white w-6' : 'bg-zinc-700 hover:bg-zinc-500'
              }`}
              title="Slide 1: Year Timeline"
            />
            <button
              onClick={() => setActiveSlide(1)}
              className={`w-4 h-1.5 rounded-full transition-all cursor-pointer ${
                activeSlide === 1 ? 'bg-[#ff3b00] w-6' : 'bg-zinc-700 hover:bg-zinc-500'
              }`}
              title="Slide 2: UKSSSC / Exam Target"
            />
          </div>
        </div>

      </div>
    </div>
  );
};
