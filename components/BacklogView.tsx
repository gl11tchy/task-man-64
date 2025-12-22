import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
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
import {
  GripVertical,
  Trash2,
  ArrowRight,
  Search,
  Filter,
  CheckSquare,
  Square,
  Calendar,
  Tag,
  Plus,
} from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { Task } from '../types';

// ============ Backlog Item Component ============

interface BacklogItemProps {
  task: Task;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onPromote: () => void;
  onDelete: () => void;
  isDragging?: boolean;
}

const BacklogItem: React.FC<BacklogItemProps> = ({
  task,
  isSelected,
  onSelect,
  onPromote,
  onDelete,
  isDragging,
}) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 bg-arcade-panel/50 rounded-lg border border-white/5
        hover:bg-arcade-panel/80 transition-all group
        ${isDragging ? 'shadow-lg shadow-arcade-cyan/30 scale-102' : ''}
        ${isSelected ? 'border-arcade-cyan/50 bg-arcade-cyan/10' : ''}
      `}
    >
      {/* Checkbox */}
      <button
        onClick={() => onSelect(!isSelected)}
        className={`shrink-0 ${isSelected ? 'text-arcade-cyan' : 'text-white/30 hover:text-white/60'}`}
      >
        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>

      {/* Drag Handle */}
      <div className="shrink-0 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/40">
        <GripVertical size={16} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-pixel text-sm text-white truncate">{task.text}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-xs font-pixel text-white/30">
            <Calendar size={10} />
            {formatDate(task.createdAt)}
          </span>
          {task.tags && task.tags.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-pixel text-white/30">
              <Tag size={10} />
              {task.tags.length}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onPromote}
          className="p-2 text-arcade-cyan/60 hover:text-arcade-cyan hover:bg-arcade-cyan/10 rounded-lg transition-colors"
          title="Promote to Board"
        >
          <ArrowRight size={16} />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// ============ Sortable Backlog Item ============

interface SortableBacklogItemProps extends Omit<BacklogItemProps, 'isDragging'> {}

const SortableBacklogItem: React.FC<SortableBacklogItemProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BacklogItem {...props} isDragging={isDragging} />
    </div>
  );
};

// ============ Quick Capture Input ============

interface QuickCaptureProps {
  onAdd: (text: string) => void;
}

const QuickCapture: React.FC<QuickCaptureProps> = ({ onAdd }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-white/5">
      <div className="flex items-center gap-3 bg-black/30 rounded-lg px-4 py-3 border border-white/10 focus-within:border-arcade-cyan/50">
        <Plus size={18} className="text-arcade-cyan/60" />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add to backlog... (Press Enter)"
          className="flex-1 bg-transparent font-pixel text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
        {text.trim() && (
          <button
            type="submit"
            className="px-3 py-1 bg-arcade-cyan/20 text-arcade-cyan font-pixel text-xs rounded-lg hover:bg-arcade-cyan/30 transition-colors"
          >
            Add
          </button>
        )}
      </div>
    </form>
  );
};

// ============ Bulk Actions Bar ============

interface BulkActionsProps {
  selectedCount: number;
  onPromote: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({
  selectedCount,
  onPromote,
  onDelete,
  onClearSelection,
}) => (
  <motion.div
    initial={{ y: 100, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: 100, opacity: 0 }}
    className="absolute bottom-0 left-0 right-0 bg-arcade-panel border-t border-white/10 px-4 py-3"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="font-pixel text-sm text-white">
          {selectedCount} selected
        </span>
        <button
          onClick={onClearSelection}
          className="text-white/40 hover:text-white text-xs font-pixel"
        >
          Clear
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onPromote}
          className="flex items-center gap-2 px-4 py-2 bg-arcade-cyan/20 text-arcade-cyan font-pixel text-xs rounded-lg hover:bg-arcade-cyan/30 transition-colors"
        >
          <ArrowRight size={14} />
          Promote to Board
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 font-pixel text-xs rounded-lg hover:bg-red-500/30 transition-colors"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  </motion.div>
);

// ============ Main Backlog View ============

export const BacklogView: React.FC = () => {
  const {
    tasks,
    currentProjectId,
    addTask,
    deleteTask,
    promoteFromBacklog,
    reorderBacklogTasks,
  } = useProjectStore();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter backlog tasks
  const backlogTasks = useMemo(() => {
    return tasks
      .filter((t) =>
        t.projectId === currentProjectId &&
        t.isInBacklog
      )
      .sort((a, b) => (a.backlogPosition ?? 0) - (b.backlogPosition ?? 0));
  }, [tasks, currentProjectId]);

  // Filter by search
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return backlogTasks;
    const query = searchQuery.toLowerCase();
    return backlogTasks.filter((t) =>
      t.text.toLowerCase().includes(query)
    );
  }, [backlogTasks, searchQuery]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = backlogTasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = backlogTasks.findIndex((t) => t.id === active.id);
    const newIndex = backlogTasks.findIndex((t) => t.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(backlogTasks, oldIndex, newIndex);
      reorderBacklogTasks(reordered);
    }
  };

  const handleAddToBacklog = async (text: string) => {
    await addTask(text, true);
  };

  const handleSelect = (taskId: string, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedIds(newSelected);
  };

  const handlePromoteSingle = async (taskId: string) => {
    await promoteFromBacklog(taskId);
  };

  const handleDeleteSingle = async (taskId: string) => {
    await deleteTask(taskId);
    selectedIds.delete(taskId);
    setSelectedIds(new Set(selectedIds));
  };

  const handleBulkPromote = async () => {
    for (const id of selectedIds) {
      await promoteFromBacklog(id);
    }
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteTask(id);
    }
    setSelectedIds(new Set());
  };

  const taskIds = useMemo(() => filteredTasks.map((t) => t.id), [filteredTasks]);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div>
          <h2 className="font-game text-sm text-arcade-cyan">BACKLOG</h2>
          <p className="text-xs font-pixel text-white/40 mt-1">
            {backlogTasks.length} item{backlogTasks.length !== 1 ? 's' : ''} waiting
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2 border border-white/10">
          <Search size={14} className="text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="bg-transparent font-pixel text-xs text-white placeholder:text-white/30 focus:outline-none w-32"
          />
        </div>
      </div>

      {/* Quick Capture */}
      <QuickCapture onAdd={handleAddToBacklog} />

      {/* Task List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ paddingBottom: selectedIds.size > 0 ? 80 : 16 }}>
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {filteredTasks.map((task) => (
              <SortableBacklogItem
                key={task.id}
                task={task}
                isSelected={selectedIds.has(task.id)}
                onSelect={(selected) => handleSelect(task.id, selected)}
                onPromote={() => handlePromoteSingle(task.id)}
                onDelete={() => handleDeleteSingle(task.id)}
              />
            ))}
          </SortableContext>

          {filteredTasks.length === 0 && (
            <div className="py-12 text-center">
              {searchQuery ? (
                <p className="text-white/40 font-pixel text-sm">No results found</p>
              ) : (
                <>
                  <p className="text-white/40 font-pixel text-sm mb-2">Your backlog is empty</p>
                  <p className="text-white/30 font-pixel text-xs">
                    Add tasks above to capture ideas for later
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <DragOverlay>
          {activeTask && (
            <BacklogItem
              task={activeTask}
              isSelected={false}
              onSelect={() => {}}
              onPromote={() => {}}
              onDelete={() => {}}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkActions
            selectedCount={selectedIds.size}
            onPromote={handleBulkPromote}
            onDelete={handleBulkDelete}
            onClearSelection={() => setSelectedIds(new Set())}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
