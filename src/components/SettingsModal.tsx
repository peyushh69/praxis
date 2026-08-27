import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, AlertTriangle, ArrowLeft, Volume2, Clock, Target } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onResetData,
}) => {
  const [form, setForm] = useState<AppSettings>(settings);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Sync state when settings open
  useEffect(() => {
    if (isOpen) {
      setForm(settings);
      setShowConfirmReset(false);
    }
  }, [isOpen, settings]);

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  const focusHrs = Math.floor(form.focusDuration / 60);
  const focusMins = form.focusDuration % 60;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs font-pixel-heading animate-in fade-in duration-150"
    >
      <div className="bg-[#0e0f14] border border-[#ff3b00]/80 sm:border-2 sm:border-[#ff3b00] w-full max-w-md max-h-[90vh] sm:max-h-[85vh] shadow-[0_0_35px_rgba(255,59,0,0.25)] flex flex-col relative overflow-hidden">
        
        {/* Header - Fixed with prominent BACK/CLOSE */}
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
            <div className="flex items-center gap-1.5 pl-1 sm:pl-0">
              <span className="w-2 h-2 bg-[#ff3b00] hidden sm:inline-block" />
              <h2 className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider">
                SETTINGS
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1a1b24] transition-colors cursor-pointer rounded-xs"
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 text-[8.5px]">
          
          {/* Section 1: Focus Duration (Hours & Minutes) */}
          <div className="bg-[#090a0d] border border-[#242630] p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[8px] font-bold text-[#ff3b00] font-pixel-label uppercase tracking-wider">
                <Clock size={11} />
                <span>FOCUS DURATION</span>
              </div>
              <div className="text-[8px] text-[#ff3b00] font-pixel-heading font-bold">
                {focusHrs > 0 ? `${focusHrs}H ` : ''}{focusMins}M ({form.focusDuration}m)
              </div>
            </div>

            {/* Hours and Minutes Dual Input */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#12131a] border border-[#282a3a] p-2 flex items-center justify-between">
                <span className="text-zinc-400 text-[7.5px] font-pixel-label font-bold">HOURS:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={focusHrs}
                    onChange={(e) => {
                      const hrs = Math.max(0, Math.min(12, parseInt(e.target.value) || 0));
                      const total = Math.max(1, hrs * 60 + focusMins);
                      setForm({ ...form, focusDuration: total });
                    }}
                    className="w-10 bg-[#090a0d] border border-[#3b3d4f] text-white font-pixel-heading text-center py-0.5 text-[9px] focus:outline-none focus:border-[#ff3b00]"
                  />
                  <span className="text-zinc-500 text-[7px] font-pixel-label">HR</span>
                </div>
              </div>

              <div className="bg-[#12131a] border border-[#282a3a] p-2 flex items-center justify-between">
                <span className="text-zinc-400 text-[7.5px] font-pixel-label font-bold">MINS:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={focusMins}
                    onChange={(e) => {
                      const mins = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                      const total = Math.max(1, focusHrs * 60 + mins);
                      setForm({ ...form, focusDuration: total });
                    }}
                    className="w-10 bg-[#090a0d] border border-[#3b3d4f] text-white font-pixel-heading text-center py-0.5 text-[9px] focus:outline-none focus:border-[#ff3b00]"
                  />
                  <span className="text-zinc-500 text-[7px] font-pixel-label">MIN</span>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              {[
                { label: '25m', val: 25 },
                { label: '45m', val: 45 },
                { label: '1h', val: 60 },
                { label: '1.5h', val: 90 },
                { label: '2h', val: 120 },
                { label: '3h', val: 180 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setForm({ ...form, focusDuration: p.val })}
                  className={`px-2 py-1 text-[7.5px] font-pixel-heading cursor-pointer border transition-colors ${
                    form.focusDuration === p.val
                      ? 'bg-[#ff3b00] text-black border-[#ff5500] font-bold'
                      : 'bg-[#151720] text-zinc-400 border-[#2b2d3d] hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Break Durations */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Short Break */}
            <div className="bg-[#090a0d] border border-[#242630] p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 text-[7.5px] font-pixel-label uppercase font-bold">SHORT BREAK</span>
                <span className="text-zinc-400 font-pixel-heading text-[7.5px]">{form.shortBreakDuration}m</span>
              </div>
              <div className="flex items-center bg-[#12131a] border border-[#282a3a] px-2 py-1">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={form.shortBreakDuration}
                  onChange={(e) => setForm({ ...form, shortBreakDuration: Math.max(1, Math.min(60, parseInt(e.target.value) || 1)) })}
                  className="w-full bg-transparent text-white font-pixel-heading text-center text-[9px] focus:outline-none"
                />
                <span className="text-zinc-500 text-[7px] font-pixel-label ml-1">MIN</span>
              </div>
              <div className="flex gap-1 pt-0.5">
                {[5, 10, 15].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({ ...form, shortBreakDuration: m })}
                    className={`flex-1 py-0.5 text-[7px] font-pixel-heading cursor-pointer border ${
                      form.shortBreakDuration === m
                        ? 'bg-zinc-200 text-black border-white font-bold'
                        : 'bg-[#151720] text-zinc-400 border-[#2b2d3d]'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            {/* Long Break */}
            <div className="bg-[#090a0d] border border-[#242630] p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 text-[7.5px] font-pixel-label uppercase font-bold">LONG BREAK</span>
                <span className="text-zinc-400 font-pixel-heading text-[7.5px]">{form.longBreakDuration}m</span>
              </div>
              <div className="flex items-center bg-[#12131a] border border-[#282a3a] px-2 py-1">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={form.longBreakDuration}
                  onChange={(e) => setForm({ ...form, longBreakDuration: Math.max(1, Math.min(180, parseInt(e.target.value) || 1)) })}
                  className="w-full bg-transparent text-white font-pixel-heading text-center text-[9px] focus:outline-none"
                />
                <span className="text-zinc-500 text-[7px] font-pixel-label ml-1">MIN</span>
              </div>
              <div className="flex gap-1 pt-0.5">
                {[15, 30, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({ ...form, longBreakDuration: m })}
                    className={`flex-1 py-0.5 text-[7px] font-pixel-heading cursor-pointer border ${
                      form.longBreakDuration === m
                        ? 'bg-zinc-200 text-black border-white font-bold'
                        : 'bg-[#151720] text-zinc-400 border-[#2b2d3d]'
                    }`}
                  >
                    {m === 60 ? '1h' : `${m}m`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Intervals & Goals */}
          <div className="bg-[#090a0d] border border-[#242630] p-2.5 space-y-2">
            <div className="flex items-center gap-1.5 text-[8px] font-bold text-[#ff3b00] font-pixel-label uppercase tracking-wider">
              <Target size={11} />
              <span>INTERVALS & GOALS</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-400 text-[7.5px] uppercase mb-1 font-pixel-label">
                  LONG BREAK EVERY:
                </label>
                <div className="flex items-center bg-[#12131a] border border-[#282a3a] px-2 py-1">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={form.longBreakInterval}
                    onChange={(e) => setForm({ ...form, longBreakInterval: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full bg-transparent text-white font-pixel-heading text-center text-[9px] focus:outline-none"
                  />
                  <span className="text-[7px] text-zinc-500 font-pixel-label ml-1 shrink-0">CYCLES</span>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-[7.5px] uppercase mb-1 font-pixel-label">
                  DAILY TARGET:
                </label>
                <div className="flex items-center bg-[#12131a] border border-[#282a3a] px-2 py-1">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={form.dailyTarget}
                    onChange={(e) => setForm({ ...form, dailyTarget: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full bg-transparent text-white font-pixel-heading text-center text-[9px] focus:outline-none"
                  />
                  <span className="text-[7px] text-zinc-500 font-pixel-label ml-1 shrink-0">GOAL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Audio & Preferences */}
          <div className="bg-[#090a0d] border border-[#242630] p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Volume2 size={12} className="text-zinc-400" />
              <span className="text-zinc-300 font-pixel-label text-[8px] uppercase">CHIPTUNE SOUND EFFECTS</span>
            </div>
            <input
              type="checkbox"
              checked={form.soundEnabled}
              onChange={(e) => setForm({ ...form, soundEnabled: e.target.checked })}
              className="w-4 h-4 accent-[#ff3b00] cursor-pointer"
            />
          </div>

          {/* Section 5: Reset Data */}
          <div className="pt-1">
            {showConfirmReset ? (
              <div className="p-2 bg-red-950/40 border border-red-800 text-red-300 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-[7.5px]">
                  <AlertTriangle size={12} className="text-red-400 shrink-0" />
                  <span>RESET ALL LOGS?</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onResetData();
                      setShowConfirmReset(false);
                      onClose();
                    }}
                    className="px-2 py-0.5 bg-red-800 hover:bg-red-700 text-white border border-red-600 text-[7.5px] font-pixel-heading cursor-pointer"
                  >
                    CONFIRM
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(false)}
                    className="px-2 py-0.5 bg-[#1a1b24] text-zinc-300 text-[7.5px] font-pixel-heading cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmReset(true)}
                className="text-[7.5px] text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer font-pixel-label"
              >
                <RotateCcw size={10} />
                <span>RESET ALL LOGS (0, 0)</span>
              </button>
            )}
          </div>
        </form>

        {/* Footer - Fixed with clear Cancel & Save buttons */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-[#0a0b10] border-t border-[#242630] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="pixel-btn-dark px-3 py-1.5 text-[8px] cursor-pointer min-h-[34px] flex items-center"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="pixel-btn-orange px-4 py-1.5 text-[8px] flex items-center gap-1.5 cursor-pointer min-h-[34px]"
          >
            <Save size={12} />
            <span>SAVE SETTINGS</span>
          </button>
        </div>

      </div>
    </div>
  );
};


