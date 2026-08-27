import React, { useState, useMemo } from 'react';
import { Calendar, Edit3, Check, X, Sparkles, Clock, Target, ArrowRight } from 'lucide-react';
import { CountdownGoal } from '../types';

interface ExamCountdownCardProps {
  goal: CountdownGoal;
  onUpdateGoal: (updatedGoal: CountdownGoal) => void;
}

export const ExamCountdownCard: React.FC<ExamCountdownCardProps> = ({
  goal,
  onUpdateGoal,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editTargetDate, setEditTargetDate] = useState(goal.targetDate);
  const [editStartDate, setEditStartDate] = useState(goal.startDate);
  const [hoveredDay, setHoveredDay] = useState<{
    index: number;
    dateStr: string;
    isElapsed: boolean;
    isToday: boolean;
    dayNum: number;
  } | null>(null);

  // Parse today's date string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Compute countdown calculations
  const stats = useMemo(() => {
    const start = new Date(goal.startDate + 'T00:00:00');
    const target = new Date(goal.targetDate + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');

    // Total days in duration
    const diffTotalTime = target.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.round(diffTotalTime / (1000 * 60 * 60 * 24)));

    // Days remaining from today until target
    const diffRemainingTime = target.getTime() - today.getTime();
    const daysLeft = Math.max(0, Math.round(diffRemainingTime / (1000 * 60 * 60 * 24)));

    // Days elapsed from start until today
    const diffElapsed = today.getTime() - start.getTime();
    const daysElapsed = Math.max(0, Math.min(totalDays, Math.round(diffElapsed / (1000 * 60 * 60 * 24))));

    // Percentage elapsed
    const percentElapsed = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));
    const percentRemaining = Math.max(0, 100 - percentElapsed);

    // Format target date nicely e.g. "5 October 2026"
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

  // Generate array of day dots
  const dayDots = useMemo(() => {
    const dots = [];
    const startDate = new Date(goal.startDate + 'T00:00:00');
    
    // We cap total rendered dots between min 15 and max 150 to keep a dense, balanced grid
    const totalToRender = Math.max(1, Math.min(150, stats.totalDays));

    for (let i = 0; i < totalToRender; i++) {
      const dotDate = new Date(startDate);
      // If totalDays > 150, step proportionally, else step 1 day
      const dayOffset = stats.totalDays > 150 
        ? Math.floor((i / totalToRender) * stats.totalDays) 
        : i;
      
      dotDate.setDate(dotDate.getDate() + dayOffset);
      const dotDateStr = `${dotDate.getFullYear()}-${String(dotDate.getMonth() + 1).padStart(2, '0')}-${String(dotDate.getDate()).padStart(2, '0')}`;
      
      const isElapsed = dotDateStr < todayStr;
      const isToday = dotDateStr === todayStr;

      dots.push({
        index: i,
        dayNum: dayOffset + 1,
        dateStr: dotDateStr,
        isElapsed: isElapsed || (isToday && stats.isTargetPassed),
        isToday,
      });
    }
    return dots;
  }, [goal.startDate, stats.totalDays, todayStr, stats.isTargetPassed]);

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

  const handleSetPreset = (days: number, name?: string) => {
    const t = new Date(todayStr + 'T00:00:00');
    t.setDate(t.getDate() + days);
    const targetStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    
    setEditStartDate(todayStr);
    setEditTargetDate(targetStr);
    if (name) setEditTitle(name);
  };

  const handleSetOctoberExamPreset = () => {
    const currYear = new Date().getFullYear();
    setEditStartDate(todayStr);
    setEditTargetDate(`${currYear}-10-05`);
    setEditTitle('5 October Exam');
  };

  return (
    <div className="w-full max-w-2xl mx-auto font-pixel-heading select-none">
      {/* Container styled after reference photo: Solid dark canvas, bold typographic header, geometric circular dot matrix */}
      <div className="bg-[#0a0b10] border-2 border-[#222636] hover:border-[#383d52] transition-all rounded-xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
        
        {/* Top Header Row with Big Percent / Days Left + Description + Edit Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 pb-4 border-b border-[#1c202d]">
          
          {/* Big High-Contrast Statistic Display (Matching photo: "84%" / "39 D") */}
          <div className="flex items-baseline gap-2 shrink-0">
            <div className="text-4xl sm:text-5xl md:text-6xl font-black font-pixel-heading text-white tracking-tight leading-none">
              {stats.daysLeft}
              <span className="text-lg sm:text-2xl text-[#ff3b00] font-bold ml-1">D</span>
            </div>
            <div className="text-[10px] font-pixel-label font-bold text-zinc-400 uppercase leading-tight">
              LEFT
            </div>
          </div>

          {/* Description & Target Meta Text (Matching the typography layout of reference image) */}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] sm:text-xs font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
              <span className="text-[#ff3b00] font-black">[{goal.title || 'EXAM TARGET'}]</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-300 font-pixel-label">{stats.targetFormatted}</span>
            </div>
            <div className="text-[8.5px] sm:text-[9px] text-zinc-400 font-pixel-label mt-1 leading-relaxed">
              {stats.isTargetPassed ? (
                <span className="text-[#39d353] font-bold">Target date has arrived! Review your milestone accomplishments.</span>
              ) : (
                <span>
                  <strong className="text-white">{stats.daysElapsed}</strong> of <strong className="text-white">{stats.totalDays}</strong> total days elapsed (<strong className="text-[#ff3b00]">{stats.percentElapsed}%</strong> completed). Every focus session compounds towards your exam.
                </span>
              )}
            </div>
          </div>

          {/* Action Trigger: Edit / Settings Pill */}
          <div className="flex items-center gap-1.5 self-start shrink-0">
            <button
              onClick={() => {
                setEditTitle(goal.title);
                setEditTargetDate(goal.targetDate);
                setEditStartDate(goal.startDate);
                setIsEditing(!isEditing);
              }}
              className="px-2.5 py-1.5 bg-[#141622] hover:bg-[#ff3b00] hover:text-black text-[#ff3b00] border border-[#ff3b00]/60 rounded-xs text-[8px] font-pixel-heading font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all uppercase"
              title="Set Target Exam Date & Title"
            >
              <Calendar size={11} />
              <span>{isEditing ? 'CLOSE' : 'SET EXAM DATE'}</span>
            </button>
          </div>

        </div>

        {/* Quick Inline Edit Drawer */}
        {isEditing && (
          <form
            onSubmit={handleSave}
            className="mt-3.5 p-3.5 bg-[#12141d] border border-[#ff3b00]/50 rounded-lg space-y-3 animate-fadeIn text-zinc-200 font-pixel-label"
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
              {/* Exam Title */}
              <div className="sm:col-span-1">
                <label className="text-[7.5px] text-zinc-400 block mb-1 uppercase">
                  EXAM / TARGET TITLE:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5 October UPSC Exam"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#08090d] border border-[#2e3244] focus:border-[#ff3b00] text-white px-2 py-1.5 text-[8.5px] rounded-xs focus:outline-none"
                />
              </div>

              {/* Target Date */}
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

              {/* Start Date */}
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

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[7px] text-zinc-500 uppercase">QUICK PRESETS:</span>
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
              <button
                type="button"
                onClick={() => handleSetPreset(90, '90-Day Mastery')}
                className="px-2 py-0.5 bg-[#1a1c26] hover:bg-[#ff3b00] hover:text-black text-zinc-300 text-[7px] rounded-xs cursor-pointer border border-[#2c3042]"
              >
                +90 Days
              </button>
            </div>

            {/* Save Button */}
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
                SAVE TARGET
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            CIRCULAR DOT MATRIX (MATCHING EXACT VISUAL SPECIFICATION OF REFERENCE IMAGE)
            ========================================================================= */}
        <div className="mt-4 pt-3">
          
          {/* Dot Matrix Grid */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center justify-start bg-[#06070a] p-3 sm:p-4 rounded-lg border border-[#1a1c26]">
            {dayDots.map((dot) => {
              const isElapsed = dot.isElapsed;
              const isToday = dot.isToday;

              return (
                <div
                  key={dot.index}
                  onMouseEnter={() => setHoveredDay(dot)}
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
                        ? 'bg-[#ff3b00] shadow-[0_0_6px_rgba(255,59,0,0.7)]' // Solid Red-Orange Circle as in Photo
                        : isToday
                        ? 'bg-gradient-to-tr from-[#ff3b00] to-white shadow-[0_0_8px_#ff3b00]'
                        : 'bg-[#d8dce6] opacity-85 hover:opacity-100 hover:bg-white' // Solid Light Gray Circle as in Photo
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Micro Legend & Interactive Hover Tooltip Bar */}
          <div className="mt-2.5 flex items-center justify-between text-[7.5px] font-pixel-label text-zinc-400">
            {hoveredDay ? (
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
                  <span>ELAPSED / BITEIN DINO (RED)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#d8dce6]" />
                  <span>REMAINING / BACHE DINO (GRAY)</span>
                </div>
              </div>
            )}

            <div className="font-pixel-heading text-[7.5px] text-zinc-500">
              TARGET: <span className="text-[#ff3b00]">{goal.targetDate}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
