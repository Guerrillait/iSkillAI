import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, Newspaper, Award, MessageSquare
} from 'lucide-react';
import NotificationBell from './NotificationBell';

interface HeaderProps {
  profile: any;
  user: any;
  activePage: string;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  onOpenMobileMenu: () => void;
  actions?: React.ReactNode;
}

export default function Header({ 
  profile, 
  user, 
  activePage, 
  isSidebarCollapsed, 
  toggleSidebar,
  onOpenMobileMenu,
  actions
}: HeaderProps) {
  const navigate = useNavigate();

  const navItems = [
    { id: 'dashboard', icon: <Zap size={14} />, text: 'Profile', path: '/dashboard' },
    { id: 'news', icon: <Newspaper size={14} />, text: 'Feed', path: '/news-feed' },
    { id: 'communities', icon: <Award size={14} />, text: 'Elite', path: '/communities' },
    { id: 'messages', icon: <MessageSquare size={14} />, text: 'Chat', path: '/messages' },
  ];

  return (
    <header className="flex items-center justify-between gap-2 md:gap-4 bg-white/70 backdrop-blur-xl border border-white/40 px-2 py-1.5 md:p-2 rounded-2xl md:rounded-[1.5rem] sticky top-0 md:top-4 z-40 mx-auto w-full shadow-lg shadow-slate-200/40 mb-6 md:mb-8 transition-all duration-300">
      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={() => {
            if (window.innerWidth < 768) {
              onOpenMobileMenu();
            } else {
              toggleSidebar();
            }
          }}
          className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/50 border border-slate-200 text-slate-400 hover:text-cyan-600 transition-all hover:bg-cyan-600/5 flex items-center justify-center overflow-hidden group shadow-sm shrink-0"
        >
          {isSidebarCollapsed || (typeof window !== 'undefined' && window.innerWidth < 768) ? (
            profile?.photoURL ? (
              <img 
                src={profile.photoURL} 
                alt="Profile" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <span className="text-[10px] font-black text-slate-900 italic uppercase">
                {profile?.firstName?.[0]}{profile?.lastName?.[0]}
              </span>
            )
          ) : (
            <Zap size={16} className="text-cyan-600 transition-transform group-hover:scale-110" />
          )}
        </button>

        <div className="hidden lg:flex flex-col">
          <h2 className="text-[9px] font-display font-black text-slate-900 uppercase italic font-serif leading-none tracking-tight">
            NODE // VERIFIED
          </h2>
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest italic font-serif mt-0.5">v4.2</span>
        </div>
      </div>

      <nav className="flex items-center gap-0.5 md:gap-1 bg-slate-50/50 p-1 rounded-xl md:rounded-2xl border border-slate-100">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`flex items-center gap-1.5 px-3 py-1.5 md:px-5 md:py-2 rounded-lg md:rounded-xl transition-all font-serif font-black text-[8px] md:text-[9px] tracking-[0.1em] uppercase italic group ${activePage === item.id ? 'bg-white text-slate-950 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-900 hover:bg-white/40'}`}
          >
            <span className={activePage === item.id ? 'text-cyan-600' : 'text-slate-300 group-hover:text-cyan-600/50'}>
              {item.icon}
            </span>
            <span className="hidden sm:inline">{item.text}</span>
            {activePage === item.id && <motion.div layoutId="activeNav" className="absolute" />}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {actions && <div className="hidden sm:flex items-center gap-2 md:gap-3">{actions}</div>}
        <div className="h-5 w-px bg-slate-200/50 mx-1 hidden md:block" />
        <NotificationBell userId={user?.uid} />
      </div>
    </header>
  );
}
