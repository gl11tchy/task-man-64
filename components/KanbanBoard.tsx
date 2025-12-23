import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  DragCancelEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Flag, MoreHorizontal, Trash2, ArrowLeft, Bot, ExternalLink, MessageSquare } from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/uiStore';
import { Task, KanbanColumn } from '../types';

// ============ Task Card Component ============

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  onDelete?: () => void;
  onMoveToBacklog?: () => void;
  onToggleAutoclaude?: () => void;
  onAddFeedback?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, isDragging, onDelete, onMoveToBacklog, onToggleAutoclaude, onAddFeedback }) => {
  const [showMenu, setShowMenu] = useState(false);

  const priorityColors = {
    high: '#e53e3e',
    medium: '#d69e2e',
    low: '#38a169',
  };

  const formatRelativeDate = (timestamp: number) => {
    const diff = timestamp - Date.now();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `${days} days`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div
      className={`
        bg-arcade-panel/80 rounded-lg p-3 border-l-4 relative group select-none
        transition-all duration-200 ease-out
        ${isDragging
          ? 'shadow-xl shadow-arcade-pink/40 scale-105 rotate-1 ring-2 ring-arcade-pink/50 bg-arcade-panel'
          : 'hover:bg-arcade-panel hover:shadow-md hover:shadow-arcade-pink/10'}
      `}
      style={{
        borderLeftColor: task.priority ? priorityColors[task.priority] : 'transparent',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-pixel text-sm text-white leading-relaxed flex-1">{task.text}</p>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-white transition-all"
          >
            <MoreHorizontal size={14} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 bg-arcade-screen border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden min-w-32"
              >
                {onMoveToBacklog && (
                  <button
                    onClick={() => {
                      onMoveToBacklog();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <ArrowLeft size={14} />
                    <span className="font-pixel text-xs">To Backlog</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span className="font-pixel text-xs">Delete</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {task.dueDate && (
          <span className="flex items-center gap-1 text-xs font-pixel text-white/40">
            <Calendar size={10} />
            {formatRelativeDate(task.dueDate)}
          </span>
        )}
        {task.priority && (
          <span
            className="text-xs font-pixel px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${priorityColors[task.priority]}20`,
              color: priorityColors[task.priority],
            }}
          >
            {task.priority}
          </span>
        )}

        {/* AUTOCLAUDE toggle */}
        {onToggleAutoclaude && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAutoclaude();
            }}
            className={`p-1 rounded transition-colors ${
              task.autoclaudeEnabled
                ? 'text-arcade-cyan bg-arcade-cyan/10'
                : 'text-white/20 hover:text-white/40 hover:bg-white/5'
            }`}
            title={task.autoclaudeEnabled ? 'AUTOCLAUDE enabled' : 'Enable AUTOCLAUDE'}
          >
            <Bot size={12} />
          </button>
        )}

        {/* PR Link */}
        {task.prUrl && (
          <a
            href={task.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs font-pixel text-arcade-cyan hover:text-arcade-cyan/80 transition-colors"
          >
            <ExternalLink size={10} />
            PR
          </a>
        )}

        {/* Feedback indicator */}
        {task.feedback && (
          <span className="flex items-center gap-1 text-xs font-pixel text-yellow-400/80" title={task.feedback}>
            <MessageSquare size={10} />
            Feedback
          </span>
        )}

        {/* Add feedback button (only for resolved tasks with PR) */}
        {task.prUrl && !task.feedback && onAddFeedback && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddFeedback();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-white/40 transition-all"
            title="Add feedback"
          >
            <MessageSquare size={10} />
          </button>
        )}

        {/* Error indicator */}
        {task.lastError && (
          <span className="text-xs font-pixel text-red-400/80" title={task.lastError}>
            Error ({task.attemptCount})
          </span>
        )}
      </div>
    </div>
  );
};

// ============ Sortable Task Card ============

interface SortableTaskCardProps {
  task: Task;
  onDelete: () => void;
  onMoveToBacklog: () => void;
  onToggleAutoclaude: () => void;
  onAddFeedback: () => void;
}

const SortableTaskCard: React.FC<SortableTaskCardProps> = ({ task, onDelete, onMoveToBacklog, onToggleAutoclaude, onAddFeedback }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({ id: task.id });

  // Smooth transitions for transform and opacity
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        relative touch-none
        ${isDragging ? 'z-50' : ''}
        ${isSorting && !isDragging ? 'transition-transform duration-200' : ''}
      `}
    >
      <TaskCard
        task={task}
        isDragging={isDragging}
        onDelete={onDelete}
        onMoveToBacklog={onMoveToBacklog}
        onToggleAutoclaude={onToggleAutoclaude}
        onAddFeedback={onAddFeedback}
      />
    </div>
  );
};

// ============ Kanban Column Component ============

interface KanbanColumnProps {
  column: KanbanColumn;
  tasks: Task[];
  onAddTask: (columnId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveToBacklog: (taskId: string) => void;
  onToggleAutoclaude: (taskId: string) => void;
  onAddFeedback: (taskId: string) => void;
}

const KanbanColumnComponent: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  onAddTask,
  onDeleteTask,
  onMoveToBacklog,
  onToggleAutoclaude,
  onAddFeedback,
}) => {
  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id: column.id,
    data: { type: 'column' },
  });

  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-shrink-0 w-72 rounded-xl border flex flex-col max-h-full
        transition-all duration-200 ease-out
        ${isOver
          ? 'bg-black/30 border-arcade-pink/30 shadow-lg shadow-arcade-pink/10'
          : 'bg-black/20 border-white/5'}
      `}
    >
      {/* Column Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-pixel text-sm text-white">{column.name}</h3>
          <span className="bg-white/10 text-white/60 text-xs font-pixel px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onDelete={() => onDeleteTask(task.id)}
              onMoveToBacklog={() => onMoveToBacklog(task.id)}
              onToggleAutoclaude={() => onToggleAutoclaude(task.id)}
              onAddFeedback={() => onAddFeedback(task.id)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className={`
            py-8 text-center rounded-lg border-2 border-dashed
            transition-all duration-200
            ${isOver
              ? 'border-arcade-pink/40 bg-arcade-pink/5'
              : 'border-transparent'}
          `}>
            <p className={`font-pixel text-xs transition-colors duration-200 ${isOver ? 'text-arcade-pink/60' : 'text-white/30'}`}>
              {isOver ? 'Drop here' : 'No tasks'}
            </p>
          </div>
        )}
      </div>

      {/* Add Task Button */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={() => onAddTask(column.id)}
          className="w-full flex items-center justify-center gap-2 py-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          <span className="font-pixel text-xs">Add Task</span>
        </button>
      </div>
    </div>
  );
};

