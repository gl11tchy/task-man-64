import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Volume2,
  VolumeX,
  Palette,
  Trash2,
  Edit2,
  Check,
  X,
  FolderOpen,
  Columns,
  Plus,
  Github,
} from 'lucide-react';
import { UserMenu } from './UserMenu';
import { useUIStore } from '../stores/uiStore';
import { useProjectStore } from '../stores/projectStore';
import { PROJECT_COLORS } from '../types';

export const SettingsView: React.FC = () => {
  const { muted, toggleMuted, setSidebarMobileOpen } = useUIStore();
  const {
    projects,
    currentProjectId,
    columns,
    updateProject,
    archiveProject,
    addColumn,
    updateColumn,
    deleteColumn,
  } = useProjectStore();

  const currentProject = projects.find(p => p.id === currentProjectId);

  const [editingProjectName, setEditingProjectName] = useState(false);
  const [projectName, setProjectName] = useState(currentProject?.name || '');
  const [repoUrl, setRepoUrl] = useState(currentProject?.repoUrl || '');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [columnName, setColumnName] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#718096');

  // Sync state when project changes
  useEffect(() => {
    setProjectName(currentProject?.name || '');
    setRepoUrl(currentProject?.repoUrl || '');
    setEditingProjectName(false);
  }, [currentProjectId, currentProject?.name, currentProject?.repoUrl]);

  const handleSaveProjectName = async () => {
    if (currentProjectId && projectName.trim()) {
      await updateProject(currentProjectId, { name: projectName.trim() });
    }
    setEditingProjectName(false);
  };

  const handleUpdateProjectColor = async (color: string) => {
    if (currentProjectId) {
      await updateProject(currentProjectId, { color });
    }
  };

  const handleUpdateRepoUrl = async (url: string) => {
    if (currentProjectId) {
      await updateProject(currentProjectId, { repoUrl: url || null });
    }
  };

  const handleArchiveProject = async () => {
    if (currentProjectId && confirm('Are you sure you want to archive this project?')) {
      await archiveProject(currentProjectId);
    }
  };

  const handleStartEditColumn = (columnId: string, name: string) => {
    setEditingColumnId(columnId);
    setColumnName(name);
  };

  const handleSaveColumn = async () => {
    if (editingColumnId && columnName.trim()) {
      await updateColumn(editingColumnId, { name: columnName.trim() });
    }
    setEditingColumnId(null);
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (confirm('Are you sure you want to delete this column? Tasks in this column will be orphaned.')) {
      await deleteColumn(columnId);
    }
  };

  const handleAddColumn = async () => {
    if (newColumnName.trim()) {
      await addColumn(newColumnName.trim(), newColumnColor);
      setNewColumnName('');
      setNewColumnColor('#718096');
      setShowAddColumn(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-black/20 border-b border-white/5 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarMobileOpen(true)}
            className="md:hidden p-2 -ml-2 text-white/60 hover:text-white"
          >
            <Menu size={20} />
          </button>

          <div>
            <h1 className="font-game text-sm text-arcade-purple">SETTINGS</h1>
            <p className="text-xs font-pixel text-white/40 mt-0.5">
              Project configuration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleMuted}
            className="text-white/30 hover:text-white transition-colors"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <UserMenu />
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Project Settings */}
        <section className="bg-arcade-panel/50 rounded-xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <FolderOpen size={16} className="text-arcade-purple" />
            <h2 className="font-game text-xs text-white">PROJECT</h2>
          </div>

          <div className="p-4 space-y-4">
            {/* Project Name */}
            <div>
              <label className="text-xs font-pixel text-white/40 mb-2 block">Name</label>
              {editingProjectName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 font-pixel text-sm text-white focus:outline-none focus:border-arcade-purple"
                    maxLength={50}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveProjectName}
                    className="p-2 text-arcade-purple hover:bg-arcade-purple/10 rounded"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingProjectName(false);
                      setProjectName(currentProject?.name || '');
                    }}
                    className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-sm text-white">{currentProject?.name}</span>
                  <button
                    onClick={() => {
                      setProjectName(currentProject?.name || '');
                      setEditingProjectName(true);
                    }}
                    className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Project Color */}
            <div>
              <label className="text-xs font-pixel text-white/40 mb-2 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleUpdateProjectColor(color)}
                    className={`w-8 h-8 rounded-lg transition-transform ${
                      currentProject?.color === color ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Repository URL (for AUTOCLAUDE) */}
            <div>
              <label className="text-xs font-pixel text-white/40 mb-2 block flex items-center gap-2">
                <Github size={12} />
                Repository URL
                <span className="text-arcade-cyan/60">(AUTOCLAUDE)</span>
              </label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onBlur={() => handleUpdateRepoUrl(repoUrl)}
                placeholder="https://github.com/user/repo"
                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 font-pixel text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-arcade-cyan"
              />
              <p className="text-xs font-pixel text-white/30 mt-1">
                Link this project to a GitHub repo for AUTOCLAUDE automation
              </p>
            </div>

            {/* Archive Project */}
            <div className="pt-4 border-t border-white/5">
              <button
                onClick={handleArchiveProject}
                className="flex items-center gap-2 text-red-400/60 hover:text-red-400 font-pixel text-xs"
              >
                <Trash2 size={14} />
                Archive Project
              </button>
            </div>
          </div>
        </section>

        {/* Kanban Columns */}
        <section className="bg-arcade-panel/50 rounded-xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Columns size={16} className="text-arcade-pink" />
              <h2 className="font-game text-xs text-white">KANBAN COLUMNS</h2>
            </div>
            <button
              onClick={() => setShowAddColumn(true)}
              className="flex items-center gap-1 text-arcade-pink/60 hover:text-arcade-pink font-pixel text-xs"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          <div className="p-4 space-y-2">
            {columns
              .sort((a, b) => a.position - b.position)
              .map((column) => (
                <div
                  key={column.id}
                  className="flex items-center gap-3 p-3 bg-black/20 rounded-lg"
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: column.color }}
                  />

                  {editingColumnId === column.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={columnName}
                        onChange={(e) => setColumnName(e.target.value)}
                        className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 font-pixel text-sm text-white focus:outline-none focus:border-arcade-pink"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveColumn}
                        className="p-1 text-arcade-pink hover:bg-arcade-pink/10 rounded"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingColumnId(null)}
                        className="p-1 text-white/40 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 font-pixel text-sm text-white">
                        {column.name}
                      </span>
                      {column.isDoneColumn && (
                        <span className="text-xs font-pixel text-arcade-cyan/60 px-2 py-0.5 bg-arcade-cyan/10 rounded">
                          Done
                        </span>
                      )}
                      <button
                        onClick={() => handleStartEditColumn(column.id, column.name)}
                        className="p-1 text-white/40 hover:text-white hover:bg-white/5 rounded opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 size={12} />
                      </button>
                      {!column.isDoneColumn && (
                        <button
                          onClick={() => handleDeleteColumn(column.id)}
                          className="p-1 text-red-400/40 hover:text-red-400 hover:bg-red-400/10 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}

            {/* Add Column Form */}
            <AnimatePresence>
              {showAddColumn && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-black/20 rounded-lg space-y-3"
                >
                  <input
                    type="text"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="Column name..."
                    className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 font-pixel text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-arcade-pink"
                    autoFocus
                  />
                  <div className="flex gap-1 flex-wrap">
                    {['#718096', '#3182ce', '#d69e2e', '#38a169', '#e53e3e', '#9d00ff'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewColumnColor(color)}
                        className={`w-6 h-6 rounded ${
                          newColumnColor === color ? 'ring-2 ring-white scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddColumn}
                      disabled={!newColumnName.trim()}
                      className="flex-1 bg-arcade-pink/20 text-arcade-pink font-pixel text-xs py-2 rounded hover:bg-arcade-pink/30 disabled:opacity-50"
                    >
                      Add Column
                    </button>
                    <button
                      onClick={() => setShowAddColumn(false)}
                      className="px-3 text-white/60 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </>
  );
};
