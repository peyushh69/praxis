import React, { useState } from 'react';
import { Plus, CheckSquare, Square, Trash2 } from 'lucide-react';
import { TaskItem } from '../types';

interface FocusTasksProps {
  tasks: TaskItem[];
  activeTaskId?: string | null;
  onSelectTask: (taskId: string | null) => void;
  onAddTask: (title: string, estimatedPomodoros: number) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const FocusTasks: React.FC<FocusTasksProps> = ({
  tasks,
  activeTaskId,
  onSelectTask,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [estimated, setEstimated] = useState(2);
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTask(newTitle.trim(), estimated);
    setNewTitle('');
    setEstimated(2);
    setIsAdding(false);
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 font-pixel-heading">
      <div className="bg-[#0e0f14] border-2 border-[#242630] p-4 sm:p-6 shadow-xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#242630] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              FOCUS TASKS
            </h3>
            <span className="text-[8px] font-pixel-label text-zinc-500">
              [{completedCount}/{tasks.length} COMPLETED]
            </span>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="pixel-btn-orange px-3 py-1.5 text-[8px] flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={11} />
            <span>{isAdding ? 'CANCEL' : 'NEW TASK'}</span>
          </button>
        </div>

        {/* Add Task Form */}
        {isAdding && (
          <form onSubmit={handleSubmit} className="bg-[#090a0d] border-2 border-[#ff3b00] p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="ENTER TASK TITLE..."
                autoFocus
                className="flex-1 bg-[#14151c] border border-[#2e3040] px-3 py-2 text-[9px] font-pixel-heading text-white placeholder-zinc-600 focus:outline-none focus:border-[#ff3b00]"
              />

              <div className="flex items-center gap-2">
                <span className="text-[8px] text-zinc-400 font-pixel-label whitespace-nowrap">POMODOROS:</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={estimated}
                  onChange={(e) => setEstimated(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 bg-[#14151c] border border-[#2e3040] px-2 py-2 text-[9px] font-pixel-heading text-white text-center focus:outline-none focus:border-[#ff3b00]"
                />
              </div>

              <button
                type="submit"
                className="pixel-btn-orange px-4 py-2 text-[8px] cursor-pointer"
              >
                ADD
              </button>
            </div>
          </form>
        )}

        {/* Task List */}
        {tasks.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-[#242630] text-zinc-600 text-[9px] font-pixel-label">
            NO ACTIVE TASKS RECORDED. CLICK "NEW TASK" TO BEGIN.
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const isActive = activeTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-3 border-2 transition-all ${
                    isActive
                      ? 'bg-[#181922] border-[#ff3b00] shadow-[0_0_10px_rgba(255,59,0,0.2)]'
                      : task.completed
                      ? 'bg-[#0a0b0e] border-[#1a1b22] text-zinc-600'
                      : 'bg-[#101117] border-[#22242e] hover:border-[#353847] text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className="text-zinc-400 hover:text-[#ff3b00] transition-colors shrink-0 cursor-pointer"
                    >
                      {task.completed ? (
                        <CheckSquare size={16} className="text-[#39d353]" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>

                    <button
                      onClick={() => onSelectTask(isActive ? null : task.id)}
                      className={`text-[9px] text-left truncate font-pixel-label cursor-pointer ${
                        task.completed ? 'line-through text-zinc-600' : 'text-zinc-200 hover:text-[#ff3b00]'
                      }`}
                      title={isActive ? 'Click to deselect' : 'Click to set as current focus target'}
                    >
                      {task.title}
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Progress Indicator */}
                    <div className="text-[8px] font-pixel-heading text-zinc-400">
                      <span className="text-white">{task.completedPomodoros}</span>
                      <span className="text-zinc-600">/{task.estimatedPomodoros}</span>
                    </div>

                    {/* Active Badge */}
                    <button
                      onClick={() => onSelectTask(isActive ? null : task.id)}
                      className={`px-2 py-1 text-[8px] border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#ff3b00] text-black border-[#ff5500] font-bold'
                          : 'pixel-btn-dark'
                      }`}
                    >
                      {isActive ? 'ACTIVE' : 'SELECT'}
                    </button>

                    {/* Delete Action */}
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1 text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