// ============ Quick Add Modal ============

interface QuickAddModalProps {
  isOpen: boolean;
  columnId: string | null;
  onClose: () => void;
  onAdd: (text: string, columnId: string) => void;
}

const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, columnId, onClose, onAdd }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim() && columnId) {
      onAdd(text.trim(), columnId);
      setText('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-arcade-panel border border-white/10 rounded-xl p-4 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-game text-sm text-arcade-pink mb-4">ADD TASK</h3>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onClose();
          }}
          placeholder="What needs to be done?"
          className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 font-pixel text-white placeholder:text-white/30 focus:outline-none focus:border-arcade-pink"
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 font-pixel text-sm text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="px-4 py-2 bg-arcade-pink/20 text-arcade-pink font-pixel text-sm rounded-lg hover:bg-arcade-pink/30 transition-colors disabled:opacity-50"
          >
            Add Task
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ============ Feedback Modal ============

interface FeedbackModalProps {
  isOpen: boolean;
  taskId: string | null;
  taskText: string;
  onClose: () => void;
  onSubmit: (taskId: string, feedback: string) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, taskId, taskText, onClose, onSubmit }) => {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (feedback.trim() && taskId) {
      onSubmit(taskId, feedback.trim());
      setFeedback('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-arcade-panel border border-white/10 rounded-xl p-4 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-game text-sm text-yellow-400 mb-2">ADD FEEDBACK</h3>
        <p className="font-pixel text-xs text-white/60 mb-4 truncate">{taskText}</p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
          placeholder="Describe what changes are needed..."
          className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 font-pixel text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400 min-h-[100px] resize-none"
          autoFocus
        />
        <p className="text-xs font-pixel text-white/30 mt-2 mb-4">
          This will move the task back to In Progress for AUTOCLAUDE to address.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 font-pixel text-sm text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!feedback.trim()}
            className="px-4 py-2 bg-yellow-400/20 text-yellow-400 font-pixel text-sm rounded-lg hover:bg-yellow-400/30 transition-colors disabled:opacity-50"
          >
            Submit Feedback
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ============ Main Kanban Board ============

export const KanbanBoard: React.FC = () => {
  const {
    columns,
    tasks,
    currentProjectId,
    addTask,
    updateTask,
    deleteTask,
    moveTaskToColumn,
    moveTaskToBacklog,
    reorderKanbanTasks,
  } = useProjectStore();

  const { addScore } = useUIStore();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [quickAddColumnId, setQuickAddColumnId] = useState<string | null>(null);
  const [feedbackTaskId, setFeedbackTaskId] = useState<string | null>(null);
  // Store original task position for rollback if drag is canceled
  const [originalTaskState, setOriginalTaskState] = useState<{
    columnId: string | null;
    position: number;
    wasCompleted: boolean;
  } | null>(null);

  // Smooth drop animation configuration
  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
    duration: 250,
    easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Lower distance for more responsive drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // Short delay for touch to distinguish from scroll
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    columns.forEach((col) => {
      grouped[col.id] = tasks
        .filter((t) =>
          t.projectId === currentProjectId &&
          t.kanbanColumnId === col.id &&
          !t.isInBacklog
        )
        .sort((a, b) => (a.kanbanPosition ?? 0) - (b.kanbanPosition ?? 0));
    });

    return grouped;
  }, [columns, tasks, currentProjectId]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
      // Store original position for potential rollback
      setOriginalTaskState({
        columnId: task.kanbanColumnId ?? null,
        position: task.kanbanPosition ?? 0,
        wasCompleted: task.status === 'completed',
      });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTaskData = tasks.find((t) => t.id === activeId);
    if (!activeTaskData) return;

    // Find which column the item is being dragged over
    const overColumn = columns.find((col) => col.id === overId);
    const overTask = tasks.find((t) => t.id === overId);

    if (overColumn) {
      // Dragging over a column directly
      if (activeTaskData.kanbanColumnId !== overColumn.id) {
        // Don't persist during drag - only update local state
        moveTaskToColumn(activeId, overColumn.id, 0, false);
      }
    } else if (overTask) {
      // Dragging over another task
      if (activeTaskData.kanbanColumnId !== overTask.kanbanColumnId) {
        // Cross-column move
        const overTaskColumn = overTask.kanbanColumnId;
        if (overTaskColumn) {
          // Don't persist during drag - only update local state
          moveTaskToColumn(activeId, overTaskColumn, overTask.kanbanPosition ?? 0, false);
        }
      } else {
        // Same-column reordering - provide visual feedback
        const columnId = activeTaskData.kanbanColumnId;
        if (columnId) {
          const columnTasks = tasksByColumn[columnId] || [];
          const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
          const newIndex = columnTasks.findIndex((t) => t.id === overId);

          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            // Reorder locally for visual feedback
            const reordered = arrayMove(columnTasks, oldIndex, newIndex) as Task[];
            reorderKanbanTasks(columnId, reordered.map(t => t.id));
          }
        }
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    // If no valid drop target, reset to original position
    if (!over) {
      if (originalTaskState && active.id) {
        const activeId = active.id as string;
        if (originalTaskState.columnId) {
          // Reset to original column and position (don't persist, just fix local state)
          await moveTaskToColumn(activeId, originalTaskState.columnId, originalTaskState.position, true);
        }
      }
      setOriginalTaskState(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTaskData = tasks.find((t) => t.id === activeId);
    if (!activeTaskData) {
      setOriginalTaskState(null);
      return;
    }

    const overColumn = columns.find((col) => col.id === overId);
    const overTask = tasks.find((t) => t.id === overId);

    // Use original column to detect actual cross-column moves
    // (local state may have been updated during handleDragOver)
    const originalColumnId = originalTaskState?.columnId;
    const isSameColumnReorder = overTask && originalColumnId === overTask.kanbanColumnId;

    // Determine target column for score calculation
    let targetColumn: KanbanColumn | undefined;

    if (overColumn) {
      targetColumn = overColumn;
      // Dropped on a column - persist the final position
      await moveTaskToColumn(activeId, overColumn.id, 0, true);
    } else if (overTask && isSameColumnReorder) {
      // Reordering within the same column - just persist the order
      const columnId = overTask.kanbanColumnId;
      if (columnId) {
        const columnTasks = tasksByColumn[columnId] || [];
        const reorderedIds = columnTasks.map(t => t.id);
        // Persist using batch update (already reordered in handleDragOver)
        await useProjectStore.getState().taskStorage?.updateTaskPositions(
          reorderedIds.map((id, index) => ({ id, kanbanPosition: index }))
        );
      }
    } else if (overTask) {
      // Dropped on a task in a different column - persist the move
      const targetColumnId = overTask.kanbanColumnId;
      if (targetColumnId) {
        targetColumn = columns.find(c => c.id === targetColumnId);
        await moveTaskToColumn(activeId, targetColumnId, overTask.kanbanPosition ?? 0, true);
      }
    }

    // Award points if task was moved to Done column and wasn't already completed
    if (targetColumn?.isDoneColumn && originalTaskState && !originalTaskState.wasCompleted) {
      addScore(100);
    }

    setOriginalTaskState(null);
  };

  const handleDragCancel = async (event: DragCancelEvent) => {
    const { active } = event;
    setActiveTask(null);

    // Reset to original position on cancel
    if (originalTaskState && active.id) {
      const activeId = active.id as string;
      if (originalTaskState.columnId) {
        await moveTaskToColumn(activeId, originalTaskState.columnId, originalTaskState.position, true);
      }
    }

    setOriginalTaskState(null);
  };

  const handleAddTask = async (text: string, columnId: string) => {
    await addTask(text, false, columnId);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
  };

  const handleMoveToBacklog = async (taskId: string) => {
    await moveTaskToBacklog(taskId);
  };

  const handleToggleAutoclaude = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await updateTask(taskId, { autoclaudeEnabled: !task.autoclaudeEnabled });
    }
  };

  const handleAddFeedback = (taskId: string) => {
    setFeedbackTaskId(taskId);
  };

  const handleSubmitFeedback = async (taskId: string, feedback: string) => {
    // Find the "In Progress" column - try multiple strategies for reliability
    // 1. Try to find by position (second column in default setup)
    // 2. Fall back to name matching
    const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
    const inProgressColumn =
      sortedColumns.find(c => c.position === 1 && !c.isDoneColumn) ||
      columns.find(c => c.name.toLowerCase().includes('progress')) ||
      columns.find(c => c.name.toLowerCase().includes('active')) ||
      columns.find(c => c.name.toLowerCase().includes('working'));

    if (inProgressColumn) {
      // Move task back to In Progress with feedback
      await updateTask(taskId, { feedback });
      await moveTaskToColumn(taskId, inProgressColumn.id, 0, true);
    } else {
      // Just add feedback if no in progress column found
      await updateTask(taskId, { feedback });
    }
  };

  const feedbackTask = feedbackTaskId ? tasks.find(t => t.id === feedbackTaskId) : null;

  if (columns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/40 font-pixel">Loading board...</p>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 h-full min-w-max">
            {columns
              .sort((a, b) => a.position - b.position)
              .map((column) => (
                <KanbanColumnComponent
                  key={column.id}
                  column={column}
                  tasks={tasksByColumn[column.id] || []}
                  onAddTask={setQuickAddColumnId}
                  onDeleteTask={handleDeleteTask}
                  onMoveToBacklog={handleMoveToBacklog}
                  onToggleAutoclaude={handleToggleAutoclaude}
                  onAddFeedback={handleAddFeedback}
                />
              ))}
          </div>
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask && (
            <div className="cursor-grabbing">
              <TaskCard task={activeTask} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {quickAddColumnId && (
          <QuickAddModal
            isOpen={!!quickAddColumnId}
            columnId={quickAddColumnId}
            onClose={() => setQuickAddColumnId(null)}
            onAdd={handleAddTask}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {feedbackTaskId && feedbackTask && (
          <FeedbackModal
            isOpen={!!feedbackTaskId}
            taskId={feedbackTaskId}
            taskText={feedbackTask.text}
            onClose={() => setFeedbackTaskId(null)}
            onSubmit={handleSubmitFeedback}
          />
        )}
      </AnimatePresence>
    </>
  );
};
