import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Kanban,
  ListTodo,
  Settings,
  ChevronLeft,
  ChevronDown,
  Plus,
  FolderOpen,
  X,
  Check,
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useProjectStore } from '../stores/projectStore';
import { PROJECT_COLORS } from '../types';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
  badge?: number;
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  path,
  isActive,
  collapsed,
  onClick,
  badge,
}) => (
  <motion.button
    onClick={onClick}
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative
      ${isActive
        ? 'bg-arcade-pink/20 text-arcade-pink shadow-neon-pink/20'
        : 'text-white/60 hover:text-white hover:bg-white/5'
      }
    `}
    whileHover={{ x: collapsed ? 0 : 4 }}
    whileTap={{ scale: 0.98 }}
  >
    <span className="shrink-0">{icon}</span>
    {!collapsed && (
      <>
        <span className="font-pixel text-sm">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto bg-arcade-pink/30 text-arcade-pink text-xs font-pixel px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </>
    )}
    {isActive && (
      <motion.div
        layoutId="activeIndicator"
        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-arcade-pink rounded-r-full shadow-neon-pink"
      />
    )}
  </motion.button>
);

interface ProjectSwitcherProps {
  collapsed: boolean;
}

const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({ collapsed }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    projects,
    currentProjectId,
    setCurrentProject,
    createProject,
  } = useProjectStore();

  const currentProject = projects.find(p => p.id === currentProjectId);
  const activeProjects = projects.filter(p => !p.isArchived);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    const project = await createProject(newProjectName.trim(), selectedColor);
    if (project) {
      setCurrentProject(project.id);
      setNewProjectName('');
      setIsCreating(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {collapsed ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: currentProject?.color || PROJECT_COLORS[0] }}
          >
            {currentProject?.name.charAt(0).toUpperCase() || 'P'}
          </div>
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
            style={{ backgroundColor: currentProject?.color || PROJECT_COLORS[0] }}
          >
            {currentProject?.name.charAt(0).toUpperCase() || 'P'}
          </div>
          <div className="flex-1 text-left overflow-hidden">
            <p className="font-pixel text-sm text-white truncate">
              {currentProject?.name || 'Select Project'}
            </p>
            <p className="text-xs text-white/40 font-pixel">
              {activeProjects.length} project{activeProjects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <ChevronDown
            size={16}
            className={`text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute bg-arcade-screen border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden ${
              collapsed
                ? 'left-full top-0 ml-2 w-56'
                : 'left-0 right-0 top-full mt-2'
            }`}
          >
            <div className="max-h-64 overflow-y-auto">
              {activeProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    setCurrentProject(project.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors
                    ${project.id === currentProjectId ? 'bg-arcade-pink/10' : ''}
                  `}
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: project.color }}
                  >
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-pixel text-sm text-white truncate flex-1 text-left">
                    {project.name}
                  </span>
                  {project.id === currentProjectId && (
                    <Check size={14} className="text-arcade-pink" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-white/10">
              {isCreating ? (
                <div className="p-3 space-y-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateProject();
                      if (e.key === 'Escape') setIsCreating(false);
                    }}
                    placeholder="Project name..."
                    className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 font-pixel text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-arcade-pink"
                    maxLength={50}
                  />
                  <div className="flex gap-1 flex-wrap">
                    {PROJECT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-6 h-6 rounded transition-transform ${
                          selectedColor === color ? 'scale-125 ring-2 ring-white' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateProject}
                      disabled={!newProjectName.trim()}
                      className="flex-1 bg-arcade-pink/20 text-arcade-pink font-pixel text-xs py-2 rounded hover:bg-arcade-pink/30 transition-colors disabled:opacity-50"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setIsCreating(false)}
                      className="px-3 py-2 text-white/60 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Plus size={16} />
                  <span className="font-pixel text-sm">New Project</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { sidebarCollapsed, toggleSidebar, setSidebarMobileOpen, sidebarMobileOpen } = useUIStore();
  const { backlogTasks } = useProjectStore();

  // Get backlog count for the current project
  const state = useProjectStore.getState();
  const backlogCount = state.tasks.filter(t =>
    t.projectId === state.currentProjectId && t.isInBacklog
  ).length;

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Workstation', path: '/' },
    { icon: <Kanban size={20} />, label: 'Kanban', path: '/kanban' },
    { icon: <ListTodo size={20} />, label: 'Backlog', path: '/backlog', badge: backlogCount },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setSidebarMobileOpen(false);
  };

  const sidebarContent = (
    <>
      {/* Project Switcher */}
      <div className="p-3 border-b border-white/5">
        <ProjectSwitcher collapsed={sidebarCollapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            path={item.path}
            isActive={location.pathname === item.path}
            collapsed={sidebarCollapsed}
            onClick={() => handleNavigate(item.path)}
            badge={item.badge}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 space-y-1">
        <NavItem
          icon={<Settings size={20} />}
          label="Settings"
          path="/settings"
          isActive={location.pathname === '/settings'}
          collapsed={sidebarCollapsed}
          onClick={() => handleNavigate('/settings')}
        />

        <button
          onClick={toggleSidebar}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
            text-white/40 hover:text-white hover:bg-white/5 transition-all
            ${sidebarCollapsed ? 'justify-center' : ''}
          `}
        >
          <ChevronLeft
            size={20}
            className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
          />
          {!sidebarCollapsed && (
            <span className="font-pixel text-sm">Collapse</span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        className="hidden md:flex flex-col bg-arcade-panel/50 border-r border-white/5 h-full shrink-0"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarMobileOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 z-40"
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-60 bg-arcade-panel border-r border-white/5 z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-3 border-b border-white/5">
                <span className="font-game text-xs text-arcade-pink">MENU</span>
                <button
                  onClick={() => setSidebarMobileOpen(false)}
                  className="p-2 text-white/60 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
