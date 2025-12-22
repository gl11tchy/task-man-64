import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, FolderOpen, Check, Plus } from 'lucide-react';
import { Project, PROJECT_COLORS } from '../types';
import { useProjectStore } from '../stores/projectStore';

interface QuickSwitcherProps {
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
  projects: Project[];
}

export const QuickSwitcher: React.FC<QuickSwitcherProps> = ({
  onClose,
  onSelectProject,
  projects,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { currentProjectId, createProject, setCurrentProject } = useProjectStore();

  // Filter projects based on query
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreating) {
          setIsCreating(false);
          setNewProjectName('');
        } else {
          onClose();
        }
        return;
      }

      if (isCreating) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredProjects.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredProjects.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredProjects[selectedIndex]) {
          onSelectProject(filteredProjects[selectedIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredProjects, selectedIndex, onClose, onSelectProject, isCreating]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    const project = await createProject(
      newProjectName.trim(),
      PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]
    );

    if (project) {
      setCurrentProject(project.id);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[20vh] z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="w-full max-w-md mx-4 bg-arcade-panel border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <Search size={18} className="text-white/40" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects..."
            className="flex-1 bg-transparent font-pixel text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          <div className="text-xs font-pixel text-white/30 px-2 py-1 bg-white/5 rounded">
            ⌘K
          </div>
        </div>

        {/* Project List */}
        {!isCreating ? (
          <div className="max-h-64 overflow-y-auto">
            {filteredProjects.map((project, index) => (
              <button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 transition-colors
                  ${index === selectedIndex ? 'bg-arcade-pink/20' : 'hover:bg-white/5'}
                `}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: project.color }}
                >
                  {project.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-pixel text-sm text-white">{project.name}</p>
                  {project.description && (
                    <p className="text-xs font-pixel text-white/40 truncate">
                      {project.description}
                    </p>
                  )}
                </div>
                {project.id === currentProjectId && (
                  <Check size={16} className="text-arcade-pink" />
                )}
              </button>
            ))}

            {filteredProjects.length === 0 && query && (
              <div className="py-8 text-center">
                <p className="text-white/40 font-pixel text-sm">No projects found</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
              }}
              placeholder="Project name..."
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 font-pixel text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-arcade-pink"
              autoFocus
              maxLength={50}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="flex-1 bg-arcade-pink/20 text-arcade-pink font-pixel text-xs py-2 rounded-lg hover:bg-arcade-pink/30 transition-colors disabled:opacity-50"
              >
                Create Project
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewProjectName('');
                }}
                className="px-4 py-2 text-white/60 hover:text-white font-pixel text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!isCreating && (
          <div className="px-4 py-3 border-t border-white/5">
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-white/40 hover:text-white font-pixel text-xs transition-colors"
            >
              <Plus size={14} />
              Create New Project
            </button>
          </div>
        )}

        {/* Keyboard hints */}
        {!isCreating && (
          <div className="px-4 py-2 border-t border-white/5 flex items-center justify-center gap-4">
            <span className="text-xs font-pixel text-white/20">
              <span className="px-1.5 py-0.5 bg-white/5 rounded mr-1">↑↓</span> Navigate
            </span>
            <span className="text-xs font-pixel text-white/20">
              <span className="px-1.5 py-0.5 bg-white/5 rounded mr-1">↵</span> Select
            </span>
            <span className="text-xs font-pixel text-white/20">
              <span className="px-1.5 py-0.5 bg-white/5 rounded mr-1">Esc</span> Close
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
};
