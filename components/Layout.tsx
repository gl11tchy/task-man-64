import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center p-2 sm:p-6 overflow-hidden relative">

      {/* 3D Perspective Grid Background */}
      <div className="perspective-container z-0">
        <div className="perspective-grid"></div>
        <div className="grid-fade"></div>
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050510_100%)] z-0 pointer-events-none"></div>

      {/* Console Frame */}
      <div className="relative w-full max-w-3xl h-[90vh] bg-arcade-panel/90 backdrop-blur-md rounded-[30px] p-3 sm:p-5 shadow-[0_0_50px_rgba(157,0,255,0.4)] border-4 border-[#ffffff20] ring-4 ring-arcade-purple z-10 flex flex-col">
        
        {/* Decorative Top Bar (Handheld style) */}
        <div className="h-6 flex justify-between items-center px-4 mb-2 opacity-60">
            <div className="flex gap-1">
                <div className="w-16 h-1 bg-white/20 rounded-full"></div>
                <div className="w-4 h-1 bg-white/20 rounded-full"></div>
            </div>
            <div className="text-[10px] font-game text-white/40 tracking-widest">WORKSTATION ULTRA</div>
            <div className="flex gap-1">
                <div className="w-16 h-1 bg-white/20 rounded-full"></div>
                <div className="w-4 h-1 bg-white/20 rounded-full"></div>
            </div>
        </div>

        {/* Inner Screen Container */}
        <div className="flex-1 relative bg-arcade-screen rounded-xl overflow-hidden border-4 border-black shadow-inner">
          
          {/* Main Content Area */}
          <div className="relative z-0 h-full w-full flex flex-col text-white selection:bg-arcade-pink selection:text-white">
             {children}
          </div>
        </div>
        
        {/* Decorative Bottom Area */}
        <div className="h-10 mt-3 flex justify-between items-center px-6">
            <div className="flex gap-3">
                 <div className="w-3 h-3 rounded-full bg-arcade-pink animate-pulse shadow-neon-pink"></div>
                 <div className="w-3 h-3 rounded-full bg-arcade-cyan shadow-neon-cyan opacity-50"></div>
            </div>
            
            {/* Ventilation Grills */}
            <div className="flex gap-1">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-1 h-4 bg-black/30 rounded-full transform -skew-x-12"></div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};