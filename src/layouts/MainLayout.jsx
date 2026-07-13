import { Outlet, useLocation, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Activity, UserCircle, Menu, X, LayoutGrid, Radar, TrendingUp, Apple, Terminal, Settings, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import ProfileSettingsModal from '../components/ProfileSettingsModal';
import InstallButton from '../components/InstallButton';

export default function MainLayout() {
  const location = useLocation();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-200 font-sans uppercase tracking-wide overflow-hidden selection:bg-brand-red selection:text-white">
      {/* Fondo Radial de Luz Neón Roja */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-red/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Sidebar for Desktop */}
      <div className="relative z-10 hidden md:flex shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl shrink-0 relative z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-red flex items-center justify-center rounded-sm">
              <Activity className="text-zinc-950" size={18} strokeWidth={3} />
            </div>
            <h1 className="text-xl font-black tracking-widest text-zinc-100 uppercase font-bebas mt-1">
              IRONFORGE
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <InstallButton isMobile={true} />
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-brand-red hover:border-brand-red transition-colors"
            >
              <UserCircle size={18} />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-sm bg-brand-red/10 border border-brand-red/30 text-brand-red hover:bg-brand-red hover:text-white transition-colors"
            >
              <Menu size={18} />
            </button>
          </div>
        </header>

        {/* Mobile Hamburger Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-50 bg-[#050505] flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-900">
                <h2 className="text-2xl font-black text-brand-red font-bebas tracking-widest mt-1">NAVEGACIÓN</h2>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-sm bg-zinc-900 text-zinc-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex flex-col p-6 gap-4 font-bebas text-3xl tracking-widest overflow-y-auto custom-scrollbar h-full pb-20">
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 text-zinc-300 hover:text-brand-red py-4 border-b border-zinc-900/50">
                  <Radar size={28} className="text-brand-red" />
                  DASHBOARD
                </Link>
                <Link to="/blocks" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 text-zinc-300 hover:text-brand-red py-4 border-b border-zinc-900/50">
                  <LayoutGrid size={28} className="text-brand-red" />
                  BLOQUES
                </Link>
                <Link to="/progression" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 text-zinc-300 hover:text-brand-red py-4 border-b border-zinc-900/50">
                  <TrendingUp size={28} className="text-brand-red" />
                  PROGRESIÓN
                </Link>
                <Link to="/measurements" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 text-zinc-300 hover:text-brand-red py-4 border-b border-zinc-900/50">
                  <Scale size={28} className="text-brand-red" />
                  MEDIDAS
                </Link>
                <Link to="/nutrition" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 text-zinc-300 hover:text-brand-red py-4 border-b border-zinc-900/50">
                  <Apple size={28} className="text-brand-red" />
                  NUTRICIÓN
                </Link>
                <Link to="/console" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 text-zinc-300 hover:text-brand-red py-4 border-b border-zinc-900/50">
                  <Terminal size={28} className="text-brand-red" />
                  IA
                </Link>
                <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 text-zinc-300 hover:text-brand-red py-4 border-b border-zinc-900/50">
                  <Settings size={28} className="text-brand-red" />
                  AJUSTES
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Content */}
        <main className="flex-1 p-4 pb-24 md:pb-8 md:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="max-w-7xl mx-auto h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      
      <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
}

