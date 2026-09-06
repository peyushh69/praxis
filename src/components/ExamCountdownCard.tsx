import React, { useState, useMemo, useRef } from 'react';
import { Calendar, X, Clock, Target } from 'lucide-react';
import { CountdownGoal, DayLog, PomodoroSession } from '../types';

interface ExamCountdownCardProps {
  goal: CountdownGoal;
  dayLogs: Record<string, DayLog>;
  sessions: PomodoroSession[];
  onUpdateGoal: (updatedGoal: CountdownGoal) => void;
  onSelectGoalAsTask: (title: string) => void;
}

export const ExamCountdownCard: React.FC<ExamCountdownCardProps> = ({
  goal,
  dayLogs,
  sessions,
  onUpdateGoal,
  onSelectGoalAsTask,
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

  // Environment (Time of day)
  const currentHour = todayDateObj.getHours();
  let skyGradient = 'from-[#0a0f18] to-[#06070a]';
  let celestialBody = null;
  const isNight = currentHour >= 19 || currentHour < 5;

  if (currentHour >= 5 && currentHour < 8) {
    skyGradient = 'from-[#312e81] to-[#0f172a]';
    celestialBody = <div className="absolute top-16 left-8 w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-yellow-300 shadow-[0_0_30px_rgba(251,146,60,0.6)]"></div>;
  } else if (currentHour >= 8 && currentHour < 16) {
    skyGradient = 'from-[#1e3a8a] to-[#0284c7]';
    celestialBody = <div className="absolute top-12 left-10 w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-300 to-yellow-100 shadow-[0_0_40px_rgba(253,224,71,0.8)] animate-pulse"></div>;
  } else if (currentHour >= 16 && currentHour < 19) {
    skyGradient = 'from-[#4c1d95] to-[#be185d]';
    celestialBody = <div className="absolute top-16 right-10 w-12 h-12 rounded-full bg-gradient-to-tr from-red-500 to-orange-400 shadow-[0_0_30px_rgba(249,115,22,0.8)]"></div>;
  } else {
    skyGradient = 'from-[#020617] to-[#0a0f18]';
    celestialBody = <div className="absolute top-12 left-12 w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-white shadow-[0_0_20px_rgba(219,234,254,0.6)]"></div>;
  }

  // ==========================================
  // 0. Total Focus Time for this Target
  // ==========================================
  const targetTotalMinutes = useMemo(() => {
    return sessions.reduce((acc, session) => {
      if (
        session.taskTitle &&
        session.taskTitle.toLowerCase() === (goal.title || '').toLowerCase() &&
        session.mode === 'focus' &&
        session.completed
      ) {
        return acc + session.durationMinutes;
      }
      return acc;
    }, 0);
  }, [sessions, goal.title]);

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
      title: editTitle.trim() || 'SET TARGET',
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

  const handleSetYearEndPreset = () => {
    setEditStartDate(todayStr);
    setEditTargetDate(`${currentYear}-12-31`);
    setEditTitle(`Year End ${currentYear}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto font-pixel-heading select-none">
      {/* Outer Card Chassis with Dual-Slide Support */}
      <div 
        className={`border-2 border-[#222636] hover:border-[#383d52] transition-all rounded-xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden ${
          activeSlide === 1 ? `bg-gradient-to-b ${skyGradient}` : 'bg-[#0a0b10]'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {activeSlide === 1 && (
          <div className="absolute inset-0 pointer-events-none z-0">
            <style>{`
              @keyframes flyBird {
                0% { left: -10%; transform: translateY(10px) scale(0.6); }
                25% { transform: translateY(0px) scale(0.6); }
                50% { transform: translateY(15px) scale(0.6); }
                75% { transform: translateY(5px) scale(0.6); }
                100% { left: 110%; transform: translateY(10px) scale(0.6); }
              }
              @keyframes driftCloud {
                0% { left: -20%; }
                100% { left: 120%; }
              }
              @keyframes fallRain {
                0% { transform: translateY(-10px) rotate(15deg); opacity: 0; }
                20% { opacity: 1; }
                100% { transform: translateY(120px) rotate(15deg); opacity: 0; }
              }
              @keyframes leafFall {
                0% { transform: translate(0, -10px) rotate(0deg); opacity: 0; }
                20% { opacity: 1; }
                100% { transform: translate(-30px, 150px) rotate(360deg); opacity: 0; }
              }
              @keyframes leafWind {
                0% { transform: translate(0, 0) rotate(0deg); opacity: 0.8; }
                20% { transform: translate(-20px, -15px) rotate(90deg); opacity: 1; }
                50% { transform: translate(-50px, -5px) rotate(180deg); opacity: 0.5; }
                100% { transform: translate(-100px, 0) rotate(360deg); opacity: 0; }
              }
              .bird-1 { animation: flyBird 18s linear infinite; }
              .bird-2 { animation: flyBird 25s linear infinite; animation-delay: 5s; }
              .bird-3 { animation: flyBird 20s linear infinite; animation-delay: 11s; }
              .cloud-1 { animation: driftCloud 35s linear infinite; }
              .cloud-2 { animation: driftCloud 45s linear infinite; animation-delay: -15s; }
              .cloud-3 { animation: driftCloud 55s linear infinite; animation-delay: -30s; }
              .rain-drop { animation: fallRain 0.8s linear infinite; width: 1.5px; height: 12px; background: rgba(186, 230, 253, 0.4); position: absolute; border-radius: 1px; }
              .rain-1 { left: 15%; animation-duration: 0.7s; }
              .rain-2 { left: 35%; animation-duration: 0.9s; animation-delay: 0.2s; }
              .rain-3 { left: 55%; animation-duration: 0.8s; animation-delay: 0.5s; }
              .rain-4 { left: 75%; animation-duration: 0.85s; animation-delay: 0.1s; }
              .rain-5 { left: 95%; animation-duration: 0.75s; animation-delay: 0.4s; }
              .leaf-f-1 { animation: leafFall 4s linear infinite; left: 30%; animation-delay: 1s; }
              .leaf-f-2 { animation: leafFall 5s linear infinite; left: 70%; animation-delay: 2.5s; }
              .leaf-f-3 { animation: leafFall 4.5s linear infinite; left: 50%; animation-delay: 0.5s; }
              .leaf-w-1 { animation: leafWind 6s ease-in-out infinite; left: 80%; bottom: 20px; animation-delay: 0s; }
              .leaf-w-2 { animation: leafWind 7s ease-in-out infinite; left: 60%; bottom: 25px; animation-delay: 2s; }
            `}</style>

            {celestialBody}

            {isNight && (
              <div className="absolute inset-0 opacity-50">
                <div className="absolute top-8 left-10 w-0.5 h-0.5 bg-white rounded-full animate-pulse"></div>
                <div className="absolute top-16 left-1/3 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-12 right-1/4 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute top-24 left-1/4 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.2s' }}></div>
                <div className="absolute top-20 right-10 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.7s' }}></div>
              </div>
            )}

            <div className="absolute top-4 w-full h-full opacity-60">
              <svg viewBox="0 0 24 12" className="cloud-1 absolute left-[-20%] w-16 h-8 fill-white/20">
                <path d="M 6 8 Q 4 8 4 6 Q 4 4 6 4 Q 7 2 10 2 Q 13 2 13 4 Q 15 4 16 5 Q 18 5 18 7 Q 18 9 15 9 L 6 9 Z" />
              </svg>
              <svg viewBox="0 0 24 12" className="cloud-2 absolute left-[-20%] top-6 w-20 h-10 fill-white/10">
                <path d="M 6 8 Q 4 8 4 6 Q 4 4 6 4 Q 7 2 10 2 Q 13 2 13 4 Q 15 4 16 5 Q 18 5 18 7 Q 18 9 15 9 L 6 9 Z" />
              </svg>
              <svg viewBox="0 0 24 12" className="cloud-3 absolute left-[-20%] top-2 w-14 h-7 fill-white/30">
                <path d="M 5 7 Q 3 7 3 5 Q 3 3 5 3 Q 6 1 9 1 Q 12 1 12 3 Q 14 3 15 4 Q 17 4 17 6 Q 17 8 14 8 L 5 8 Z" />
              </svg>
            </div>

            <div className="absolute inset-0 opacity-40">
               <div className="rain-drop rain-1"></div>
               <div className="rain-drop rain-2"></div>
               <div className="rain-drop rain-3"></div>
               <div className="rain-drop rain-4"></div>
               <div className="rain-drop rain-5"></div>
            </div>

            <div className="absolute top-10 w-full h-full opacity-40">
              <div className="bird-1 absolute left-[-10%]">
                <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-zinc-500 fill-none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s4-4 10 0c6-4 10 0 10 0" />
                </svg>
              </div>
              <div className="bird-2 absolute left-[-10%] top-6">
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-zinc-600 fill-none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s4-4 10 0c6-4 10 0 10 0" />
                </svg>
              </div>
              <div className="bird-3 absolute left-[-10%] top-2">
                <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-zinc-400 fill-none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s4-4 10 0c6-4 10 0 10 0" />
                </svg>
              </div>
            </div>

            {/* Falling Leaves */}
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
               <svg viewBox="0 0 24 24" className="leaf-f-1 absolute top-20 w-3 h-3 fill-green-600/60"><path d="M12 2C12 2 4 6 4 12C4 18 12 22 12 22C12 22 20 18 20 12C20 6 12 2 12 2Z"/></svg>
               <svg viewBox="0 0 24 24" className="leaf-f-2 absolute top-10 w-2.5 h-2.5 fill-green-500/50"><path d="M12 2C12 2 4 6 4 12C4 18 12 22 12 22C12 22 20 18 20 12C20 6 12 2 12 2Z"/></svg>
               <svg viewBox="0 0 24 24" className="leaf-f-3 absolute top-32 w-3 h-3 fill-yellow-600/60"><path d="M12 2C12 2 4 6 4 12C4 18 12 22 12 22C12 22 20 18 20 12C20 6 12 2 12 2Z"/></svg>
               <svg viewBox="0 0 24 24" className="leaf-w-1 absolute w-3 h-3 fill-green-700/70"><path d="M12 2C12 2 4 6 4 12C4 18 12 22 12 22C12 22 20 18 20 12C20 6 12 2 12 2Z"/></svg>
               <svg viewBox="0 0 24 24" className="leaf-w-2 absolute w-2.5 h-2.5 fill-yellow-700/60"><path d="M12 2C12 2 4 6 4 12C4 18 12 22 12 22C12 22 20 18 20 12C20 6 12 2 12 2Z"/></svg>
            </div>
            
            {/* Organic Ground Vector */}
            <div className="absolute bottom-0 w-full z-0 pointer-events-none">
              <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="w-full h-24 sm:h-32 fill-[#07090c]">
                <path d="M0,100 C150,150 350,50 500,100 C650,150 850,50 1000,100 L1000,200 L0,200 Z" opacity="0.6"/>
                <path d="M0,130 C200,90 400,160 600,120 C800,80 900,140 1000,120 L1000,200 L0,200 Z" opacity="0.8"/>
                <path d="M0,160 C250,180 450,120 700,150 C850,170 950,140 1000,160 L1000,200 L0,200 Z" fill="#040507" />
              </svg>
            </div>
          </div>
        )}
        
        {/* Top Navigation & Slide Selector Bar */}
        <div className="relative z-10 flex items-center justify-between pb-3 mb-3 border-b border-[#1c202d]/50">
          
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

            {/* 2nd Tab: TARGET GOAL / COUNTDOWN */}
            <button
              onClick={() => setActiveSlide(1)}
              className={`px-3 py-1.5 rounded-md text-[8.5px] sm:text-[9px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeSlide === 1
                  ? 'bg-gradient-to-r from-[#ff5500] to-[#ff3b00] text-black shadow-[0_0_12px_rgba(255,59,0,0.5)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Target size={11} className={activeSlide === 1 ? 'text-black' : 'text-[#ff3b00]'} />
              <span>{goal.title || 'SET TARGET'}</span>
            </button>
          </div>

          {/* Slide Controls & Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* If on Goal Slide (Slide 1), Show Config Button */}
            {activeSlide === 1 && (
              <button
                onClick={() => {
                  setEditTitle(goal.title);
                  setEditTargetDate(goal.targetDate);
                  setEditStartDate(goal.startDate);
                  setIsEditing(!isEditing);
                }}
                className="px-2.5 py-1.5 bg-[#141622] hover:bg-[#ff3b00] hover:text-black text-[#ff3b00] border border-[#ff3b00]/60 rounded-md text-[8px] font-bold flex items-center gap-1 cursor-pointer transition-all uppercase"
                title="Configure Target Date & Title"
              >
                <Calendar size={11} />
                <span className="hidden sm:inline">{isEditing ? 'CLOSE' : 'SET TARGET'}</span>
              </button>
            )}
          </div>

        </div>

        {/* Inline Edit Drawer for Goal */}
        {isEditing && activeSlide === 1 && (
          <form
            onSubmit={handleSave}
            className="mb-4 p-3.5 bg-[#12141d] border border-[#ff3b00]/50 rounded-lg space-y-3 animate-fadeIn text-zinc-200 font-pixel-label"
          >
            <div className="flex items-center justify-between border-b border-[#252838] pb-1.5">
              <span className="text-[9px] font-bold text-[#ff3b00] flex items-center gap-1.5 font-pixel-heading">
                <Target size={12} /> CONFIGURE TARGET COUNTDOWN
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
                  TARGET TITLE:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Marathon, Launch Date, Exam..."
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#08090d] border border-[#2e3244] focus:border-[#ff3b00] text-white px-2 py-1.5 text-[8.5px] rounded-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[7.5px] text-zinc-400 block mb-1 uppercase">
                  TARGET DATE:
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
                onClick={() => handleSetPreset(30, '30-Day Sprint')}
                className="px-2 py-0.5 bg-[#1a1c26] hover:bg-[#ff3b00] hover:text-black text-zinc-300 text-[7px] rounded-xs cursor-pointer border border-[#2c3042]"
              >
                +30 Days
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset(60, '60-Day Goal')}
                className="px-2 py-0.5 bg-[#1a1c26] hover:bg-[#ff3b00] hover:text-black text-zinc-300 text-[7px] rounded-xs cursor-pointer border border-[#2c3042]"
              >
                +60 Days
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset(90, '90-Day Quarter')}
                className="px-2 py-0.5 bg-[#1a1c26] hover:bg-[#ff3b00] hover:text-black text-zinc-300 text-[7px] rounded-xs cursor-pointer border border-[#2c3042]"
              >
                +90 Days
              </button>
              <button
                type="button"
                onClick={handleSetYearEndPreset}
                className="px-2 py-0.5 bg-[#1a1c26] hover:bg-[#ff3b00] hover:text-black text-zinc-300 text-[7px] rounded-xs cursor-pointer border border-[#2c3042]"
              >
                Year End {currentYear}
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
          <div className="relative z-10 animate-fadeIn space-y-4">
            
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
          <div className="relative z-10 animate-fadeIn space-y-4">
            
            {/* Header Stat & Meta Row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              
              <div className="flex items-center sm:items-start gap-4 flex-1">
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
                    <span className="text-[#ff3b00] font-black">[{goal.title || 'SET TARGET'}]</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-300 font-pixel-label">{examStats.targetFormatted}</span>
                  </div>
                  <div className="text-[8.5px] sm:text-[9px] text-zinc-400 font-pixel-label mt-1 leading-relaxed">
                    {examStats.isTargetPassed ? (
                      <span className="text-[#39d353] font-bold">Target date has arrived! Focus compound accomplished.</span>
                    ) : (
                      <span>
                        <strong className="text-white">{examStats.daysElapsed}</strong> of <strong className="text-white">{examStats.totalDays}</strong> total days elapsed (<strong className="text-[#ff3b00]">{examStats.percentElapsed}%</strong> completed). Every focus session compounds towards your target goal.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Total Focus Time for Target (Centered, No Box) */}
            <div className="flex flex-col items-center justify-center my-3">
              <div className="text-[8px] font-pixel-label text-zinc-500 uppercase tracking-wider mb-1.5">
                TARGET FOCUS TIME
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-pixel-heading text-[#39d353] leading-none tracking-tight">
                {Math.floor(targetTotalMinutes / 60)}<span className="text-[10px] font-normal text-zinc-500 ml-0.5 mr-1.5 font-pixel-label">H</span>
                {targetTotalMinutes % 60}<span className="text-[10px] font-normal text-zinc-500 ml-0.5 font-pixel-label">M</span>
              </div>
            </div>

            {/* Focused Forest Matrix (Trees growing based on focus time) */}
            <div className="pt-1">
              <div 
                className="relative bg-transparent transition-colors cursor-pointer overflow-hidden group"
                title="Click to select this target as your active focus task"
                onClick={() => onSelectGoalAsTask(goal.title || 'Target Goal')}
              >
                {/* Forest Scroll Container */}
                <div className="relative z-10 flex overflow-x-auto gap-2 sm:gap-3 items-end justify-start p-3 sm:p-4 min-h-[6rem] pb-3 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-[#242630]/80 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full">
                  {examDayDots.map((dot) => {
                    const minutes = dayLogs?.[dot.dateStr]?.totalMinutes || 0;
                    const isElapsed = dot.isElapsed;
                    const isToday = dot.isToday;

                    let TreeVisual = null;

                    if (isElapsed && minutes === 0 && !isToday) {
                      TreeVisual = (
                        <div className="flex flex-col items-center justify-end mb-1.5 opacity-80" title="Missed Day (Dead Tree)">
                          <svg viewBox="0 0 24 24" className="w-5 h-7 drop-shadow-md" fill="none" stroke="#5C4033" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12,22 L12,12 M12,16 L8,10 M12,14 L16,8 M10,22 L14,22" />
                          </svg>
                        </div>
                      );
                    } else if (minutes === 0) {
                      if (isToday) {
                        TreeVisual = (
                          <svg viewBox="0 0 24 24" className="w-5 h-6 drop-shadow-sm mb-1.5 animate-pulse" fill="none" title="Baby Tree (Today)">
                            <path d="M12,22 Q12,16 10,14" stroke="#5C4033" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M10,14 C8,12 4,14 6,16 C8,18 10,16 10,14 Z" fill="#4ADE80"/>
                            <path d="M11,17 C13,15 17,13 15,11 C13,9 11,13 11,15 Z" fill="#22C55E"/>
                          </svg>
                        );
                      } else {
                        TreeVisual = (
                          <svg viewBox="0 0 24 24" className="w-4 h-4 mb-1 opacity-70" fill="none" title="Future Seed">
                            <path d="M12,18 C14,18 16,16 16,14 C16,12 12,8 12,8 C12,8 8,12 8,14 C8,16 10,18 12,18 Z" fill="#8B5A2B"/>
                            <path d="M8,20 L16,20" stroke="#5C4033" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        );
                      }
                    } else {
                      if (minutes <= 25) {
                        TreeVisual = (
                          <svg viewBox="0 0 24 24" className="w-5 h-6 drop-shadow-md mb-1.5" fill="none">
                            <path d="M11,22 L13,22 L12,12 Z" fill="#5C4033"/>
                            <circle cx="12" cy="10" r="5" fill="#22C55E"/>
                            <circle cx="10" cy="12" r="4" fill="#16A34A"/>
                            <circle cx="14" cy="12" r="4" fill="#15803D"/>
                          </svg>
                        );
                      } else if (minutes <= 60) {
                        TreeVisual = (
                          <svg viewBox="0 0 24 24" className="w-6 h-8 drop-shadow-md mb-1.5" fill="none">
                            <path d="M10,24 L14,24 L12,10 Z" fill="#5C4033"/>
                            <circle cx="12" cy="8" r="6" fill="#22C55E"/>
                            <circle cx="8" cy="12" r="5" fill="#16A34A"/>
                            <circle cx="16" cy="12" r="5" fill="#15803D"/>
                            <circle cx="12" cy="14" r="5" fill="#166534"/>
                          </svg>
                        );
                      } else if (minutes <= 120) {
                        TreeVisual = (
                          <svg viewBox="0 0 24 24" className="w-7 h-9 drop-shadow-md mb-1.5" fill="none">
                            <path d="M9,24 L15,24 L12,8 Z" fill="#5C4033"/>
                            <circle cx="12" cy="6" r="7" fill="#4ADE80"/>
                            <circle cx="7" cy="11" r="6" fill="#22C55E"/>
                            <circle cx="17" cy="11" r="6" fill="#16A34A"/>
                            <circle cx="10" cy="15" r="5" fill="#15803D"/>
                            <circle cx="14" cy="15" r="5" fill="#166534"/>
                          </svg>
                        );
                      } else {
                        TreeVisual = (
                          <svg viewBox="0 0 24 24" className="w-9 h-12 drop-shadow-lg mb-1.5" fill="none">
                            <path d="M8,24 L16,24 L13,16 L11,16 Z" fill="#4A2E1B"/>
                            <path d="M12,16 L9,8 M12,16 L16,7 M12,16 L12,4" stroke="#4A2E1B" strokeWidth="2.5" strokeLinecap="round"/>
                            <circle cx="12" cy="4" r="7" fill="#4ADE80"/>
                            <circle cx="6" cy="9" r="7" fill="#22C55E"/>
                            <circle cx="18" cy="9" r="7" fill="#16A34A"/>
                            <circle cx="8" cy="14" r="6" fill="#15803D"/>
                            <circle cx="16" cy="14" r="6" fill="#166534"/>
                            <circle cx="12" cy="12" r="8" fill="#22C55E"/>
                          </svg>
                        );
                      }
                    }

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
                        className={`relative flex flex-col items-center justify-end h-16 transition-transform duration-200 transform hover:scale-110 shrink-0 ${
                          isToday ? 'z-10' : ''
                        }`}
                      >
                        {TreeVisual}
                        <span className={`text-[5px] sm:text-[6px] font-pixel-label leading-none whitespace-nowrap mt-auto z-10 ${isToday ? 'text-white font-bold drop-shadow-[0_0_4px_rgba(255,255,255,0.8)] text-[6px] sm:text-[7px]' : 'text-zinc-500'}`}>
                          {new Date(dot.dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend & Tooltip Bar */}
              <div className="mt-2.5 flex items-center justify-between text-[7.5px] font-pixel-label text-zinc-400">
                {hoveredDay && hoveredDay.slide === 'exam' ? (
                  <div className="text-zinc-200 flex items-center gap-1.5">
                    <span className="text-[#ff3b00] font-bold">DAY {hoveredDay.dayNum}:</span>
                    <span>{hoveredDay.dateStr}</span>
                    <span className="text-[#39d353] font-bold ml-1">
                      {dayLogs?.[hoveredDay.dateStr]?.totalMinutes || 0} MINS FOCUSED
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="w-4 h-5 drop-shadow-md" fill="none">
                        <path d="M10,24 L14,24 L12,10 Z" fill="#5C4033"/>
                        <circle cx="12" cy="8" r="6" fill="#22C55E"/>
                        <circle cx="8" cy="12" r="5" fill="#16A34A"/>
                        <circle cx="16" cy="12" r="5" fill="#15803D"/>
                        <circle cx="12" cy="14" r="5" fill="#166534"/>
                      </svg>
                      <span>FOCUSED TREE</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="w-4 h-5 drop-shadow-md" fill="none" stroke="#5C4033" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12,22 L12,12 M12,16 L8,10 M12,14 L16,8 M10,22 L14,22" />
                      </svg>
                      <span>DEAD TREE</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-70" fill="none">
                        <path d="M12,18 C14,18 16,16 16,14 C16,12 12,8 12,8 C12,8 8,12 8,14 C8,16 10,18 12,18 Z" fill="#8B5A2B"/>
                        <path d="M8,20 L16,20" stroke="#5C4033" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span>FUTURE SEED</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Bottom Swipe Hint & Slide Indicator Dots */}
        <div className="relative z-10 mt-3 pt-2.5 border-t border-[#181a24]/50 flex items-center justify-between text-[7px] font-pixel-label text-zinc-400 font-bold">
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
              title="Slide 2: Target Goal Countdown"
            />
          </div>
        </div>

      </div>
    </div>
  );
};
