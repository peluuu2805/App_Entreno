import { NavLink, useLocation } from 'react-router-dom';
import { LayoutGrid, TrendingUp, Apple, Terminal, Scale } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'DASHBOARD', icon: LayoutGrid },
    { path: '/blocks', label: 'BLOQUES', icon: TrendingUp },
    { path: '/nutrition', label: 'NUTRICIÓN', icon: Apple },
    { path: '/measurements', label: 'MEDIDAS', icon: Scale },
    { path: '/console', label: 'IA', icon: Terminal },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-md border-t border-brand-red z-50 px-4 py-2 flex justify-between items-center shadow-[0_-5px_20px_rgba(225,29,72,0.15)]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
        
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center gap-1 p-2 transition-all duration-300 ${
              isActive 
                ? 'text-brand-red drop-shadow-[0_0_8px_rgba(225,29,72,0.8)] scale-110' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <item.icon size={22} strokeWidth={isActive ? 3 : 2} />
            <span className="text-[9px] font-bold tracking-widest uppercase">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
