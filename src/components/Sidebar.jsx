import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, Radar, TrendingUp, Apple, Terminal, Settings, LogOut, Activity, Scale, UserCircle } from 'lucide-react';
import { useState } from 'react';
import ProfileSettingsModal from './ProfileSettingsModal';
import InstallButton from './InstallButton';
import { motion } from 'framer-motion';

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'ATLETA';
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'DASHBOARD', icon: Radar },
    { path: '/blocks', label: 'BLOQUES', icon: LayoutGrid },
    { path: '/progression', label: 'PROGRESIÓN', icon: TrendingUp },
    { path: '/nutrition', label: 'NUTRICIÓN', icon: Apple },
    { path: '/measurements', label: 'MEDIDAS', icon: Scale },
    { path: '/console', label: 'CONSOLA_IA', icon: Terminal },
    { path: '/settings', label: 'AJUSTES', icon: Settings },
  ];

  return (
    <>
      <aside className="w-64 bg-zinc-950/80 backdrop-blur-xl border-r border-zinc-800/50 h-screen flex flex-col hidden md:flex shrink-0 relative z-20">
        {/* Brand */}
        <div className="h-20 flex items-center px-6 border-b border-zinc-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-red flex items-center justify-center rounded-sm">
              <Activity className="text-zinc-950" size={18} strokeWidth={3} />
            </div>
            <h1 className="text-xl font-black tracking-widest uppercase text-zinc-100 font-bebas">
              IRONFORGE
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs tracking-widest transition-colors duration-300 uppercase shrink-0 ${
                  isActive 
                    ? 'text-white' 
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSidebar"
                  className="absolute inset-0 bg-brand-red/15 border border-brand-red/40 rounded-xl shadow-[0_0_15px_rgba(225,29,72,0.2)] z-0"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-3">
                <item.icon size={18} strokeWidth={2.5} className={isActive ? 'text-brand-red drop-shadow-[0_0_8px_rgba(225,29,72,0.8)]' : ''} />
                {item.label}
              </div>
            </Link>
          )})}
        </nav>

        {/* Footer / System Status */}
        <div className="p-4 border-t border-zinc-900 flex flex-col gap-2 shrink-0">
          <InstallButton />
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-sm transition-colors duration-200 text-left"
          >
            <UserCircle size={18} className="text-brand-red" />
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-xs tracking-widest truncate">{userName}</span>
              <span className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase">Editar Perfil</span>
            </div>
          </button>
          <button 
            onClick={signOut}
            className="w-full group flex items-center justify-between px-4 py-3 bg-transparent border border-zinc-800 hover:border-brand-red hover:bg-brand-red/10 text-zinc-500 hover:text-brand-red rounded-sm transition-colors duration-200 uppercase"
          >
            <span className="font-bold text-xs tracking-widest">CERRAR SESIÓN</span>
            <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </aside>
      
      <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </>
  );
}
