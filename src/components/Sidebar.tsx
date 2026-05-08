import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Cpu, LogOut, Search, MessageSquare, Zap, 
  Award, TrendingUp, Newspaper, ShieldCheck, X, BookOpen
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface SidebarProps {
  activePage: string;
  profile?: any;
  isCollapsed?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ 
  activePage, 
  profile, 
  isCollapsed = false, 
  isMobileOpen = false,
  onCloseMobile
}: SidebarProps) {
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      where('type', '==', 'message'),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadMessages(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const links = [
    { id: 'news', icon: <Newspaper size={18} />, text: 'Network Feed', path: '/news-feed', activeColor: 'cyan' },
    { id: 'dashboard', icon: <Zap size={18} />, text: 'Unified Profile', path: '/dashboard', activeColor: 'cyan' },
    { id: 'my-posts', icon: <BookOpen size={18} />, text: 'My Publications', path: '/my-posts', activeColor: 'cyan' },
    { id: 'search', icon: <Search size={18} />, text: 'Intelligent Search', path: '/search', activeColor: 'cyan' },
    { id: 'communities', icon: <Award size={18} />, text: 'Elite Guilds', path: '/communities', activeColor: 'cyan' },
    { id: 'messages', icon: <MessageSquare size={18} />, text: 'Neural Comms', path: '/messages', activeColor: 'cyan', badge: unreadMessages > 0 ? unreadMessages : null },
  ];

  if (isCollapsed && !isMobileOpen) return null;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-[101] w-80 bg-white backdrop-blur-3xl border-r border-slate-100 flex flex-col p-10 gap-8 transition-transform duration-300 ease-in-out shadow-2xl shadow-slate-200/50
        md:relative md:translate-x-0 md:bg-slate-50 flex-shrink-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'md:hidden' : 'md:flex'}
      `}>
        <button 
          onClick={onCloseMobile}
          className="md:hidden absolute top-6 right-6 p-2 rounded-xl bg-slate-100 text-slate-500"
        >
          <X size={20} />
        </button>

        {/* Profile Section at Top */}
        <div className="flex flex-col items-center gap-4 mb-4 pb-8 border-b border-slate-100">
          <div className="w-20 h-20 rounded-[1.8rem] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 p-[2px] shadow-xl shadow-cyan-600/10">
            <div className="w-full h-full rounded-[1.7rem] bg-white flex items-center justify-center overflow-hidden">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-2xl font-display font-black text-slate-900/90">
                  {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                </span>
              )}
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-display font-black tracking-tight text-slate-900 italic font-serif truncate max-w-[200px]">
              {profile?.firstName} {profile?.lastName}
            </h2>
            <p className="text-[9px] font-black text-cyan-600 uppercase tracking-[0.2em] italic font-serif">Validated Node</p>
          </div>
        </div>
        
        <nav className="flex-grow flex flex-col gap-3">
          {links.map((link) => (
            <SidebarLink 
              key={link.id}
              icon={link.icon} 
              text={link.text} 
              active={activePage === link.id} 
              badge={link.badge}
              onClick={() => {
                link.path !== '#' && navigate(link.path);
                onCloseMobile?.();
              }}
              activeColor={link.activeColor}
            />
          ))}
        </nav>

        <button 
          onClick={() => auth.signOut()}
          className="flex items-center gap-3 text-slate-500 hover:text-slate-900 transition-all p-4 rounded-2xl hover:bg-slate-100 mt-auto border border-transparent hover:border-slate-200"
        >
          <LogOut size={18} />
          <span className="font-bold text-sm tracking-tight">System Logout</span>
        </button>
      </aside>
    </>
  );
}

function SidebarLink({ icon, text, active = false, onClick, activeColor = 'white', badge }: any) {
  const getActiveStyles = () => {
    if (activeColor === 'cyan') return 'bg-cyan-600/10 text-slate-900 border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]';
    return 'bg-slate-100 text-slate-900 border-slate-200 shadow-sm';
  };

  const getIconColor = () => {
    if (active) return activeColor === 'cyan' ? 'text-cyan-600' : 'text-blue-600';
    return 'text-inherit opacity-60';
  };

  return (
    <div 
      onClick={onClick}
      className={`group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 border border-transparent ${active ? getActiveStyles() : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
    >
      <div className={`transition-colors duration-300 flex-shrink-0 ${getIconColor()}`}>
        {icon}
      </div>
      <span className="font-bold text-sm tracking-tight whitespace-nowrap">{text}</span>
      {badge && (
        <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">
          {badge}
        </span>
      )}
      {active && !badge && (
        <div className="ml-auto w-1 h-4 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
      )}
    </div>
  );
}
