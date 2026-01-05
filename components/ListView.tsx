import React from 'react';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import { Task } from '../types';
import { GripVertical, X, PlayCircle, CheckCircle, RotateCcw, Archive, Edit2 } from 'lucide-react';

interface ListViewProps {
  activeTasks: Task[];
  completedTasks: Task[];
  currentTab: 'active' | 'completed';
  onTabChange: (tab: 'active' | 'completed') => void;
  onReorder: (tasks: Task[]) => void;
  onSelect: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onRestore: (taskId: string) => void;
  onEdit?: (taskId: string) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  activeTasks,
  completedTasks,
  currentTab,
  onTabChange,
  onReorder,
  onSelect,
  onDelete,
  onRestore,
  onEdit
}) => {
  
  const isHistory = currentTab === 'completed';
  const displayedTasks = isHistory ? completedTasks : activeTasks;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      
      {/* Tabs */}
      <div className="flex border-b border-white/10 shrink-0">
        <button
          onClick={() => onTabChange('active')}
          className={`flex-1 py-3 text-xs font-game tracking-widest transition-colors relative ${!isHistory ? 'text-arcade-cyan bg-white/5' : 'text-white/30 hover:text-white/60'}`}
        >
          ACTIVE MISSIONS
          {!isHistory && (
             <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 w-full h-1 bg-arcade-cyan shadow-neon-cyan" />
          )}
        </button>
        <button
          onClick={() => onTabChange('completed')}
          className={`flex-1 py-3 text-xs font-game tracking-widest transition-colors relative ${isHistory ? 'text-arcade-pink bg-white/5' : 'text-white/30 hover:text-white/60'}`}
        >
          MISSION LOG
          {isHistory && (
             <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 w-full h-1 bg-arcade-pink shadow-neon-pink" />
          )}
        </button>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        
        {displayedTasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/30">
            {isHistory ? (
               <>
                 <Archive size={48} className="mb-4 opacity-50" />
                 <p className="font-game text-[10px] tracking-widest">LOG EMPTY</p>
               </>
            ) : (
               <>
                 <div className="w-16 h-16 border-4 border-dashed border-white/20 rounded-full animate-spin-slow mb-4"></div>
                 <p className="font-game text-[10px] tracking-widest">NO ACTIVE MISSIONS</p>
                 <p className="font-pixel text-xl mt-2 text-arcade-pink">READY PLAYER ONE?</p>
               </>
            )}
          </div>
        ) : (
          isHistory ? (
            // Static List for History (No drag)
            <div className="space-y-3">
              <AnimatePresence>
                {displayedTasks.map((task) => (
                   <motion.div
                     key={task.id}
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     className="flex items-center bg-white/5 border-l-4 border-white/20 p-3 rounded-r-lg"
                   >
                     <div className="mr-3 text-arcade-pink">
                       <CheckCircle size={18} />
                     </div>
                     <div className="flex-1 font-pixel text-xl text-white/50 line-through decoration-arcade-pink/50 decoration-2">
                       {task.text}
                     </div>
                     <button
                        onClick={() => onRestore(task.id)}
                        className="p-2 text-white/20 hover:text-arcade-cyan transition-colors"
                        title="Restore Mission"
                     >
                        <RotateCcw size={18} />
                     </button>
                     {onEdit && (
                       <button
                          onClick={() => onEdit(task.id)}
                          className="p-2 text-white/20 hover:text-arcade-purple transition-colors"
                          title="Edit Mission"
                       >
                          <Edit2 size={18} />
                       </button>
                     )}
                     <button
                        onClick={() => onDelete(task.id)}
                        className="p-2 text-white/20 hover:text-red-500 transition-colors"
                        title="Purge Data"
                     >
                        <X size={18} />
                     </button>
                   </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            // Draggable List for Active
            <Reorder.Group axis="y" values={displayedTasks} onReorder={onReorder} className="space-y-3">
              <AnimatePresence mode='popLayout'>
              {displayedTasks.map((task, index) => (
                <Reorder.Item key={task.id} value={task}>
                  <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.8, x: -50 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="group relative flex items-center bg-white/5 border-l-4 border-arcade-purple hover:border-arcade-pink p-4 rounded-r-lg hover:bg-white/10 transition-colors shadow-lg"
                  >
                    {/* Drag Handle */}
                    <div className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white mr-4">
                      <GripVertical size={20} />
                    </div>

                    {/* Index Number */}
                    <div className="font-game text-[10px] text-white/30 mr-4 w-6">
                      {(index + 1).toString().padStart(2, '0')}
                    </div>

                    {/* Task Text */}
                    <div className="flex-1 font-pixel text-2xl text-white truncate drop-shadow-md cursor-pointer" onClick={() => onSelect(task.id)}>
                      {task.text}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {onEdit && (
                        <motion.button
                          whileHover={{ scale: 1.2, color: "#9d00ff" }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onEdit(task.id)}
                          className="p-2 text-white/40 hover:text-arcade-purple transition-colors"
                          title="Edit Mission"
                        >
                          <Edit2 size={20} />
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.2, color: "#ff00ff" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onDelete(task.id)}
                        className="p-2 text-white/40 hover:text-arcade-pink transition-colors"
                      >
                        <X size={20} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.2, color: "#00ffff" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onSelect(task.id)}
                        className="p-2 text-white/40 hover:text-arcade-cyan transition-colors"
                      >
                        <PlayCircle size={24} />
                      </motion.button>
                    </div>

                  </motion.div>
                </Reorder.Item>
              ))}
              </AnimatePresence>
            </Reorder.Group>
          )
        )}
      </div>
    </div>
  );
};